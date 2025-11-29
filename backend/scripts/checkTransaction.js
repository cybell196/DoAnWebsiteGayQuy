/**
 * Script để check transaction signature với reference keys trong database
 * Usage: node backend/scripts/checkTransaction.js <signature>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Connection, PublicKey } = require('@solana/web3.js');
const mysql = require('mysql2/promise');

const SIGNATURE = process.argv[2];

if (!SIGNATURE) {
  console.error('❌ Vui lòng cung cấp transaction signature');
  console.log('Usage: node backend/scripts/checkTransaction.js <signature>');
  process.exit(1);
}

async function checkTransaction() {
  try {
    // Database connection
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fundraise_app',
      port: process.env.DB_PORT || 3306
    });

    // Solana connection
    const SOLANA_DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    const receiverWallet = process.env.SOLANA_RECEIVER_WALLET;

    if (!receiverWallet) {
      console.error('❌ SOLANA_RECEIVER_WALLET not configured');
      process.exit(1);
    }

    console.log('🔍 Checking transaction:', SIGNATURE);
    console.log('   RPC URL:', SOLANA_DEVNET_RPC);
    console.log('   Receiver Wallet:', receiverWallet);
    console.log('');

    // Get transaction from Solana
    const transaction = await connection.getTransaction(SIGNATURE, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      console.error('❌ Transaction not found on Solana');
      process.exit(1);
    }

    if (transaction.meta?.err) {
      console.error('❌ Transaction failed:', transaction.meta.err);
      process.exit(1);
    }

    console.log('✅ Transaction found on Solana');
    console.log('   Block Time:', transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : 'N/A');
    console.log('   Slot:', transaction.slot);
    console.log('');

    // Get account keys
    const accountKeys = transaction.transaction.message.accountKeys;
    const accountAddresses = accountKeys.map(ak => {
      // Handle both formats: {pubkey: PublicKey} or PublicKey directly
      if (ak.pubkey) {
        return ak.pubkey.toString();
      } else if (ak.toString) {
        return ak.toString();
      } else {
        return String(ak);
      }
    });
    
    console.log('📋 Account Keys in transaction:');
    accountAddresses.forEach((addr, idx) => {
      console.log(`   ${idx + 1}. ${addr}`);
    });
    console.log('');

    // Check amount
    const recipientPubkey = new PublicKey(receiverWallet);
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
        
        if (accountPubkey.equals && accountPubkey.equals(recipientPubkey)) {
          const preBalance = transaction.meta.preBalances[i];
          const postBalance = transaction.meta.postBalances[i];
          receivedAmount = (postBalance - preBalance) / 1e9;
          break;
        } else if (accountAddresses[i] === receiverWallet) {
          // Fallback: compare by string
          const preBalance = transaction.meta.preBalances[i];
          const postBalance = transaction.meta.postBalances[i];
          receivedAmount = (postBalance - preBalance) / 1e9;
          break;
        }
      }
    }

    console.log('💰 Amount received:', receivedAmount, 'SOL');
    console.log('');

    // Get all pending donations with reference keys
    const [donations] = await pool.execute(
      `SELECT d.id, d.amount, d.payment_status, t.reference, t.exchange_rate, t.amount as transaction_amount
       FROM donations d
       LEFT JOIN transactions t ON d.id = t.donation_id
       WHERE d.payment_status = 'PENDING' AND t.reference IS NOT NULL
       ORDER BY d.created_at DESC`
    );

    console.log(`🔍 Checking against ${donations.length} pending donations...`);
    console.log('');

    let foundMatch = false;

    for (const donation of donations) {
      const referenceKey = donation.reference;
      const expectedAmountSOL = parseFloat(donation.transaction_amount) / parseFloat(donation.exchange_rate);
      
      // Check if reference key is in transaction
      let hasReference = false;
      try {
        const referencePubkey = new PublicKey(referenceKey);
        for (let i = 0; i < accountKeys.length; i++) {
          // Handle both formats: {pubkey: PublicKey} or PublicKey directly
          let accountPubkey;
          if (accountKeys[i].pubkey) {
            accountPubkey = accountKeys[i].pubkey;
          } else {
            accountPubkey = accountKeys[i];
          }
          
          if (accountPubkey.equals && accountPubkey.equals(referencePubkey)) {
            hasReference = true;
            break;
          } else if (accountAddresses[i] === referenceKey) {
            // Fallback: compare by string
            hasReference = true;
            break;
          }
        }
      } catch (error) {
        // Invalid reference key format
        continue;
      }

      // Check amount match
      const amountDiff = Math.abs(receivedAmount - expectedAmountSOL);
      const tolerance = 0.001;
      const amountMatch = amountDiff <= tolerance;

      console.log(`Donation ID: ${donation.id}`);
      console.log(`   Reference Key: ${referenceKey}`);
      console.log(`   Expected Amount: ${expectedAmountSOL} SOL (${donation.transaction_amount} USD)`);
      console.log(`   Received Amount: ${receivedAmount} SOL`);
      console.log(`   Amount Diff: ${amountDiff} SOL`);
      console.log(`   Reference Found: ${hasReference ? '✅ YES' : '❌ NO'}`);
      console.log(`   Amount Match: ${amountMatch ? '✅ YES' : '❌ NO'}`);

      if (hasReference && amountMatch) {
        console.log(`   🎉 PERFECT MATCH! (Reference + Amount)`);
        foundMatch = true;
      } else if (amountMatch && !hasReference) {
        console.log(`   ⚠️ PARTIAL MATCH (Amount only, no reference)`);
        foundMatch = true;
      } else if (hasReference && !amountMatch) {
        console.log(`   ⚠️ Reference found but amount mismatch`);
      } else {
        console.log(`   ❌ No match`);
      }
      console.log('');
    }

    if (!foundMatch) {
      console.log('❌ No matching donation found for this transaction');
      console.log('');
      console.log('💡 Suggestions:');
      console.log('   1. Check if amount matches any pending donation');
      console.log('   2. Check if transaction is recent (within 30 minutes)');
      console.log('   3. Verify recipient wallet is correct');
    }

    // Explorer link
    console.log('');
    console.log('🔗 View on Solscan:');
    console.log(`   https://solscan.io/tx/${SIGNATURE}?cluster=devnet`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkTransaction();

