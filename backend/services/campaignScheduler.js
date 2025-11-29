const pool = require('../config/database');

/**
 * Kiểm tra và tự động chuyển trạng thái campaigns đã hết hạn sang ENDED
 * Chạy định kỳ để đảm bảo campaigns tự động kết thúc khi end_date đã qua
 */
const checkAndEndExpiredCampaigns = async () => {
  try {
    // Tìm tất cả campaigns đã hết hạn nhưng chưa ENDED
    const [expiredCampaigns] = await pool.execute(
      `SELECT id, title, end_date, status 
       FROM campaigns 
       WHERE end_date IS NOT NULL 
         AND end_date < NOW() 
         AND status = 'APPROVED'`
    );

    if (expiredCampaigns.length === 0) {
      return { updated: 0, campaigns: [] };
    }

    const updatedCampaigns = [];
    
    // Update từng campaign sang ENDED
    for (const campaign of expiredCampaigns) {
      await pool.execute(
        'UPDATE campaigns SET status = "ENDED" WHERE id = ?',
        [campaign.id]
      );
      updatedCampaigns.push({
        id: campaign.id,
        title: campaign.title,
        end_date: campaign.end_date
      });
      console.log(`✅ Campaign "${campaign.title}" (ID: ${campaign.id}) đã tự động kết thúc vì hết hạn`);
    }

    return {
      updated: updatedCampaigns.length,
      campaigns: updatedCampaigns
    };
  } catch (error) {
    console.error('Error checking expired campaigns:', error);
    throw error;
  }
};

/**
 * Khởi động scheduled job để check expired campaigns
 * Chạy mỗi 1 giờ (có thể config)
 */
const startCampaignScheduler = (intervalMinutes = 60) => {
  console.log(`🕐 Campaign scheduler started. Checking expired campaigns every ${intervalMinutes} minutes...`);
  
  // Chạy ngay lần đầu
  checkAndEndExpiredCampaigns()
    .then(result => {
      if (result.updated > 0) {
        console.log(`✅ Auto-ended ${result.updated} expired campaign(s)`);
      }
    })
    .catch(error => {
      console.error('Error in initial campaign check:', error);
    });

  // Chạy định kỳ
  const interval = setInterval(async () => {
    try {
      const result = await checkAndEndExpiredCampaigns();
      if (result.updated > 0) {
        console.log(`✅ Auto-ended ${result.updated} expired campaign(s)`);
      }
    } catch (error) {
      console.error('Error in scheduled campaign check:', error);
    }
  }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds

  return interval;
};

module.exports = {
  checkAndEndExpiredCampaigns,
  startCampaignScheduler
};

