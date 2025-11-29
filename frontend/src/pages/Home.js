import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getCategoryLabel } from '../constants/categories';
import './Home.css';
import { getImageUrl } from '../utils/imageUtils';

const Home = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active', 'ended', 'all'
  const [statistics, setStatistics] = useState({ totalAmount: 0, campaignCount: 0 });

  useEffect(() => {
    fetchCampaigns();
    fetchStatistics();
  }, [filter]);

  const fetchCampaigns = async () => {
    try {
      const response = await api.get(`/campaigns?filter=${filter}`);
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/campaigns/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateProgress = (current, goal) => {
    if (!goal || goal === 0) return 0;
    const progress = Math.min((current / goal) * 100, 100);
    return Math.max(progress, 0); // Đảm bảo không âm
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
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Cùng Chúng Tôi Tạo Nên Sự Khác Biệt</h1>
          <p className="hero-subtitle">
            Hỗ trợ các chiến dịch gây quỹ ý nghĩa và tạo tác động tích cực đến cộng đồng
          </p>
          <Link to="/create-campaign" className="btn btn-primary btn-hero">
            Bắt Đầu Chiến Dịch Của Bạn
          </Link>
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-number">
              {formatCurrency(statistics.totalAmount)}
            </div>
            <div className="stat-label">Đã Quyên Góp</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              {statistics.campaignCount}+
            </div>
            <div className="stat-label">Chiến Dịch</div>
          </div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="campaigns-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              {filter === 'active' ? 'Chiến Dịch Đang Diễn Ra' : 
               filter === 'ended' ? 'Chiến Dịch Đã Kết Thúc' : 
               'Tất Cả Chiến Dịch'}
            </h2>
            <p className="section-subtitle">
              {filter === 'active' ? 'Khám phá và hỗ trợ các chiến dịch gây quỹ đang cần sự giúp đỡ' :
               filter === 'ended' ? 'Xem lại các chiến dịch đã hoàn thành' :
               'Xem tất cả các chiến dịch'}
            </p>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                Đang Diễn Ra
              </button>
              <button
                className={`filter-btn ${filter === 'ended' ? 'active' : ''}`}
                onClick={() => setFilter('ended')}
              >
                Đã Kết Thúc
              </button>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>
                {filter === 'active' ? 'Chưa có chiến dịch đang diễn ra' :
                 filter === 'ended' ? 'Chưa có chiến dịch đã kết thúc' :
                 'Chưa có chiến dịch nào'}
              </h3>
              <p>
                {filter === 'active' ? 'Hãy là người đầu tiên tạo chiến dịch gây quỹ!' :
                 'Chưa có chiến dịch nào trong danh mục này'}
              </p>
              {filter === 'active' && (
                <Link to="/create-campaign" className="btn btn-primary">
                  Tạo Chiến Dịch
                </Link>
              )}
            </div>
          ) : (
            <div className="campaigns-grid">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  to={`/campaign/${campaign.id}`}
                  className="campaign-card-modern"
                >
                  <div className="campaign-image-wrapper">
                    {campaign.thumbnail ? (
                      <img
                        src={getImageUrl(campaign.thumbnail)}
                        alt={campaign.title}
                        className="campaign-thumbnail-modern"
                      />
                    ) : (
                      <div className="campaign-thumbnail-placeholder">
                        <span>📸</span>
                      </div>
                    )}
                    {campaign.category && (
                      <span className="campaign-category-badge">
                        {getCategoryLabel(campaign.category)}
                      </span>
                    )}
                  </div>
                  <div className="campaign-content-modern">
                    <h3 className="campaign-title-modern">{campaign.title}</h3>
                    {(campaign.content_h1 || campaign.content_excerpt) ? (
                      <p className="campaign-story-modern">
                        {campaign.content_h1 && (
                          <>
                            <span className="campaign-h1-title">{campaign.content_h1}</span>
                            {campaign.content_excerpt && ': '}
                          </>
                        )}
                        {campaign.content_excerpt}
                      </p>
                    ) : (
                      <p className="campaign-story-modern" style={{ color: '#999', fontStyle: 'italic' }}>
                        Chưa có nội dung
                      </p>
                    )}
                    <p className="campaign-creator-modern">
                      Bởi {campaign.creator_name}
                    </p>
                    <div className="campaign-progress-modern">
                      <div className="progress-bar-modern">
                        <div
                          className="progress-fill-modern"
                          style={{
                            width: `${calculateProgress(
                              campaign.current_amount,
                              campaign.goal_amount
                            )}%`
                          }}
                        ></div>
                      </div>
                      <div className="progress-info-modern">
                        <span className="progress-stats-modern">
                          Raised {formatCurrency(campaign.current_amount)} of {formatCurrency(campaign.goal_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
