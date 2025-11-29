const nodemailer = require('nodemailer');

// Validate SMTP configuration
const validateSMTPConfig = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration is missing. Please set SMTP_USER and SMTP_PASS in .env file');
  }
};

// Create transporter
let transporter;

try {
  validateSMTPConfig();
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS?.replace(/\s/g, ''), // Remove spaces from app password
    },
  });
  console.log('SMTP transporter initialized');
} catch (error) {
  console.error('SMTP configuration error:', error.message);
  transporter = null;
}

// Send OTP email
const sendOTPEmail = async (email, otpCode) => {
  if (!transporter) {
    throw new Error('SMTP transporter is not configured. Please check your .env file.');
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || `"Fundraise App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Mã xác thực đăng ký - Fundraise App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">Xác thực email đăng ký</h2>
          <p>Xin chào,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Fundraise App. Vui lòng sử dụng mã OTP sau để xác thực email của bạn:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #2196F3; font-size: 32px; letter-spacing: 5px; margin: 0;">${otpCode}</h1>
          </div>
          <p>Mã OTP này có hiệu lực trong <strong>10 phút</strong>.</p>
          <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Đây là email tự động, vui lòng không trả lời email này.</p>
        </div>
      `,
      text: `
        Xác thực email đăng ký
        
        Cảm ơn bạn đã đăng ký tài khoản tại Fundraise App.
        Mã OTP của bạn là: ${otpCode}
        
        Mã OTP này có hiệu lực trong 10 phút.
        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    // Log detailed error information
    if (error.response) {
      console.error('SMTP Error Response:', error.response);
    }
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    throw error;
  }
};

// Verify transporter connection
const verifyConnection = async () => {
  if (!transporter) {
    console.error('SMTP transporter is not configured');
    return false;
  }
  
  try {
    await transporter.verify();
    console.log('SMTP server is ready to send emails');
    return true;
  } catch (error) {
    console.error('SMTP connection error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  verifyConnection,
};

