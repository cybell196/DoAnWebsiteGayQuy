# 📋 MÔ TẢ CÁC CHỨC NĂNG ĐÃ XÂY DỰNG

## 🎯 TỔNG QUAN DỰ ÁN

**Tên dự án:** Website Gây Quỹ (Fundraising Website)  
**Công nghệ:** React (Frontend) + Node.js/Express (Backend) + MySQL (Database)  
**Mục đích:** Nền tảng gây quỹ trực tuyến với quản lý chiến dịch, quyên góp và thông báo real-time

---

## 👥 PHÂN QUYỀN NGƯỜI DÙNG

### 1. **Khách vãng lai (Guest)**
- Xem danh sách chiến dịch đã được duyệt (APPROVED và đang diễn ra)
- Xem chi tiết chiến dịch
- Lọc chiến dịch: Đang Diễn Ra / Đã Kết Thúc
- Không thể quyên góp (cần đăng nhập)

### 2. **Người dùng (USER)**
- Tất cả quyền của Guest
- Đăng ký / Đăng nhập tài khoản
- Tạo chiến dịch gây quỹ
- Quản lý chiến dịch của mình
- Quyên góp cho chiến dịch
- Xem lịch sử quyên góp
- Quản lý hồ sơ cá nhân
- Nhận thông báo

### 3. **Quản trị viên (ADMIN)**
- Tất cả quyền của USER
- Xem tất cả chiến dịch (mọi trạng thái)
- Duyệt/từ chối chiến dịch
- Kết thúc chiến dịch sớm
- Xóa bất kỳ chiến dịch nào
- Xem tất cả quyên góp
- Nhận thông báo khi có chiến dịch mới

---

## 🔐 CHỨC NĂNG XÁC THỰC (Authentication)

### Đăng ký (Register)
- **Route:** `POST /api/auth/register`
- **Tính năng:**
  - Đăng ký với email, password, fullname
  - Kiểm tra email trùng lặp
  - Mã hóa password bằng bcrypt
  - Tự động đăng nhập sau khi đăng ký
  - Mặc định role: USER

### Đăng nhập (Login)
- **Route:** `POST /api/auth/login`
- **Tính năng:**
  - Xác thực email/password
  - Tạo JWT token (hết hạn 7 ngày)
  - Trả về thông tin user (id, email, fullname, role)

### Lấy thông tin user hiện tại
- **Route:** `GET /api/auth/me`
- **Tính năng:**
  - Lấy thông tin user từ JWT token
  - Dùng để kiểm tra trạng thái đăng nhập

---

## 📢 CHỨC NĂNG CHIẾN DỊCH (Campaigns)

### 1. **Tạo Chiến Dịch**
- **Route:** `POST /api/campaigns`
- **Tính năng:**
  - Tạo chiến dịch với:
    - Tiêu đề, mục tiêu (USD), danh mục
    - Ngày bắt đầu/kết thúc
    - Ảnh đại diện (thumbnail)
    - Nội dung dài (Block Editor)
    - Nhiều ảnh minh họa (embedded trong content)
  - **Block Editor:** H1, Quote, Body Text, Image
  - **Logic đặc biệt:**
    - Admin tạo → Tự động APPROVED
    - User tạo → Trạng thái PENDING (chờ duyệt)
  - **Thông báo:** Admin nhận thông báo khi user tạo chiến dịch mới

### 2. **Xem Danh Sách Chiến Dịch**
- **Route:** `GET /api/campaigns?filter=active|ended|all`
- **Tính năng:**
  - **Guest/User:** Chỉ thấy APPROVED và đang diễn ra (không ENDED)
  - **Admin:** Thấy tất cả (có thể filter)
  - **Filter:**
    - `active`: Chiến dịch đang diễn ra
    - `ended`: Chiến dịch đã kết thúc
    - `all`: Tất cả (chỉ Admin)
  - Hiển thị: Thumbnail, title, creator, category, progress bar, current/goal amount

### 3. **Xem Chi Tiết Chiến Dịch**
- **Route:** `GET /api/campaigns/:id`
- **Tính năng:**
  - **Guest/User:** Chỉ xem được APPROVED và đang diễn ra
  - **Owner:** Xem được chiến dịch của mình (mọi trạng thái)
  - **Admin:** Xem được tất cả
  - Hiển thị đầy đủ: Content, images, progress, donations list

### 4. **Sửa Chiến Dịch**
- **Route:** `PUT /api/campaigns/:id`
- **Tính năng:**
  - Chỉ owner mới được sửa
  - Chỉ sửa được khi status = PENDING hoặc REJECTED
  - Có thể cập nhật: Title, goal, category, dates, thumbnail, content, images

### 5. **Xóa Chiến Dịch**
- **Route:** `DELETE /api/campaigns/:id`
- **Tính năng:**
  - Owner: Chỉ xóa được khi chưa APPROVED
  - Admin: Xóa được bất kỳ chiến dịch nào

### 6. **Kết Thúc Chiến Dịch**
- **Route:** `POST /api/campaigns/:id/end`
- **Tính năng:**
  - Owner hoặc Admin có thể kết thúc sớm
  - Chuyển status sang ENDED
  - Tự động disable donate form

### 7. **Duyệt/Từ Chối Chiến Dịch (Admin)**
- **Route:** `PATCH /api/campaigns/:id/status`
- **Tính năng:**
  - Admin duyệt → Status: APPROVED
  - Admin từ chối → Status: REJECTED
  - **Thông báo:** User nhận thông báo khi chiến dịch được duyệt/từ chối

### 8. **Xem Chiến Dịch Của Tôi**
- **Route:** `GET /api/campaigns/my-campaigns`
- **Tính năng:**
  - Hiển thị tất cả chiến dịch của user đã đăng nhập
  - Bao gồm mọi trạng thái (PENDING, APPROVED, REJECTED, ENDED)
  - Có thể sửa/xóa/kết thúc tùy theo trạng thái

### 9. **Tự Động Kết Thúc Khi Đủ Target**
- **Logic:** Khi donation đủ goal_amount → Tự động chuyển status sang ENDED
- **Vị trí:** Trong `donationController.js` sau khi tạo donation

---

## 💰 CHỨC NĂNG QUYÊN GÓP (Donations)

### 1. **Quyên Góp**
- **Route:** `POST /api/donations`
- **Tính năng:**
  - Chỉ quyên góp được cho chiến dịch APPROVED và chưa ENDED
  - Chuẩn hóa số tiền sang USD
  - Lưu message (tùy chọn)
  - Lưu is_public (hiển thị tên hoặc Anonymous)
  - **Real-time:** Socket.IO emit event cho tất cả người đang xem
  - **Tự động:** Cập nhật current_amount của campaign
  - **Thông báo:** Campaign owner nhận thông báo khi có donation mới

### 2. **Xem Danh Sách Quyên Góp Của Chiến Dịch**
- **Route:** `GET /api/donations/campaign/:campaign_id`
- **Tính năng:**
  - Hiển thị tất cả donations của 1 campaign
  - Ẩn tên nếu is_public = FALSE (hiển thị "Anonymous")
  - Real-time update khi có donation mới

### 3. **Xem Lịch Sử Quyên Góp Của User**
- **Route:** `GET /api/donations/my-donations`
- **Tính năng:**
  - Hiển thị tất cả donations của user đã đăng nhập
  - Kèm thông tin campaign (title, thumbnail)
  - Sắp xếp theo thời gian (mới nhất trước)

### 4. **Xem Tất Cả Quyên Góp (Admin)**
- **Route:** `GET /api/donations/all`
- **Tính năng:**
  - Admin xem tất cả donations của mọi campaign
  - Hiển thị: Campaign, donor, amount, message, date

---

## 🔔 CHỨC NĂNG THÔNG BÁO (Notifications)

### 1. **Các Loại Thông Báo**
- **CAMPAIGN_APPROVED:** Chiến dịch được duyệt
- **CAMPAIGN_REJECTED:** Chiến dịch bị từ chối
- **NEW_CAMPAIGN:** Có chiến dịch mới (chỉ Admin nhận)

### 2. **Xem Thông Báo**
- **Route:** `GET /api/notifications`
- **Tính năng:**
  - Lấy tất cả thông báo của user
  - Kèm thông tin campaign (nếu có)
  - Sắp xếp theo thời gian (mới nhất trước)

### 3. **Đếm Thông Báo Chưa Đọc**
- **Route:** `GET /api/notifications/unread-count`
- **Tính năng:**
  - Trả về số lượng thông báo chưa đọc
  - Hiển thị badge trên notification bell

### 4. **Đánh Dấu Đã Đọc**
- **Route:** `PATCH /api/notifications/:id/read`
- **Tính năng:**
  - Đánh dấu 1 thông báo đã đọc

### 5. **Đánh Dấu Tất Cả Đã Đọc**
- **Route:** `PATCH /api/notifications/all/read`
- **Tính năng:**
  - Đánh dấu tất cả thông báo đã đọc

### 6. **Notification Bell Component**
- **Vị trí:** Navbar
- **Tính năng:**
  - Hiển thị badge số thông báo chưa đọc
  - Dropdown danh sách thông báo
  - Click vào thông báo → Đánh dấu đã đọc + Chuyển đến campaign
  - Auto refresh mỗi 30 giây

---

## 👤 CHỨC NĂNG HỒ SƠ (Profile)

### 1. **Xem Hồ Sơ**
- **Route:** `/profile`
- **Tính năng:**
  - 3 tabs: Thông Tin Cá Nhân, Đã Quyên Góp, Chiến Dịch Đã Tạo

### 2. **Tab: Thông Tin Cá Nhân**
- **Cập nhật thông tin:**
  - **Route:** `PUT /api/auth/profile`
  - Cập nhật fullname, email
  - Kiểm tra email trùng lặp
- **Đổi mật khẩu:**
  - **Route:** `PUT /api/auth/change-password`
  - Yêu cầu mật khẩu hiện tại
  - Xác nhận mật khẩu mới
  - Mật khẩu tối thiểu 6 ký tự
- **Đăng xuất:**
  - Nút đăng xuất với xác nhận
  - Xóa token và chuyển về trang chủ

### 3. **Tab: Đã Quyên Góp**
- Hiển thị tất cả donations của user
- Kèm thông tin campaign (title, link)
- Hiển thị: Số tiền, message, ngày quyên góp

### 4. **Tab: Chiến Dịch Đã Tạo**
- Hiển thị tất cả campaigns của user
- Kèm status badge, progress, thumbnail
- Link đến chi tiết campaign

---

## 🎨 CHỨC NĂNG GIAO DIỆN (UI/UX)

### 1. **Trang Chủ (Home)**
- Hero section với stats
- Danh sách chiến dịch dạng grid
- Filter: Đang Diễn Ra / Đã Kết Thúc
- Campaign cards với progress bar
- Responsive design

### 2. **Chi Tiết Chiến Dịch**
- Hiển thị đầy đủ thông tin
- Progress bar real-time
- Donate form (disable khi chưa APPROVED hoặc đã ENDED)
- Danh sách donations real-time
- Campaign content với images

### 3. **Tạo Chiến Dịch**
- Form đầy đủ các trường
- **Block Editor:**
  - Thêm block: H1, Quote, Body Text, Image
  - Drag & drop để sắp xếp
  - Upload image cho image block
  - Xóa block
  - Di chuyển block lên/xuống

### 4. **Navbar**
- Logo/Brand
- Links: Trang Chủ, Tạo Chiến Dịch, Chiến Dịch Của Tôi, Admin Panel (nếu Admin)
- Notification Bell
- Link Profile (tên user)
- Responsive

### 5. **Admin Panel**
- 2 tabs: Quản Lý Chiến Dịch, Tất Cả Quyên Góp
- Duyệt/từ chối/kết thúc/xóa chiến dịch
- Xem tất cả donations

---

## 🔄 CHỨC NĂNG REAL-TIME

### Socket.IO Integration
- **Kết nối:** Client kết nối đến server
- **Join room:** Khi vào trang chi tiết campaign → Join room `campaign-{id}`
- **Events:**
  - `join-campaign`: Client join room
  - `leave-campaign`: Client leave room
  - `new-donation`: Server emit khi có donation mới
- **Real-time updates:**
  - Progress bar tự động cập nhật
  - Danh sách donations tự động thêm donation mới
  - Không cần refresh trang

---

## 📁 QUẢN LÝ FILE

### Upload Images
- **Route:** `POST /api/upload/image`
- **Tính năng:**
  - Upload ảnh cho content (Block Editor)
  - Lưu vào `uploads/content-images/`
  - Validate: Chỉ image files, max 5MB
  - Trả về URL để hiển thị

### Thumbnail Upload
- Upload cùng với campaign creation
- Lưu vào `uploads/`
- Hiển thị trong campaign cards và detail

---

## 🗄️ DATABASE SCHEMA

### Bảng chính:
1. **users:** Thông tin người dùng
2. **campaigns:** Chiến dịch gây quỹ
3. **campaign_contents:** Nội dung chiến dịch (HTML)
4. **campaign_images:** Ảnh minh họa (đã deprecated, dùng embedded trong content)
5. **donations:** Quyên góp
6. **notifications:** Thông báo
7. **campaign_updates:** Cập nhật chiến dịch (chưa sử dụng)
8. **payment_methods:** Phương thức thanh toán (chưa sử dụng)
9. **transactions:** Giao dịch (chưa sử dụng)

### Status Campaigns:
- **PENDING:** Chờ duyệt
- **APPROVED:** Đã duyệt (có thể nhận quyên góp)
- **REJECTED:** Đã từ chối
- **ENDED:** Đã kết thúc (không thể nhận quyên góp)

---

## 🔒 BẢO MẬT

### Authentication & Authorization
- JWT token cho authentication
- Middleware `authenticate` để bảo vệ routes
- Middleware `isAdmin` cho admin routes
- Middleware `optionalAuth` cho public routes (có thể có token hoặc không)

### Password Security
- Bcrypt hash với salt rounds = 10
- Không lưu plain text password

### File Upload Security
- Validate file type (chỉ image)
- Validate file size (max 5MB)
- Lưu với tên unique (timestamp + originalname)

---

## 📱 RESPONSIVE DESIGN

- Mobile-first approach
- Breakpoints cho tablet và mobile
- Navbar responsive với hamburger menu (nếu cần)
- Grid layout tự động điều chỉnh

---

## 🎯 LOGIC ĐẶC BIỆT

### 1. **Campaign Visibility**
- Guest/User: Chỉ thấy APPROVED và không ENDED
- Owner: Thấy chiến dịch của mình (mọi status)
- Admin: Thấy tất cả

### 2. **Donation Restrictions**
- Chỉ donate được cho APPROVED và không ENDED
- Form tự động disable khi không đủ điều kiện
- Validation ở cả frontend và backend

### 3. **Auto-approve Admin Campaigns**
- Admin tạo campaign → Tự động APPROVED
- User tạo campaign → PENDING (chờ duyệt)

### 4. **Auto-end Campaign**
- Khi current_amount >= goal_amount → Tự động ENDED
- Disable donate form ngay lập tức

### 5. **Notification Triggers**
- Admin duyệt/từ chối → User nhận thông báo
- User tạo campaign → Tất cả Admin nhận thông báo
- Có donation mới → Campaign owner nhận thông báo

---

## 📦 FILE STRUCTURE

### Backend:
```
backend/
├── config/
│   └── database.js
├── controllers/
│   ├── authController.js
│   ├── campaignController.js
│   ├── donationController.js
│   └── notificationController.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── authRoutes.js
│   ├── campaignRoutes.js
│   ├── donationRoutes.js
│   ├── notificationRoutes.js
│   └── uploadRoutes.js
├── services/
│   └── notificationService.js
├── uploads/
│   └── content-images/
└── server.js
```

### Frontend:
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── BlockEditor.js
│   │   ├── Navbar.js
│   │   ├── NotificationBell.js
│   │   └── ProtectedRoute.js
│   ├── context/
│   │   └── AuthContext.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── CampaignDetail.js
│   │   ├── CreateCampaign.js
│   │   ├── MyCampaigns.js
│   │   ├── AdminPanel.js
│   │   └── Profile.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   └── index.js
└── package.json
```

---

## ✅ CHECKLIST TÍNH NĂNG

### Authentication ✅
- [x] Đăng ký
- [x] Đăng nhập
- [x] JWT authentication
- [x] Protected routes
- [x] Role-based access (USER/ADMIN)

### Campaigns ✅
- [x] Tạo chiến dịch
- [x] Xem danh sách (với filter)
- [x] Xem chi tiết
- [x] Sửa chiến dịch
- [x] Xóa chiến dịch
- [x] Kết thúc chiến dịch
- [x] Duyệt/từ chối (Admin)
- [x] Block Editor cho content
- [x] Upload thumbnail
- [x] Upload images trong content

### Donations ✅
- [x] Quyên góp
- [x] Real-time updates
- [x] Xem danh sách donations
- [x] Lịch sử quyên góp của user
- [x] Tự động kết thúc khi đủ target

### Notifications ✅
- [x] Thông báo khi campaign được duyệt/từ chối
- [x] Thông báo khi có campaign mới (Admin)
- [x] Notification bell với badge
- [x] Đánh dấu đã đọc
- [x] Real-time notification count

### Profile ✅
- [x] Xem hồ sơ
- [x] Cập nhật thông tin
- [x] Đổi mật khẩu
- [x] Xem lịch sử quyên góp
- [x] Xem chiến dịch đã tạo
- [x] Đăng xuất

### Admin Features ✅
- [x] Xem tất cả campaigns
- [x] Duyệt/từ chối campaigns
- [x] Kết thúc campaigns
- [x] Xóa campaigns
- [x] Xem tất cả donations

### UI/UX ✅
- [x] Modern design (GiveAsia inspired)
- [x] Responsive design
- [x] Progress bars
- [x] Real-time updates
- [x] Loading states
- [x] Error handling
- [x] Success messages

---

## 🚀 DEPLOYMENT READY

- [x] Environment variables (.env)
- [x] Database migration files
- [x] Error handling
- [x] Input validation
- [x] Security best practices
- [x] Documentation (SETUP_DATABASE.md, PROJECT_FEATURES.md)

---

**Tổng kết:** Dự án đã hoàn thiện với đầy đủ các chức năng cơ bản và nâng cao cho một website gây quỹ, bao gồm authentication, campaign management, donations, notifications, real-time updates, và admin panel.

