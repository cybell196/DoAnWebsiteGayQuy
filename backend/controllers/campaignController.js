const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const { notifyCampaignStatus, notifyNewCampaign } = require('../services/notificationService');
const { uploadImage, deleteImage, deleteImages } = require('../services/cloudinaryService');
const { checkAndEndExpiredCampaigns } = require('../services/campaignScheduler');

/**
 * Extract local image URLs từ HTML content và upload lên Cloudinary
 * @param {string} htmlContent - HTML content có thể chứa local image URLs
 * @param {string} baseUrl - Base URL của server (để detect local URLs)
 * @returns {Promise<{content: string, uploadedImages: string[]}>} - Content đã được replace và danh sách URLs đã upload
 */
const uploadContentImagesToCloudinary = async (htmlContent, baseUrl = 'http://localhost:5000') => {
  if (!htmlContent) {
    return { content: htmlContent, uploadedImages: [] };
  }

  const uploadedImages = [];
  let updatedContent = htmlContent;

  // Tìm tất cả <img> tags với src là local URL
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [...htmlContent.matchAll(imgRegex)];

  for (const match of matches) {
    const imageUrl = match[1];
    
    // Chỉ xử lý local URLs (không phải Cloudinary URLs)
    if (imageUrl.includes(baseUrl) && !imageUrl.includes('cloudinary.com')) {
      try {
        // Extract file path từ URL
        // Ví dụ: http://localhost:5000/uploads/content-images/123.jpg
        // → uploads/content-images/123.jpg
        const urlPath = new URL(imageUrl).pathname;
        const filePath = path.join(process.cwd(), urlPath);

        // Kiểm tra file có tồn tại không
        if (fs.existsSync(filePath)) {
          // Upload lên Cloudinary
          const uploadResult = await uploadImage(filePath, {
            folder: 'campaigns/content-images',
            transformation: [
              { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
            ]
          });

          const cloudinaryUrl = uploadResult.url;
          uploadedImages.push(cloudinaryUrl);

          // Replace URL trong content
          updatedContent = updatedContent.replace(imageUrl, cloudinaryUrl);
        }
      } catch (error) {
        console.error('Error uploading content image to Cloudinary:', error);
        // Giữ nguyên URL nếu upload fail
      }
    }
  }

  return { content: updatedContent, uploadedImages };
};

// Get all campaigns (approved and active only for non-admin, all for admin)
const getAllCampaigns = async (req, res) => {
  try {
    // Check and auto-end expired campaigns before querying
    // Chạy async, không block request
    checkAndEndExpiredCampaigns().catch(err => {
      console.error('Error checking expired campaigns:', err);
    });

    const { filter } = req.query; // filter: 'all', 'active', 'ended', 'pending', 'rejected'
    
    let query = `
      SELECT c.*, u.fullname as creator_name, u.avatar as creator_avatar
      FROM campaigns c
      JOIN users u ON c.user_id = u.id
    `;

    const params = [];
    const conditions = [];

    // If not admin
    if (req.user?.role !== 'ADMIN') {
      // Non-admin: only show approved or ended campaigns (không cho xem PENDING/REJECTED)
      if (filter === 'ended') {
        // Show ended campaigns
        conditions.push('c.status = "ENDED"');
      } else {
        // Default: only show approved campaigns (active)
        conditions.push('c.status = "APPROVED"');
      }
    } else {
      // Admin: can see all, apply filter if provided
      if (filter === 'active') {
        conditions.push('c.status = "APPROVED" AND c.status != "ENDED"');
      } else if (filter === 'ended') {
        conditions.push('c.status = "ENDED"');
      } else if (filter === 'pending') {
        conditions.push('c.status = "PENDING"');
      } else if (filter === 'rejected') {
        conditions.push('c.status = "REJECTED"');
      }
      // If filter is 'all' or not provided, show all (no conditions)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.created_at DESC';

    const [campaigns] = await pool.execute(query, params);

    // Get content for each campaign (extract h1 and body text separately)
    for (const campaign of campaigns) {
      const [contents] = await pool.execute(
        'SELECT content FROM campaign_contents WHERE campaign_id = ?',
        [campaign.id]
      );
      
      if (contents.length > 0 && contents[0].content) {
        let htmlContent = contents[0].content;
        
        // Extract H1 title first
        const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
        let h1Title = '';
        if (h1Match && h1Match[1]) {
          h1Title = h1Match[1]
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&') // Decode &amp;
            .replace(/&lt;/g, '<') // Decode &lt;
            .replace(/&gt;/g, '>') // Decode &gt;
            .replace(/&quot;/g, '"') // Decode &quot;
            .replace(/&#39;/g, "'") // Decode &#39;
            .trim();
        }
        
        // Remove h1 and blockquote tags for body text extraction
        let filteredContent = htmlContent
          .replace(/<h1[^>]*>.*?<\/h1>/gi, '') // Remove h1 tags
          .replace(/<blockquote[^>]*>.*?<\/blockquote>/gi, '') // Remove blockquote tags
          .replace(/<img[^>]*>/gi, ''); // Remove image tags
        
        // Extract text only from <p> tags (body text blocks)
        const pMatches = filteredContent.match(/<p[^>]*>(.*?)<\/p>/gi);
        let bodyText = '';
        
        if (pMatches && pMatches.length > 0) {
          bodyText = pMatches
            .map(p => {
              // Extract text from <p> tag, decode HTML entities
              return p
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
                .replace(/&amp;/g, '&') // Decode &amp;
                .replace(/&lt;/g, '<') // Decode &lt;
                .replace(/&gt;/g, '>') // Decode &gt;
                .replace(/&quot;/g, '"') // Decode &quot;
                .replace(/&#39;/g, "'") // Decode &#39;
                .replace(/<br\s*\/?>/gi, ' ') // Replace <br> with space
                .trim();
            })
            .filter(text => text.length > 0)
            .join(' ');
        }
        
        // Clean up multiple spaces
        bodyText = bodyText.replace(/\s+/g, ' ').trim();
        
        // Store H1 title and body text separately
        campaign.content_h1 = h1Title || '';
        campaign.content_excerpt = bodyText || '';
      } else {
        campaign.content_h1 = '';
        campaign.content_excerpt = '';
      }
    }

    res.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get campaign by ID
const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check and auto-end expired campaigns before querying
    checkAndEndExpiredCampaigns().catch(err => {
      console.error('Error checking expired campaigns:', err);
    });

    // Get campaign
    const [campaigns] = await pool.execute(
      `SELECT c.*, u.fullname as creator_name, u.avatar as creator_avatar
       FROM campaigns c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Get campaign content
    const [contents] = await pool.execute(
      'SELECT * FROM campaign_contents WHERE campaign_id = ?',
      [id]
    );
    campaign.content = contents[0]?.content || '';

    // Get campaign images
    const [images] = await pool.execute(
      'SELECT * FROM campaign_images WHERE campaign_id = ? ORDER BY created_at ASC',
      [id]
    );
    campaign.images = images;

    // Check if user can view
    // - Admin can view all campaigns
    // - Owner can view their own campaigns (any status)
    // - Others can view APPROVED and ENDED campaigns (chỉ chặn PENDING và REJECTED)
    // - If not authenticated, can view APPROVED and ENDED campaigns
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (userRole === 'ADMIN') {
      // Admin can view all campaigns
    } else if (campaign.user_id === userId) {
      // Owner can view their own campaigns
    } else if (campaign.status === 'APPROVED' || campaign.status === 'ENDED') {
      // Others can view approved and ended campaigns
    } else {
      // Chặn PENDING và REJECTED campaigns
      return res.status(403).json({ message: 'Campaign not available' });
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create campaign
const createCampaign = async (req, res) => {
  let thumbnail = null;
  try {
    const { title, goal_amount, category, start_date, end_date, content, images } = req.body;

    if (!title || !goal_amount || !content) {
      return res.status(400).json({ message: 'Title, goal amount, and content are required' });
    }

    // Upload thumbnail to Cloudinary if uploaded
    if (req.file) {
      try {
        const uploadResult = await uploadImage(req.file.path, {
          folder: 'campaigns/thumbnails',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
          ]
        });
        thumbnail = uploadResult.url;
      } catch (uploadError) {
        console.error('Thumbnail upload error:', uploadError);
        // Cleanup local file if upload fails
        if (req.file && req.file.path) {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        }
        return res.status(500).json({ message: 'Failed to upload thumbnail' });
      }
    }

    // If admin creates campaign, auto-approve. Otherwise, set to PENDING
    const status = req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING';

    // Create campaign
    const [result] = await pool.execute(
      `INSERT INTO campaigns (user_id, title, goal_amount, category, start_date, end_date, thumbnail, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, goal_amount, category || null, start_date || null, end_date || null, thumbnail, status]
    );

    const campaignId = result.insertId;

    // Upload content images từ HTML lên Cloudinary (nếu có local URLs)
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const { content: updatedContent, uploadedImages: contentUploadedImages } = await uploadContentImagesToCloudinary(content, baseUrl);

    // Create campaign content (với URLs đã được replace)
    await pool.execute(
      'INSERT INTO campaign_contents (campaign_id, content) VALUES (?, ?)',
      [campaignId, updatedContent]
    );

    // Upload và create campaign images (nếu có images array)
    const uploadedImageUrls = [];
    if (images && Array.isArray(images) && images.length > 0) {
      for (const imageUrl of images) {
        let finalImageUrl = imageUrl;
        
        // Nếu là local URL, upload lên Cloudinary
        if (imageUrl.includes(baseUrl) && !imageUrl.includes('cloudinary.com')) {
          try {
            const urlPath = new URL(imageUrl).pathname;
            const filePath = path.join(process.cwd(), urlPath);
            
            if (fs.existsSync(filePath)) {
              const uploadResult = await uploadImage(filePath, {
                folder: 'campaigns/content-images',
                transformation: [
                  { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
                ]
              });
              finalImageUrl = uploadResult.url;
              uploadedImageUrls.push(finalImageUrl);
            }
          } catch (error) {
            console.error('Error uploading campaign image to Cloudinary:', error);
            // Giữ nguyên URL nếu upload fail
            finalImageUrl = imageUrl;
          }
        } else {
          // Đã là Cloudinary URL hoặc URL khác
          finalImageUrl = imageUrl;
        }
        
        await pool.execute(
          'INSERT INTO campaign_images (campaign_id, image_url) VALUES (?, ?)',
          [campaignId, finalImageUrl]
        );
      }
    }

    // If user (not admin) creates campaign, notify all admins
    if (req.user.role !== 'ADMIN') {
      await notifyNewCampaign(campaignId, title, req.user.fullname);
    }

    res.status(201).json({ message: 'Campaign created successfully', campaignId });
  } catch (error) {
    console.error('Create campaign error:', error);
    // Cleanup: xóa thumbnail từ Cloudinary nếu có lỗi
    if (thumbnail && thumbnail.includes('cloudinary.com')) {
      try {
        await deleteImage(thumbnail);
      } catch (deleteError) {
        console.error('Error deleting thumbnail from Cloudinary:', deleteError);
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update campaign
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, goal_amount, category, start_date, end_date, content, images } = req.body;

    // Check if campaign exists and belongs to user
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Check ownership or admin
    if (campaign.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Can only edit if not approved or ended (admin can edit any)
    if ((campaign.status === 'APPROVED' || campaign.status === 'ENDED') && req.user.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Cannot edit approved or ended campaign' });
    }

    // Update campaign
    let thumbnail = undefined;
    
    // Upload thumbnail mới lên Cloudinary và xóa thumbnail cũ nếu có thumbnail mới
    if (req.file) {
      try {
        // Xóa thumbnail cũ từ Cloudinary trước
        if (campaign.thumbnail && campaign.thumbnail.includes('cloudinary.com')) {
          try {
            await deleteImage(campaign.thumbnail);
          } catch (deleteError) {
            console.error('Error deleting old thumbnail:', deleteError);
          }
        }

        // Upload thumbnail mới lên Cloudinary
        const uploadResult = await uploadImage(req.file.path, {
          folder: 'campaigns/thumbnails',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
          ]
        });
        thumbnail = uploadResult.url;
      } catch (uploadError) {
        console.error('Thumbnail upload error:', uploadError);
        // Cleanup local file if upload fails
        if (req.file && req.file.path) {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        }
        return res.status(500).json({ message: 'Failed to upload thumbnail' });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (title) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (goal_amount) {
      updateFields.push('goal_amount = ?');
      updateValues.push(goal_amount);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (start_date) {
      updateFields.push('start_date = ?');
      updateValues.push(start_date);
    }
    if (end_date) {
      updateFields.push('end_date = ?');
      updateValues.push(end_date);
    }
    if (thumbnail) {
      updateFields.push('thumbnail = ?');
      updateValues.push(thumbnail);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await pool.execute(
        `UPDATE campaigns SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Update content (upload local images lên Cloudinary nếu có)
    if (content) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const { content: updatedContent } = await uploadContentImagesToCloudinary(content, baseUrl);
      
      await pool.execute(
        'UPDATE campaign_contents SET content = ? WHERE campaign_id = ?',
        [updatedContent, id]
      );
    }

    // Update images (delete old and insert new)
    if (images && Array.isArray(images)) {
      // Lấy danh sách ảnh cũ để xóa từ Cloudinary
      const [oldImages] = await pool.execute(
        'SELECT image_url FROM campaign_images WHERE campaign_id = ?',
        [id]
      );
      
      // Xóa ảnh cũ từ Cloudinary (chỉ nếu là Cloudinary URL)
      const cloudinaryUrls = oldImages
        .map(img => img.image_url)
        .filter(url => url && url.includes('cloudinary.com'));
      
      if (cloudinaryUrls.length > 0) {
        try {
          await deleteImages(cloudinaryUrls);
        } catch (deleteError) {
          console.error('Error deleting old images from Cloudinary:', deleteError);
        }
      }
      
      // Xóa records và insert mới (upload local images lên Cloudinary)
      await pool.execute('DELETE FROM campaign_images WHERE campaign_id = ?', [id]);
      
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      for (const imageUrl of images) {
        let finalImageUrl = imageUrl;
        
        // Nếu là local URL, upload lên Cloudinary
        if (imageUrl.includes(baseUrl) && !imageUrl.includes('cloudinary.com')) {
          try {
            const urlPath = new URL(imageUrl).pathname;
            const filePath = path.join(process.cwd(), urlPath);
            
            if (fs.existsSync(filePath)) {
              const uploadResult = await uploadImage(filePath, {
                folder: 'campaigns/content-images',
                transformation: [
                  { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
                ]
              });
              finalImageUrl = uploadResult.url;
            }
          } catch (error) {
            console.error('Error uploading campaign image to Cloudinary:', error);
            // Giữ nguyên URL nếu upload fail
            finalImageUrl = imageUrl;
          }
        }
        
        await pool.execute(
          'INSERT INTO campaign_images (campaign_id, image_url) VALUES (?, ?)',
          [id, finalImageUrl]
        );
      }
    }

    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete campaign
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Check ownership or admin
    if (campaign.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Admin can delete any campaign, user can only delete their own non-approved campaigns
    if (req.user.role !== 'ADMIN') {
      if (campaign.status === 'APPROVED') {
        return res.status(400).json({ message: 'Cannot delete approved campaign' });
      }
    }

    // Xóa thumbnail từ Cloudinary
    if (campaign.thumbnail && campaign.thumbnail.includes('cloudinary.com')) {
      try {
        await deleteImage(campaign.thumbnail);
      } catch (deleteError) {
        console.error('Error deleting thumbnail from Cloudinary:', deleteError);
      }
    }

    // Xóa tất cả ảnh content từ Cloudinary
    const [images] = await pool.execute(
      'SELECT image_url FROM campaign_images WHERE campaign_id = ?',
      [id]
    );
    
    const cloudinaryUrls = images
      .map(img => img.image_url)
      .filter(url => url && url.includes('cloudinary.com'));
    
    if (cloudinaryUrls.length > 0) {
      try {
        await deleteImages(cloudinaryUrls);
      } catch (deleteError) {
        console.error('Error deleting images from Cloudinary:', deleteError);
      }
    }

    // Delete campaign (cascade will handle related records)
    await pool.execute('DELETE FROM campaigns WHERE id = ?', [id]);

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's campaigns
const getMyCampaigns = async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      `SELECT c.*, u.fullname as creator_name, u.avatar as creator_avatar
       FROM campaigns c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ campaigns });
  } catch (error) {
    console.error('Get my campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Approve/Reject campaign
const updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get campaign title before updating
    const [campaigns] = await pool.execute(
      'SELECT title FROM campaigns WHERE id = ?',
      [id]
    );

    await pool.execute(
      'UPDATE campaigns SET status = ? WHERE id = ?',
      [status, id]
    );

    // Send notification to campaign owner
    if (campaigns.length > 0) {
      await notifyCampaignStatus(id, status, campaigns[0].title);
    }

    res.json({ message: `Campaign ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// End campaign (user or admin)
const endCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Check authorization: owner or admin
    if (campaign.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if already ended
    if (campaign.status === 'ENDED') {
      return res.status(400).json({ message: 'Campaign already ended' });
    }

    // Update status to ENDED
    await pool.execute(
      'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
      [id]
    );

    res.json({ message: 'Campaign ended successfully' });
  } catch (error) {
    console.error('End campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Manual check and end expired campaigns
const checkExpiredCampaigns = async (req, res) => {
  try {
    const result = await checkAndEndExpiredCampaigns();
    res.json({
      message: `Checked expired campaigns. ${result.updated} campaign(s) ended.`,
      updated: result.updated,
      campaigns: result.campaigns
    });
  } catch (error) {
    console.error('Check expired campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get statistics (tổng số tiền quyên góp và số lượng chiến dịch)
const getStatistics = async (req, res) => {
  try {
    // Tổng số tiền đã quyên góp (tất cả campaigns APPROVED và ENDED có current_amount > 0)
    const [totalAmountResult] = await pool.execute(
      `SELECT COALESCE(SUM(current_amount), 0) as total_amount
       FROM campaigns
       WHERE status IN ('APPROVED', 'ENDED') AND current_amount > 0`
    );
    
    const totalAmount = parseFloat(totalAmountResult[0].total_amount) || 0;
    
    // Số lượng chiến dịch (APPROVED và ENDED)
    const [campaignCountResult] = await pool.execute(
      `SELECT COUNT(*) as campaign_count
       FROM campaigns
       WHERE status IN ('APPROVED', 'ENDED')`
    );
    
    const campaignCount = parseInt(campaignCountResult[0].campaign_count) || 0;
    
    res.json({
      totalAmount,
      campaignCount
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getMyCampaigns,
  updateCampaignStatus,
  endCampaign,
  checkExpiredCampaigns,
  getStatistics
};

