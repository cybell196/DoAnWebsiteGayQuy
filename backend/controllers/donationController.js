const pool = require('../config/database');

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
      ORDER BY d.created_at DESC
    `;

    const [donations] = await pool.execute(query, [campaign_id]);

    res.json({ donations });
  } catch (error) {
    console.error('Get donations error:', error);
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
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );

    res.json({ donations });
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createDonation,
  getCampaignDonations,
  getAllDonations,
  getMyDonations
};

