import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import './PaymentPage.css';

const PaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);

  const donationId = searchParams.get('donation_id');
  const orderCode = searchParams.get('order_code');
  const campaignId = searchParams.get('campaign_id');

  useEffect(() => {
    if (donationId && orderCode) {
      fetchPaymentData();
      // Kiểm tra trạng thái thanh toán mỗi 5 giây
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setError('Thiếu thông tin thanh toán');
      setLoading(false);
    }
  }, [donationId, orderCode]);

  const fetchPaymentData = async () => {
    try {
      // Lấy thông tin từ localStorage nếu có (từ CampaignDetail)
      const storedPaymentData = localStorage.getItem('paymentData');
      if (storedPaymentData) {
        const data = JSON.parse(storedPaymentData);
        setPaymentData(data);
        setLoading(false);
        localStorage.removeItem('paymentData');
        return;
      }

      // Nếu không có trong localStorage, có thể fetch từ API
      setError('Không tìm thấy thông tin thanh toán');
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Không thể tải thông tin thanh toán');
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!donationId || checkingStatus) return;

    try {
      setCheckingStatus(true);
      const response = await api.get(`/donations/check-status/${donationId}`);
      
      if (response.data.donation.payment_status === 'SUCCESS') {
        // Thanh toán thành công, redirect về campaign
        if (campaignId) {
          navigate(`/campaigns/${campaignId}?payment=success&donation_id=${donationId}`);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Payment method handlers - dễ mở rộng cho các phương thức thanh toán khác
  const handleBankingPayment = () => {
    if (paymentData?.checkoutUrl) {
      window.open(paymentData.checkoutUrl, '_blank');
    }
  };

  const handleCancel = () => {
    if (campaignId) {
      navigate(`/campaigns/${campaignId}?payment=cancelled`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="container">
        <div className="payment-page">
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
      <div className="payment-page">
        <div className="payment-header">
          <h1>Thanh Toán Quyên Góp</h1>
          <p className="payment-description">{paymentData.description}</p>
        </div>

        <div className="payment-info-card">
          <div className="payment-amount-section">
            <div className="amount-item">
              <span className="amount-label">Số tiền (USD):</span>
              <span className="amount-value">${paymentData.amount_usd?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="amount-item">
              <span className="amount-label">Số tiền (VND):</span>
              <span className="amount-value vnd-amount">
                {paymentData.amount_vnd?.toLocaleString('vi-VN')} VND
              </span>
            </div>
            <div className="amount-item">
              <span className="amount-label">Mã đơn hàng:</span>
              <span className="amount-value order-code">{paymentData.order_code}</span>
            </div>
            {paymentData.exchange_rate && (
              <div className="exchange-rate-info">
                <small>Tỷ giá: 1 USD = {paymentData.exchange_rate.toLocaleString('vi-VN')} VND</small>
              </div>
            )}
          </div>

          <div className="payment-actions">
            <button 
              onClick={handleBankingPayment} 
              className="btn btn-primary btn-large"
            >
              Thanh Toán Banking
            </button>
            <button 
              onClick={handleCancel} 
              className="btn btn-secondary"
            >
              Hủy Thanh Toán
            </button>
          </div>

          <div className="payment-status">
            <div className="status-indicator">
              <div className="status-dot pending"></div>
              <span>Đang chờ thanh toán...</span>
            </div>
            <p className="status-note">
              Trang này sẽ tự động cập nhật khi thanh toán thành công
            </p>
          </div>
        </div>

        <div className="payment-methods-info">
          <h4>Phương thức thanh toán được hỗ trợ:</h4>
          <ul>
            <li>Quét QR Code qua ứng dụng ngân hàng</li>
            <li>Internet Banking</li>
            <li>Ví điện tử (MoMo, ZaloPay, VNPay, v.v.)</li>
            <li>Thẻ ATM nội địa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;

