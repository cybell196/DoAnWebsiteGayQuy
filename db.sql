-- ====================================================
-- DATABASE CHUẨN DỰ ÁN WEB GÂY QUỸ
-- ====================================================

-- 1. Tạo database
CREATE DATABASE IF NOT EXISTS fundraise_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Sử dụng database
USE fundraise_app;

-- 3. Bảng users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER','ADMIN') DEFAULT 'USER',
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng campaigns
CREATE TABLE campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    goal_amount DECIMAL(15,2) NOT NULL,        -- USD
    current_amount DECIMAL(15,2) DEFAULT 0,    -- USD
    status ENUM('PENDING','APPROVED','REJECTED','ENDED') DEFAULT 'PENDING',
    thumbnail VARCHAR(255),
    category ENUM('Medical','Animals','Food','Humanitarian','Education','Others') DEFAULT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. Bảng campaign_contents
CREATE TABLE campaign_contents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- 6. Bảng campaign_images
CREATE TABLE campaign_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- 7. Bảng donations (chuẩn hóa USD)
CREATE TABLE donations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,        -- USD
    currency CHAR(3) DEFAULT 'USD',       -- Tiền gốc
    exchange_rate DECIMAL(10,4) DEFAULT 1.0,  -- Tỷ giá lúc donate
    message VARCHAR(255),
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 8. Bảng campaign_updates
CREATE TABLE campaign_updates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    title VARCHAR(255),
    content TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- 9. Bảng payment_methods
CREATE TABLE payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,            -- VNPay, MOMO, SOLANA, ETH, BTC...
    type ENUM('BANK','CRYPTO') NOT NULL,
    status ENUM('ACTIVE','DISABLED') DEFAULT 'ACTIVE'
);

-- 10. Bảng transactions (chuẩn hóa USD)
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donation_id INT NOT NULL,
    payment_method_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,        -- USD
    currency CHAR(3) DEFAULT 'USD',       -- Tiền gốc
    exchange_rate DECIMAL(10,4) DEFAULT 1.0,
    tx_hash VARCHAR(255),                  -- Blockchain hash
    bank_ref VARCHAR(255),                 -- Mã giao dịch ngân hàng
    status ENUM('PENDING','SUCCESS','FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

-- ====================================================
-- Hoàn tất
-- ====================================================

CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                 -- người nhận thông báo
    campaign_id INT DEFAULT NULL,         -- chiến dịch liên quan (nếu có)
    type ENUM('CAMPAIGN_APPROVED','CAMPAIGN_REJECTED','NEW_CAMPAIGN') NOT NULL,
    message VARCHAR(255) NOT NULL,        -- nội dung thông báo
    is_read BOOLEAN DEFAULT FALSE,        -- trạng thái đã đọc hay chưa
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
