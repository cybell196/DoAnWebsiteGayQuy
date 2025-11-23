const pool = require('../config/database');
const { notifyCampaignStatus, notifyNewCampaign } = require('../services/notificationService');

// Get all campaigns (approved and active only for non-admin, all for admin)
const getAllCampaigns = async (req, res) => {
  try {
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
      // Non-admin: only show approved campaigns
      if (filter === 'ended') {
        // Show ended campaigns
        conditions.push('c.status = "ENDED"');
      } else {
        // Default: only show active (approved and not ended)
        conditions.push('c.status = "APPROVED" AND c.status != "ENDED"');
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
    // - Others can only view APPROVED campaigns (not ENDED)
    // - If not authenticated, only show APPROVED campaigns (not ENDED)
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (userRole === 'ADMIN') {
      // Admin can view all campaigns
    } else if (campaign.user_id === userId) {
      // Owner can view their own campaigns
    } else if (campaign.status === 'APPROVED') {
      // Others can view approved campaigns (but not ended ones)
      // Note: If status is ENDED, it won't be APPROVED, so this check is sufficient
    } else {
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
  try {
    const { title, goal_amount, category, start_date, end_date, content, images } = req.body;

    if (!title || !goal_amount || !content) {
      return res.status(400).json({ message: 'Title, goal amount, and content are required' });
    }

    const thumbnail = req.file ? `/uploads/${req.file.filename}` : null;

    // If admin creates campaign, auto-approve. Otherwise, set to PENDING
    const status = req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING';

    // Create campaign
    const [result] = await pool.execute(
      `INSERT INTO campaigns (user_id, title, goal_amount, category, start_date, end_date, thumbnail, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, goal_amount, category || null, start_date || null, end_date || null, thumbnail, status]
    );

    const campaignId = result.insertId;

    // Create campaign content
    await pool.execute(
      'INSERT INTO campaign_contents (campaign_id, content) VALUES (?, ?)',
      [campaignId, content]
    );

    // Create campaign images
    if (images && Array.isArray(images) && images.length > 0) {
      for (const imageUrl of images) {
        await pool.execute(
          'INSERT INTO campaign_images (campaign_id, image_url) VALUES (?, ?)',
          [campaignId, imageUrl]
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

    // Can only edit if not approved
    if (campaign.status === 'APPROVED' && req.user.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Cannot edit approved campaign' });
    }

    // Update campaign
    const thumbnail = req.file ? `/uploads/${req.file.filename}` : undefined;
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

    // Update content
    if (content) {
      await pool.execute(
        'UPDATE campaign_contents SET content = ? WHERE campaign_id = ?',
        [content, id]
      );
    }

    // Update images (delete old and insert new)
    if (images && Array.isArray(images)) {
      await pool.execute('DELETE FROM campaign_images WHERE campaign_id = ?', [id]);
      for (const imageUrl of images) {
        await pool.execute(
          'INSERT INTO campaign_images (campaign_id, image_url) VALUES (?, ?)',
          [id, imageUrl]
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

module.exports = {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getMyCampaigns,
  updateCampaignStatus,
  endCampaign
};

