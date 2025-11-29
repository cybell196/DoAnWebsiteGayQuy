/**
 * Script để verify donation bằng donation ID
 * Usage: node backend/scripts/verifyDonation.js <donation_id>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const { findTransactionByReference } = require('../services/solanaService');

const DONATION_ID = parseInt(process.argv[2]);

if (!DONATION_ID || isNaN(DONATION_ID)) {
  console.error('❌ Vui lòng cung cấp donation ID');
  console.log('Usage: node backend/scripts/verifyDonation.js <donation_id>');
  process.exit(1);
}

async function verifyDonation() {
  try {
    // Database connection
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fundraise_app',
      port: process.env.DB_PORT || 3306
    });

    const receiverWallet = process.env.SOLANA_RECEIVER_WALLET;

    if (!receiverWallet) {
      console.error('❌ SOLANA_RECEIVER_WALLET not configured');
      process.exit(1);
    }

    console.log(`🔍 Verifying donation ID: ${DONATION_ID}`);
    console.log('');

    // Get donation with reference key
    const [donations] = await pool.execute(
      `SELECT d.*, t.id as transaction_id, t.reference, t.amount as transaction_amount, t.exchange_rate
       FROM donations d
       LEFT JOIN transactions t ON d.id = t.donation_id
       WHERE d.id = ?`,
      [DONATION_ID]
    );

    if (donations.length === 0) {
      console.error('❌ Donation not found');
      process.exit(1);
    }

    const donation = donations[0];

    console.log('📋 Donation Info:');
    console.log(`   ID: ${donation.id}`);
    console.log(`   Campaign ID: ${donation.campaign_id}`);
    console.log(`   Amount: ${donation.amount} USD`);
    console.log(`   Payment Status: ${donation.payment_status}`);
    console.log(`   Reference Key: ${donation.reference || 'N/A'}`);
    console.log(`   Exchange Rate: ${donation.exchange_rate || 'N/A'}`);
    console.log('');

    if (donation.payment_status === 'SUCCESS') {
      console.log('⚠️ Donation already verified');
      process.exit(0);
    }

    if (!donation.reference) {
      console.error('❌ Reference key not found for this donation');
      process.exit(1);
    }

    // Convert USD amount to SOL
    const solAmount = parseFloat(donation.transaction_amount) / parseFloat(donation.exchange_rate);

    console.log('🔍 Searching for transaction...');
    console.log(`   Reference Key: ${donation.reference}`);
    console.log(`   Expected Amount: ${solAmount} SOL`);
    console.log(`   Recipient: ${receiverWallet}`);
    console.log('');

    // Find transaction by reference
    const verification = await findTransactionByReference(
      donation.reference,
      receiverWallet,
      solAmount
    );

    console.log('');
    console.log('📊 Verification Result:');
    console.log(`   Valid: ${verification.valid ? '✅ YES' : '❌ NO'}`);
    
    if (verification.valid) {
      console.log(`   Signature: ${verification.signature}`);
      console.log(`   Amount: ${verification.amount} SOL`);
      console.log(`   Block Time: ${verification.blockTime ? new Date(verification.blockTime * 1000).toISOString() : 'N/A'}`);
      console.log(`   Matched By Amount Only: ${verification.matchedByAmount ? '⚠️ YES' : '✅ NO (Reference found)'}`);
      console.log('');

      // Update donation status to SUCCESS
      await pool.execute(
        'UPDATE donations SET payment_status = "SUCCESS" WHERE id = ?',
        [DONATION_ID]
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

      console.log('✅ Donation verified and updated successfully!');
      console.log(`   Donation ID: ${DONATION_ID}`);
      console.log(`   Transaction Hash: ${verification.signature}`);
      console.log(`   Campaign ID: ${donation.campaign_id}`);
      console.log('');
      console.log('🔗 View transaction on Solscan:');
      console.log(`   https://solscan.io/tx/${verification.signature}?cluster=devnet`);
    } else {
      console.log(`   Error: ${verification.error}`);
      console.log('');
      console.log('❌ Transaction not found. Possible reasons:');
      console.log('   1. Transaction not yet confirmed');
      console.log('   2. Transaction sent to wrong address');
      console.log('   3. Amount mismatch');
      console.log('   4. Transaction too old (>30 minutes)');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyDonation();

