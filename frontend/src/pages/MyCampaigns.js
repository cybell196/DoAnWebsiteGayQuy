import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { getImageUrl } from '../utils/imageUtils';
import './MyCampaigns.css';

const MyCampaigns = () => {
  const { user } = useContext(AuthContext);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCampaigns();
  }, []);

  const fetchMyCampaigns = async () => {
    try {
      const response = await api.get('/campaigns/my-campaigns');
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chiến dịch này?')) {
      return;
    }

    try {
      await api.delete(`/campaigns/${id}`);
      fetchMyCampaigns();
    } catch (error) {
      alert('Xóa chiến dịch thất bại');
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

  const handleEndCampaign = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn kết thúc chiến dịch này?')) {
      return;
    }

    try {
      await api.post(`/campaigns/${id}/end`);
      fetchMyCampaigns();
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
      <h1 className="page-title">Chiến Dịch Của Tôi</h1>
      {campaigns.length === 0 ? (
        <div className="empty-state">
          <p>Bạn chưa tạo chiến dịch nào.</p>
          <Link to="/create-campaign" className="btn btn-primary">
            Tạo Chiến Dịch Đầu Tiên
          </Link>
        </div>
      ) : (
        <div className="my-campaigns-list">
          {campaigns.map((campaign) => {
            const statusBadge = getStatusBadge(campaign.status);
            return (
              <div key={campaign.id} className="my-campaign-card">
                {campaign.thumbnail && (
                  <img
                    src={getImageUrl(campaign.thumbnail)}
                    alt={campaign.title}
                    className="my-campaign-thumbnail"
                  />
                )}
                <div className="my-campaign-content">
                  <div className="my-campaign-header">
                    <h3>
                      <Link to={`/campaign/${campaign.id}`}>
                        {campaign.title}
                      </Link>
                    </h3>
                    <span className={`status-badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                  </div>
                  <p className="my-campaign-meta">
                    Mục tiêu: {formatCurrency(campaign.goal_amount)} | Đã quyên
                    góp: {formatCurrency(campaign.current_amount)}
                  </p>
                  <div className="my-campaign-actions">
                    {campaign.status !== 'APPROVED' && campaign.status !== 'ENDED' && (
                      <Link
                        to={`/edit-campaign/${campaign.id}`}
                        className="btn btn-secondary"
                      >
                        Sửa
                      </Link>
                    )}
                    {campaign.status !== 'APPROVED' && campaign.status !== 'ENDED' && (
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="btn btn-danger"
                      >
                        Xóa
                      </button>
                    )}
                    {campaign.status === 'APPROVED' && campaign.status !== 'ENDED' && (
                      <button
                        onClick={() => handleEndCampaign(campaign.id)}
                        className="btn btn-warning"
                      >
                        Kết Thúc
                      </button>
                    )}
                    <Link
                      to={`/campaign/${campaign.id}`}
                      className="btn btn-primary"
                    >
                      Xem Chi Tiết
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCampaigns;

