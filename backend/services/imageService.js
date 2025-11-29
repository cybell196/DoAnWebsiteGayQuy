const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Optimize và resize ảnh
 * @param {string} inputPath - Đường dẫn file ảnh gốc
 * @param {string} outputPath - Đường dẫn file ảnh đã optimize
 * @param {object} options - Tùy chọn resize và quality
 * @returns {Promise<string>} - Đường dẫn file đã optimize
 */
const optimizeImage = async (inputPath, outputPath, options = {}) => {
  const {
    width = 1920,
    height = 1080,
    quality = 85
  } = options;

  try {
    // Đảm bảo thư mục output tồn tại
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Resize và optimize ảnh
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality,
        mozjpeg: true // Tối ưu JPEG
      })
      .toFile(outputPath);

    // Xóa file gốc sau khi optimize
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
    return outputPath;
  } catch (error) {
    console.error('Image optimization error:', error);
    // Nếu optimize lỗi, giữ nguyên file gốc
    if (fs.existsSync(inputPath) && !fs.existsSync(outputPath)) {
      // Copy file gốc làm output nếu optimize fail
      fs.copyFileSync(inputPath, outputPath);
      fs.unlinkSync(inputPath);
    }
    throw error;
  }
};

/**
 * Xóa file ảnh
 * @param {string} imagePath - Đường dẫn file ảnh (có thể là relative hoặc absolute)
 */
const deleteImage = (imagePath) => {
  try {
    if (!imagePath) return;

    let fullPath;
    
    // Nếu là đường dẫn relative từ /uploads/
    if (imagePath.startsWith('/uploads/')) {
      fullPath = path.join(process.cwd(), imagePath);
    } 
    // Nếu là đường dẫn absolute
    else if (path.isAbsolute(imagePath)) {
      fullPath = imagePath;
    }
    // Nếu là filename trong uploads
    else {
      fullPath = path.join(process.cwd(), 'uploads', imagePath);
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('Deleted image:', fullPath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

/**
 * Xóa nhiều file ảnh
 * @param {Array<string>} imagePaths - Mảng các đường dẫn file ảnh
 */
const deleteImages = (imagePaths) => {
  if (!Array.isArray(imagePaths)) return;
  
  imagePaths.forEach(imagePath => {
    if (imagePath) {
      deleteImage(imagePath);
    }
  });
};

/**
 * Xóa ảnh từ URL (extract path từ URL)
 * @param {string} imageUrl - URL của ảnh
 */
const deleteImageFromUrl = (imageUrl) => {
  if (!imageUrl) return;
  
  try {
    // Extract path từ URL
    // Ví dụ: http://localhost:5000/uploads/image.jpg -> /uploads/image.jpg
    const url = new URL(imageUrl);
    const imagePath = url.pathname;
    deleteImage(imagePath);
  } catch (error) {
    // Nếu không phải URL hợp lệ, thử xóa như path
    deleteImage(imageUrl);
  }
};

module.exports = {
  optimizeImage,
  deleteImage,
  deleteImages,
  deleteImageFromUrl
};

