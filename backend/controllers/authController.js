const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { OAuth2Client } = require('google-auth-library');
const { sendOTPEmail } = require('../services/emailService');

// Send OTP
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check rate limiting: max 3 OTP requests per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recentOTPs] = await pool.execute(
      'SELECT COUNT(*) as count FROM email_verifications WHERE email = ? AND created_at > ?',
      [email, oneHourAgo]
    );

    if (recentOTPs[0].count >= 3) {
      return res.status(429).json({ 
        message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.' 
      });
    }

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();

    // Set expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old unverified OTPs for this email
    await pool.execute(
      'DELETE FROM email_verifications WHERE email = ? AND verified = FALSE',
      [email]
    );

    // Save OTP to database
    await pool.execute(
      'INSERT INTO email_verifications (email, otp_code, expires_at) VALUES (?, ?, ?)',
      [email, otpCode, expiresAt]
    );

    // Send OTP email
    try {
      await sendOTPEmail(email, otpCode);
      res.json({ 
        success: true, 
        message: 'Mã OTP đã được gửi đến email của bạn' 
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Delete the OTP record if email fails
      await pool.execute(
        'DELETE FROM email_verifications WHERE email = ? AND otp_code = ?',
        [email, otpCode]
      );
      
      // Provide more specific error messages
      let errorMessage = 'Không thể gửi email. Vui lòng thử lại sau.';
      if (emailError.message?.includes('SMTP')) {
        errorMessage = 'Cấu hình email chưa đúng. Vui lòng liên hệ quản trị viên.';
      } else if (emailError.code === 'EAUTH') {
        errorMessage = 'Lỗi xác thực email. Vui lòng kiểm tra cấu hình SMTP.';
      } else if (emailError.code === 'ECONNECTION') {
        errorMessage = 'Không thể kết nối đến máy chủ email. Vui lòng thử lại sau.';
      }
      
      return res.status(500).json({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find the most recent unverified OTP for this email
    const [otpRecords] = await pool.execute(
      'SELECT * FROM email_verifications WHERE email = ? AND verified = FALSE ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'Không tìm thấy mã OTP. Vui lòng gửi lại mã OTP.' });
    }

    const otpRecord = otpRecords[0];

    // Check if OTP is expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      return res.status(400).json({ message: 'Mã OTP không đúng.' });
    }

    // Mark OTP as verified
    await pool.execute(
      'UPDATE email_verifications SET verified = TRUE WHERE id = ?',
      [otpRecord.id]
    );

    // Create a temporary verification token (valid for 15 minutes)
    const verificationToken = jwt.sign(
      { email, otpId: otpRecord.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'Xác thực OTP thành công',
      verificationToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register (updated to require OTP verification)
const register = async (req, res) => {
  try {
    const { fullname, email, password, verificationToken } = req.body;

    if (!fullname || !email || !password || !verificationToken) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify the verification token
    let decoded;
    try {
      decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Token xác thực không hợp lệ hoặc đã hết hạn' });
    }

    // Check if email matches
    if (decoded.email !== email) {
      return res.status(400).json({ message: 'Email không khớp với token xác thực' });
    }

    // Check if OTP was verified
    const [otpRecord] = await pool.execute(
      'SELECT * FROM email_verifications WHERE id = ? AND email = ? AND verified = TRUE',
      [decoded.otpId, email]
    );

    if (otpRecord.length === 0) {
      return res.status(400).json({ message: 'Email chưa được xác thực. Vui lòng xác thực OTP trước.' });
    }

    // Check if user already exists (double check)
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (fullname, email, password_hash, auth_provider) VALUES (?, ?, ?, ?)',
      [fullname, email, passwordHash, 'local']
    );

    // Delete used OTP records for this email
    await pool.execute(
      'DELETE FROM email_verifications WHERE email = ?',
      [email]
    );

    const token = jwt.sign(
      { id: result.insertId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        fullname,
        email,
        role: 'USER'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, fullname, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, fullname, role, avatar, auth_provider, password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = users[0];
    // Add has_password flag (true if password_hash exists and is not null)
    user.has_password = !!user.password_hash;
    // Don't send password_hash to client
    delete user.password_hash;

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { fullname } = req.body;

    if (!fullname) {
      return res.status(400).json({ message: 'Fullname is required' });
    }

    // Update user - email cannot be changed
    await pool.execute(
      'UPDATE users SET fullname = ? WHERE id = ?',
      [fullname, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Get current user with password
    const [users] = await pool.execute(
      'SELECT password_hash, auth_provider FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    const hasPassword = !!user.password_hash;

    // If user has password, require current password
    if (hasPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Mật khẩu hiện tại là bắt buộc' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
      }
    }
    // If user doesn't have password (Google login), allow setting password without current password

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and set auth_provider to 'local' if it was 'google'
    // This allows user to login with both methods
    await pool.execute(
      'UPDATE users SET password_hash = ?, auth_provider = ? WHERE id = ?',
      [passwordHash, hasPassword ? user.auth_provider : 'local', req.user.id]
    );

    res.json({ 
      message: hasPassword ? 'Đổi mật khẩu thành công' : 'Đặt mật khẩu thành công. Bạn có thể đăng nhập bằng email và mật khẩu.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Google Login
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body; // Google ID token

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify Google ID token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let ticket;
    
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('Google token verification error:', error);
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google' });
    }

    // Normalize Google avatar URL để đảm bảo hiển thị đúng
    // Google avatar URLs thường cần tham số =s96-c để hiển thị đúng kích thước
    let normalizedPicture = picture;
    if (picture && picture.includes('googleusercontent.com')) {
      // Loại bỏ các tham số cũ nếu có
      const baseUrl = picture.split('?')[0].split('=')[0];
      // Thêm tham số để đảm bảo kích thước và format: =s96-c (size 96px, crop to circle)
      normalizedPicture = `${baseUrl}=s96-c`;
    }

    // Check if user exists by email
    const [existingUsers] = await pool.execute(
      'SELECT id, email, password_hash, fullname, role, auth_provider, google_id, avatar FROM users WHERE email = ?',
      [email]
    );

    let user;

    if (existingUsers.length > 0) {
      // User exists - allow Google login even if email has password
      user = existingUsers[0];
      
      // Update google_id and auth_provider if needed
      // If user has both local and Google login, set auth_provider to 'google'
      // This allows user to login with either method
      const updates = [];
      const updateValues = [];
      
      if (user.google_id !== googleId) {
        updates.push('google_id = ?');
        updateValues.push(googleId);
      }
      
      // Update auth_provider to 'google' to allow both login methods
      if (user.auth_provider !== 'google') {
        updates.push('auth_provider = ?');
        updateValues.push('google');
      }
      
      // Update avatar if Google provides one and user doesn't have one
      if (normalizedPicture && !user.avatar) {
        updates.push('avatar = ?');
        updateValues.push(normalizedPicture);
      }
      
      // Update fullname if Google provides one and it's different
      if (name && name !== user.fullname) {
        updates.push('fullname = ?');
        updateValues.push(name);
      }
      
      if (updates.length > 0) {
        updateValues.push(user.id);
        await pool.execute(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          updateValues
        );
        
        // Refresh user data after update
        const [updatedUsers] = await pool.execute(
          'SELECT id, email, fullname, role, avatar FROM users WHERE id = ?',
          [user.id]
        );
        if (updatedUsers.length > 0) {
          user = updatedUsers[0];
        }
      }
    } else {
      // Create new user
      const [result] = await pool.execute(
        'INSERT INTO users (email, fullname, avatar, google_id, auth_provider, password_hash) VALUES (?, ?, ?, ?, ?, NULL)',
        [email, name || email.split('@')[0], normalizedPicture || null, googleId, 'google']
      );

      // Get the new user
      const [newUsers] = await pool.execute(
        'SELECT id, email, fullname, role, avatar FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUsers[0];
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, googleLogin, sendOTP, verifyOTP };

