import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { getCategoryLabel } from '../constants/categories';
import './CampaignDetail.css';

const CampaignDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCampaign();
    fetchDonations();

    // Socket.IO connection
    const socket = io('http://localhost:5000');
    socket.emit('join-campaign', id);

    socket.on('new-donation', (data) => {
      setCampaign((prev) => ({
        ...prev,
        current_amount: data.campaign.current_amount,
        goal_amount: data.campaign.goal_amount
      }));
      // Add new donation to list
      fetchDonations();
    });

    return () => {
      socket.emit('leave-campaign', id);
      socket.disconnect();
    };
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const response = await api.get(`/campaigns/${id}`);
      setCampaign(response.data.campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      setError('Không tìm thấy chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const response = await api.get(`/donations/campaign/${id}`);
      setDonations(response.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

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

    setError('');
    setSuccess('');

    try {
      await api.post('/donations', {
        campaign_id: id,
        amount: parseFloat(donationAmount),
        currency: 'USD',
        exchange_rate: 1.0,
        message: donationMessage,
        is_public: isPublic
      });

      setSuccess('Donate thành công!');
      setDonationAmount('');
      setDonationMessage('');
      fetchCampaign();
      fetchDonations();
    } catch (err) {
      setError(err.response?.data?.message || 'Donate thất bại');
    }
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
              src={`http://localhost:5000${campaign.thumbnail}`}
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
                    <label>Số Tiền (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Lời Nhắn (Tùy chọn)</label>
                    <textarea
                      value={donationMessage}
                      onChange={(e) => setDonationMessage(e.target.value)}
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                      />
                      {' '}Hiển thị công khai
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">
                    Quyên Góp Ngay
                  </button>
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
            <h3>Danh Sách Quyên Góp</h3>
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
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;

