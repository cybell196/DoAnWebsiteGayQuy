# Hướng Dẫn Setup Database

## Tình huống 1: Tạo Database Mới (Lần đầu)

Nếu bạn đang tạo database mới từ đầu, **chỉ cần chạy file `db.sql`**:

```sql
-- Trong MySQL/phpMyAdmin, chạy toàn bộ nội dung file db.sql
```

File `db.sql` đã bao gồm:
- Tất cả các bảng cần thiết
- Status `ENDED` trong bảng campaigns
- Bảng notifications với đầy đủ các type

## Tình huống 2: Database Đã Tồn Tại (Cập nhật)

Nếu database của bạn đã có sẵn và cần cập nhật, **chỉ cần chạy 1 file duy nhất**:

### Chạy file cập nhật:
```sql
-- Chạy file: db_update.sql
-- File này sẽ tự động cập nhật:
-- 1. Bảng notifications (xóa thông báo cũ, cập nhật ENUM type)
-- 2. Bảng campaigns (thêm status ENDED)
```

**Lưu ý:** File `db_update.sql` đã gộp tất cả các cập nhật lại thành 1 file duy nhất, rất tiện lợi khi chuyển giao project.

## Cách Chạy SQL Files

### Cách 1: Qua phpMyAdmin
1. Mở phpMyAdmin
2. Chọn database của bạn (ví dụ: `fundraise_app`)
3. Click tab "SQL"
4. Copy nội dung file SQL và paste vào
5. Click "Go" để chạy

### Cách 2: Qua MySQL Command Line
```bash
# Tạo database mới
mysql -u root -p fundraise_app < db.sql

# Cập nhật database đã có
mysql -u root -p fundraise_app < db_update.sql
```

### Cách 3: Qua MySQL Workbench
1. Mở MySQL Workbench
2. Kết nối đến database
3. File → Open SQL Script → Chọn file SQL (`db.sql` hoặc `db_update.sql`)
4. Click nút Run (⚡) để chạy

## Kiểm Tra Sau Khi Chạy

### Kiểm tra bảng campaigns:
```sql
SHOW COLUMNS FROM campaigns LIKE 'status';
-- Kết quả phải có: PENDING, APPROVED, REJECTED, ENDED
```

### Kiểm tra bảng notifications:
```sql
SHOW COLUMNS FROM notifications LIKE 'type';
-- Kết quả phải có: CAMPAIGN_APPROVED, CAMPAIGN_REJECTED, NEW_CAMPAIGN
```

## Lưu Ý

⚠️ **Quan trọng**: 
- Nếu database đã có dữ liệu, file `db_update.sql` sẽ **XÓA** các thông báo cũ (DONATION, CAMPAIGN_UPDATE)
- Nếu bạn muốn giữ lại dữ liệu cũ, hãy backup trước khi chạy
- File `db_update.sql` đã gộp tất cả các cập nhật lại thành 1 file duy nhất, rất tiện khi chuyển giao project

## Các File SQL

- **`db.sql`**: File tạo database mới từ đầu (đã bao gồm đầy đủ)
- **`db_update.sql`**: File cập nhật database đã có (gộp tất cả các cập nhật) ⭐ **Dùng file này khi chuyển giao project**
- **`db_update_notifications.sql`**: File cũ (đã gộp vào db_update.sql)
- **`db_update_add_ended_status.sql`**: File cũ (đã gộp vào db_update.sql)

## Tự Động Hóa (Tùy chọn)

Nếu muốn tự động hóa, bạn có thể tạo script `setup-db.js` trong thư mục backend để chạy các file SQL này tự động. Nhưng cách thủ công qua phpMyAdmin/MySQL Workbench là an toàn và dễ kiểm soát hơn.

