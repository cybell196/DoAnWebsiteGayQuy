const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { encodeURL } = require('@solana/pay');
const BigNumber = require('bignumber.js');
const QRCode = require('qrcode');
const axios = require('axios');
const sharp = require('sharp');

// Solana Devnet connection
const SOLANA_DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');

// Receiver wallet address (có thể config trong .env)
// Lưu ý: Đây là wallet để nhận tiền, nên dùng một wallet cố định
const RECEIVER_WALLET = process.env.SOLANA_RECEIVER_WALLET || null;

/**
 * Lấy tỷ giá SOL/USD từ Binance API
 * @returns {Promise<number>} Tỷ giá SOL/USD (1 SOL = ? USD)
 */
const getSOLToUSDRate = async () => {
  try {
    const response = await axios.get(
      'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
      {
        timeout: 5000
      }
    );
    
    if (response.data && response.data.price) {
      const rate = parseFloat(response.data.price);
      return rate;
    }
  } catch (error) {
    console.warn('⚠️ Binance API không khả dụng, sử dụng tỷ giá mặc định...', error.message);
  }

  // Fallback: Tỷ giá mặc định (có thể update theo giá thực tế)
  console.warn('⚠️ Sử dụng tỷ giá mặc định: 1 SOL = $150 USD');
  return 150;
};

/**
 * Convert USD to SOL
 * @param {number} usdAmount - Số tiền USD
 * @returns {Promise<{solAmount: number, exchangeRate: number}>}
 */
const convertUSDToSOL = async (usdAmount) => {
  try {
    const solPriceUSD = await getSOLToUSDRate();
    const solAmount = usdAmount / solPriceUSD;
    
    return {
      solAmount,
      exchangeRate: solPriceUSD
    };
  } catch (error) {
    console.error('Error converting USD to SOL:', error);
    // Fallback: 1 SOL = $150
    const fallbackRate = 150;
    return {
      solAmount: usdAmount / fallbackRate,
      exchangeRate: fallbackRate
    };
  }
};

/**
 * Generate Solana payment URL sử dụng @solana/pay encodeURL
 * Theo docs: https://docs.solanapay.com/core/transfer-request
 * Format: solana:<MERCHANT_WALLET>?amount=<AMOUNT>&reference=<REFERENCE>&label=<LABEL>&message=<MESSAGE>
 * 
 * @returns {object} { url, reference } - URL và reference key để lưu vào database
 */
const generateSolanaPaymentURL = (walletAddress, amountSOL, donationId) => {
  try {
    // Validate wallet address
    const recipient = new PublicKey(walletAddress);
    
    // Convert amount to BigNumber (Solana Pay requires BigNumber)
    const amountBN = new BigNumber(amountSOL);
    if (amountBN.isNaN() || amountBN.isLessThanOrEqualTo(0)) {
      throw new Error(`Invalid amount: ${amountSOL}`);
    }
    
    // Generate reference từ donation ID (32 bytes)
    // Reference phải là PublicKey hoặc Uint8Array (32 bytes)
    // Đây là key để backend verify transaction sau này
    const crypto = require('crypto');
    const referenceBuffer = crypto.createHash('sha256')
      .update(`donation_${donationId}_${Date.now()}`)
      .digest()
      .slice(0, 32); // 32 bytes
    
    // Tạo PublicKey từ reference buffer
    const reference = new PublicKey(referenceBuffer);
    
    // Encode URL sử dụng @solana/pay - tự động format đúng chuẩn Solana Pay
    const url = encodeURL({
      recipient,
      amount: amountBN,
      reference: [reference], // Array of references (Solana Pay spec)
      label: `Donation #${donationId}`,
      message: 'Thank you for your donation!'
    });
    
    // Return cả URL và reference để lưu vào database
    return {
      url,
      reference: reference.toBase58() // Lưu dạng string vào database
    };
  } catch (error) {
    console.error('Error generating Solana payment URL:', error);
    throw error;
  }
};

/**
 * Generate QR code từ Solana Pay URL với logo Solana
 * createQR từ @solana/pay chỉ hoạt động trong browser, nên dùng qrcode + sharp
 */
const generateQRCode = async (paymentURL) => {
  try {
    // Generate QR code as buffer với error correction cao để có thể embed logo
    const qrCodeBuffer = await QRCode.toBuffer(paymentURL.toString(), {
      errorCorrectionLevel: 'H', // High error correction (30%) - cần thiết khi có logo
      type: 'image/png',
      margin: 4,
      width: 512,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Tạo logo Solana (SVG) - 3 bars như trong ảnh mẫu
    const solanaLogoSVG = `
      <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="white" rx="4"/>
        <g transform="translate(20, 20)">
          <!-- Top bar -->
          <rect x="0" y="0" width="40" height="8" fill="#000000" rx="2"/>
          <!-- Middle bar (shorter, offset right) -->
          <rect x="8" y="16" width="32" height="8" fill="#000000" rx="2"/>
          <!-- Bottom bar -->
          <rect x="0" y="32" width="40" height="8" fill="#000000" rx="2"/>
        </g>
      </svg>
    `;
    
    // Convert SVG to buffer
    const logoBuffer = Buffer.from(solanaLogoSVG);
    
    // Composite logo vào center của QR code
    const qrCodeWithLogo = await sharp(qrCodeBuffer)
      .composite([
        {
          input: logoBuffer,
          top: Math.floor((512 - 80) / 2), // Center vertically
          left: Math.floor((512 - 80) / 2) // Center horizontally
        }
      ])
      .png()
      .toBuffer();
    
    // Convert buffer to data URL
    const qrCodeDataURL = `data:image/png;base64,${qrCodeWithLogo.toString('base64')}`;
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback: QR code không có logo
    try {
      const urlString = typeof paymentURL === 'string' ? paymentURL : paymentURL.toString();
      const qrCodeDataURL = await QRCode.toDataURL(urlString, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 4,
        width: 512,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (fallbackError) {
      throw error;
    }
  }
};

/**
 * Verify Solana transaction by signature
 * @param {string} signature - Transaction signature
 * @param {string} expectedAmount - Expected SOL amount
 * @param {string} expectedRecipient - Expected recipient wallet
 * @param {string} expectedReference - Expected reference key (optional)
 * @returns {Promise<object>} - Transaction details
 */
const verifyTransaction = async (signature, expectedAmount, expectedRecipient, expectedReference = null) => {
  try {
    // Get transaction details from Solana
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return {
        valid: false,
        error: 'Transaction not found'
      };
    }

    // Check if transaction is confirmed
    if (!transaction.meta || transaction.meta.err) {
      return {
        valid: false,
        error: 'Transaction failed',
        details: transaction.meta?.err
      };
    }

    // Verify reference key nếu có
    if (expectedReference) {
      const referencePubkey = new PublicKey(expectedReference);
      const accountKeys = transaction.transaction.message.accountKeys;
      let referenceFound = false;
      
      for (const accountKey of accountKeys) {
        if (accountKey.pubkey.equals(referencePubkey)) {
          referenceFound = true;
          break;
        }
      }
      
      if (!referenceFound) {
        return {
          valid: false,
          error: 'Reference key not found in transaction'
        };
      }
    }

    // Verify recipient and amount
    const recipientPubkey = new PublicKey(expectedRecipient);
    let receivedAmount = 0;

    // Check pre/post balances for SOL transfer
    if (transaction.meta.preBalances && transaction.meta.postBalances) {
      // Find the recipient's balance change
      const accountKeys = transaction.transaction.message.accountKeys;
      for (let i = 0; i < accountKeys.length; i++) {
        const accountKey = accountKeys[i].pubkey;
        if (accountKey.equals(recipientPubkey)) {
          const preBalance = transaction.meta.preBalances[i];
          const postBalance = transaction.meta.postBalances[i];
          receivedAmount = (postBalance - preBalance) / 1e9; // Convert lamports to SOL
          break;
        }
      }
    }

    // Verify amount (with small tolerance for fees)
    const expectedAmountNum = parseFloat(expectedAmount);
    const tolerance = 0.001; // 0.001 SOL tolerance
    const amountValid = Math.abs(receivedAmount - expectedAmountNum) <= tolerance;

    if (!amountValid) {
      return {
        valid: false,
        error: 'Amount mismatch',
        expected: expectedAmountNum,
        received: receivedAmount
      };
    }

    return {
      valid: true,
      signature: signature,
      amount: receivedAmount,
      recipient: expectedRecipient,
      reference: expectedReference,
      blockTime: transaction.blockTime,
      slot: transaction.slot
    };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Find transaction by reference key (Solana Pay verification)
 * Backend tự động quét blockchain để tìm transaction có reference key
 * Fallback: Nếu không tìm thấy bằng reference, tìm bằng amount match
 * @param {string} referenceKey - Reference PublicKey (base58 string)
 * @param {string} expectedRecipient - Expected recipient wallet
 * @param {number} expectedAmount - Expected SOL amount
 * @returns {Promise<object>} - Transaction details or null
 */
const findTransactionByReference = async (referenceKey, expectedRecipient, expectedAmount, minBlockTime = null, excludeSignatures = []) => {
  // CHỈ match transaction có reference key đúng - không dùng fallback match by amount
  try {
    const referencePubkey = new PublicKey(referenceKey);
    const recipientPubkey = new PublicKey(expectedRecipient);
    
    // Get recent signatures for the recipient wallet
    // Tăng limit để check nhiều transactions hơn
    const signatures = await connection.getSignaturesForAddress(recipientPubkey, {
      limit: 100 // Check last 100 transactions
    });
    
    // Chỉ log khi debug mode hoặc khi tìm thấy
    // Tránh spam logs khi polling
    
    const expectedAmountNum = parseFloat(expectedAmount);
    const tolerance = 0.001; // 0.001 SOL tolerance
    
    // Strategy 1: Tìm transaction có reference key
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
        
        // Check if reference key is in the transaction
        let hasReference = false;
        for (let i = 0; i < accountKeys.length; i++) {
          // Handle both formats: {pubkey: PublicKey} or PublicKey directly
          let accountPubkey;
          if (accountKeys[i].pubkey) {
            accountPubkey = accountKeys[i].pubkey;
          } else {
            accountPubkey = accountKeys[i];
          }
          
          // Check by equals method
          if (accountPubkey.equals && accountPubkey.equals(referencePubkey)) {
            hasReference = true;
            break;
          }
          
          // Fallback: check by string comparison
          const accountAddress = accountPubkey.toString ? accountPubkey.toString() : String(accountPubkey);
          if (accountAddress === referenceKey) {
            hasReference = true;
            break;
          }
        }
        
        if (hasReference) {
          // Verify amount
          let receivedAmount = 0;
          if (transaction.meta.preBalances && transaction.meta.postBalances) {
            for (let i = 0; i < accountKeys.length; i++) {
              // Handle both formats: {pubkey: PublicKey} or PublicKey directly
              let accountPubkey;
              if (accountKeys[i].pubkey) {
                accountPubkey = accountKeys[i].pubkey;
              } else {
                accountPubkey = accountKeys[i];
              }
              
              // Check by equals method
              if (accountPubkey.equals && accountPubkey.equals(recipientPubkey)) {
                const preBalance = transaction.meta.preBalances[i];
                const postBalance = transaction.meta.postBalances[i];
                receivedAmount = (postBalance - preBalance) / 1e9;
                break;
              }
              
              // Fallback: check by string comparison
              const accountAddress = accountPubkey.toString ? accountPubkey.toString() : String(accountPubkey);
              if (accountAddress === expectedRecipient) {
                const preBalance = transaction.meta.preBalances[i];
                const postBalance = transaction.meta.postBalances[i];
                receivedAmount = (postBalance - preBalance) / 1e9;
                break;
              }
            }
          }
          
          // Check if transaction đã được dùng cho donation khác
          if (excludeSignatures.includes(sigInfo.signature)) {
            continue; // Skip transaction đã được verify cho donation khác
          }
          
          if (Math.abs(receivedAmount - expectedAmountNum) <= tolerance) {
            return {
              valid: true,
              signature: sigInfo.signature,
              amount: receivedAmount,
              recipient: expectedRecipient,
              reference: referenceKey,
              blockTime: transaction.blockTime,
              slot: transaction.slot
            };
            }
        }
      } catch (txError) {
        // Skip failed transactions
        continue;
      }
    }
    
    // Strategy 2 đã bị loại bỏ - chỉ match bằng reference key để đảm bảo chính xác
    
    // Không tìm thấy transaction với reference key đúng
    // Không log "not found" để tránh spam logs khi polling
    return {
      valid: false,
      error: 'Transaction not found. Please ensure the transaction includes the correct reference key and was sent to the correct address.'
    };
  } catch (error) {
    console.error('Error finding transaction by reference:', error);
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Create Solana payment request
 * @param {number} usdAmount - Amount in USD
 * @param {number} donationId - Donation ID for reference
 * @returns {Promise<object>} - Payment details with QR code
 */
const createSolanaPaymentRequest = async (usdAmount, donationId) => {
  try {
    // Get receiver wallet (should be configured in .env)
    if (!RECEIVER_WALLET) {
      throw new Error('SOLANA_RECEIVER_WALLET not configured');
    }

    // Convert USD to SOL
    const { solAmount, exchangeRate } = await convertUSDToSOL(usdAmount);

    // Validate SOL amount (phải >= 0.000000001 SOL - minimum)
    if (solAmount < 0.000000001) {
      throw new Error(`Amount too small: ${solAmount} SOL (minimum: 0.000000001 SOL)`);
    }

    // Generate payment URL (returns { url, reference })
    const { url: paymentURL, reference } = generateSolanaPaymentURL(RECEIVER_WALLET, solAmount, donationId);

    // Generate QR code
    const qrCodeDataURL = await generateQRCode(paymentURL);

    return {
      paymentURL,
      qrCode: qrCodeDataURL,
      amountSOL: solAmount,
      amountUSD: usdAmount,
      exchangeRate: exchangeRate, // SOL/USD rate
      recipient: RECEIVER_WALLET,
      reference, // Reference key để lưu vào database
      donationId
    };
  } catch (error) {
    console.error('Error creating Solana payment:', error);
    throw error;
  }
};

/**
 * Poll for transaction (check if user has paid)
 * @param {string} donationId - Donation ID
 * @param {number} maxAttempts - Maximum polling attempts
 * @param {number} intervalMs - Polling interval in milliseconds
 */
const pollForTransaction = async (donationId, expectedAmount, expectedRecipient, maxAttempts = 30, intervalMs = 3000) => {
  // This would be called by a background job or endpoint
  // For now, return a function that can be called
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      
      try {
        // Get donation to check for tx_hash
        // This should be implemented in the controller
        // For now, just return a structure
        
        if (attempts >= maxAttempts) {
          resolve({
            found: false,
            error: 'Transaction not found after maximum attempts'
          });
          return;
        }

        // Wait before next attempt
        setTimeout(poll, intervalMs);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
};

module.exports = {
  createSolanaPayment: createSolanaPaymentRequest,
  verifyTransaction,
  findTransactionByReference,
  generateQRCode,
  convertUSDToSOL,
  getSOLToUSDRate,
  pollForTransaction,
  connection
};

