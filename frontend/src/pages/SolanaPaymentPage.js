import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import './SolanaPaymentPage.css';

const SolanaPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(300); // 5 phút = 300 giây
  const pollingAttemptsRef = useRef(0);
  const pollingIntervalRef = useRef(null);
  const qrCountdownIntervalRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const isVerifiedRef = useRef(false);
  const MAX_POLLING_ATTEMPTS = 30; // 5 phút (30 * 10 giây)

  const donationId = searchParams.get('donation_id');
  const campaignId = searchParams.get('campaign_id');

  const fetchPaymentData = async () => {
    try {
      // Lấy thông tin từ localStorage nếu có (từ CampaignDetail)
      const storedPaymentData = localStorage.getItem('solanaPaymentData');
      if (storedPaymentData) {
        const data = JSON.parse(storedPaymentData);
        setPaymentData(data);
        setLoading(false);
        localStorage.removeItem('solanaPaymentData');
        return;
      }

      // Không hiển thị lỗi, chỉ set loading = false
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Không thể tải thông tin thanh toán');
      setLoading(false);
    }
  };

  // Tự động verify transaction bằng reference key (backend tự động quét blockchain)
  const autoVerifyTransaction = useCallback(async () => {
    // Nếu đã verify thành công rồi, không gọi lại
    if (isVerifiedRef.current) return;
    
    if (!donationId || checkingStatus) return;

    // Tăng số lần thử
    pollingAttemptsRef.current += 1;

    // Dừng polling nếu đã quá số lần thử
    if (pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setError('Đã hết thời gian chờ thanh toán (5 phút). Vui lòng kiểm tra lại transaction hoặc liên hệ hỗ trợ.');
      return;
    }

    try {
      setCheckingStatus(true);
      // Gọi endpoint auto-verify để backend tự động tìm transaction bằng reference key
      const response = await api.post(`/donations/auto-verify-solana/${donationId}`);
      
      // Chỉ xử lý thành công nếu verified === true (strict check)
      if (response && response.data && response.data.verified === true) {
        // Đánh dấu đã verify thành công để không gọi lại
        isVerifiedRef.current = true;
        
        // Dừng polling và QR countdown
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (qrCountdownIntervalRef.current) {
          clearInterval(qrCountdownIntervalRef.current);
          qrCountdownIntervalRef.current = null;
        }
        
        setCheckingStatus(false);
        setSuccess(true);
        setCountdown(5);
        return;
      } else {
        setCheckingStatus(false);
      }
    } catch (err) {
      // Nếu donation đã được processed (404) và chưa verify, có thể đã được verify từ nơi khác
      if (err.response?.status === 404 && !isVerifiedRef.current) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Kiểm tra lại donation status trước khi hiển thị lỗi
        try {
          const checkResponse = await api.get(`/donations/check-status/${donationId}`);
          if (checkResponse.data.donation.payment_status === 'SUCCESS') {
            // Donation đã thành công, redirect ngay
            isVerifiedRef.current = true;
            if (qrCountdownIntervalRef.current) {
              clearInterval(qrCountdownIntervalRef.current);
              qrCountdownIntervalRef.current = null;
            }
            setCheckingStatus(false);
            setSuccess(true);
            setCountdown(5);
            return;
          }
        } catch (checkErr) {
          // Nếu không check được, hiển thị lỗi
        }
        setError('Donation đã được xử lý hoặc không tìm thấy.');
        return;
      }
      
      // Không hiển thị lỗi nếu transaction chưa tìm thấy (chưa thanh toán)
      if (err.response?.status !== 400) {
        console.error('Error auto-verifying transaction:', err);
      }
    } finally {
      if (!isVerifiedRef.current) {
        setCheckingStatus(false);
      }
    }
  }, [donationId, checkingStatus]);

  useEffect(() => {
    if (donationId) {
      fetchPaymentData();
      
      // Set QR expiry time (5 phút từ bây giờ)
      const expiryTime = Date.now() + 5 * 60 * 1000; // 5 phút
      
      // QR countdown timer
      const qrCountdown = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
        setQrTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(qrCountdown);
          setError('QR code đã hết hạn. Vui lòng tạo lại thanh toán.');
        }
      }, 1000);
      
      qrCountdownIntervalRef.current = qrCountdown;
      
      // Tự động verify transaction bằng reference key mỗi 10 giây
      // Dừng sau MAX_POLLING_ATTEMPTS lần (5 phút)
      const interval = setInterval(() => {
        autoVerifyTransaction();
      }, 10000); // 10 giây
      
      pollingIntervalRef.current = interval;
      pollingAttemptsRef.current = 0;
      isVerifiedRef.current = false;

      return () => {
        // Clear intervals khi component unmount
        if (interval) {
          clearInterval(interval);
        }
        if (qrCountdown) {
          clearInterval(qrCountdown);
        }
        pollingIntervalRef.current = null;
        qrCountdownIntervalRef.current = null;
      };
    } else {
      setError('Thiếu thông tin thanh toán');
      setLoading(false);
    }
  }, [donationId, autoVerifyTransaction]);

  // Countdown timer khi verify thành công
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            // Redirect về trang chủ
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [countdown, navigate]);

  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  // Chỉ hiển thị lỗi nếu có error và không phải là lỗi "Không tìm thấy thông tin"
  if (error && error !== 'Không tìm thấy thông tin thanh toán' && !paymentData) {
    return (
      <div className="container">
        <div className="solana-payment-page">
          <div className="alert alert-error">{error}</div>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return null;
  }

  return (
    <div className="container">
      <div className="solana-payment-page">
        <div className="payment-header">
          <h1>Thanh Toán Bằng Solana</h1>
          <p className="payment-description">Quét QR code bằng Phantom wallet để thanh toán</p>
        </div>

        {success ? (
          // Hiển thị thông báo thành công với countdown
          <div className="payment-info-card">
            <div className="transaction-verify-section">
              <div className="alert alert-success">
                <h3>Thanh toán thành công!</h3>
                {countdown !== null && countdown > 0 && (
                  <p>Trang sẽ tự động chuyển về trang chủ sau <strong>{countdown}</strong> giây...</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="payment-info-card">
              <div className="payment-amount-section">
                <div className="amount-item">
                  <span className="amount-label">Số tiền (USD):</span>
                  <span className="amount-value">${paymentData.amountUSD?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="amount-item">
                  <span className="amount-label">Số tiền (SOL):</span>
                  <span className="amount-value sol-amount">
                    {paymentData.amountSOL?.toFixed(6)} SOL
                  </span>
                </div>
                {paymentData.exchangeRate && (
                  <div className="exchange-rate-info">
                    <small>Tỷ giá: 1 SOL = ${paymentData.exchangeRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</small>
                  </div>
                )}
              </div>

              {/* QR Code Section */}
              <div className="qr-code-section">
                <h3>Quét QR Code</h3>
                {paymentData.qrCode ? (
                  <div className="qr-code-container">
                    <img 
                      src={paymentData.qrCode} 
                      alt="Solana Payment QR Code" 
                      className="qr-code-image"
                    />
                    <p className="qr-instruction">
                      Nếu chưa biết cách thanh toán qua ví solana thì kéo xuống dưới đọc hướng dẫn
                    </p>
                    {qrTimeLeft > 0 && (
                      <div className="qr-expiry-countdown">
                        <small>QR code còn hiệu lực: {Math.floor(qrTimeLeft / 60)}:{(qrTimeLeft % 60).toString().padStart(2, '0')}</small>
                      </div>
                    )}
                    {qrTimeLeft <= 0 && (
                      <div className="qr-expired">
                        <small style={{ color: '#dc3545' }}>QR code đã hết hạn</small>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="qr-code-placeholder">
                    <p>Đang tạo QR code...</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && error !== 'Không tìm thấy thông tin thanh toán' && (
                <div className="transaction-verify-section">
                  <div className="alert alert-error">{error}</div>
                </div>
              )}

              {/* Cancel Button */}
              <div className="transaction-verify-section">
                <div className="form-actions">
                  <button 
                    type="button"
                    onClick={handleCancel} 
                    className="btn btn-secondary"
                  >
                    Hủy
                  </button>
                </div>
              </div>

              {/* Payment Status */}
              <div className="payment-status">
                <div className="status-indicator">
                  <div className={`status-dot ${paymentData.paymentStatus === 'SUCCESS' ? 'success' : 'pending'}`}></div>
                  <span>
                    {paymentData.paymentStatus === 'SUCCESS' 
                      ? 'Đã thanh toán thành công' 
                      : 'Đang chờ thanh toán...'}
                  </span>
                </div>
                {paymentData.paymentStatus !== 'SUCCESS' && (
                  <p className="status-note">
                    Trang này sẽ tự động cập nhật khi thanh toán thành công
                  </p>
                )}
              </div>
            </div>

            <div className="payment-methods-info">
              <h4>Hướng dẫn thanh toán:</h4>
              <ol>
                <li>Mở <strong>camera điện thoại</strong></li>
                <li><strong>Quét QR code</strong> ở trên</li>
                <li>Trình duyệt sẽ yêu cầu mở app (<strong>Solflare, Phantom</strong>... hoặc bất cứ ví nào có thể thanh toán bằng Solana)</li>
                <li>Khi mở ví, ấn <strong>xác nhận chuyển tiền</strong></li>
                <li>Chờ hệ thống xác nhận (tự động sau vài giây)</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SolanaPaymentPage;

