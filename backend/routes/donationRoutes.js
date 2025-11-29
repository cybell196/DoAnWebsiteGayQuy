const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/donationController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Legacy endpoint (giữ lại để tương thích)
router.post('/', authenticate, createDonation);

// PayOS endpoints
router.post('/create-payment', authenticate, createPaymentLink);
router.post('/webhook', handlePayOSWebhook); // Không cần authenticate vì PayOS gọi từ bên ngoài
router.get('/check-status/:donation_id', authenticate, checkPaymentStatus);
router.get('/exchange-rate', getExchangeRate); // Public endpoint - USD/VND
router.get('/sol-exchange-rate', getSOLExchangeRate); // Public endpoint - SOL/USD

// Solana endpoints
router.post('/create-solana-payment', authenticate, createSolanaPayment);
router.post('/verify-solana-transaction', authenticate, verifySolanaTransaction);
router.get('/check-solana-status/:donation_id', authenticate, checkSolanaPaymentStatus);
router.post('/auto-verify-solana/:donation_id', authenticate, autoVerifySolanaTransaction); // Backend tự động verify bằng reference key

// Debug endpoints (admin only)
router.get('/debug/solana/transactions', authenticate, isAdmin, listRecentSolanaTransactions); // List recent transactions
router.get('/debug/solana/transaction/:signature', authenticate, isAdmin, checkSolanaTransactionBySignature); // Check specific transaction

// Other endpoints
router.get('/campaign/:campaign_id', getCampaignDonations);
router.get('/campaign/:campaign_id/top-donors', getTopDonors);
router.get('/all', authenticate, isAdmin, getAllDonations);
router.get('/my-donations', authenticate, getMyDonations);

// Sync endpoint (admin only)
router.post('/sync-campaign-amounts', authenticate, isAdmin, syncCampaignAmounts);

module.exports = router;

