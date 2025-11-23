-- ============================================
-- FILE CẬP NHẬT DATABASE - CHẠY 1 LẦN DUY NHẤT
-- ============================================
-- File này gộp tất cả các cập nhật database
-- Chạy file này nếu database đã có sẵn và cần cập nhật
-- 
-- Nếu tạo database mới từ đầu, chỉ cần chạy db.sql
-- ============================================

USE fundraise_app;

-- ============================================
-- 1. CẬP NHẬT BẢNG NOTIFICATIONS
-- ============================================
-- Xóa các thông báo cũ không cần thiết
DELETE FROM notifications WHERE type IN ('DONATION', 'CAMPAIGN_UPDATE');

-- Cập nhật ENUM type để chỉ còn 3 loại thông báo
ALTER TABLE notifications 
MODIFY COLUMN type ENUM('CAMPAIGN_APPROVED','CAMPAIGN_REJECTED','NEW_CAMPAIGN') NOT NULL;

-- ============================================
-- 2. CẬP NHẬT BẢNG CAMPAIGNS
-- ============================================
-- Thêm status ENDED vào ENUM
ALTER TABLE campaigns 
MODIFY COLUMN status ENUM('PENDING','APPROVED','REJECTED','ENDED') DEFAULT 'PENDING';

-- Cập nhật category từ VARCHAR sang ENUM
-- Chuyển các category không hợp lệ sang 'Others'
UPDATE campaigns 
SET category = 'Others' 
WHERE category IS NOT NULL 
  AND category NOT IN ('Medical','Animals','Food','Humanitarian','Education','Others');

-- Đổi category sang ENUM
ALTER TABLE campaigns 
MODIFY COLUMN category ENUM('Medical','Animals','Food','Humanitarian','Education','Others') DEFAULT NULL;

-- ============================================
-- HOÀN TẤT
-- ============================================
-- Sau khi chạy file này, database đã được cập nhật đầy đủ
-- Kiểm tra bằng các lệnh sau:
-- 
-- SHOW COLUMNS FROM campaigns LIKE 'status';
-- SHOW COLUMNS FROM campaigns LIKE 'category';
-- SHOW COLUMNS FROM notifications LIKE 'type';

