const express = require('express');
const router = express.Router();
const {
  createDonation,
  getCampaignDonations,
  getAllDonations,
  getMyDonations
} = require('../controllers/donationController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.post('/', authenticate, createDonation);
router.get('/campaign/:campaign_id', getCampaignDonations);
router.get('/all', authenticate, isAdmin, getAllDonations);
router.get('/my-donations', authenticate, getMyDonations);

module.exports = router;

