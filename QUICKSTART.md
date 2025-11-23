# Hướng Dẫn Nhanh - Quick Start Guide

## Bước 1: Setup Database

1. Mở MySQL (XAMPP hoặc MySQL server)
2. Tạo database và import schema:
```bash
mysql -u root -p < db.sql
```
Hoặc mở MySQL và copy/paste nội dung file `db.sql` vào.

## Bước 2: Setup Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fundraise_app
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

Tạo thư mục uploads:
```bash
mkdir uploads
```

Chạy backend:
```bash
npm start
```

Backend chạy tại: http://localhost:5000

## Bước 3: Setup Frontend

Mở terminal mới:
```bash
cd frontend
npm install
npm start
```

Frontend chạy tại: http://localhost:3000

## Bước 4: Tạo Admin User

1. Đăng ký tài khoản mới qua giao diện web
2. Mở MySQL và chạy:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

## Test Realtime

1. Mở 2 tab trình duyệt
2. Tab 1: Xem chi tiết một campaign
3. Tab 2: Đăng nhập và donate cho campaign đó
4. Tab 1 sẽ tự động cập nhật donation list và progress bar

## Lưu Ý

- Đảm bảo MySQL đang chạy
- Đảm bảo port 5000 và 3000 không bị chiếm
- File upload được lưu trong `backend/uploads/`

