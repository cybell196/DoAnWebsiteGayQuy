-- ============================================
-- KIỂM TRA TRẠNG THÁI CATEGORY
-- ============================================
-- Chạy file này để kiểm tra xem category đã là ENUM chưa
-- Nếu kết quả là VARCHAR(100) → Cần chạy db_update.sql
-- Nếu kết quả là ENUM(...) → Đã được cập nhật rồi

USE fundraise_app;

-- Kiểm tra kiểu dữ liệu của cột category
SHOW COLUMNS FROM campaigns LIKE 'category';

-- Xem các giá trị category hiện có (nếu có dữ liệu)
SELECT DISTINCT category, COUNT(*) as count 
FROM campaigns 
WHERE category IS NOT NULL
GROUP BY category;

