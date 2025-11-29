/**
 * Get image URL - handle both local and Cloudinary URLs
 * @param {string} imagePath - Image path (can be relative or full URL)
 * @returns {string} - Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If already a full URL (http/https), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If relative path, add localhost:5000
  return `http://localhost:5000${imagePath}`;
};

