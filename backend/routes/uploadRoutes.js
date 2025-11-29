const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { uploadImage } = require('../services/cloudinaryService');

// Error handler middleware for Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File quá lớn. Kích thước tối đa là 10MB. Vui lòng chọn ảnh nhỏ hơn hoặc nén ảnh trước khi upload.' 
      });
    }
    return res.status(400).json({ 
      message: `Upload error: ${err.message}` 
    });
  }
  if (err) {
    return res.status(400).json({ 
      message: err.message || 'Upload error' 
    });
  }
  next();
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/content-images';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (tăng từ 5MB)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Upload image for rich text editor (chỉ lưu tạm local, chưa upload Cloudinary)
router.post('/image', authenticate, upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Chỉ lưu tạm local, trả về URL local
    // Sẽ upload lên Cloudinary khi tạo campaign
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const imageUrl = `${baseUrl}/uploads/content-images/${req.file.filename}`;

    res.json({ 
      imageUrl: imageUrl,
      message: 'Image uploaded successfully (temporary)' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Cleanup: xóa file local nếu có lỗi
    if (req.file && req.file.path) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

module.exports = router;

