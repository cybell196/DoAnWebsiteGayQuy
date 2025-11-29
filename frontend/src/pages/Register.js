import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './Auth.css';

const Register = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Info
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [formData, setFormData] = useState({
    fullname: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError('');
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); // Only numbers, max 6 digits
    setError('');
  };

  const handleFormDataChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Vui lòng nhập email');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/send-otp', { email });
      setOtpSent(true);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi mã OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!otp || otp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 số OTP');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      setVerificationToken(response.data.verificationToken);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Mã OTP không đúng');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Register
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        email,
        fullname: formData.fullname,
        password: formData.password,
        verificationToken
      });
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Google Register
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError('');
      const response = await api.post('/auth/google', {
        credential: credentialResponse.credential
      });
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký Google thất bại');
    }
  };

  const handleGoogleError = () => {
    setError('Đăng ký Google thất bại');
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    setOtp('');
    try {
      await api.post('/auth/send-otp', { email });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Đăng Ký</h2>
        {error && <div className="alert alert-error">{error}</div>}
        
        {/* Step 1: Email */}
        {step === 1 && (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Nhập email của bạn"
                required
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>
            <div className="auth-divider">
              <span>Hoặc</span>
            </div>
            <div className="google-login-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                text="signup_with"
                shape="rectangular"
                theme="outline"
                size="large"
                width="100%"
              />
            </div>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label>Mã OTP</label>
              <input
                type="text"
                name="otp"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Nhập 6 số OTP"
                maxLength={6}
                required
                disabled={loading}
                style={{ 
                  textAlign: 'center', 
                  fontSize: '24px', 
                  letterSpacing: '8px',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                Mã OTP đã được gửi đến <strong>{email}</strong>
              </p>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </button>
            <button
              type="button"
              onClick={handleResendOTP}
              className="btn btn-secondary btn-block"
              disabled={loading}
              style={{ marginTop: '12px' }}
            >
              Gửi lại mã OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
              }}
              className="btn btn-link btn-block"
              style={{ marginTop: '8px' }}
            >
              Quay lại
            </button>
          </form>
        )}

        {/* Step 3: Info */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Họ và Tên</label>
              <input
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleFormDataChange}
                placeholder="Nhập họ và tên"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Mật Khẩu</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleFormDataChange}
                placeholder="Tối thiểu 6 ký tự"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Xác Nhận Mật Khẩu</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleFormDataChange}
                placeholder="Nhập lại mật khẩu"
                required
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(2);
                setError('');
              }}
              className="btn btn-link btn-block"
              style={{ marginTop: '8px' }}
            >
              Quay lại
            </button>
          </form>
        )}

        <p className="auth-link">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

