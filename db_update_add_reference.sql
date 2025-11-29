-- Thêm field reference vào bảng transactions để lưu Solana Pay reference key
USE fundraise_app;

ALTER TABLE transactions 
ADD COLUMN reference VARCHAR(255) NULL COMMENT 'Solana Pay reference key (PublicKey)' AFTER bank_ref;

-- Thêm index cho reference để tìm kiếm nhanh
CREATE INDEX idx_reference ON transactions(reference);
CREATE INDEX idx_tx_hash ON transactions(tx_hash);

