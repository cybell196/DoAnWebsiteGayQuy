const pool = require('../config/database');

// Create notification
const createNotification = async (userId, campaignId, type, message) => {
  try {
    await pool.execute(
      `INSERT INTO notifications (user_id, campaign_id, type, message)
       VALUES (?, ?, ?, ?)`,
      [userId, campaignId, type, message]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Create notification for campaign approval/rejection
const notifyCampaignStatus = async (campaignId, status, campaignTitle) => {
  try {
    // Get campaign owner
    const [campaigns] = await pool.execute(
      'SELECT user_id, title FROM campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) return;

    const campaign = campaigns[0];
    const userId = campaign.user_id;
    const title = campaignTitle || campaign.title;

    let type, message;
    if (status === 'APPROVED') {
      type = 'CAMPAIGN_APPROVED';
      message = `Chiến dịch "${title}" đã được duyệt`;
    } else if (status === 'REJECTED') {
      type = 'CAMPAIGN_REJECTED';
      message = `Chiến dịch "${title}" đã bị từ chối`;
    } else {
      return;
    }

    await createNotification(userId, campaignId, type, message);
  } catch (error) {
    console.error('Error notifying campaign status:', error);
  }
};

// Create notification for new campaign to all admins
const notifyNewCampaign = async (campaignId, campaignTitle, creatorName) => {
  try {
    // Get all admin users
    const [admins] = await pool.execute(
      'SELECT id FROM users WHERE role = "ADMIN"',
      []
    );

    if (admins.length === 0) return;

    const message = `${creatorName} đã tạo chiến dịch mới: "${campaignTitle}"`;

    // Create notification for each admin
    for (const admin of admins) {
      await createNotification(admin.id, campaignId, 'NEW_CAMPAIGN', message);
    }
  } catch (error) {
    console.error('Error notifying new campaign:', error);
  }
};

module.exports = {
  createNotification,
  notifyCampaignStatus,
  notifyNewCampaign
};

