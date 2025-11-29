# 📚 TÀI LIỆU ĐỒ ÁN TỐT NGHIỆP
## Website Gây Quỹ Trực Tuyến

---

## 📋 MỤC LỤC

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)
3. [Công Nghệ Sử Dụng](#3-công-nghệ-sử-dụng)
4. [Database Schema](#4-database-schema)
5. [Phân Quyền Người Dùng](#5-phân-quyền-người-dùng)
6. [Các Chức Năng Chi Tiết](#6-các-chức-năng-chi-tiết)
7. [Luồng Hoạt Động](#7-luồng-hoạt-động)
8. [API Documentation](#8-api-documentation)
9. [Frontend Components](#9-frontend-components)
10. [Backend Services](#10-backend-services)
11. [Tích Hợp Thanh Toán](#11-tích-hợp-thanh-toán)
12. [Real-time Features](#12-real-time-features)
13. [Quản Lý Hình Ảnh](#13-quản-lý-hình-ảnh)
14. [Bảo Mật](#14-bảo-mật)
15. [Triển Khai](#15-triển-khai)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Giới Thiệu

**Website Gây Quỹ Trực Tuyến** là một nền tảng web cho phép người dùng tạo và quản lý các chiến dịch gây quỹ, đồng thời cho phép cộng đồng quyên góp tiền cho các mục đích từ thiện, nhân đạo, y tế, giáo dục, v.v.

### 1.2. Mục Đích

- Tạo môi trường minh bạch cho việc gây quỹ trực tuyến
- Hỗ trợ nhiều phương thức thanh toán (PayOS, Solana)
- Quản lý chiến dịch với hệ thống duyệt tự động
- Cập nhật real-time về tiến độ gây quỹ
- Thông báo tự động cho người dùng

### 1.3. Đối Tượng Sử Dụng

- **Khách vãng lai (Guest):** Xem chiến dịch đã được duyệt
- **Người dùng (USER):** Tạo chiến dịch, quyên góp, quản lý hồ sơ
- **Quản trị viên (ADMIN):** Duyệt/từ chối chiến dịch, quản lý toàn hệ thống

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1. Kiến Trúc Tổng Thể

```
┌─────────────────┐
│   Frontend      │  React.js (SPA)
│   (Port 3000)   │
└────────┬────────┘
         │ HTTP/REST API
         │ WebSocket (Socket.IO)
┌────────▼────────┐
│   Backend       │  Node.js + Express
│   (Port 5000)   │
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬──────────────┐
    │         │              │              │
┌───▼───┐ ┌──▼───┐    ┌─────▼─────┐  ┌────▼────┐
│ MySQL │ │Cloudi│    │  PayOS    │  │ Solana  │
│       │ │ nary │    │  API      │  │Network  │
└───────┘ └──────┘    └───────────┘  └─────────┘
```

### 2.2. Cấu Trúc Thư Mục

#### Backend
```
backend/
├── config/
│   └── database.js          # Cấu hình kết nối MySQL
├── controllers/
│   ├── authController.js    # Xử lý đăng ký, đăng nhập, OTP
│   ├── campaignController.js # Quản lý chiến dịch
│   ├── donationController.js # Quản lý quyên góp, thanh toán
│   └── notificationController.js # Quản lý thông báo
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── authRoutes.js        # Routes xác thực
│   ├── campaignRoutes.js    # Routes chiến dịch
│   ├── donationRoutes.js    # Routes quyên góp
│   ├── notificationRoutes.js # Routes thông báo
│   └── uploadRoutes.js      # Routes upload ảnh
├── services/
│   ├── solanaService.js      # Xử lý thanh toán Solana
│   ├── payosService.js       # Xử lý thanh toán PayOS
│   ├── cloudinaryService.js # Upload ảnh lên Cloudinary
│   ├── emailService.js      # Gửi email OTP
│   ├── exchangeRateService.js # Lấy tỷ giá USD/VND
│   ├── notificationService.js # Tạo thông báo
│   └── campaignScheduler.js # Tự động kết thúc chiến dịch
├── uploads/
│   └── content-images/      # Ảnh tạm thời trước khi upload Cloudinary
├── scripts/
│   ├── checkTransaction.js  # Script debug Solana transaction
│   └── verifyDonation.js    # Script verify donation
└── server.js                # File chính khởi động server
```

#### Frontend
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Navbar.js        # Thanh điều hướng
│   │   ├── NotificationBell.js # Chuông thông báo
│   │   ├── ProfileDropdown.js # Dropdown profile
│   │   ├── ProtectedRoute.js # Route bảo vệ
│   │   ├── PublicRoute.js   # Route công khai
│   │   ├── BlockEditor.js   # Editor nội dung chiến dịch
│   │   └── RichTextEditor.js # Rich text editor
│   ├── context/
│   │   └── AuthContext.js   # Context quản lý authentication
│   ├── pages/
│   │   ├── Home.js          # Trang chủ
│   │   ├── Login.js         # Đăng nhập
│   │   ├── Register.js      # Đăng ký
│   │   ├── CampaignDetail.js # Chi tiết chiến dịch
│   │   ├── CreateCampaign.js # Tạo chiến dịch
│   │   ├── MyCampaigns.js   # Chiến dịch của tôi
│   │   ├── AdminPanel.js    # Panel quản trị
│   │   ├── Profile.js       # Hồ sơ cá nhân
│   │   ├── PaymentPage.js   # Trang thanh toán PayOS
│   │   └── SolanaPaymentPage.js # Trang thanh toán Solana
│   ├── services/
│   │   └── api.js           # Axios instance, API calls
│   ├── constants/
│   │   └── categories.js    # Danh mục chiến dịch
│   ├── utils/
│   │   └── imageUtils.js    # Utilities xử lý ảnh
│   ├── App.js               # Component chính, routing
│   └── index.js             # Entry point
└── package.json
```

---

## 3. CÔNG NGHỆ SỬ DỤNG

### 3.1. Frontend

| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|-----------|----------|
| React | 18.2.0 | Framework UI |
| React Router DOM | 6.20.0 | Điều hướng |
| Axios | 1.6.2 | HTTP client |
| Socket.IO Client | 4.6.1 | Real-time communication |
| React Quill | 2.0.0 | Rich text editor |
| React Icons | 4.12.0 | Icon library |
| @react-oauth/google | 0.12.2 | Google OAuth |

### 3.2. Backend

| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|-----------|----------|
| Node.js | - | Runtime environment |
| Express | 4.18.2 | Web framework |
| MySQL2 | 3.6.5 | Database driver |
| JWT | 9.0.2 | Authentication |
| Bcryptjs | 2.4.3 | Password hashing |
| Socket.IO | 4.6.1 | Real-time server |
| Multer | 1.4.5-lts.1 | File upload |
| Cloudinary | 2.8.0 | Image storage |
| Nodemailer | 7.0.10 | Email service |
| @solana/web3.js | 1.98.4 | Solana blockchain |
| @solana/pay | 0.2.6 | Solana Pay integration |
| @payos/node | 2.0.3 | PayOS payment gateway |
| QRCode | 1.5.4 | QR code generation |
| Sharp | 0.34.5 | Image processing |
| BigNumber.js | 9.3.1 | Số lớn cho Solana |
| Google Auth Library | 9.0.0 | Google OAuth |

### 3.3. Database

- **MySQL** với charset `utf8mb4_unicode_ci`
- 12 bảng chính: users, campaigns, campaign_contents, donations, transactions, notifications, v.v.

### 3.4. External Services

- **Cloudinary:** Lưu trữ và xử lý hình ảnh
- **PayOS:** Cổng thanh toán VNPay/Momo
- **Solana Devnet:** Mạng blockchain Solana (testnet)
- **Binance API:** Lấy tỷ giá SOL/USD
- **Exchange Rate API:** Lấy tỷ giá USD/VND
- **Gmail SMTP:** Gửi email OTP

---

## 4. DATABASE SCHEMA

### 4.1. Bảng `users`

Lưu trữ thông tin người dùng.

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID người dùng |
| fullname | VARCHAR(100) | Họ tên |
| email | VARCHAR(100) UNIQUE | Email (unique) |
| google_id | VARCHAR(255) NULL | Google ID (nếu đăng nhập Google) |
| auth_provider | ENUM('local','google') | Phương thức đăng nhập |
| password_hash | VARCHAR(255) NULL | Mật khẩu đã hash (bcrypt) |
| role | ENUM('USER','ADMIN') | Vai trò |
| avatar | VARCHAR(255) | URL avatar |
| created_at | TIMESTAMP | Ngày tạo |

**Indexes:**
- `idx_google_id` trên `google_id`

### 4.2. Bảng `campaigns`

Lưu trữ thông tin chiến dịch gây quỹ.

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID chiến dịch |
| user_id | INT NOT NULL | ID người tạo (FK → users) |
| title | VARCHAR(255) | Tiêu đề |
| goal_amount | DECIMAL(15,2) | Mục tiêu (USD) |
| current_amount | DECIMAL(15,2) DEFAULT 0 | Số tiền hiện tại (USD) |
| status | ENUM('PENDING','APPROVED','REJECTED','ENDED') | Trạng thái |
| thumbnail | VARCHAR(255) | URL ảnh đại diện |
| category | ENUM('Medical','Animals','Food','Humanitarian','Education','Others') | Danh mục |
| start_date | DATE | Ngày bắt đầu |
| end_date | DATE | Ngày kết thúc |
| created_at | TIMESTAMP | Ngày tạo |

**Foreign Keys:**
- `user_id` → `users(id)`

### 4.3. Bảng `campaign_contents`

Lưu trữ nội dung HTML của chiến dịch.

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID nội dung |
| campaign_id | INT NOT NULL | ID chiến dịch (FK → campaigns) |
| content | LONGTEXT | Nội dung HTML |
| created_at | TIMESTAMP | Ngày tạo |

### 4.4. Bảng `donations`

Lưu trữ thông tin quyên góp.

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID quyên góp |
| campaign_id | INT NOT NULL | ID chiến dịch (FK → campaigns) |
| user_id | INT NOT NULL | ID người quyên góp (FK → users) |
| amount | DECIMAL(15,2) | Số tiền (USD) |
| currency | CHAR(3) DEFAULT 'USD' | Tiền tệ gốc |
| exchange_rate | DECIMAL(10,4) | Tỷ giá lúc quyên góp |
| amount_vnd | DECIMAL(15,2) NULL | Số tiền VND (PayOS) |
| message | VARCHAR(255) | Lời nhắn |
| is_public | BOOLEAN DEFAULT TRUE | Hiển thị tên hay ẩn danh |
| payment_id | VARCHAR(255) NULL | PayOS payment code |
| payment_status | ENUM('PENDING','SUCCESS','FAILED','CANCELLED') | Trạng thái thanh toán |
| order_code | BIGINT NULL | Mã đơn hàng PayOS |
| created_at | TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | Ngày cập nhật |

**Indexes:**
- `idx_order_code` trên `order_code`
- `idx_payment_status` trên `payment_status`

### 4.5. Bảng `transactions`

Lưu trữ giao dịch thanh toán (PayOS, Solana).

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID giao dịch |
| donation_id | INT NOT NULL | ID quyên góp (FK → donations) |
| payment_method_id | INT NOT NULL | ID phương thức (FK → payment_methods) |
| amount | DECIMAL(15,2) | Số tiền (USD) |
| currency | CHAR(3) DEFAULT 'USD' | Tiền tệ |
| exchange_rate | DECIMAL(10,4) | Tỷ giá |
| tx_hash | VARCHAR(255) | Blockchain hash (Solana) |
| bank_ref | VARCHAR(255) | Mã giao dịch ngân hàng |
| reference | VARCHAR(255) | Solana Pay reference key |
| status | ENUM('PENDING','SUCCESS','FAILED') | Trạng thái |
| created_at | TIMESTAMP | Ngày tạo |

**Indexes:**
- `idx_reference` trên `reference`
- `idx_tx_hash` trên `tx_hash`

### 4.6. Bảng `notifications`

Lưu trữ thông báo cho người dùng.

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID thông báo |
| user_id | INT NOT NULL | ID người nhận (FK → users) |
| campaign_id | INT NULL | ID chiến dịch liên quan (FK → campaigns) |
| type | ENUM('CAMPAIGN_APPROVED','CAMPAIGN_REJECTED','NEW_CAMPAIGN') | Loại thông báo |
| message | VARCHAR(255) | Nội dung |
| is_read | BOOLEAN DEFAULT FALSE | Đã đọc chưa |
| created_at | TIMESTAMP | Ngày tạo |

### 4.7. Bảng `email_verifications`

Lưu trữ mã OTP xác thực email.

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID |
| email | VARCHAR(100) | Email cần xác thực |
| otp_code | VARCHAR(6) | Mã OTP 6 số |
| expires_at | TIMESTAMP | Thời gian hết hạn |
| verified | BOOLEAN DEFAULT FALSE | Đã xác thực chưa |
| created_at | TIMESTAMP | Ngày tạo |

**Indexes:**
- `idx_email` trên `email`
- `idx_expires` trên `expires_at`
- `idx_verified` trên `verified`

### 4.8. Bảng `payment_methods`

Lưu trữ các phương thức thanh toán.

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INT PRIMARY KEY | ID phương thức |
| name | VARCHAR(50) | Tên (PayOS, SOLANA) |
| type | ENUM('BANK','CRYPTO') | Loại |
| status | ENUM('ACTIVE','DISABLED') | Trạng thái |

**Dữ liệu mặc định:**
- PayOS (BANK, ACTIVE)
- SOLANA (CRYPTO, ACTIVE)

---

## 5. PHÂN QUYỀN NGƯỜI DÙNG

### 5.1. Khách Vãng Lai (Guest)

**Quyền:**
- ✅ Xem danh sách chiến dịch đã được duyệt (APPROVED, chưa ENDED)
- ✅ Xem chi tiết chiến dịch đã được duyệt
- ✅ Lọc chiến dịch: Đang Diễn Ra / Đã Kết Thúc
- ✅ Xem danh sách quyên góp của chiến dịch
- ❌ Không thể quyên góp (cần đăng nhập)
- ❌ Không thể tạo chiến dịch

**Hạn Chế:**
- Không thấy chiến dịch PENDING, REJECTED
- Không thấy chiến dịch đã ENDED (trừ khi filter "Đã Kết Thúc")

### 5.2. Người Dùng (USER)

**Quyền:**
- ✅ Tất cả quyền của Guest
- ✅ Đăng ký / Đăng nhập tài khoản
- ✅ Đăng nhập bằng Google OAuth
- ✅ Xác thực email bằng OTP
- ✅ Tạo chiến dịch gây quỹ
- ✅ Quản lý chiến dịch của mình (sửa, xóa nếu chưa APPROVED)
- ✅ Quyên góp cho chiến dịch (PayOS, Solana)
- ✅ Xem lịch sử quyên góp của mình
- ✅ Quản lý hồ sơ cá nhân (cập nhật thông tin, đổi mật khẩu)
- ✅ Nhận thông báo (chiến dịch được duyệt/từ chối)
- ✅ Xem chiến dịch của mình ở mọi trạng thái

**Hạn Chế:**
- Chỉ sửa/xóa được chiến dịch của mình khi status = PENDING hoặc REJECTED
- Không thể duyệt/từ chối chiến dịch

### 5.3. Quản Trị Viên (ADMIN)

**Quyền:**
- ✅ Tất cả quyền của USER
- ✅ Xem tất cả chiến dịch (mọi trạng thái)
- ✅ Duyệt/từ chối chiến dịch
- ✅ Kết thúc chiến dịch sớm
- ✅ Xóa bất kỳ chiến dịch nào
- ✅ Xem tất cả quyên góp
- ✅ Nhận thông báo khi có chiến dịch mới
- ✅ Tạo chiến dịch tự động được APPROVED (không cần duyệt)

**Đặc Quyền:**
- Chiến dịch do Admin tạo tự động có status = APPROVED
- Có thể xem và quản lý tất cả chiến dịch, kể cả PENDING, REJECTED

---

## 6. CÁC CHỨC NĂNG CHI TIẾT

### 6.1. Xác Thực (Authentication)

#### 6.1.1. Đăng Ký

**Route:** `POST /api/auth/register`

**Luồng:**
1. User nhập email, password, fullname
2. Backend kiểm tra email đã tồn tại chưa
3. Gửi mã OTP qua email (6 số, hết hạn 10 phút)
4. User nhập OTP để xác thực
5. Hash password bằng bcrypt (salt rounds = 10)
6. Tạo user với role = USER
7. Tự động đăng nhập và trả về JWT token

**Validation:**
- Email: Format hợp lệ, không trùng
- Password: Tối thiểu 6 ký tự
- Fullname: Bắt buộc

#### 6.1.2. Đăng Nhập

**Route:** `POST /api/auth/login`

**Luồng:**
1. User nhập email và password
2. Backend tìm user theo email
3. So sánh password với hash (bcrypt.compare)
4. Tạo JWT token (hết hạn 7 ngày)
5. Trả về token và thông tin user

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullname": "Nguyễn Văn A",
    "role": "USER"
  }
}
```

#### 6.1.3. Đăng Nhập Google OAuth

**Route:** `POST /api/auth/google`

**Luồng:**
1. Frontend gửi Google ID token
2. Backend verify token với Google Auth Library
3. Lấy thông tin user từ Google (email, name, avatar)
4. Kiểm tra user đã tồn tại (theo `google_id` hoặc `email`)
5. Nếu chưa tồn tại → Tạo user mới
6. Nếu đã tồn tại → Cập nhật `google_id` nếu cần
7. Tạo JWT token và trả về

#### 6.1.4. Gửi OTP

**Route:** `POST /api/auth/send-otp`

**Luồng:**
1. Backend tạo mã OTP 6 số ngẫu nhiên
2. Lưu vào bảng `email_verifications` với `expires_at = now + 10 phút`
3. Gửi email OTP qua SMTP (Gmail)
4. Trả về success

#### 6.1.5. Xác Thực OTP

**Route:** `POST /api/auth/verify-otp`

**Luồng:**
1. User nhập OTP
2. Backend tìm OTP theo email và `verified = FALSE`
3. Kiểm tra OTP khớp và chưa hết hạn
4. Đánh dấu `verified = TRUE`
5. Trả về success

### 6.2. Quản Lý Chiến Dịch (Campaigns)

#### 6.2.1. Tạo Chiến Dịch

**Route:** `POST /api/campaigns` (Authenticated)

**Dữ Liệu Đầu Vào:**
- `title`: Tiêu đề
- `goal_amount`: Mục tiêu (USD)
- `category`: Danh mục
- `start_date`: Ngày bắt đầu
- `end_date`: Ngày kết thúc
- `thumbnail`: File ảnh đại diện
- `content`: Nội dung HTML (từ Block Editor)

**Luồng:**
1. Upload thumbnail lên Cloudinary
2. Extract các ảnh từ HTML content (URL local)
3. Upload từng ảnh lên Cloudinary
4. Replace URL local bằng URL Cloudinary trong content
5. Lưu campaign vào database với:
   - `user_id`: ID user hiện tại
   - `status`: PENDING (nếu USER) hoặc APPROVED (nếu ADMIN)
   - `current_amount`: 0
6. Lưu content vào `campaign_contents`
7. Nếu USER tạo → Gửi thông báo cho tất cả ADMIN
8. Trả về campaign đã tạo

**Block Editor:**
- Hỗ trợ các block: H1, Quote, Body Text, Image
- Drag & drop để sắp xếp
- Upload ảnh cho image block
- Xóa, di chuyển block

#### 6.2.2. Xem Danh Sách Chiến Dịch

**Route:** `GET /api/campaigns?filter=active|ended|all`

**Logic Phân Quyền:**
- **Guest/User:** Chỉ thấy APPROVED và chưa ENDED (hoặc ENDED nếu filter="ended")
- **Admin:** Thấy tất cả (có thể filter)

**Filter:**
- `active`: Chiến dịch đang diễn ra (APPROVED, chưa ENDED, chưa hết hạn)
- `ended`: Chiến dịch đã kết thúc (ENDED hoặc đã hết hạn)
- `all`: Tất cả (chỉ Admin)

**Response:**
```json
{
  "campaigns": [
    {
      "id": 1,
      "title": "Chiến dịch từ thiện",
      "goal_amount": 10000,
      "current_amount": 5000,
      "status": "APPROVED",
      "thumbnail": "https://...",
      "category": "Medical",
      "user": {
        "id": 1,
        "fullname": "Nguyễn Văn A"
      }
    }
  ]
}
```

#### 6.2.3. Xem Chi Tiết Chiến Dịch

**Route:** `GET /api/campaigns/:id`

**Logic Phân Quyền:**
- **Guest/User:** Chỉ xem được APPROVED và chưa ENDED
- **Owner:** Xem được chiến dịch của mình (mọi status)
- **Admin:** Xem được tất cả

**Response:**
```json
{
  "campaign": {
    "id": 1,
    "title": "...",
    "goal_amount": 10000,
    "current_amount": 5000,
    "status": "APPROVED",
    "content": "<div>...</div>",
    "user": {...},
    "donations": [...],
    "top_donors": [...]
  }
}
```

#### 6.2.4. Sửa Chiến Dịch

**Route:** `PUT /api/campaigns/:id` (Authenticated, Owner only)

**Điều Kiện:**
- Chỉ owner mới được sửa
- Chỉ sửa được khi `status = PENDING` hoặc `REJECTED`

**Luồng:**
1. Kiểm tra quyền sở hữu
2. Kiểm tra status
3. Upload thumbnail mới (nếu có)
4. Xử lý content images (upload lên Cloudinary)
5. Cập nhật database
6. Trả về campaign đã cập nhật

#### 6.2.5. Xóa Chiến Dịch

**Route:** `DELETE /api/campaigns/:id` (Authenticated)

**Logic:**
- **Owner:** Chỉ xóa được khi chưa APPROVED
- **Admin:** Xóa được bất kỳ chiến dịch nào

**Luồng:**
1. Kiểm tra quyền
2. Xóa ảnh trên Cloudinary (thumbnail, content images)
3. Xóa campaign và các bảng liên quan (donations, notifications, v.v.)
4. Trả về success

#### 6.2.6. Duyệt/Từ Chối Chiến Dịch (Admin)

**Route:** `PATCH /api/campaigns/:id/status` (Admin only)

**Body:**
```json
{
  "status": "APPROVED" // hoặc "REJECTED"
}
```

**Luồng:**
1. Kiểm tra quyền ADMIN
2. Cập nhật status
3. Gửi thông báo cho campaign owner
4. Trả về campaign đã cập nhật

#### 6.2.7. Kết Thúc Chiến Dịch

**Route:** `POST /api/campaigns/:id/end` (Owner hoặc Admin)

**Luồng:**
1. Kiểm tra quyền (owner hoặc admin)
2. Cập nhật `status = ENDED`
3. Trả về success

**Tự Động Kết Thúc:**
- Khi `current_amount >= goal_amount` → Tự động chuyển `status = ENDED`
- Logic này nằm trong `donationController.js` sau khi tạo donation

#### 6.2.8. Tự Động Kết Thúc Chiến Dịch Hết Hạn

**Service:** `campaignScheduler.js`

**Luồng:**
- Chạy định kỳ (mỗi giờ)
- Tìm các campaign có `end_date < now()` và `status = APPROVED`
- Cập nhật `status = ENDED`

### 6.3. Quyên Góp (Donations)

#### 6.3.1. Tạo Quyên Góp

**Route:** `POST /api/donations` (Authenticated)

**Body:**
```json
{
  "campaign_id": 1,
  "amount": 100,
  "currency": "USD",
  "exchange_rate": 1.0,
  "message": "Chúc bạn sớm đạt mục tiêu!",
  "is_public": true
}
```

**Luồng:**
1. Kiểm tra campaign tồn tại và `status = APPROVED`, chưa ENDED
2. Chuẩn hóa số tiền sang USD: `amountUSD = amount * exchange_rate`
3. Tạo donation với `payment_status = PENDING`
4. Cập nhật `campaigns.current_amount += amountUSD`
5. Kiểm tra nếu `current_amount >= goal_amount` → Tự động ENDED
6. Emit Socket.IO event `new-donation` cho tất cả người đang xem
7. Gửi thông báo cho campaign owner
8. Trả về donation đã tạo

**Real-time Update:**
- Tất cả người đang xem chiến dịch sẽ thấy:
  - Progress bar cập nhật
  - Danh sách donations thêm donation mới
  - Top donors cập nhật

#### 6.3.2. Xem Danh Sách Quyên Góp

**Route:** `GET /api/donations/campaign/:campaign_id`

**Response:**
```json
{
  "donations": [
    {
      "id": 1,
      "amount": 100,
      "message": "...",
      "user": {
        "id": 1,
        "fullname": "Nguyễn Văn A" // hoặc "Anonymous" nếu is_public = false
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Logic:**
- Nếu `is_public = FALSE` → Hiển thị "Anonymous" thay vì tên

#### 6.3.3. Xem Lịch Sử Quyên Góp

**Route:** `GET /api/donations/my-donations` (Authenticated)

**Response:**
- Danh sách tất cả donations của user hiện tại
- Kèm thông tin campaign (title, thumbnail, link)
- Sắp xếp theo thời gian (mới nhất trước)

#### 6.3.4. Xem Tất Cả Quyên Góp (Admin)

**Route:** `GET /api/donations/all` (Admin only)

**Response:**
- Tất cả donations của mọi campaign
- Hiển thị: Campaign, donor, amount, message, date

### 6.4. Thông Báo (Notifications)

#### 6.4.1. Các Loại Thông Báo

1. **CAMPAIGN_APPROVED:** Chiến dịch được duyệt
   - Gửi cho: Campaign owner
   - Trigger: Admin duyệt chiến dịch

2. **CAMPAIGN_REJECTED:** Chiến dịch bị từ chối
   - Gửi cho: Campaign owner
   - Trigger: Admin từ chối chiến dịch

3. **NEW_CAMPAIGN:** Có chiến dịch mới
   - Gửi cho: Tất cả ADMIN
   - Trigger: User tạo chiến dịch mới

#### 6.4.2. Xem Thông Báo

**Route:** `GET /api/notifications` (Authenticated)

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "CAMPAIGN_APPROVED",
      "message": "Chiến dịch 'Từ thiện' đã được duyệt",
      "is_read": false,
      "campaign": {
        "id": 1,
        "title": "Từ thiện"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 6.4.3. Đếm Thông Báo Chưa Đọc

**Route:** `GET /api/notifications/unread-count` (Authenticated)

**Response:**
```json
{
  "count": 5
}
```

#### 6.4.4. Đánh Dấu Đã Đọc

**Route:** `PATCH /api/notifications/:id/read` (Authenticated)

**Route:** `PATCH /api/notifications/all/read` (Authenticated) - Đánh dấu tất cả

### 6.5. Hồ Sơ Cá Nhân (Profile)

#### 6.5.1. Xem Hồ Sơ

**Route:** `/profile` (Frontend)

**Tabs:**
1. **Thông Tin Cá Nhân:**
   - Hiển thị: Fullname, Email, Role
   - Nút: Cập nhật thông tin, Đổi mật khẩu, Đăng xuất

2. **Đã Quyên Góp:**
   - Danh sách donations của user
   - Kèm thông tin campaign

3. **Chiến Dịch Đã Tạo:**
   - Danh sách campaigns của user
   - Kèm status badge, progress bar

#### 6.5.2. Cập Nhật Thông Tin

**Route:** `PUT /api/auth/profile` (Authenticated)

**Body:**
```json
{
  "fullname": "Nguyễn Văn B",
  "email": "newemail@example.com"
}
```

**Validation:**
- Email không trùng với user khác
- Fullname bắt buộc

#### 6.5.3. Đổi Mật Khẩu

**Route:** `PUT /api/auth/change-password` (Authenticated)

**Body:**
```json
{
  "current_password": "oldpass",
  "new_password": "newpass"
}
```

**Validation:**
- Mật khẩu hiện tại phải đúng
- Mật khẩu mới tối thiểu 6 ký tự
- Hash mật khẩu mới bằng bcrypt

---

## 7. LUỒNG HOẠT ĐỘNG

### 7.1. Luồng Tạo Chiến Dịch

```
User → Tạo chiến dịch
  ↓
Upload thumbnail → Cloudinary
  ↓
Nhập nội dung (Block Editor)
  ↓
Upload ảnh trong content → Lưu tạm local
  ↓
Nhấn "Tạo"
  ↓
Backend:
  - Upload thumbnail lên Cloudinary
  - Upload tất cả ảnh content lên Cloudinary
  - Replace URL local bằng URL Cloudinary
  - Lưu campaign (status = PENDING nếu USER, APPROVED nếu ADMIN)
  ↓
Nếu USER → Gửi thông báo cho ADMIN
  ↓
Trả về campaign đã tạo
```

### 7.2. Luồng Quyên Góp PayOS

```
User → Chọn chiến dịch → Nhập số tiền VND
  ↓
Frontend: Lấy tỷ giá USD/VND
  ↓
Tính số tiền USD tương ứng
  ↓
POST /api/donations
  ↓
Backend:
  - Tạo donation (payment_status = PENDING)
  - Tạo order_code (unique)
  - Gọi PayOS API tạo payment link
  ↓
Trả về checkoutUrl
  ↓
Frontend: Redirect đến PayOS
  ↓
User thanh toán trên PayOS
  ↓
PayOS redirect về returnUrl với payment status
  ↓
Frontend: Kiểm tra payment status
  ↓
Nếu success → Cập nhật donation (payment_status = SUCCESS)
  ↓
Real-time update: Socket.IO emit new-donation
```

### 7.3. Luồng Quyên Góp Solana

```
User → Chọn chiến dịch → Chọn Solana → Nhập số tiền USD
  ↓
Frontend: Lấy tỷ giá SOL/USD từ Binance
  ↓
Tính số SOL tương ứng
  ↓
POST /api/donations/solana
  ↓
Backend:
  - Tạo donation (payment_status = PENDING)
  - Generate Solana Pay URL với reference key
  - Generate QR code (có logo Solana)
  ↓
Trả về QR code image
  ↓
Frontend: Hiển thị QR code (hiệu lực 5 phút)
  ↓
User quét QR bằng ví Solana (Phantom, Solflare)
  ↓
Ví mở → User xác nhận thanh toán
  ↓
Giao dịch được gửi lên Solana blockchain
  ↓
Frontend: Polling mỗi 10s để check transaction
  ↓
Backend: Quét blockchain tìm transaction với reference key
  ↓
Nếu tìm thấy → Cập nhật donation (payment_status = SUCCESS)
  ↓
Frontend: Hiển thị thông báo thành công → Đóng sau 5s
```

### 7.4. Luồng Duyệt Chiến Dịch (Admin)

```
Admin → Xem danh sách chiến dịch PENDING
  ↓
Chọn chiến dịch → Duyệt/Từ chối
  ↓
PATCH /api/campaigns/:id/status
  ↓
Backend:
  - Cập nhật status (APPROVED hoặc REJECTED)
  - Tạo notification cho campaign owner
  ↓
Campaign owner nhận thông báo
  ↓
Nếu APPROVED → Chiến dịch hiển thị công khai
```

### 7.5. Luồng Real-time Update

```
User A mở chi tiết chiến dịch
  ↓
Socket.IO: Join room "campaign-{id}"
  ↓
User B quyên góp
  ↓
Backend: Tạo donation → Emit "new-donation" vào room
  ↓
Tất cả user trong room nhận event
  ↓
Frontend: Cập nhật UI
  - Progress bar
  - Danh sách donations
  - Top donors
```

---

## 8. API DOCUMENTATION

### 8.1. Authentication APIs

#### POST /api/auth/register
Đăng ký tài khoản mới.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullname": "Nguyễn Văn A"
}
```

**Response:**
```json
{
  "message": "OTP đã được gửi đến email của bạn"
}
```

#### POST /api/auth/verify-otp
Xác thực OTP.

**Request:**
```json
{
  "email": "user@example.com",
  "otp_code": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullname": "Nguyễn Văn A",
    "role": "USER"
  }
}
```

#### POST /api/auth/login
Đăng nhập.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

#### POST /api/auth/google
Đăng nhập bằng Google.

**Request:**
```json
{
  "credential": "google_id_token"
}
```

#### GET /api/auth/me
Lấy thông tin user hiện tại (cần token).

#### PUT /api/auth/profile
Cập nhật thông tin cá nhân.

**Request:**
```json
{
  "fullname": "Nguyễn Văn B",
  "email": "newemail@example.com"
}
```

#### PUT /api/auth/change-password
Đổi mật khẩu.

**Request:**
```json
{
  "current_password": "oldpass",
  "new_password": "newpass"
}
```

### 8.2. Campaign APIs

#### GET /api/campaigns
Lấy danh sách chiến dịch.

**Query Params:**
- `filter`: `active` | `ended` | `all` (mặc định: `active`)

#### GET /api/campaigns/:id
Lấy chi tiết chiến dịch.

#### POST /api/campaigns
Tạo chiến dịch mới (cần token).

**Request (FormData):**
- `title`: string
- `goal_amount`: number
- `category`: string
- `start_date`: date
- `end_date`: date
- `thumbnail`: file
- `content`: string (HTML)

#### PUT /api/campaigns/:id
Cập nhật chiến dịch (cần token, owner only).

#### DELETE /api/campaigns/:id
Xóa chiến dịch (cần token).

#### PATCH /api/campaigns/:id/status
Cập nhật trạng thái (Admin only).

**Request:**
```json
{
  "status": "APPROVED" // hoặc "REJECTED"
}
```

#### POST /api/campaigns/:id/end
Kết thúc chiến dịch (Owner hoặc Admin).

#### GET /api/campaigns/my-campaigns
Lấy danh sách chiến dịch của user hiện tại.

#### GET /api/campaigns/statistics
Lấy thống kê tổng quan (tổng số tiền, tổng số chiến dịch).

### 8.3. Donation APIs

#### POST /api/donations
Tạo quyên góp (cần token).

**Request:**
```json
{
  "campaign_id": 1,
  "amount": 100,
  "currency": "USD",
  "exchange_rate": 1.0,
  "message": "Chúc bạn thành công!",
  "is_public": true
}
```

#### GET /api/donations/campaign/:campaign_id
Lấy danh sách quyên góp của chiến dịch.

#### GET /api/donations/my-donations
Lấy lịch sử quyên góp của user hiện tại.

#### GET /api/donations/all
Lấy tất cả quyên góp (Admin only).

#### POST /api/donations/payos
Tạo payment link PayOS.

**Request:**
```json
{
  "campaign_id": 1,
  "amount_vnd": 100000,
  "message": "...",
  "is_public": true
}
```

**Response:**
```json
{
  "checkoutUrl": "https://pay.payos.vn/...",
  "order_code": 123456789
}
```

#### POST /api/donations/solana
Tạo payment request Solana.

**Request:**
```json
{
  "campaign_id": 1,
  "amount_usd": 100,
  "message": "...",
  "is_public": true
}
```

**Response:**
```json
{
  "qr_code": "data:image/png;base64,...",
  "donation_id": 1,
  "reference": "reference_key"
}
```

#### GET /api/donations/exchange-rate
Lấy tỷ giá USD/VND.

#### GET /api/donations/sol-exchange-rate
Lấy tỷ giá SOL/USD.

#### GET /api/donations/check-payment/:donation_id
Kiểm tra trạng thái thanh toán.

### 8.4. Notification APIs

#### GET /api/notifications
Lấy danh sách thông báo (cần token).

#### GET /api/notifications/unread-count
Lấy số lượng thông báo chưa đọc.

#### PATCH /api/notifications/:id/read
Đánh dấu thông báo đã đọc.

#### PATCH /api/notifications/all/read
Đánh dấu tất cả thông báo đã đọc.

### 8.5. Upload APIs

#### POST /api/upload/image
Upload ảnh cho content editor.

**Request:** FormData với field `image`

**Response:**
```json
{
  "url": "http://localhost:5000/uploads/content-images/..."
}
```

---

## 9. FRONTEND COMPONENTS

### 9.1. Components Chính

#### Navbar.js
Thanh điều hướng chính.

**Features:**
- Logo/Brand
- Links: Trang Chủ, Tạo Chiến Dịch, Chiến Dịch Của Tôi, Admin Panel (nếu Admin)
- NotificationBell
- ProfileDropdown
- Responsive design

#### NotificationBell.js
Chuông thông báo với badge số lượng chưa đọc.

**Features:**
- Badge hiển thị số thông báo chưa đọc
- Dropdown danh sách thông báo
- Click vào thông báo → Đánh dấu đã đọc + Chuyển đến campaign
- Auto refresh mỗi 30 giây

#### BlockEditor.js
Editor nội dung chiến dịch với các block.

**Block Types:**
- H1: Tiêu đề
- Quote: Trích dẫn
- Body Text: Đoạn văn
- Image: Ảnh

**Features:**
- Thêm block
- Xóa block
- Di chuyển block lên/xuống
- Drag & drop để sắp xếp
- Upload ảnh cho image block

#### ProtectedRoute.js
Route bảo vệ, yêu cầu đăng nhập.

**Logic:**
- Nếu chưa đăng nhập → Redirect đến `/login`
- Nếu đã đăng nhập → Render children

#### PublicRoute.js
Route công khai, chuyển hướng nếu đã đăng nhập.

**Logic:**
- Nếu đã đăng nhập → Redirect đến `/`
- Nếu chưa đăng nhập → Render children

### 9.2. Pages

#### Home.js
Trang chủ hiển thị danh sách chiến dịch.

**Features:**
- Hero section với thống kê (tổng số tiền, tổng số chiến dịch)
- Filter: Đang Diễn Ra / Đã Kết Thúc
- Grid layout campaign cards
- Progress bar cho mỗi campaign
- Responsive design

#### CampaignDetail.js
Trang chi tiết chiến dịch.

**Features:**
- Hiển thị đầy đủ thông tin campaign
- Progress bar real-time
- Donate form (PayOS, Solana)
- Danh sách donations real-time
- Top donors
- Campaign content với images
- Socket.IO join room để nhận real-time updates

#### CreateCampaign.js
Trang tạo chiến dịch.

**Features:**
- Form đầy đủ các trường
- Block Editor cho content
- Upload thumbnail
- Upload ảnh trong content
- Validation
- Preview trước khi submit

#### SolanaPaymentPage.js
Trang thanh toán Solana.

**Features:**
- Hiển thị QR code (hiệu lực 5 phút, có countdown)
- Hướng dẫn thanh toán
- Auto polling mỗi 10s để check transaction
- Thông báo thành công với countdown 5s
- Tự động đóng khi thành công

#### PaymentPage.js
Trang thanh toán PayOS.

**Features:**
- Redirect đến PayOS checkout
- Xử lý callback từ PayOS
- Hiển thị kết quả thanh toán

---

## 10. BACKEND SERVICES

### 10.1. solanaService.js

Xử lý tất cả logic liên quan đến Solana.

**Functions:**
- `getSOLToUSDRate()`: Lấy tỷ giá SOL/USD từ Binance API
- `convertUSDToSOL(usdAmount)`: Chuyển đổi USD sang SOL
- `generateSolanaPaymentURL(walletAddress, amountSOL, donationId)`: Tạo Solana Pay URL
- `generateQRCode(url)`: Tạo QR code với logo Solana
- `createSolanaPayment(donationId, amountUSD, ...)`: Tạo payment request
- `findTransactionByReference(referenceKey, minBlockTime, excludeSignatures)`: Tìm transaction trên blockchain
- `verifyTransaction(donationId)`: Verify transaction và cập nhật donation

**Solana Pay URL Format:**
```
solana:<MERCHANT_WALLET>?amount=<AMOUNT>&reference=<REFERENCE>&label=<LABEL>&message=<MESSAGE>
```

**Reference Key:**
- 32 bytes, được hash từ `donation_id` + timestamp
- Dùng để match transaction trên blockchain

### 10.2. payosService.js

Xử lý tích hợp PayOS.

**Functions:**
- `createPaymentLink(paymentData)`: Tạo payment link từ PayOS
- `verifyWebhook(webhookData)`: Verify webhook từ PayOS
- `getPaymentInfo(orderCode)`: Lấy thông tin payment

**PayOS Flow:**
1. Tạo payment link với `order_code` unique
2. User thanh toán trên PayOS
3. PayOS redirect về `returnUrl` với payment status
4. Backend verify và cập nhật donation

### 10.3. cloudinaryService.js

Xử lý upload ảnh lên Cloudinary.

**Functions:**
- `uploadImage(filePath)`: Upload ảnh lên Cloudinary
- `deleteImage(publicId)`: Xóa ảnh trên Cloudinary
- `deleteImages(publicIds)`: Xóa nhiều ảnh

**Configuration:**
- Cloud name, API key, API secret từ `.env`

### 10.4. emailService.js

Gửi email OTP.

**Functions:**
- `sendOTPEmail(email, otpCode)`: Gửi email OTP
- `verifyConnection()`: Kiểm tra kết nối SMTP

**SMTP Configuration:**
- Host: Gmail SMTP
- Port: 587
- Auth: User, App Password

### 10.5. exchangeRateService.js

Lấy tỷ giá USD/VND.

**Functions:**
- `getUSDToVNDRate()`: Lấy tỷ giá từ API

### 10.6. notificationService.js

Tạo và quản lý thông báo.

**Functions:**
- `notifyCampaignStatus(campaignId, status, userId)`: Thông báo khi campaign được duyệt/từ chối
- `notifyNewCampaign(campaignId)`: Thông báo cho ADMIN khi có campaign mới

### 10.7. campaignScheduler.js

Tự động kết thúc chiến dịch hết hạn.

**Functions:**
- `checkAndEndExpiredCampaigns()`: Tìm và kết thúc các campaign hết hạn
- `startCampaignScheduler()`: Khởi động scheduler (chạy mỗi giờ)

---

## 11. TÍCH HỢP THANH TOÁN

### 11.1. PayOS Integration

#### Cấu Hình
```env
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
```

#### Luồng Thanh Toán
1. User chọn số tiền VND
2. Frontend lấy tỷ giá USD/VND
3. Tính số tiền USD tương ứng
4. Tạo donation với `payment_status = PENDING`
5. Gọi PayOS API tạo payment link
6. Redirect user đến PayOS checkout
7. User thanh toán
8. PayOS redirect về với payment status
9. Backend cập nhật `payment_status = SUCCESS`

#### Webhook (Tùy chọn)
- PayOS có thể gửi webhook khi thanh toán thành công
- Backend verify webhook và cập nhật donation

### 11.2. Solana Integration

#### Cấu Hình
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RECEIVER_WALLET=<wallet_address>
```

#### Solana Pay
- Sử dụng thư viện `@solana/pay` để tạo URL chuẩn
- Format URL: `solana:<wallet>?amount=<sol>&reference=<ref>&label=<label>&message=<msg>`

#### QR Code
- Generate QR code từ URL
- Embed logo Solana vào giữa QR code (sử dụng `sharp`)
- QR code hiệu lực 5 phút

#### Transaction Verification
1. Generate reference key (32 bytes) từ donation ID
2. User quét QR và thanh toán
3. Transaction được gửi lên Solana blockchain
4. Backend polling quét blockchain tìm transaction với reference key
5. Verify transaction:
   - Kiểm tra recipient wallet khớp
   - Kiểm tra amount khớp
   - Kiểm tra reference key khớp
   - Kiểm tra transaction xảy ra sau khi tạo donation
   - Loại trừ các transaction đã được verify trước đó
6. Cập nhật donation `payment_status = SUCCESS`

#### Tỷ Giá SOL/USD
- Lấy từ Binance API: `https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT`
- Fallback: 150 USD/SOL nếu API không khả dụng

---

## 12. REAL-TIME FEATURES

### 12.1. Socket.IO Setup

**Backend (server.js):**
```javascript
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

app.set('io', io);
```

**Frontend:**
```javascript
import io from 'socket.io-client';
const socket = io('http://localhost:5000');
```

### 12.2. Events

#### Client → Server

**join-campaign:**
```javascript
socket.emit('join-campaign', campaignId);
```
- Client join room `campaign-{id}` để nhận updates

**leave-campaign:**
```javascript
socket.emit('leave-campaign', campaignId);
```
- Client leave room khi rời trang

#### Server → Client

**new-donation:**
```javascript
io.to(`campaign-${campaignId}`).emit('new-donation', {
  donation: {...},
  campaign: {...}
});
```
- Emit khi có donation mới
- Tất cả client trong room nhận event

### 12.3. Real-time Updates

**CampaignDetail.js:**
- Join room khi component mount
- Listen `new-donation` event
- Cập nhật:
  - Progress bar
  - Danh sách donations
  - Top donors
- Leave room khi unmount

---

## 13. QUẢN LÝ HÌNH ẢNH

### 13.1. Upload Strategy

**Workflow:**
1. User chọn ảnh trong Block Editor
2. Upload tạm thời lên local storage (`uploads/content-images/`)
3. Trả về URL local để preview
4. Khi user nhấn "Tạo" campaign:
   - Upload thumbnail lên Cloudinary
   - Upload tất cả ảnh content lên Cloudinary
   - Replace URL local bằng URL Cloudinary trong content
   - Lưu vào database

**Lý Do:**
- Tiết kiệm tài nguyên (không upload ảnh không dùng)
- User có thể preview trước khi submit
- Dễ dàng rollback nếu user hủy

### 13.2. Cloudinary Integration

**Upload:**
- Sử dụng `cloudinary.v2.uploader.upload()`
- Transform: Auto-format, quality optimization
- Trả về `secure_url`

**Delete:**
- Khi xóa campaign → Xóa tất cả ảnh liên quan
- Sử dụng `cloudinary.v2.uploader.destroy()`

### 13.3. Image Processing

**Sharp:**
- Resize, optimize ảnh
- Embed logo Solana vào QR code
- Convert format (PNG, JPEG)
- Quality optimization

**File Size Limit:**
- Max 10MB cho mỗi ảnh
- Validation ở cả frontend và backend (Multer)

---

## 14. BẢO MẬT

### 14.1. Authentication & Authorization

#### JWT Token
- **Algorithm:** HS256
- **Expiration:** 7 ngày
- **Storage:** localStorage (frontend)
- **Middleware:** `authenticate`, `isAdmin`, `optionalAuth`

#### Password Security
- **Hashing:** bcrypt với salt rounds = 10
- **Validation:** Tối thiểu 6 ký tự
- **Không lưu plain text** trong database

#### Google OAuth
- Verify token với Google Auth Library
- Kiểm tra `google_id` và `email` để tránh duplicate

### 14.2. API Security

#### CORS
- Chỉ cho phép origin từ `FRONTEND_URL`
- Methods: GET, POST, PUT, DELETE, PATCH

#### Rate Limiting
- Có thể thêm rate limiting middleware (chưa implement)

#### Input Validation
- Validate tất cả input từ client
- Sanitize HTML content
- SQL injection prevention (sử dụng prepared statements)

### 14.3. File Upload Security

#### Validation
- Chỉ cho phép image files (jpeg, jpg, png, gif, webp)
- Max file size: 10MB
- Validate MIME type

#### Storage
- Upload tạm thời lên local storage
- Final upload lên Cloudinary (CDN)
- Xóa file tạm sau khi upload Cloudinary

### 14.4. Database Security

#### Prepared Statements
- Tất cả queries sử dụng prepared statements (MySQL2)
- Tránh SQL injection

#### Connection Pooling
- Sử dụng connection pool từ MySQL2
- Giới hạn số lượng connections

### 14.5. Environment Variables

**Backend .env:**
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=fundraise_app
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# PayOS
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RECEIVER_WALLET=...

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# Google OAuth
GOOGLE_CLIENT_ID=...
```

**Lưu Ý:**
- Không commit file `.env` lên Git
- Sử dụng `.env.example` làm template
- Rotate secrets định kỳ trong production

---

## 15. TRIỂN KHAI

### 15.1. Yêu Cầu Hệ Thống

#### Backend
- Node.js >= 14.0.0
- MySQL >= 5.7
- npm hoặc yarn

#### Frontend
- Node.js >= 14.0.0
- npm hoặc yarn

### 15.2. Cài Đặt

#### 1. Clone Repository
```bash
git clone https://github.com/cybell196/DoAnWebsiteGayQuy.git
cd DoAnWebsiteGayQuy
```

#### 2. Database Setup
```bash
# Tạo database và import schema
mysql -u root -p < db.sql
```

#### 3. Backend Setup
```bash
cd backend
npm install

# Tạo file .env
cp .env.example .env
# Điền các giá trị cần thiết

# Chạy server
npm start
# hoặc
npm run dev  # với nodemon
```

#### 4. Frontend Setup
```bash
cd frontend
npm install

# Chạy development server
npm start
```

### 15.3. Production Deployment

#### Backend (Node.js/Express)

**Option 1: PM2**
```bash
npm install -g pm2
pm2 start server.js --name fundraise-backend
pm2 save
pm2 startup
```

**Option 2: Docker**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**Option 3: Heroku**
```bash
heroku create fundraise-backend
git push heroku main
```

#### Frontend (React)

**Build:**
```bash
cd frontend
npm run build
```

**Serve với Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Serve với Netlify/Vercel:**
- Upload folder `build` lên Netlify/Vercel
- Cấu hình proxy `/api` đến backend URL

### 15.4. Database Migration

**Production:**
- Backup database trước khi deploy
- Chạy migration scripts nếu có
- Test connection trước khi start server

### 15.5. Environment Variables (Production)

**Backend:**
- Sử dụng environment variables từ hosting provider
- Không hardcode secrets
- Rotate JWT_SECRET định kỳ

**Frontend:**
- Cấu hình `REACT_APP_API_URL` trong build
- Hoặc sử dụng proxy trong Nginx

### 15.6. Monitoring & Logging

#### Logging
- Sử dụng `console.log`, `console.error` cho development
- Production: Sử dụng Winston hoặc Morgan
- Log errors, API calls, payment transactions

#### Monitoring
- Health check endpoint: `GET /api/health`
- Monitor database connections
- Monitor payment gateway status
- Monitor Solana RPC connection

### 15.7. Backup

#### Database
- Backup MySQL định kỳ (daily)
- Lưu backup ở nhiều nơi (local, cloud)

#### Images
- Cloudinary tự động backup
- Có thể export images nếu cần

---

## 16. TESTING

### 16.1. Manual Testing

#### Authentication
- ✅ Đăng ký với email mới
- ✅ Đăng ký với email đã tồn tại (error)
- ✅ Xác thực OTP
- ✅ Đăng nhập với email/password đúng
- ✅ Đăng nhập với email/password sai (error)
- ✅ Đăng nhập Google OAuth
- ✅ Đăng xuất

#### Campaigns
- ✅ Tạo chiến dịch (USER → PENDING, ADMIN → APPROVED)
- ✅ Xem danh sách chiến dịch (phân quyền)
- ✅ Xem chi tiết chiến dịch (phân quyền)
- ✅ Sửa chiến dịch (owner only, status check)
- ✅ Xóa chiến dịch (owner/admin, status check)
- ✅ Duyệt/từ chối chiến dịch (admin only)
- ✅ Kết thúc chiến dịch
- ✅ Tự động kết thúc khi đủ target

#### Donations
- ✅ Quyên góp PayOS (flow đầy đủ)
- ✅ Quyên góp Solana (flow đầy đủ)
- ✅ Real-time update khi có donation mới
- ✅ Xem lịch sử quyên góp
- ✅ Ẩn danh (is_public = false)

#### Notifications
- ✅ Nhận thông báo khi campaign được duyệt/từ chối
- ✅ Admin nhận thông báo khi có campaign mới
- ✅ Đánh dấu đã đọc
- ✅ Badge số lượng chưa đọc

### 16.2. Edge Cases

#### Đã Test
- ✅ Chiến dịch hết hạn tự động ENDED
- ✅ Chiến dịch đủ target tự động ENDED
- ✅ QR code Solana hết hạn (5 phút)
- ✅ Transaction Solana không tìm thấy
- ✅ PayOS payment cancelled
- ✅ File upload quá lớn (>10MB)
- ✅ Email OTP hết hạn (10 phút)
- ✅ Duplicate email đăng ký
- ✅ Unauthorized access (403)
- ✅ Campaign không tồn tại (404)

### 16.3. Performance Testing

#### Đã Kiểm Tra
- ✅ Load danh sách 100+ campaigns
- ✅ Real-time update với nhiều user cùng lúc
- ✅ Upload nhiều ảnh trong content
- ✅ QR code generation performance

---

## 17. HẠN CHẾ VÀ HƯỚNG PHÁT TRIỂN

### 17.1. Hạn Chế Hiện Tại

1. **Thanh Toán Solana:**
   - Chỉ hỗ trợ Solana Devnet (testnet)
   - Cần chuyển sang Mainnet cho production
   - Transaction verification có thể chậm (polling 10s)

2. **Email OTP:**
   - Phụ thuộc vào Gmail SMTP
   - Có thể bị rate limit nếu gửi nhiều
   - Nên sử dụng email service chuyên nghiệp (SendGrid, Mailgun)

3. **Real-time:**
   - Socket.IO có thể không scale tốt với nhiều connections
   - Nên sử dụng Redis adapter cho multi-server

4. **Image Upload:**
   - Upload tạm thời lên local storage
   - Có thể gây vấn đề với multiple servers
   - Nên sử dụng S3 hoặc Cloudinary ngay từ đầu

5. **Database:**
   - Chưa có indexing tối ưu cho một số queries
   - Chưa có database replication
   - Chưa có backup tự động

### 17.2. Hướng Phát Triển

#### Ngắn Hạn
- [ ] Thêm phương thức thanh toán khác (VNPay, Momo trực tiếp)
- [ ] Thêm tính năng bình luận cho chiến dịch
- [ ] Thêm tính năng chia sẻ lên mạng xã hội
- [ ] Thêm email notification cho donation
- [ ] Thêm tính năng tìm kiếm chiến dịch
- [ ] Thêm filter theo category, amount range
- [ ] Thêm pagination cho danh sách campaigns/donations

#### Trung Hạn
- [ ] Mobile app (React Native)
- [ ] Admin dashboard với charts/analytics
- [ ] Export báo cáo (PDF, Excel)
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Push notifications (browser, mobile)
- [ ] Tính năng follow/unfollow campaign
- [ ] Tính năng campaign updates (owner có thể post updates)

#### Dài Hạn
- [ ] Blockchain integration (NFT rewards)
- [ ] AI recommendation (gợi ý chiến dịch)
- [ ] Social features (groups, communities)
- [ ] Crowdfunding analytics dashboard
- [ ] Integration với các nền tảng gây quỹ khác
- [ ] White-label solution (cho phép tổ chức tự host)

---

## 18. KẾT LUẬN

### 18.1. Tổng Kết

Website Gây Quỹ Trực Tuyến đã được xây dựng thành công với đầy đủ các chức năng cơ bản và nâng cao:

✅ **Authentication & Authorization:**
- Đăng ký/đăng nhập với OTP email
- Google OAuth integration
- JWT-based authentication
- Role-based access control (USER/ADMIN)

✅ **Campaign Management:**
- Tạo, sửa, xóa chiến dịch
- Block Editor cho nội dung phong phú
- Upload và quản lý hình ảnh
- Hệ thống duyệt chiến dịch
- Tự động kết thúc khi đủ target hoặc hết hạn

✅ **Donation System:**
- Hỗ trợ 2 phương thức thanh toán: PayOS và Solana
- Real-time updates với Socket.IO
- Chuẩn hóa số tiền về USD
- Lịch sử quyên góp đầy đủ

✅ **Real-time Features:**
- Cập nhật tiến độ gây quỹ real-time
- Thông báo tự động
- Notification bell với badge

✅ **Admin Panel:**
- Duyệt/từ chối chiến dịch
- Quản lý toàn bộ hệ thống
- Xem tất cả quyên góp

✅ **Security:**
- Password hashing với bcrypt
- JWT token authentication
- Input validation
- SQL injection prevention
- File upload security

### 18.2. Đóng Góp

Dự án đã áp dụng các công nghệ và kỹ thuật hiện đại:

- **Frontend:** React với Hooks, Context API, Socket.IO client
- **Backend:** Node.js/Express với RESTful API, Socket.IO server
- **Database:** MySQL với schema được thiết kế chuẩn
- **Payment:** Tích hợp PayOS và Solana Pay
- **Real-time:** Socket.IO cho updates tức thời
- **Image Storage:** Cloudinary CDN
- **Email:** SMTP với Nodemailer

### 18.3. Kinh Nghiệm Rút Ra

1. **Blockchain Integration:**
   - Solana Pay integration đòi hỏi hiểu rõ về blockchain
   - Transaction verification cần xử lý cẩn thận để tránh false positives
   - Reference key matching là phương pháp an toàn nhất

2. **Real-time Communication:**
   - Socket.IO rất mạnh mẽ cho real-time features
   - Cần quản lý rooms và connections cẩn thận
   - Cleanup khi component unmount là quan trọng

3. **Image Management:**
   - Upload tạm thời trước khi final upload giúp UX tốt hơn
   - Cloudinary CDN giúp tối ưu performance
   - Cần xử lý cleanup ảnh không dùng

4. **Payment Gateway:**
   - PayOS integration khá đơn giản với SDK
   - Solana Pay cần hiểu rõ về Solana blockchain
   - Tỷ giá exchange rate cần update thường xuyên

5. **Security:**
   - JWT token cần được bảo vệ cẩn thận
   - Input validation là bắt buộc
   - Environment variables không được commit

### 18.4. Ứng Dụng Thực Tế

Website có thể được sử dụng cho:

- **Tổ chức từ thiện:** Gây quỹ cho các hoạt động nhân đạo
- **Cá nhân:** Gây quỹ cho mục đích cá nhân (y tế, giáo dục)
- **Startup:** Crowdfunding cho dự án khởi nghiệp
- **Sự kiện:** Gây quỹ cho các sự kiện cộng đồng

### 18.5. Lời Cảm Ơn

Dự án đã được xây dựng với sự hỗ trợ từ:

- **Cộng đồng Open Source:** React, Node.js, Express, và các thư viện khác
- **Documentation:** Solana Pay, PayOS, Cloudinary documentation
- **Testing:** Các công cụ testing và debugging

---

## 19. TÀI LIỆU THAM KHẢO

### 19.1. Documentation

1. **React Documentation**
   - https://react.dev/

2. **Node.js Documentation**
   - https://nodejs.org/en/docs/

3. **Express.js Documentation**
   - https://expressjs.com/

4. **Socket.IO Documentation**
   - https://socket.io/docs/

5. **Solana Pay Documentation**
   - https://docs.solanapay.com/

6. **PayOS Documentation**
   - https://payos.vn/docs/

7. **Cloudinary Documentation**
   - https://cloudinary.com/documentation

8. **MySQL Documentation**
   - https://dev.mysql.com/doc/

### 19.2. Libraries & Packages

- **@solana/web3.js:** https://solana-labs.github.io/solana-web3.js/
- **@solana/pay:** https://github.com/solana-labs/solana-pay
- **@payos/node:** https://www.npmjs.com/package/@payos/node
- **bcryptjs:** https://www.npmjs.com/package/bcryptjs
- **jsonwebtoken:** https://www.npmjs.com/package/jsonwebtoken
- **multer:** https://www.npmjs.com/package/multer
- **qrcode:** https://www.npmjs.com/package/qrcode
- **sharp:** https://sharp.pixelplumbing.com/

### 19.3. APIs

- **Binance API:** https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT
- **Exchange Rate API:** (có thể sử dụng các API miễn phí)
- **Solana Devnet RPC:** https://api.devnet.solana.com

### 19.4. Best Practices

- **RESTful API Design:** https://restfulapi.net/
- **JWT Best Practices:** https://datatracker.ietf.org/doc/html/rfc7519
- **OWASP Security:** https://owasp.org/
- **React Best Practices:** https://react.dev/learn

---

## 20. PHỤ LỤC

### 20.1. Cấu Trúc Database (ERD)

```
users (1) ──< (N) campaigns
users (1) ──< (N) donations
campaigns (1) ──< (N) donations
campaigns (1) ──< (1) campaign_contents
campaigns (1) ──< (N) notifications
donations (1) ──< (N) transactions
payment_methods (1) ──< (N) transactions
users (1) ──< (N) notifications
```

### 20.2. API Response Examples

#### Success Response
```json
{
  "message": "Success",
  "data": {...}
}
```

#### Error Response
```json
{
  "message": "Error message",
  "error": "Detailed error"
}
```

### 20.3. Environment Variables Template

**backend/.env.example:**
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fundraise_app
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=

SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RECEIVER_WALLET=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

GOOGLE_CLIENT_ID=
```

### 20.4. Git Workflow

```bash
# Clone repository
git clone https://github.com/cybell196/DoAnWebsiteGayQuy.git

# Create branch
git checkout -b feature/new-feature

# Commit changes
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
```

### 20.5. Troubleshooting

#### Lỗi "Cannot find module 'google-auth-library'"
- **Nguyên nhân:** Module chưa được cài đặt
- **Giải pháp:** Chạy `npm install` trong thư mục `backend`

#### Lỗi "File too large"
- **Nguyên nhân:** File > 10MB
- **Giải pháp:** Giảm kích thước file hoặc tăng limit trong Multer

#### Lỗi "Transaction not found" (Solana)
- **Nguyên nhân:** Transaction chưa được confirm hoặc reference key không khớp
- **Giải pháp:** Kiểm tra transaction trên Solscan, verify reference key

#### Lỗi "SMTP connection failed"
- **Nguyên nhân:** SMTP credentials sai hoặc chưa enable "Less secure app access"
- **Giải pháp:** Sử dụng App Password thay vì mật khẩu thường

---

## KẾT THÚC TÀI LIỆU

**Tài liệu này cung cấp đầy đủ thông tin về:**
- Kiến trúc và công nghệ sử dụng
- Các chức năng chi tiết
- Luồng hoạt động
- API documentation
- Hướng dẫn triển khai
- Testing và troubleshooting

**Đủ để viết quyển đồ án tốt nghiệp với các phần:**
1. Tổng quan đề tài
2. Phân tích yêu cầu
3. Thiết kế hệ thống
4. Cài đặt và triển khai
5. Kết quả và đánh giá
6. Kết luận và hướng phát triển

---

**Ngày hoàn thành:** 2024  
**Phiên bản:** 1.0  
**Tác giả:** [Tên sinh viên]  
**Giảng viên hướng dẫn:** [Tên giảng viên]