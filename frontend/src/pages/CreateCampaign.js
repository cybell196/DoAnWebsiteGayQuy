import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import BlockEditor from '../components/BlockEditor';
import { CAMPAIGN_CATEGORIES } from '../constants/categories';
import './CreateCampaign.css';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    goal_amount: '',
    category: '',
    start_date: '',
    end_date: '',
    content: '',
    blocks: []
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      // Tạo preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
    // Reset file input
    const fileInput = document.getElementById('thumbnail-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Convert blocks to HTML
  const convertBlocksToHTML = (blocks) => {
    if (!blocks || blocks.length === 0) return '';
    
    return blocks.map(block => {
      switch (block.type) {
        case 'h1':
          return `<h1>${escapeHtml(block.content)}</h1>`;
        case 'quote':
          return `<blockquote>${escapeHtml(block.content)}</blockquote>`;
        case 'body':
          return `<p>${escapeHtml(block.content).replace(/\n/g, '<br>')}</p>`;
        case 'image':
          if (block.imageUrl) {
            return `<img src="${block.imageUrl}" alt="Campaign image" />`;
          }
          return '';
        default:
          return '';
      }
    }).join('');
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('goal_amount', formData.goal_amount);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('start_date', formData.start_date);
      formDataToSend.append('end_date', formData.end_date);
      
      // Convert blocks to HTML content
      const htmlContent = convertBlocksToHTML(formData.blocks);
      formDataToSend.append('content', htmlContent);
      
      // Extract images from blocks
      const images = formData.blocks
        .filter(block => block.type === 'image' && block.imageUrl)
        .map(block => block.imageUrl);
      formDataToSend.append('images', JSON.stringify(images));

      if (thumbnail) {
        formDataToSend.append('thumbnail', thumbnail);
      }

      // Validate content
      if (!formData.blocks || formData.blocks.length === 0) {
        setError('Vui lòng thêm ít nhất một block nội dung');
        setLoading(false);
        return;
      }

      const response = await api.post('/campaigns', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      navigate(`/campaign/${response.data.campaignId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo chiến dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Tạo Chiến Dịch Gây Quỹ</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="campaign-form">
        <div className="form-group">
          <label>Tiêu Đề *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Mục Tiêu (USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="goal_amount"
              value={formData.goal_amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Danh Mục</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">-- Chọn danh mục --</option>
              {CAMPAIGN_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Ngày Bắt Đầu</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Ngày Kết Thúc</label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Ảnh Đại Diện</label>
          {thumbnailPreview ? (
            <div className="thumbnail-preview-container">
              <div className="thumbnail-preview">
                <img src={thumbnailPreview} alt="Thumbnail preview" />
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  className="btn-remove-thumbnail"
                  title="Xóa ảnh"
                >
                  ✕
                </button>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('thumbnail-input').click()}
                className="btn btn-secondary btn-sm"
              >
                Chọn ảnh khác
              </button>
            </div>
          ) : (
            <div className="thumbnail-upload">
              <label htmlFor="thumbnail-input" className="thumbnail-upload-label">
                <span className="upload-icon">📷</span>
                <span>Chọn ảnh đại diện</span>
              </label>
            </div>
          )}
          <input
            id="thumbnail-input"
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="form-group">
          <BlockEditor
            value={formData.blocks}
            onChange={(blocks) => setFormData({ ...formData, blocks })}
          />
          {(!formData.blocks || formData.blocks.length === 0) && (
            <p className="form-error">Vui lòng thêm ít nhất một block nội dung</p>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo Chiến Dịch'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCampaign;

