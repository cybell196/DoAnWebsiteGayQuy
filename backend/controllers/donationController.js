const pool = require('../config/database');
const { convertUSDToVND } = require('../services/exchangeRateService');
const { createPaymentLink: createPayOSPaymentLink, getPaymentInfo } = require('../services/payosService');
const { createSolanaPayment: createSolanaPaymentRequest, verifyTransaction, findTransactionByReference, getSOLToUSDRate } = require('../services/solanaService');
const crypto = require('crypto');

// Create donation
const createDonation = async (req, res) => {
  const io = req.app?.get('io');
  try {
    const { campaign_id, amount, currency, exchange_rate, message, is_public } = req.body;

    if (!campaign_id || !amount) {
      return res.status(400).json({ message: 'Campaign ID and amount are required' });
    }

    // Check if campaign exists and is approved
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaign_id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaignStatus = campaigns[0].status;
    if (campaignStatus !== 'APPROVED') {
      return res.status(400).json({ message: 'Campaign is not approved' });
    }
    if (campaignStatus === 'ENDED') {
      return res.status(400).json({ message: 'Campaign has ended' });
    }

    // Convert to USD
    const amountUSD = parseFloat(amount) * (parseFloat(exchange_rate) || 1.0);

    // Create donation
    const [result] = await pool.execute(
      `INSERT INTO donations (campaign_id, user_id, amount, currency, exchange_rate, message, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        campaign_id,
        req.user.id,
        amountUSD,
        currency || 'USD',
        exchange_rate || 1.0,
        message || null,
        is_public !== undefined ? is_public : true
      ]
    );

    // Update campaign current_amount
    await pool.execute(
      'UPDATE campaigns SET current_amount = current_amount + ? WHERE id = ?',
      [amountUSD, campaign_id]
    );

    // Get updated campaign
    const [updatedCampaigns] = await pool.execute(
      'SELECT current_amount, goal_amount, status FROM campaigns WHERE id = ?',
      [campaign_id]
    );

    // Auto-end campaign if goal is reached
    const updatedCampaign = updatedCampaigns[0];
    if (updatedCampaign.status === 'APPROVED' && 
        parseFloat(updatedCampaign.current_amount) >= parseFloat(updatedCampaign.goal_amount)) {
      await pool.execute(
        'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
        [campaign_id]
      );
      updatedCampaign.status = 'ENDED';
    }

    const donation = {
      id: result.insertId,
      campaign_id,
      user_id: req.user.id,
      amount: amountUSD,
      currency: currency || 'USD',
      message: message || null,
      is_public: is_public !== undefined ? is_public : true,
      created_at: new Date()
    };

    const response = {
      message: 'Donation created successfully',
      donation,
      campaign: updatedCampaigns[0]
    };

    // Emit socket event for real-time update
    if (io) {
      io.to(`campaign-${campaign_id}`).emit('new-donation', {
        donation,
        campaign: updatedCampaigns[0]
      });
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get donations for a campaign
const getCampaignDonations = async (req, res) => {
  try {
    const { campaign_id } = req.params;

    let query = `
      SELECT d.*, 
             CASE 
               WHEN d.is_public = 1 THEN u.fullname 
               ELSE 'Anonymous' 
             END as donor_name,
             CASE 
               WHEN d.is_public = 1 THEN u.avatar 
               ELSE NULL 
             END as donor_avatar
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.campaign_id = ?
        AND (d.payment_status IS NULL OR d.payment_status = 'SUCCESS')
      ORDER BY d.created_at DESC
    `;

    const [donations] = await pool.execute(query, [campaign_id]);

    res.json({ donations });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get top donors for a campaign (tổng quyên góp của mỗi người)
const getTopDonors = async (req, res) => {
  try {
    const { campaign_id } = req.params;

    let query = `
      SELECT 
        d.user_id,
        SUM(d.amount) as total_amount,
        COUNT(d.id) as donation_count,
        MAX(d.created_at) as last_donation_date,
        CASE 
          WHEN MAX(d.is_public) = 1 THEN u.fullname 
          ELSE 'Anonymous' 
        END as donor_name,
        CASE 
          WHEN MAX(d.is_public) = 1 THEN u.avatar 
          ELSE NULL 
        END as donor_avatar
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.campaign_id = ?
        AND (d.payment_status IS NULL OR d.payment_status = 'SUCCESS')
      GROUP BY d.user_id
      ORDER BY total_amount DESC, last_donation_date DESC
      LIMIT 10
    `;

    const [topDonors] = await pool.execute(query, [campaign_id]);

    res.json({ topDonors });
  } catch (error) {
    console.error('Get top donors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all donations
const getAllDonations = async (req, res) => {
  try {
    const query = `
      SELECT d.*, 
             u.fullname as donor_name,
             u.avatar as donor_avatar,
             c.title as campaign_title
      FROM donations d
      JOIN users u ON d.user_id = u.id
      JOIN campaigns c ON d.campaign_id = c.id
      WHERE (d.payment_status IS NULL OR d.payment_status = 'SUCCESS')
      ORDER BY d.created_at DESC
    `;

    const [donations] = await pool.execute(query);

    res.json({ donations });
  } catch (error) {
    console.error('Get all donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's donations
const getMyDonations = async (req, res) => {
  try {
    const [donations] = await pool.execute(
      `SELECT d.*, c.title as campaign_title, c.thumbnail as campaign_thumbnail
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       WHERE d.user_id = ?
         AND (d.payment_status IS NULL OR d.payment_status = 'SUCCESS')
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );

    res.json({ donations });
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Tạo payment link từ PayOS
const createPaymentLink = async (req, res) => {
  try {
    const { campaign_id, amount_usd, message, is_public } = req.body;

    if (!campaign_id || !amount_usd) {
      return res.status(400).json({ message: 'Campaign ID and amount are required' });
    }

    const amountUSD = parseFloat(amount_usd);
    if (isNaN(amountUSD) || amountUSD <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Check if campaign exists and is approved
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaign_id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    if (campaign.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Campaign is not approved' });
    }
    if (campaign.status === 'ENDED') {
      return res.status(400).json({ message: 'Campaign has ended' });
    }

    // Convert USD to VND
    const { vndAmount, exchangeRate } = await convertUSDToVND(amountUSD);

    // Generate unique order code (6-8 digits)
    // PayOS requires orderCode to be a number, typically 6-8 digits
    // Use: timestamp last 6 digits + random 2 digits
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 100);
    const orderCode = parseInt(String(timestamp).slice(-6) + String(randomSuffix).padStart(2, '0'));

    // Create temporary donation record with PENDING status
    try {
      const [result] = await pool.execute(
        `INSERT INTO donations (campaign_id, user_id, amount, currency, exchange_rate, amount_vnd, message, is_public, payment_status, order_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [
          campaign_id,
          req.user.id,
          amountUSD,
          'USD',
          exchangeRate,
          vndAmount,
          message || null,
          is_public !== undefined ? is_public : true,
          orderCode
        ]
      );
      var donationId = result.insertId;
    } catch (dbError) {
      console.error('Database error when inserting donation:', dbError);
      console.error('SQL Error Code:', dbError.code);
      console.error('SQL Error Message:', dbError.message);
      throw new Error(`Database error: ${dbError.message}. Có thể các cột payment_status, amount_vnd, order_code chưa được thêm vào bảng donations.`);
    }

    // Create payment link from PayOS
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/campaigns/${campaign_id}?payment=success&donation_id=${donationId}`;
    const cancelUrl = `${baseUrl}/campaigns/${campaign_id}?payment=cancelled&donation_id=${donationId}`;

    // PayOS yêu cầu description tối đa 25 ký tự
    let description = campaign.title || 'Quyên góp';
    if (description.length > 25) {
      description = description.substring(0, 22) + '...';
    }

    const paymentLinkData = {
      amount: vndAmount,
      description: description,
      orderCode: orderCode,
      returnUrl: returnUrl,
      cancelUrl: cancelUrl
    };

    const paymentResult = await createPayOSPaymentLink(paymentLinkData);

    // Update donation with payment_id
    if (paymentResult.paymentLink) {
      const paymentLinkId = paymentResult.paymentLink.paymentLinkId || paymentResult.paymentLink.id;
      if (paymentLinkId) {
        await pool.execute(
          'UPDATE donations SET payment_id = ? WHERE id = ?',
          [paymentLinkId.toString(), donationId]
        );
      }
    }

    if (!paymentResult.checkoutUrl) {
      console.error('PayOS response missing checkoutUrl:', paymentResult);
      throw new Error('PayOS không trả về checkout URL');
    }

    res.json({
      success: true,
      checkoutUrl: paymentResult.checkoutUrl,
      qrCode: paymentResult.paymentLink?.qrCode || null,
      paymentLinkId: paymentResult.paymentLink?.paymentLinkId || null,
      donation_id: donationId,
      order_code: orderCode,
      amount_usd: amountUSD,
      amount_vnd: vndAmount,
      exchange_rate: exchangeRate,
      description: paymentLinkData.description
    });
  } catch (error) {
    console.error('Create payment link error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Webhook từ PayOS
const handlePayOSWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    // PayOS sẽ gửi webhook với signature để verify
    // Trong production, nên verify signature này
    const { code, desc, data } = webhookData;

    if (code !== 0) {
      console.error('PayOS webhook error:', desc);
      return res.status(400).json({ message: 'Webhook error' });
    }

    const { orderCode, transactionDateTime, amount, description } = data;

    // Tìm donation theo order_code
    const [donations] = await pool.execute(
      'SELECT * FROM donations WHERE order_code = ?',
      [orderCode]
    );

    if (donations.length === 0) {
      console.error('Donation not found for order_code:', orderCode);
      return res.status(404).json({ message: 'Donation not found' });
    }

    const donation = donations[0];

    // Kiểm tra nếu đã xử lý rồi
    if (donation.payment_status === 'SUCCESS') {
      return res.json({ message: 'Already processed' });
    }

    // Cập nhật trạng thái thanh toán
    await pool.execute(
      'UPDATE donations SET payment_status = ?, updated_at = ? WHERE id = ?',
      ['SUCCESS', new Date(), donation.id]
    );

    // Cập nhật campaign current_amount
    await pool.execute(
      'UPDATE campaigns SET current_amount = current_amount + ? WHERE id = ?',
      [donation.amount, donation.campaign_id]
    );

    // Get updated campaign
    const [updatedCampaigns] = await pool.execute(
      'SELECT current_amount, goal_amount, status FROM campaigns WHERE id = ?',
      [donation.campaign_id]
    );

    // Auto-end campaign if goal is reached
    const updatedCampaign = updatedCampaigns[0];
    if (updatedCampaign.status === 'APPROVED' && 
        parseFloat(updatedCampaign.current_amount) >= parseFloat(updatedCampaign.goal_amount)) {
      await pool.execute(
        'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
        [donation.campaign_id]
      );
      updatedCampaign.status = 'ENDED';
    }

    // Emit socket event for real-time update
    const io = req.app?.get('io');
    if (io) {
      io.to(`campaign-${donation.campaign_id}`).emit('new-donation', {
        donation: {
          ...donation,
          payment_status: 'SUCCESS'
        },
        campaign: updatedCampaign
      });
    }

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Kiểm tra trạng thái thanh toán
const checkPaymentStatus = async (req, res) => {
  try {
    const { donation_id } = req.params;

    const [donations] = await pool.execute(
      'SELECT * FROM donations WHERE id = ?',
      [donation_id]
    );

    if (donations.length === 0) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const donation = donations[0];

    // Nếu có order_code, lấy thông tin từ PayOS
    if (donation.order_code) {
      try {
        const paymentInfo = await getPaymentInfo(donation.order_code);
        if (paymentInfo.success && paymentInfo.data) {
          // Cập nhật trạng thái nếu cần
          const payosStatus = paymentInfo.data.status;
          if (payosStatus === 'PAID' && donation.payment_status !== 'SUCCESS') {
            // Thanh toán đã thành công trên PayOS nhưng chưa cập nhật trong DB
            console.log('Payment successful on PayOS, updating database...');
            
            // Cập nhật payment status
            await pool.execute(
              'UPDATE donations SET payment_status = ?, updated_at = ? WHERE id = ?',
              ['SUCCESS', new Date(), donation.id]
            );
            donation.payment_status = 'SUCCESS';
            
            // Cập nhật campaign current_amount
            // Chỉ cộng vào campaign khi payment_status chuyển từ PENDING sang SUCCESS lần đầu
            // Điều này đảm bảo không cộng trùng nếu gọi nhiều lần
            const [campaigns] = await pool.execute(
              'SELECT current_amount FROM campaigns WHERE id = ?',
              [donation.campaign_id]
            );
            
            if (campaigns.length > 0) {
              // Cộng donation amount vào campaign current_amount
              // Logic này an toàn vì chỉ chạy khi payment_status chuyển từ PENDING sang SUCCESS
              await pool.execute(
                'UPDATE campaigns SET current_amount = current_amount + ? WHERE id = ?',
                [donation.amount, donation.campaign_id]
              );
              
              // Kiểm tra và auto-end campaign nếu đạt goal
              const [updatedCampaigns] = await pool.execute(
                'SELECT current_amount, goal_amount, status FROM campaigns WHERE id = ?',
                [donation.campaign_id]
              );
              
              const updatedCampaign = updatedCampaigns[0];
              if (updatedCampaign.status === 'APPROVED' && 
                  parseFloat(updatedCampaign.current_amount) >= parseFloat(updatedCampaign.goal_amount)) {
                await pool.execute(
                  'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
                  [donation.campaign_id]
                );
              }
              
              // Emit socket event
              const io = req.app?.get('io');
              if (io) {
                io.to(`campaign-${donation.campaign_id}`).emit('new-donation', {
                  donation: {
                    ...donation,
                    payment_status: 'SUCCESS'
                  },
                  campaign: updatedCampaign
                });
              }
              
              console.log('Campaign amount updated successfully');
            }
          }
        }
      } catch (error) {
        console.error('Error checking PayOS status:', error);
      }
    }

    res.json({
      donation: {
        id: donation.id,
        payment_status: donation.payment_status,
        amount: donation.amount,
        amount_vnd: donation.amount_vnd,
        order_code: donation.order_code
      }
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Lấy tỷ giá USD/VND
const getExchangeRate = async (req, res) => {
  try {
    const { getUSDToVNDRate } = require('../services/exchangeRateService');
    const rate = await getUSDToVNDRate();
    res.json({ exchange_rate: rate });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    // Trả về fallback rate thay vì lỗi
    console.warn('Returning fallback exchange rate: 25,000 VND/USD');
    res.json({ exchange_rate: 25000 });
  }
};

// Get SOL/USD exchange rate
const getSOLExchangeRate = async (req, res) => {
  try {
    const rate = await getSOLToUSDRate();
    res.json({ 
      exchange_rate: rate,
      currency: 'SOL/USD'
    });
  } catch (error) {
    console.error('Get SOL exchange rate error:', error);
    // Trả về fallback rate
    console.warn('Returning fallback SOL exchange rate: 150 USD/SOL');
    res.json({ 
      exchange_rate: 150,
      currency: 'SOL/USD'
    });
  }
};

// Sync campaign current_amount từ donations đã thanh toán
// Endpoint này sẽ tính lại current_amount của tất cả campaigns từ donations có payment_status = 'SUCCESS'
const syncCampaignAmounts = async (req, res) => {
  try {
    
    // Lấy tất cả campaigns
    const [campaigns] = await pool.execute('SELECT id FROM campaigns');
    
    let updatedCount = 0;
    const results = [];
    
    for (const campaign of campaigns) {
      // Tính tổng donations đã thanh toán thành công cho campaign này
      const [donations] = await pool.execute(
        `SELECT SUM(amount) as total_amount 
         FROM donations 
         WHERE campaign_id = ? 
           AND (payment_status = 'SUCCESS' OR payment_status IS NULL)`,
        [campaign.id]
      );
      
      const totalAmount = parseFloat(donations[0].total_amount || 0);
      
      // Cập nhật current_amount
      await pool.execute(
        'UPDATE campaigns SET current_amount = ? WHERE id = ?',
        [totalAmount, campaign.id]
      );
      
      // Kiểm tra và auto-end campaign nếu đạt goal
      const [updatedCampaigns] = await pool.execute(
        'SELECT current_amount, goal_amount, status FROM campaigns WHERE id = ?',
        [campaign.id]
      );
      
      const updatedCampaign = updatedCampaigns[0];
      if (updatedCampaign.status === 'APPROVED' && 
          parseFloat(updatedCampaign.current_amount) >= parseFloat(updatedCampaign.goal_amount)) {
        await pool.execute(
          'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
          [campaign.id]
        );
        updatedCampaign.status = 'ENDED';
      }
      
      results.push({
        campaign_id: campaign.id,
        current_amount: totalAmount,
        status: updatedCampaign.status
      });
      
      updatedCount++;
    }
    
    res.json({
      success: true,
      message: `Đã đồng bộ ${updatedCount} chiến dịch`,
      updated_count: updatedCount,
      results: results
    });
  } catch (error) {
    console.error('Sync campaign amounts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create Solana payment (generate QR code)
const createSolanaPayment = async (req, res) => {
  const io = req.app?.get('io');
  try {
    const { campaign_id, amount_usd, message, is_public } = req.body;

    if (!campaign_id || !amount_usd) {
      return res.status(400).json({ message: 'Campaign ID and amount are required' });
    }

    const amountUSD = parseFloat(amount_usd);
    if (isNaN(amountUSD) || amountUSD <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Check if campaign exists and is approved
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaign_id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    if (campaign.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Campaign is not approved' });
    }
    if (campaign.status === 'ENDED') {
      return res.status(400).json({ message: 'Campaign has ended' });
    }

    // Get SOLANA payment method
    const [paymentMethods] = await pool.execute(
      'SELECT id FROM payment_methods WHERE name = "SOLANA" AND status = "ACTIVE" LIMIT 1'
    );

    if (paymentMethods.length === 0) {
      return res.status(400).json({ message: 'Solana payment method not available' });
    }

    const solanaPaymentMethodId = paymentMethods[0].id;

    // Get SOL/USD exchange rate first
    const solExchangeRate = await getSOLToUSDRate();
    
    // Create donation with PENDING status (lưu SOL/USD exchange rate)
    const [result] = await pool.execute(
      `INSERT INTO donations (campaign_id, user_id, amount, currency, exchange_rate, message, is_public, payment_status)
       VALUES (?, ?, ?, 'USD', ?, ?, ?, 'PENDING')`,
      [
        campaign_id,
        req.user.id,
        amountUSD,
        solExchangeRate, // SOL/USD rate
        message || null,
        is_public !== undefined ? is_public : true
      ]
    );

    const donationId = result.insertId;

    // Create Solana payment (generate QR code) với donationId thật
    const solanaPayment = await createSolanaPaymentRequest(amountUSD, donationId);

    // Create transaction record (lưu SOL/USD exchange rate và reference key)
    await pool.execute(
      `INSERT INTO transactions (donation_id, payment_method_id, amount, currency, exchange_rate, reference, status)
       VALUES (?, ?, ?, 'USD', ?, ?, 'PENDING')`,
      [donationId, solanaPaymentMethodId, amountUSD, solExchangeRate, solanaPayment.reference]
    );

    res.json({
      message: 'Solana payment created successfully',
      donationId,
      qrCode: solanaPayment.qrCode,
      paymentURL: solanaPayment.paymentURL.toString(), // Convert URL to string
      amountSOL: solanaPayment.amountSOL,
      amountUSD: solanaPayment.amountUSD,
      exchangeRate: solanaPayment.exchangeRate, // SOL/USD rate
      recipient: solanaPayment.recipient,
      reference: solanaPayment.reference // Reference key để frontend có thể track
    });
  } catch (error) {
    console.error('Create Solana payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify Solana transaction
const verifySolanaTransaction = async (req, res) => {
  const io = req.app?.get('io');
  try {
    const { donation_id, signature } = req.body;

    if (!donation_id || !signature) {
      return res.status(400).json({ message: 'Donation ID and transaction signature are required' });
    }

    // Get donation and transaction
    const [donations] = await pool.execute(
      `SELECT d.*, t.id as transaction_id, t.amount as transaction_amount
       FROM donations d
       LEFT JOIN transactions t ON d.id = t.donation_id
       WHERE d.id = ?`,
      [donation_id]
    );

    if (donations.length === 0) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const donation = donations[0];

    if (donation.payment_status === 'SUCCESS') {
      return res.status(400).json({ message: 'Donation already verified' });
    }

    // Get receiver wallet from env
    const receiverWallet = process.env.SOLANA_RECEIVER_WALLET;
    if (!receiverWallet) {
      return res.status(500).json({ message: 'Solana receiver wallet not configured' });
    }

    // Verify transaction on Solana
    const verification = await verifyTransaction(
      signature,
      donation.amount.toString(), // Expected amount in SOL (will be converted)
      receiverWallet
    );

    if (!verification.valid) {
      // Update transaction with failed status
      if (donation.transaction_id) {
        await pool.execute(
          'UPDATE transactions SET status = "FAILED", tx_hash = ? WHERE id = ?',
          [signature, donation.transaction_id]
        );
      }

      return res.status(400).json({
        message: 'Transaction verification failed',
        error: verification.error
      });
    }

    // Update donation status to SUCCESS
    await pool.execute(
      'UPDATE donations SET payment_status = "SUCCESS" WHERE id = ?',
      [donation_id]
    );

    // Update transaction
    if (donation.transaction_id) {
      await pool.execute(
        'UPDATE transactions SET status = "SUCCESS", tx_hash = ? WHERE id = ?',
        [signature, donation.transaction_id]
      );
    }

    // Update campaign current_amount
    await pool.execute(
      'UPDATE campaigns SET current_amount = current_amount + ? WHERE id = ?',
      [donation.amount, donation.campaign_id]
    );

    // Get updated campaign
    const [updatedCampaigns] = await pool.execute(
      'SELECT current_amount, goal_amount, status FROM campaigns WHERE id = ?',
      [donation.campaign_id]
    );

    const updatedCampaign = updatedCampaigns[0];

    // Auto-end campaign if goal is reached
    if (updatedCampaign.status === 'APPROVED' && 
        parseFloat(updatedCampaign.current_amount) >= parseFloat(updatedCampaign.goal_amount)) {
      await pool.execute(
        'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
        [donation.campaign_id]
      );
      updatedCampaign.status = 'ENDED';
    }

    // Emit socket event
    if (io) {
      io.to(`campaign-${donation.campaign_id}`).emit('new-donation', {
        donation: {
          ...donation,
          payment_status: 'SUCCESS'
        },
        campaign: updatedCampaign
      });
    }

    res.json({
      message: 'Transaction verified successfully',
      donation: {
        ...donation,
        payment_status: 'SUCCESS'
      },
      campaign: updatedCampaign,
      transaction: verification
    });
  } catch (error) {
    console.error('Verify Solana transaction error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check Solana payment status (polling endpoint)
const checkSolanaPaymentStatus = async (req, res) => {
  try {
    const { donation_id } = req.params;

    const [donations] = await pool.execute(
      `SELECT d.*, t.tx_hash, t.status as transaction_status, t.reference
       FROM donations d
       LEFT JOIN transactions t ON d.id = t.donation_id
       WHERE d.id = ?`,
      [donation_id]
    );

    if (donations.length === 0) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const donation = donations[0];

    res.json({
      donationId: donation.id,
      paymentStatus: donation.payment_status,
      transactionHash: donation.tx_hash,
      transactionStatus: donation.transaction_status,
      reference: donation.reference
    });
  } catch (error) {
    console.error('Check Solana payment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Auto-verify Solana transaction by reference key (backend tự động quét)
// Endpoint này được gọi định kỳ để tự động verify transaction
const autoVerifySolanaTransaction = async (req, res) => {
  const io = req.app?.get('io');
  try {
    const { donation_id } = req.params;

    // Get donation with reference key (bao gồm created_at để check thời gian)
    const [donations] = await pool.execute(
      `SELECT d.*, t.id as transaction_id, t.reference, t.amount as transaction_amount, t.exchange_rate, 
              UNIX_TIMESTAMP(d.created_at) * 1000 as donation_created_at
       FROM donations d
       LEFT JOIN transactions t ON d.id = t.donation_id
       WHERE d.id = ? AND d.payment_status = 'PENDING'`,
      [donation_id]
    );

    if (donations.length === 0) {
      return res.status(404).json({ message: 'Donation not found or already processed' });
    }

    const donation = donations[0];

    if (!donation.reference) {
      return res.status(400).json({ message: 'Reference key not found for this donation' });
    }

    // Get receiver wallet from env
    const receiverWallet = process.env.SOLANA_RECEIVER_WALLET;
    if (!receiverWallet) {
      return res.status(500).json({ message: 'Solana receiver wallet not configured' });
    }

    // Convert USD amount to SOL using stored exchange rate
    const solAmount = parseFloat(donation.transaction_amount) / parseFloat(donation.exchange_rate);

    // Lấy thời điểm tạo donation (chỉ match transaction sau thời điểm này)
    // Trừ đi 1 phút để đảm bảo không miss transaction được tạo ngay sau donation
    const minBlockTime = donation.donation_created_at ? donation.donation_created_at - (60 * 1000) : null;

    // Lấy danh sách transaction signatures đã được verify (để tránh match transaction đã dùng)
    const [usedTransactions] = await pool.execute(
      `SELECT DISTINCT tx_hash FROM transactions 
       WHERE tx_hash IS NOT NULL 
       AND tx_hash != '' 
       AND status = 'SUCCESS'`,
      []
    );
    const excludeSignatures = usedTransactions.map(t => t.tx_hash).filter(Boolean);

    // Tìm transaction bằng reference key
    // Chỉ log lần đầu hoặc khi có lỗi để tránh spam logs
    const verification = await findTransactionByReference(
      donation.reference,
      receiverWallet,
      solAmount,
      minBlockTime, // Chỉ match transaction sau khi donation được tạo
      excludeSignatures // Exclude transactions đã được verify cho donation khác
    );
    
    if (!verification.valid) {
      return res.json({
        verified: false,
        message: 'Transaction not found yet. Please try again later.',
        error: verification.error
      });
    }

    // Transaction found! Update database

    // Update donation status to SUCCESS
    await pool.execute(
      'UPDATE donations SET payment_status = "SUCCESS" WHERE id = ?',
      [donation_id]
    );

    // Update transaction
    if (donation.transaction_id) {
      await pool.execute(
        'UPDATE transactions SET status = "SUCCESS", tx_hash = ? WHERE id = ?',
        [verification.signature, donation.transaction_id]
      );
    }

    // Update campaign current_amount
    await pool.execute(
      'UPDATE campaigns SET current_amount = current_amount + ? WHERE id = ?',
      [donation.amount, donation.campaign_id]
    );

    // Get updated campaign
    const [updatedCampaigns] = await pool.execute(
      'SELECT current_amount, goal_amount, status FROM campaigns WHERE id = ?',
      [donation.campaign_id]
    );

    const updatedCampaign = updatedCampaigns[0];

    // Auto-end campaign if goal is reached
    if (updatedCampaign.status === 'APPROVED' && 
        parseFloat(updatedCampaign.current_amount) >= parseFloat(updatedCampaign.goal_amount)) {
      await pool.execute(
        'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
        [donation.campaign_id]
      );
      updatedCampaign.status = 'ENDED';
    }

    // Emit socket event
    if (io) {
      io.to(`campaign-${donation.campaign_id}`).emit('new-donation', {
        donation: {
          ...donation,
          payment_status: 'SUCCESS'
        },
        campaign: updatedCampaign
      });
    }

    res.json({
      verified: true,
      message: 'Transaction verified successfully',
      donation: {
        ...donation,
        payment_status: 'SUCCESS'
      },
      campaign: updatedCampaign,
      transaction: verification
    });
  } catch (error) {
    console.error('Auto-verify Solana transaction error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Debug: List recent transactions for recipient wallet
const listRecentSolanaTransactions = async (req, res) => {
  try {
    const receiverWallet = process.env.SOLANA_RECEIVER_WALLET;
    if (!receiverWallet) {
      return res.status(500).json({ message: 'Solana receiver wallet not configured' });
    }

    const { Connection, PublicKey } = require('@solana/web3.js');
    const SOLANA_DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    const recipientPubkey = new PublicKey(receiverWallet);

    // Get recent signatures
    const signatures = await connection.getSignaturesForAddress(recipientPubkey, {
      limit: 20 // Last 20 transactions
    });

    const transactions = [];

    for (const sigInfo of signatures) {
      try {
        const transaction = await connection.getTransaction(sigInfo.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });

        if (!transaction || !transaction.meta || transaction.meta.err) {
          continue;
        }

        const accountKeys = transaction.transaction.message.accountKeys;
        let receivedAmount = 0;
        const accountAddresses = [];

        if (transaction.meta.preBalances && transaction.meta.postBalances) {
          for (let i = 0; i < accountKeys.length; i++) {
            const accountKey = accountKeys[i].pubkey.toString();
            accountAddresses.push(accountKey);
            
            if (accountKey === receiverWallet) {
              const preBalance = transaction.meta.preBalances[i];
              const postBalance = transaction.meta.postBalances[i];
              receivedAmount = (postBalance - preBalance) / 1e9;
            }
          }
        }

        transactions.push({
          signature: sigInfo.signature,
          amount: receivedAmount,
          blockTime: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
          slot: transaction.slot,
          accountKeys: accountAddresses,
          explorerUrl: `https://solscan.io/tx/${sigInfo.signature}?cluster=devnet`
        });
      } catch (error) {
        console.error(`Error fetching transaction ${sigInfo.signature}:`, error.message);
      }
    }

    res.json({
      wallet: receiverWallet,
      totalTransactions: signatures.length,
      transactions: transactions,
      explorerWalletUrl: `https://solscan.io/account/${receiverWallet}?cluster=devnet`
    });
  } catch (error) {
    console.error('List recent Solana transactions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Debug: Check specific transaction by signature
const checkSolanaTransactionBySignature = async (req, res) => {
  try {
    const { signature } = req.params;

    if (!signature) {
      return res.status(400).json({ message: 'Transaction signature is required' });
    }

    const { Connection, PublicKey } = require('@solana/web3.js');
    const SOLANA_DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    const receiverWallet = process.env.SOLANA_RECEIVER_WALLET;

    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.meta?.err) {
      return res.status(400).json({ 
        message: 'Transaction failed', 
        error: transaction.meta.err 
      });
    }

    const accountKeys = transaction.transaction.message.accountKeys;
    let receivedAmount = 0;
    const accountAddresses = [];

    if (transaction.meta.preBalances && transaction.meta.postBalances) {
      for (let i = 0; i < accountKeys.length; i++) {
        const accountKey = accountKeys[i].pubkey.toString();
        accountAddresses.push(accountKey);
        
        if (accountKey === receiverWallet) {
          const preBalance = transaction.meta.preBalances[i];
          const postBalance = transaction.meta.postBalances[i];
          receivedAmount = (postBalance - preBalance) / 1e9;
        }
      }
    }

    res.json({
      signature: signature,
      amount: receivedAmount,
      recipient: receiverWallet,
      blockTime: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
      slot: transaction.slot,
      accountKeys: accountAddresses,
      explorerUrl: `https://solscan.io/tx/${signature}?cluster=devnet`
    });
  } catch (error) {
    console.error('Check Solana transaction by signature error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createDonation,
  getCampaignDonations,
  getTopDonors,
  getAllDonations,
  getMyDonations,
  createPaymentLink,
  handlePayOSWebhook,
  checkPaymentStatus,
  getExchangeRate,
  syncCampaignAmounts,
  createSolanaPayment,
  verifySolanaTransaction,
  checkSolanaPaymentStatus,
  autoVerifySolanaTransaction,
  listRecentSolanaTransactions,
  checkSolanaTransactionBySignature,
  getSOLExchangeRate
};

