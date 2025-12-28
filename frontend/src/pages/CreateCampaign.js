import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import BlockEditor from '../components/BlockEditor';
import { CAMPAIGN_CATEGORIES } from '../constants/categories';
import { getImageUrl } from '../utils/imageUtils';
import './CreateCampaign.css';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
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
  const [fetching, setFetching] = useState(false);

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

  // Parse HTML to blocks
  const parseHTMLToBlocks = (html) => {
    if (!html) return [];
    
    const blocks = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    
    // Helper function to extract text content (excluding images)
    const extractTextContent = (element) => {
      const clone = element.cloneNode(true);
      // Remove all img tags
      clone.querySelectorAll('img').forEach(img => img.remove());
      return clone.textContent.trim();
    };
    
    // Process only direct child nodes of body (to maintain order)
    Array.from(body.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        if (tagName === 'h1') {
          const text = extractTextContent(node);
          if (text) {
            blocks.push({
              id: Date.now() + Math.random(),
              type: 'h1',
              content: text,
              imageUrl: null
            });
          }
        } else if (tagName === 'blockquote') {
          const text = extractTextContent(node);
          if (text) {
            blocks.push({
              id: Date.now() + Math.random(),
              type: 'quote',
              content: text,
              imageUrl: null
            });
          }
        } else if (tagName === 'p') {
          // Check if p contains img - if yes, skip p and process img separately
          const images = node.querySelectorAll('img');
          if (images.length > 0) {
            // Process images first
            images.forEach(img => {
              const src = img.getAttribute('src');
              if (src) {
                blocks.push({
                  id: Date.now() + Math.random(),
                  type: 'image',
                  content: '',
                  imageUrl: src
                });
              }
            });
            // Then process text if any
            const text = extractTextContent(node);
            if (text) {
              blocks.push({
                id: Date.now() + Math.random(),
                type: 'body',
                content: text,
                imageUrl: null
              });
            }
          } else {
            // No images, just process text
            const text = extractTextContent(node);
            if (text) {
              blocks.push({
                id: Date.now() + Math.random(),
                type: 'body',
                content: text,
                imageUrl: null
              });
            }
          }
        } else if (tagName === 'img') {
          const src = node.getAttribute('src');
          if (src) {
            blocks.push({
              id: Date.now() + Math.random(),
              type: 'image',
              content: '',
              imageUrl: src
            });
          }
        }
      }
    });
    
    return blocks;
  };

  // Fetch campaign data for edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const fetchCampaign = async () => {
      setFetching(true);
      try {
        const response = await api.get(`/campaigns/${id}`);
        const campaign = response.data.campaign;
        
        // Check if user can edit (only owner and only PENDING or REJECTED status)
        if (campaign.status === 'APPROVED' || campaign.status === 'ENDED') {
          setError('Không thể sửa chiến dịch đã được duyệt hoặc đã kết thúc');
          setTimeout(() => navigate('/my-campaigns'), 2000);
          return;
        }

        // Load form data
        setFormData({
          title: campaign.title || '',
          goal_amount: campaign.goal_amount || '',
          category: campaign.category || '',
          start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
          end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
          content: campaign.content || '',
          blocks: []
        });

        // Parse HTML content to blocks
        if (campaign.content) {
          const blocks = parseHTMLToBlocks(campaign.content);
          setFormData(prev => ({ ...prev, blocks }));
        }

        // Load thumbnail preview
        if (campaign.thumbnail) {
          setThumbnailPreview(getImageUrl(campaign.thumbnail));
        }
      } catch (err) {
        console.error('Error fetching campaign:', err);
        if (err.response?.status === 403 || err.response?.status === 404) {
          setError('Không tìm thấy chiến dịch hoặc bạn không có quyền sửa');
        } else {
          setError('Lỗi khi tải thông tin chiến dịch');
        }
        setTimeout(() => navigate('/my-campaigns'), 2000);
      } finally {
        setFetching(false);
      }
    };

    fetchCampaign();
  }, [id, isEditMode, navigate]);

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

      if (isEditMode) {
        // Update campaign
        await api.put(`/campaigns/${id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        navigate(`/campaign/${id}`);
      } else {
        // Create campaign
        const response = await api.post('/campaigns', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        navigate(`/campaign/${response.data.campaignId}`);
      }
    } catch (err) {
      if (isEditMode) {
        setError(err.response?.data?.message || 'Cập nhật chiến dịch thất bại');
      } else {
        setError(err.response?.data?.message || 'Tạo chiến dịch thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Đang tải thông tin chiến dịch...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">{isEditMode ? 'Sửa Chiến Dịch Gây Quỹ' : 'Tạo Chiến Dịch Gây Quỹ'}</h1>
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
            {loading 
              ? (isEditMode ? 'Đang cập nhật...' : 'Đang tạo...') 
              : (isEditMode ? 'Cập Nhật Chiến Dịch' : 'Tạo Chiến Dịch')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCampaign;

