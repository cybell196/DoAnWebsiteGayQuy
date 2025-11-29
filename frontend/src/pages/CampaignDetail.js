import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { getCategoryLabel } from '../constants/categories';
import { getImageUrl } from '../utils/imageUtils';
import './CampaignDetail.css';

const CampaignDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [topDonors, setTopDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [solExchangeRate, setSolExchangeRate] = useState(null);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('payos'); // 'payos' or 'solana'
  const [avatarErrors, setAvatarErrors] = useState(new Set());

  // Normalize Google avatar URL
  const normalizeAvatarUrl = (url) => {
    if (!url) return null;
    if (url.includes('googleusercontent.com')) {
      const baseUrl = url.split('?')[0].split('=')[0];
      return `${baseUrl}=s96-c`;
    }
    return url;
  };

  // Handle avatar load error
  const handleAvatarError = (donorId) => {
    setAvatarErrors(prev => new Set(prev).add(donorId));
  };

  const fetchExchangeRate = async () => {
    try {
      setLoadingExchangeRate(true);
      const response = await api.get('/donations/exchange-rate');
      const rate = response.data.exchange_rate;
      setExchangeRate(rate);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Fallback rate (cập nhật lên 25,000 cho gần với thực tế hơn)
      setExchangeRate(25000);
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const fetchSOLExchangeRate = async () => {
    try {
      const response = await api.get('/donations/sol-exchange-rate');
      const rate = response.data.exchange_rate;
      setSolExchangeRate(rate);
    } catch (error) {
      console.error('Error fetching SOL exchange rate:', error);
      // Fallback rate
      setSolExchangeRate(150);
    }
  };

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await api.get(`/campaigns/${id}`);
      setCampaign(response.data.campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      if (error.response?.status === 403) {
        setError('Chiến dịch này không khả dụng hoặc đã bị từ chối. Chỉ chủ sở hữu và quản trị viên mới có thể xem.');
      } else if (error.response?.status === 404) {
        setError('Không tìm thấy chiến dịch');
      } else {
        setError('Không thể tải thông tin chiến dịch');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDonations = useCallback(async () => {
    try {
      const response = await api.get(`/donations/campaign/${id}`);
      setDonations(response.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  }, [id]);

  const fetchTopDonors = useCallback(async () => {
    try {
      const response = await api.get(`/donations/campaign/${id}/top-donors`);
      setTopDonors(response.data.topDonors || []);
    } catch (error) {
      console.error('Error fetching top donors:', error);
    }
  }, [id]);

  const checkAndUpdatePaymentStatus = useCallback(async (donationId) => {
    try {
      // Gọi API để kiểm tra và cập nhật payment status từ PayOS
      const response = await api.get(`/donations/check-status/${donationId}`);
      
      // Nếu payment đã thành công, refresh campaign và donations để cập nhật tiến độ
      if (response.data.donation.payment_status === 'SUCCESS') {
        // Đợi một chút để đảm bảo backend đã cập nhật xong
        setTimeout(() => {
          fetchCampaign(); // Refresh campaign để cập nhật current_amount
          fetchDonations(); // Refresh donations list
          fetchTopDonors(); // Refresh top donors
        }, 500);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      // Vẫn refresh để đảm bảo hiển thị đúng
      fetchCampaign();
      fetchDonations();
      fetchTopDonors();
    }
  }, [fetchCampaign, fetchDonations, fetchTopDonors]);

  useEffect(() => {
    fetchCampaign();
    fetchDonations();
    fetchTopDonors();
    fetchExchangeRate();
    fetchSOLExchangeRate();

    // Socket.IO connection
    const socket = io('http://localhost:5000');
    socket.emit('join-campaign', id);

    socket.on('new-donation', (data) => {
      setCampaign((prev) => ({
        ...prev,
        current_amount: data.campaign.current_amount,
        goal_amount: data.campaign.goal_amount
      }));
      // Add new donation to list and refresh top donors
      fetchDonations();
      fetchTopDonors();
    });

    // Check payment status from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const donationId = urlParams.get('donation_id');
    
    if (paymentStatus === 'success' && donationId) {
      setSuccess('Thanh toán thành công! Cảm ơn bạn đã quyên góp.');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Kiểm tra và cập nhật payment status từ PayOS
      checkAndUpdatePaymentStatus(donationId);
      
      fetchCampaign();
      fetchDonations();
    } else if (paymentStatus === 'cancelled') {
      setError('Thanh toán đã bị hủy.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      socket.emit('leave-campaign', id);
      socket.disconnect();
    };
  }, [id, fetchCampaign, fetchDonations, fetchTopDonors, checkAndUpdatePaymentStatus]);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    // Prevent donation if campaign is not approved or is ended
    if (campaign.status !== 'APPROVED' || campaign.status === 'ENDED') {
      setError('Chiến dịch không thể nhận quyên góp');
      return;
    }

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    setError('');
    setSuccess('');
    setLoadingPayment(true);

    try {
      if (paymentMethod === 'solana') {
        // Solana payment
        const response = await api.post('/donations/create-solana-payment', {
          campaign_id: id,
          amount_usd: parseFloat(donationAmount),
          message: donationMessage,
          is_public: isPublic
        });

        // Lưu thông tin thanh toán vào localStorage
        localStorage.setItem('solanaPaymentData', JSON.stringify({
          qrCode: response.data.qrCode,
          paymentURL: response.data.paymentURL,
          donationId: response.data.donationId,
          amountUSD: response.data.amountUSD,
          amountSOL: response.data.amountSOL,
          exchangeRate: response.data.exchangeRate,
          recipient: response.data.recipient,
          paymentStatus: 'PENDING'
        }));
        
        // Redirect to Solana payment page
        navigate(`/payment/solana?donation_id=${response.data.donationId}&campaign_id=${id}`);
      } else {
        // PayOS payment
        const response = await api.post('/donations/create-payment', {
          campaign_id: id,
          amount_usd: parseFloat(donationAmount),
          message: donationMessage,
          is_public: isPublic
        });

        if (response.data.success) {
          // Lưu thông tin thanh toán vào localStorage
          localStorage.setItem('paymentData', JSON.stringify({
            checkoutUrl: response.data.checkoutUrl,
            qrCode: response.data.qrCode,
            donation_id: response.data.donation_id,
            order_code: response.data.order_code,
            amount_usd: response.data.amount_usd,
            amount_vnd: response.data.amount_vnd,
            exchange_rate: response.data.exchange_rate,
            description: response.data.description
          }));
          
          // Redirect to payment page
          navigate(`/payment?donation_id=${response.data.donation_id}&order_code=${response.data.order_code}&campaign_id=${id}`);
        } else {
          setError('Không thể tạo link thanh toán. Vui lòng thử lại.');
          setLoadingPayment(false);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo link thanh toán thất bại');
      setLoadingPayment(false);
    }
  };

  const calculateSOLAmount = () => {
    if (!donationAmount || !solExchangeRate) return 0;
    const usdAmount = parseFloat(donationAmount);
    if (isNaN(usdAmount)) return 0;
    return usdAmount / solExchangeRate;
  };

  const calculateVNDAmount = () => {
    if (!donationAmount || !exchangeRate) return 0;
    const usdAmount = parseFloat(donationAmount);
    if (isNaN(usdAmount)) return 0;
    return Math.round(usdAmount * exchangeRate);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateProgress = (current, goal) => {
    return Math.min((current / goal) * 100, 100);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải chiến dịch...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container">
        <div className="alert alert-error">Chiến dịch không tồn tại</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="campaign-detail">
        <div className="campaign-main">
          {campaign.thumbnail && (
            <img
              src={getImageUrl(campaign.thumbnail)}
              alt={campaign.title}
              className="campaign-detail-thumbnail"
            />
          )}

          <h1 className="campaign-detail-title">{campaign.title}</h1>

          <div className="campaign-meta">
            <p>
              <strong>Người tạo:</strong> {campaign.creator_name}
            </p>
            {campaign.category && (
              <p>
                <strong>Danh mục:</strong> {getCategoryLabel(campaign.category)}
              </p>
            )}
            {campaign.start_date && (
              <p>
                <strong>Ngày bắt đầu:</strong>{' '}
                {new Date(campaign.start_date).toLocaleDateString('vi-VN')}
              </p>
            )}
            {campaign.end_date && (
              <p>
                <strong>Ngày kết thúc:</strong>{' '}
                {new Date(campaign.end_date).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>

          <div className="campaign-progress-section">
            <div className="progress-bar-large">
              <div
                className="progress-fill-large"
                style={{
                  width: `${calculateProgress(
                    campaign.current_amount,
                    campaign.goal_amount
                  )}%`
                }}
              ></div>
            </div>
            <div className="progress-stats">
              <div className="progress-stat">
                <span className="stat-label">Đã quyên góp</span>
                <span className="stat-value">
                  {formatCurrency(campaign.current_amount)}
                </span>
              </div>
              <div className="progress-stat">
                <span className="stat-label">Mục tiêu</span>
                <span className="stat-value">
                  {formatCurrency(campaign.goal_amount)}
                </span>
              </div>
              <div className="progress-stat">
                <span className="stat-label">Tiến độ</span>
                <span className="stat-value">
                  {calculateProgress(
                    campaign.current_amount,
                    campaign.goal_amount
                  ).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="campaign-content-section">
            <h2>Nội Dung Chiến Dịch</h2>
            <div
              className="campaign-content-text"
              dangerouslySetInnerHTML={{
                __html: campaign.content
              }}
            />
          </div>

          {campaign.images && campaign.images.length > 0 && (
            <div className="campaign-images-section">
              <h2>Hình Ảnh</h2>
              <div className="campaign-images-grid">
                {campaign.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.image_url}
                    alt="Campaign"
                    className="campaign-image"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="campaign-sidebar">
          <div className="donate-card">
            <h3>Quyên Góp</h3>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            {user ? (
              campaign.status === 'APPROVED' && campaign.status !== 'ENDED' ? (
                <form onSubmit={handleDonate}>
                  <div className="form-group">
                    <label>Phương Thức Thanh Toán</label>
                    <div className="payment-method-selector">
                      <label className="payment-method-option">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="payos"
                          checked={paymentMethod === 'payos'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          disabled={loadingPayment}
                        />
                        <span>PayOS (Banking)</span>
                      </label>
                      <label className="payment-method-option">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="solana"
                          checked={paymentMethod === 'solana'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          disabled={loadingPayment}
                        />
                        <span>Solana (Crypto)</span>
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Số Tiền (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      required
                      disabled={loadingPayment}
                    />
                    {donationAmount && paymentMethod === 'payos' && exchangeRate && (
                      <div className="vnd-amount-display">
                        <small>
                          ≈ {calculateVNDAmount().toLocaleString('vi-VN')} VND
                          {loadingExchangeRate && <span> (Đang cập nhật tỷ giá...)</span>}
                        </small>
                      </div>
                    )}
                    {donationAmount && paymentMethod === 'solana' && solExchangeRate && (
                      <div className="sol-amount-display">
                        <small>
                          ≈ {calculateSOLAmount().toFixed(6)} SOL
                        </small>
                      </div>
                    )}
                    {paymentMethod === 'payos' && exchangeRate && (
                      <div className="exchange-rate-info">
                        <small>Tỷ giá: 1 USD = {exchangeRate.toLocaleString('vi-VN')} VND</small>
                      </div>
                    )}
                    {paymentMethod === 'solana' && solExchangeRate && (
                      <div className="exchange-rate-info">
                        <small>Tỷ giá: 1 SOL = ${solExchangeRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</small>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Lời Nhắn (Tùy chọn)</label>
                    <textarea
                      value={donationMessage}
                      onChange={(e) => setDonationMessage(e.target.value)}
                      rows="3"
                      disabled={loadingPayment}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        disabled={loadingPayment}
                      />
                      {' '}Hiển thị công khai
                    </label>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block"
                    disabled={loadingPayment || loadingExchangeRate}
                  >
                    {loadingPayment ? 'Đang xử lý...' : 'Quyên Góp Ngay'}
                  </button>
                  <div className="payment-info">
                    {paymentMethod === 'payos' ? (
                      <small>Thanh toán qua PayOS (QR Code, Internet Banking, Ví điện tử)</small>
                    ) : (
                      <small>Thanh toán qua Solana (Quét QR code bằng Phantom wallet - Devnet)</small>
                    )}
                  </div>
                </form>
              ) : campaign.status === 'ENDED' ? (
                <div className="donate-disabled">
                  <div className="alert alert-info">
                    Chiến dịch đã kết thúc. Không thể nhận quyên góp.
                  </div>
                  <div className="form-group">
                    <label>Số Tiền (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      disabled
                      placeholder="Chiến dịch đã kết thúc"
                    />
                  </div>
                  <div className="form-group">
                    <label>Lời Nhắn (Tùy chọn)</label>
                    <textarea
                      disabled
                      placeholder="Chiến dịch đã kết thúc"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        disabled
                      />
                      {' '}Hiển thị công khai
                    </label>
                  </div>
                  <button type="button" className="btn btn-primary btn-block" disabled>
                    Quyên Góp Ngay
                  </button>
                </div>
              ) : (
                <div className="donate-disabled">
                  <div className="alert alert-info">
                    {campaign.status === 'PENDING' 
                      ? 'Chiến dịch đang chờ duyệt. Vui lòng chờ admin duyệt để có thể nhận quyên góp.'
                      : 'Chiến dịch đã bị từ chối. Không thể nhận quyên góp.'}
                  </div>
                  <div className="form-group">
                    <label>Số Tiền (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      disabled
                      placeholder="Chưa thể quyên góp"
                    />
                  </div>
                  <div className="form-group">
                    <label>Lời Nhắn (Tùy chọn)</label>
                    <textarea
                      disabled
                      placeholder="Chưa thể nhập lời nhắn"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        disabled
                      />
                      {' '}Hiển thị công khai
                    </label>
                  </div>
                  <button type="button" className="btn btn-primary btn-block" disabled>
                    Quyên Góp Ngay
                  </button>
                </div>
              )
            ) : (
              <div className="donate-login-prompt">
                <p>Vui lòng đăng nhập để quyên góp</p>
                <Link to="/login" className="btn btn-primary btn-block">
                  Đăng Nhập
                </Link>
              </div>
            )}
          </div>

          <div className="donations-list">
            <h3>Người Quyên Góp Gần Đây</h3>
            {donations.length === 0 ? (
              <p>Chưa có quyên góp nào</p>
            ) : (
              <div className="donations-items">
                {donations.map((donation) => (
                  <div key={donation.id} className="donation-item">
                    <div className="donation-header">
                      <strong>{donation.donor_name}</strong>
                      <span className="donation-amount">
                        {formatCurrency(donation.amount)}
                      </span>
                    </div>
                    {donation.message && (
                      <p className="donation-message">{donation.message}</p>
                    )}
                    <p className="donation-date">
                      {new Date(donation.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="top-donors-list">
            <h3>Top Các Nhà Quyên Góp</h3>
            {topDonors.length === 0 ? (
              <p>Chưa có dữ liệu</p>
            ) : (
              <div className="top-donors-table">
                <table>
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>Người Quyên Góp</th>
                      <th>Tổng Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDonors.map((donor, index) => (
                      <tr key={donor.user_id}>
                        <td className="rank-cell">
                          <span className={`rank-badge rank-${index + 1}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="donor-name-cell">
                          {donor.donor_avatar && !avatarErrors.has(donor.donor_id) ? (
                            <img 
                              src={normalizeAvatarUrl(donor.donor_avatar)} 
                              alt={donor.donor_name}
                              className="donor-avatar-small"
                              onError={() => handleAvatarError(donor.donor_id)}
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <span>{donor.donor_name}</span>
                        </td>
                        <td className="total-amount-cell">
                          <strong>{formatCurrency(donor.total_amount)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;

