const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getMyCampaigns,
  updateCampaignStatus,
  endCampaign
} = require('../controllers/campaignController');
const { authenticate, isAdmin, optionalAuth } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Public routes with optional auth (to check user role)
router.get('/', optionalAuth, getAllCampaigns);

// Protected routes
router.get('/my-campaigns', authenticate, getMyCampaigns);
router.post('/', authenticate, upload.single('thumbnail'), createCampaign);

// Public route with optional auth (must be after /my-campaigns)
router.get('/:id', optionalAuth, getCampaignById);

// Protected routes
router.put('/:id', authenticate, upload.single('thumbnail'), updateCampaign);
router.delete('/:id', authenticate, deleteCampaign);
router.post('/:id/end', authenticate, endCampaign);

// Admin routes
router.patch('/:id/status', authenticate, isAdmin, updateCampaignStatus);

module.exports = router;

