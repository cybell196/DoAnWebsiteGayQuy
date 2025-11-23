import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  
  // Profile info
  const [profileData, setProfileData] = useState({
    fullname: '',
    email: ''
  });
  
  // Change password
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Donations
  const [donations, setDonations] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  
  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullname: user.fullname || '',
        email: user.email || ''
      });
      fetchMyDonations();
      fetchMyCampaigns();
    }
  }, [user]);

  const fetchMyDonations = async () => {
    setDonationsLoading(true);
    try {
      const response = await api.get('/donations/my-donations');
      setDonations(response.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setDonationsLoading(false);
    }
  };

  const fetchMyCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const response = await api.get('/campaigns/my-campaigns');
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/profile', profileData);
      updateUser({ ...user, ...profileData });
      alert('Cập nhật thông tin thành công');
    } catch (error) {
      alert(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Đổi mật khẩu thành công');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      alert(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
      navigate('/');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { text: 'Chờ Duyệt', class: 'status-pending' },
      APPROVED: { text: 'Đã Duyệt', class: 'status-approved' },
      REJECTED: { text: 'Đã Từ Chối', class: 'status-rejected' },
      ENDED: { text: 'Đã Kết Thúc', class: 'status-ended' }
    };
    return badges[status] || { text: status, class: '' };
  };

  return (
    <div className="container">
      <div className="profile-page">
        <h1 className="page-title">Hồ Sơ Cá Nhân</h1>
        
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Thông Tin Cá Nhân
          </button>
          <button
            className={`tab-btn ${activeTab === 'donations' ? 'active' : ''}`}
            onClick={() => setActiveTab('donations')}
          >
            Đã Quyên Góp
          </button>
          <button
            className={`tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaigns')}
          >
            Chiến Dịch Đã Tạo
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'info' && (
            <div className="profile-info-section">
              <div className="profile-card">
                <h2>Cập Nhật Thông Tin</h2>
                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group">
                    <label>Họ và Tên</label>
                    <input
                      type="text"
                      value={profileData.fullname}
                      onChange={(e) => setProfileData({ ...profileData, fullname: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Đang cập nhật...' : 'Cập Nhật'}
                  </button>
                </form>
              </div>

              <div className="profile-card">
                <h2>Đổi Mật Khẩu</h2>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Mật Khẩu Hiện Tại</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mật Khẩu Mới</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>Xác Nhận Mật Khẩu Mới</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Đang đổi...' : 'Đổi Mật Khẩu'}
                  </button>
                </form>
              </div>

              <div className="profile-card">
                <h2>Đăng Xuất</h2>
                <p>Bạn có thể đăng xuất khỏi tài khoản của mình</p>
                <button onClick={handleLogout} className="btn btn-danger">
                  Đăng Xuất
                </button>
              </div>
            </div>
          )}

          {activeTab === 'donations' && (
            <div className="profile-donations-section">
              <h2>Lịch Sử Quyên Góp</h2>
              {donationsLoading ? (
                <div className="loading-spinner">Đang tải...</div>
              ) : donations.length === 0 ? (
                <div className="empty-state">
                  <p>Bạn chưa quyên góp cho chiến dịch nào.</p>
                </div>
              ) : (
                <div className="donations-list">
                  {donations.map((donation) => (
                    <div key={donation.id} className="donation-card">
                      <div className="donation-header">
                        <h3>
                          <Link to={`/campaign/${donation.campaign_id}`}>
                            {donation.campaign_title}
                          </Link>
                        </h3>
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
          )}

          {activeTab === 'campaigns' && (
            <div className="profile-campaigns-section">
              <h2>Chiến Dịch Đã Tạo</h2>
              {campaignsLoading ? (
                <div className="loading-spinner">Đang tải...</div>
              ) : campaigns.length === 0 ? (
                <div className="empty-state">
                  <p>Bạn chưa tạo chiến dịch nào.</p>
                  <Link to="/create-campaign" className="btn btn-primary">
                    Tạo Chiến Dịch Đầu Tiên
                  </Link>
                </div>
              ) : (
                <div className="campaigns-list">
                  {campaigns.map((campaign) => {
                    const statusBadge = getStatusBadge(campaign.status);
                    return (
                      <div key={campaign.id} className="campaign-card">
                        {campaign.thumbnail && (
                          <img
                            src={`http://localhost:5000${campaign.thumbnail}`}
                            alt={campaign.title}
                            className="campaign-thumbnail"
                          />
                        )}
                        <div className="campaign-content">
                          <h3>
                            <Link to={`/campaign/${campaign.id}`}>
                              {campaign.title}
                            </Link>
                          </h3>
                          <div className="campaign-meta">
                            <span className={`status-badge ${statusBadge.class}`}>
                              {statusBadge.text}
                            </span>
                            <span className="campaign-amount">
                              {formatCurrency(campaign.current_amount)} / {formatCurrency(campaign.goal_amount)}
                            </span>
                          </div>
                          <p className="campaign-date">
                            Tạo ngày: {new Date(campaign.created_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

