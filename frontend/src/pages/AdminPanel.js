import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './AdminPanel.css';

const AdminPanel = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      fetchCampaigns();
    } else {
      fetchDonations();
    }
  }, [activeTab]);

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const response = await api.get('/donations/all');
      setDonations(response.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (campaignId, status) => {
    try {
      await api.patch(`/campaigns/${campaignId}/status`, { status });
      fetchCampaigns();
    } catch (error) {
      alert('Cập nhật trạng thái thất bại');
    }
  };

  const handleDelete = async (campaignId, campaignTitle) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chiến dịch "${campaignTitle}"?\n\nHành động này không thể hoàn tác!`)) {
      return;
    }

    try {
      await api.delete(`/campaigns/${campaignId}`);
      fetchCampaigns();
      alert('Xóa chiến dịch thành công');
    } catch (error) {
      alert('Xóa chiến dịch thất bại: ' + (error.response?.data?.message || 'Lỗi không xác định'));
    }
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

  const handleEndCampaign = async (campaignId) => {
    if (!window.confirm('Bạn có chắc chắn muốn kết thúc chiến dịch này?')) {
      return;
    }

    try {
      await api.post(`/campaigns/${campaignId}/end`);
      fetchCampaigns();
      alert('Chiến dịch đã được kết thúc');
    } catch (error) {
      alert(error.response?.data?.message || 'Kết thúc chiến dịch thất bại');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Admin Panel</h1>
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          Quản Lý Chiến Dịch
        </button>
        <button
          className={`tab-button ${activeTab === 'donations' ? 'active' : ''}`}
          onClick={() => setActiveTab('donations')}
        >
          Tất Cả Quyên Góp
        </button>
      </div>

      {activeTab === 'campaigns' && (
        <div className="admin-campaigns">
          {campaigns.length === 0 ? (
            <p>Chưa có chiến dịch nào</p>
          ) : (
            <div className="admin-campaigns-list">
              {campaigns.map((campaign) => {
                const statusBadge = getStatusBadge(campaign.status);
                return (
                  <div key={campaign.id} className="admin-campaign-card">
                    {campaign.thumbnail && (
                      <img
                        src={`http://localhost:5000${campaign.thumbnail}`}
                        alt={campaign.title}
                        className="admin-campaign-thumbnail"
                      />
                    )}
                    <div className="admin-campaign-content">
                      <h3>
                        <Link to={`/campaign/${campaign.id}`}>
                          {campaign.title}
                        </Link>
                      </h3>
                      <p>
                        <strong>Người tạo:</strong> {campaign.creator_name}
                      </p>
                      <p>
                        <strong>Mục tiêu:</strong>{' '}
                        {formatCurrency(campaign.goal_amount)}
                      </p>
                      <p>
                        <strong>Đã quyên góp:</strong>{' '}
                        {formatCurrency(campaign.current_amount)}
                      </p>
                      <div className="admin-campaign-actions">
                        <span className={`status-badge ${statusBadge.class}`}>
                          {statusBadge.text}
                        </span>
                        {campaign.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusUpdate(campaign.id, 'APPROVED')
                              }
                              className="btn btn-success"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(campaign.id, 'REJECTED')
                              }
                              className="btn btn-danger"
                            >
                              Từ Chối
                            </button>
                          </>
                        )}
                        {campaign.status === 'APPROVED' && campaign.status !== 'ENDED' && (
                          <button
                            onClick={() => handleEndCampaign(campaign.id)}
                            className="btn btn-warning"
                            title="Kết thúc chiến dịch"
                          >
                            Kết Thúc
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(campaign.id, campaign.title)}
                          className="btn btn-danger"
                          title="Xóa chiến dịch"
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'donations' && (
        <div className="admin-donations">
          {donations.length === 0 ? (
            <p>Chưa có quyên góp nào</p>
          ) : (
            <div className="admin-donations-table">
              <table>
                <thead>
                  <tr>
                    <th>Chiến Dịch</th>
                    <th>Người Quyên Góp</th>
                    <th>Số Tiền</th>
                    <th>Lời Nhắn</th>
                    <th>Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr key={donation.id}>
                      <td>
                        <Link to={`/campaign/${donation.campaign_id}`}>
                          {donation.campaign_title}
                        </Link>
                      </td>
                      <td>{donation.donor_name}</td>
                      <td>{formatCurrency(donation.amount)}</td>
                      <td>{donation.message || '-'}</td>
                      <td>
                        {new Date(donation.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

