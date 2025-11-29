const pool = require('../config/database');
const { uploadImage } = require('../services/cloudinaryService');
const fs = require('fs');
const path = require('path');

/**
 * Script để migrate tất cả ảnh local lên Cloudinary
 * - Campaign thumbnails
 * - Campaign content images
 * - Content HTML images
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Upload file local lên Cloudinary
 */
const uploadLocalFile = async (filePath, folder) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return null;
    }

    const uploadResult = await uploadImage(filePath, {
      folder: folder,
      transformation: [
        { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
      ]
    });

    return uploadResult.url;
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Migrate campaign thumbnails
 */
const migrateThumbnails = async () => {
  console.log('\n📸 Migrating campaign thumbnails...');
  
  try {
    // Lấy tất cả campaigns có thumbnail là local path
    const [campaigns] = await pool.execute(
      `SELECT id, title, thumbnail 
       FROM campaigns 
       WHERE thumbnail IS NOT NULL 
         AND thumbnail NOT LIKE 'https://%' 
         AND thumbnail NOT LIKE 'http://%'`
    );

    console.log(`Found ${campaigns.length} campaigns with local thumbnails`);

    let success = 0;
    let failed = 0;

    for (const campaign of campaigns) {
      try {
        // Extract file path
        let filePath = campaign.thumbnail;
        if (filePath.startsWith('/uploads/')) {
          filePath = path.join(process.cwd(), filePath);
        } else if (!path.isAbsolute(filePath)) {
          filePath = path.join(process.cwd(), 'uploads', filePath);
        }

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadLocalFile(filePath, 'campaigns/thumbnails');
        
        if (cloudinaryUrl) {
          // Update database
          await pool.execute(
            'UPDATE campaigns SET thumbnail = ? WHERE id = ?',
            [cloudinaryUrl, campaign.id]
          );
          console.log(`✅ Migrated thumbnail for campaign "${campaign.title}" (ID: ${campaign.id})`);
          success++;
        } else {
          console.error(`❌ Failed to migrate thumbnail for campaign "${campaign.title}" (ID: ${campaign.id})`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error migrating thumbnail for campaign ${campaign.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Thumbnails: ${success} success, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('Error migrating thumbnails:', error);
    throw error;
  }
};

/**
 * Migrate campaign_images
 */
const migrateCampaignImages = async () => {
  console.log('\n🖼️  Migrating campaign content images...');
  
  try {
    // Lấy tất cả campaign_images có image_url là local path
    const [images] = await pool.execute(
      `SELECT id, campaign_id, image_url 
       FROM campaign_images 
       WHERE image_url IS NOT NULL 
         AND image_url NOT LIKE 'https://%' 
         AND image_url NOT LIKE 'http://%'`
    );

    console.log(`Found ${images.length} campaign images with local URLs`);

    let success = 0;
    let failed = 0;

    for (const image of images) {
      try {
        // Extract file path
        let filePath = image.image_url;
        if (filePath.startsWith('/uploads/')) {
          filePath = path.join(process.cwd(), filePath);
        } else if (filePath.startsWith('http://localhost:5000')) {
          filePath = filePath.replace(BASE_URL, '');
          filePath = path.join(process.cwd(), filePath);
        } else if (!path.isAbsolute(filePath)) {
          filePath = path.join(process.cwd(), 'uploads', 'content-images', path.basename(filePath));
        }

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadLocalFile(filePath, 'campaigns/content-images');
        
        if (cloudinaryUrl) {
          // Update database
          await pool.execute(
            'UPDATE campaign_images SET image_url = ? WHERE id = ?',
            [cloudinaryUrl, image.id]
          );
          console.log(`✅ Migrated image ID ${image.id} (Campaign: ${image.campaign_id})`);
          success++;
        } else {
          console.error(`❌ Failed to migrate image ID ${image.id}`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error migrating image ${image.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Campaign Images: ${success} success, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('Error migrating campaign images:', error);
    throw error;
  }
};

/**
 * Migrate images trong HTML content
 */
const migrateContentImages = async () => {
  console.log('\n📝 Migrating images in HTML content...');
  
  try {
    // Lấy tất cả campaign_contents
    const [contents] = await pool.execute(
      'SELECT id, campaign_id, content FROM campaign_contents WHERE content IS NOT NULL'
    );

    console.log(`Found ${contents.length} campaign contents to check`);

    let success = 0;
    let failed = 0;
    let updated = 0;

    for (const content of contents) {
      try {
        let htmlContent = content.content;
        let hasChanges = false;

        // Tìm tất cả img tags với local URLs
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        const matches = [...htmlContent.matchAll(imgRegex)];

        for (const match of matches) {
          const imageUrl = match[1];
          
          // Skip nếu đã là Cloudinary URL hoặc external URL
          if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) {
            if (imageUrl.includes('cloudinary.com')) {
              continue; // Đã là Cloudinary URL
            }
            // Có thể là localhost URL, cần extract path
          }

          // Extract file path
          let filePath = imageUrl;
          if (filePath.startsWith('http://localhost:5000')) {
            filePath = filePath.replace(BASE_URL, '');
          }
          if (filePath.startsWith('/uploads/')) {
            filePath = path.join(process.cwd(), filePath);
          } else if (!path.isAbsolute(filePath)) {
            // Thử tìm trong content-images folder
            filePath = path.join(process.cwd(), 'uploads', 'content-images', path.basename(filePath));
          }

          // Upload to Cloudinary
          const cloudinaryUrl = await uploadLocalFile(filePath, 'campaigns/content-images');
          
          if (cloudinaryUrl) {
            // Replace URL trong HTML
            htmlContent = htmlContent.replace(imageUrl, cloudinaryUrl);
            hasChanges = true;
            console.log(`  ✅ Migrated image in content (Campaign: ${content.campaign_id})`);
          } else {
            console.warn(`  ⚠️  Could not migrate image: ${imageUrl}`);
          }
        }

        // Update database nếu có thay đổi
        if (hasChanges) {
          await pool.execute(
            'UPDATE campaign_contents SET content = ? WHERE id = ?',
            [htmlContent, content.id]
          );
          updated++;
          success++;
        }
      } catch (error) {
        console.error(`❌ Error migrating content ${content.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Content Images: ${updated} contents updated, ${success} success, ${failed} failed`);
    return { success, failed, updated };
  } catch (error) {
    console.error('Error migrating content images:', error);
    throw error;
  }
};

/**
 * Main migration function
 */
const migrateAllImages = async () => {
  console.log('🚀 Starting image migration to Cloudinary...\n');
  console.log('⚠️  This will upload all local images to Cloudinary and update the database.');
  console.log('⚠️  Local files will be deleted after successful upload.\n');

  try {
    const results = {
      thumbnails: { success: 0, failed: 0 },
      campaignImages: { success: 0, failed: 0 },
      contentImages: { success: 0, failed: 0, updated: 0 }
    };

    // Migrate thumbnails
    results.thumbnails = await migrateThumbnails();

    // Migrate campaign_images
    results.campaignImages = await migrateCampaignImages();

    // Migrate content images
    results.contentImages = await migrateContentImages();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Thumbnails:        ${results.thumbnails.success} success, ${results.thumbnails.failed} failed`);
    console.log(`Campaign Images:   ${results.campaignImages.success} success, ${results.campaignImages.failed} failed`);
    console.log(`Content Images:    ${results.contentImages.updated} contents updated, ${results.contentImages.success} success, ${results.contentImages.failed} failed`);
    console.log('='.repeat(50));
    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateAllImages()
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Migration error:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateAllImages,
  migrateThumbnails,
  migrateCampaignImages,
  migrateContentImages
};

