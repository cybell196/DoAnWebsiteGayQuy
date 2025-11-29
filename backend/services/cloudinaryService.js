const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload ảnh lên Cloudinary
 * @param {string} filePath - Đường dẫn file ảnh local
 * @param {object} options - Tùy chọn upload
 * @returns {Promise<object>} - Kết quả upload (url, public_id, etc.)
 */
const uploadImage = async (filePath, options = {}) => {
  const {
    folder = 'campaigns',
    transformation = [
      { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
    ],
    resource_type = 'image'
  } = options;

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      transformation: transformation,
      resource_type: resource_type
    });

    // Xóa file local sau khi upload thành công
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Xóa file local nếu upload fail
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw error;
  }
};

/**
 * Upload ảnh từ buffer (không cần lưu file local)
 * @param {Buffer} buffer - Buffer của ảnh
 * @param {object} options - Tùy chọn upload
 * @returns {Promise<object>} - Kết quả upload
 */
const uploadImageFromBuffer = async (buffer, options = {}) => {
  const {
    folder = 'campaigns',
    transformation = [
      { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
    ],
    resource_type = 'image',
    filename = `image_${Date.now()}`
  } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: transformation,
        resource_type: resource_type,
        public_id: filename
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Xóa ảnh từ Cloudinary
 * @param {string} publicId - Public ID hoặc URL của ảnh
 * @returns {Promise<object>} - Kết quả xóa
 */
const deleteImage = async (publicId) => {
  try {
    // Nếu là URL, extract public_id
    let id = publicId;
    if (publicId.includes('cloudinary.com')) {
      // Extract public_id từ URL
      // Ví dụ: https://res.cloudinary.com/dvtyifujw/image/upload/v1234567890/campaigns/image.jpg
      // → campaigns/image
      const urlParts = publicId.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
        // Lấy phần sau 'upload' và bỏ extension
        const pathParts = urlParts.slice(uploadIndex + 1);
        id = pathParts.join('/').replace(/\.[^/.]+$/, ''); // Bỏ extension
      }
    }

    const result = await cloudinary.uploader.destroy(id);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Xóa nhiều ảnh từ Cloudinary
 * @param {Array<string>} publicIds - Mảng public IDs hoặc URLs
 * @returns {Promise<object>} - Kết quả xóa
 */
const deleteImages = async (publicIds) => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    return { deleted: {} };
  }

  try {
    // Extract public_ids từ URLs nếu cần
    const ids = publicIds.map(id => {
      if (id.includes('cloudinary.com')) {
        const urlParts = id.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
          const pathParts = urlParts.slice(uploadIndex + 1);
          return pathParts.join('/').replace(/\.[^/.]+$/, '');
        }
      }
      return id;
    });

    const result = await cloudinary.api.delete_resources(ids);
    return result;
  } catch (error) {
    console.error('Cloudinary delete multiple error:', error);
    throw error;
  }
};

/**
 * Tạo URL với transformation on-the-fly
 * @param {string} publicId - Public ID hoặc URL
 * @param {object} transformation - Transformation options
 * @returns {string} - URL đã transform
 */
const getTransformedUrl = (publicId, transformation = {}) => {
  const {
    width,
    height,
    crop = 'limit',
    quality = 'auto:good'
  } = transformation;

  // Nếu là URL, extract public_id
  let id = publicId;
  if (publicId.includes('cloudinary.com')) {
    const urlParts = publicId.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
      const pathParts = urlParts.slice(uploadIndex + 1);
      id = pathParts.join('/').replace(/\.[^/.]+$/, '');
    }
  }

  return cloudinary.url(id, {
    transformation: [
      { width, height, crop, quality }
    ]
  });
};

module.exports = {
  uploadImage,
  uploadImageFromBuffer,
  deleteImage,
  deleteImages,
  getTransformedUrl
};

