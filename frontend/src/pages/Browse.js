import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { CAMPAIGN_CATEGORIES, getCategoryLabel } from '../constants/categories';
import './Browse.css';
import { getImageUrl } from '../utils/imageUtils';

const Browse = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns?filter=active');
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...campaigns];

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.category === categoryFilter);
    }

    // Filter by status
    if (statusFilter === 'active') {
      // Đang diễn ra: APPROVED và không ENDED
      filtered = filtered.filter(campaign => 
        campaign.status === 'APPROVED' && campaign.status !== 'ENDED'
      );
    } else if (statusFilter === 'ending-soon') {
      // Sắp kết thúc: có end_date và trong 7 ngày tới
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      filtered = filtered.filter(campaign => {
        if (!campaign.end_date) return false;
        const endDate = new Date(campaign.end_date);
        return endDate >= today && endDate <= nextWeek;
      });
    } else if (statusFilter === 'nearly-complete') {
      // Gần hoàn thành: >= 80% tiến trình
      filtered = filtered.filter(campaign => {
        const progress = (parseFloat(campaign.current_amount || 0) / parseFloat(campaign.goal_amount || 1)) * 100;
        return progress >= 80 && progress < 100;
      });
    }
    // 'all' không filter gì

    setFilteredCampaigns(filtered);
  }, [campaigns, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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

  const getDaysUntilEnd = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="browse-page">
      <div className="container">
        <h1 className="page-title">Chiến Dịch</h1>

        {/* Filters */}
        <div className="browse-filters">
          <div className="filter-group">
            <label>Danh Mục:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất Cả</option>
              {CAMPAIGN_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Trạng Thái:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất Cả</option>
              <option value="active">Đang Diễn Ra</option>
              <option value="ending-soon">Sắp Kết Thúc</option>
              <option value="nearly-complete">Gần Hoàn Thành</option>
            </select>
          </div>

          <div className="filter-results">
            Tìm thấy <strong>{filteredCampaigns.length}</strong> chiến dịch
          </div>
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Không tìm thấy chiến dịch nào</h3>
            <p>Thử thay đổi bộ lọc để xem thêm kết quả</p>
          </div>
        ) : (
          <div className="campaigns-grid">
            {filteredCampaigns.map((campaign) => {
              const progress = calculateProgress(
                campaign.current_amount,
                campaign.goal_amount
              );
              const daysUntilEnd = getDaysUntilEnd(campaign.end_date);

              return (
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
                        No Image
                      </div>
                    )}
                    {campaign.category && (
                      <span className="campaign-category-badge">
                        {getCategoryLabel(campaign.category)}
                      </span>
                    )}
                    {daysUntilEnd !== null && daysUntilEnd > 0 && daysUntilEnd <= 7 && (
                      <span className="campaign-ending-badge">
                        Còn {daysUntilEnd} ngày
                      </span>
                    )}
                    {progress >= 80 && progress < 100 && (
                      <span className="campaign-progress-badge">
                        {progress.toFixed(0)}% hoàn thành
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
                      Bởi: {campaign.creator_name}
                    </p>
                    <div className="campaign-progress-modern">
                      <div className="progress-bar-modern">
                        <div
                          className="progress-fill-modern"
                          style={{ width: `${progress}%` }}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;

