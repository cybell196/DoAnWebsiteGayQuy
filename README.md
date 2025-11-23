# Website Gây Quỹ - Fundraising Website

Project web gây quỹ sử dụng React (frontend) + Node.js/Express (backend) + MySQL (database).

## Cấu Trúc Project

```
DoAnWebsiteGayQuy/
├── backend/                 # Backend Node.js/Express
│   ├── config/             # Database configuration
│   ├── controllers/        # Business logic
│   ├── middleware/         # Authentication middleware
│   ├── routes/            # API routes
│   ├── uploads/           # Uploaded images
│   ├── server.js          # Main server file
│   └── package.json
├── frontend/              # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context (Auth)
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.js
│   └── package.json
└── db.sql                 # Database schema
```

## Cài Đặt

### 1. Database Setup

1. Tạo database MySQL và import file `db.sql`:
```sql
mysql -u root -p < db.sql
```

Hoặc mở MySQL và chạy nội dung file `db.sql`.

### 2. Backend Setup

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

Chạy backend:
```bash
npm start
# hoặc
npm run dev  # với nodemon
```

Backend sẽ chạy tại `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Chạy frontend:
```bash
npm start
```

Frontend sẽ chạy tại `http://localhost:3000`

## Chức Năng

### Người Dùng (User)

- ✅ Đăng ký / Đăng nhập với JWT
- ✅ Tạo chiến dịch gây quỹ (tiêu đề, ảnh, mục tiêu, ngày, danh mục, nội dung, hình ảnh)
- ✅ Sửa / Xóa chiến dịch của mình (nếu chưa được duyệt)
- ✅ Xem danh sách chiến dịch đã được duyệt
- ✅ Donate cho chiến dịch (số tiền chuẩn hóa USD)
- ✅ Xem danh sách người đã donate (ẩn danh nếu is_public = FALSE)
- ✅ Thanh tiến trình gây quỹ realtime

### Admin

- ✅ Duyệt chiến dịch (Approve / Reject)
- ✅ Xem tất cả chiến dịch + trạng thái
- ✅ Xem danh sách donate của mọi chiến dịch

### Realtime

- ✅ Socket.IO cho realtime donation updates
- ✅ Thanh tiến trình cập nhật realtime khi có donate mới

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Campaigns
- `GET /api/campaigns` - Lấy danh sách campaigns
- `GET /api/campaigns/:id` - Lấy chi tiết campaign
- `POST /api/campaigns` - Tạo campaign (cần auth)
- `PUT /api/campaigns/:id` - Cập nhật campaign (cần auth)
- `DELETE /api/campaigns/:id` - Xóa campaign (cần auth)
- `PATCH /api/campaigns/:id/status` - Cập nhật trạng thái (admin only)

### Donations
- `POST /api/donations` - Tạo donation (cần auth)
- `GET /api/donations/campaign/:campaign_id` - Lấy donations của campaign
- `GET /api/donations/all` - Lấy tất cả donations (admin only)

## Socket.IO Events

### Client → Server
- `join-campaign` - Tham gia room của campaign
- `leave-campaign` - Rời room của campaign

### Server → Client
- `new-donation` - Khi có donation mới

## Lưu Ý

- File upload được lưu trong thư mục `backend/uploads/`
- JWT token được lưu trong localStorage
- Socket.IO kết nối tại `http://localhost:5000`
- Database sử dụng MySQL với charset `utf8mb4`

## Tạo Admin User

Để tạo user admin, chạy SQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

Hoặc đăng ký user mới và update role trong database.

