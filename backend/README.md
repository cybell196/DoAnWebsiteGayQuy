# Backend Setup

## Cài Đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env`:
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

3. Đảm bảo database đã được tạo và import từ `db.sql`

4. Tạo thư mục uploads:
```bash
mkdir uploads
```

5. Chạy server:
```bash
npm start
# hoặc
npm run dev  # với nodemon
```

## API Endpoints

Xem README.md ở thư mục gốc để biết chi tiết về API endpoints.

