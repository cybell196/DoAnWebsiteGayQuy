import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './BlockEditor.css';

const BlockEditor = ({ value, onChange }) => {
  const [blocks, setBlocks] = useState(value || []);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(blocks)) {
      setBlocks(value);
    }
  }, [value]);

  const updateBlocks = (newBlocks) => {
    setBlocks(newBlocks);
    if (onChange) {
      onChange(newBlocks);
    }
  };

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type: type,
      content: '',
      imageUrl: null
    };
    updateBlocks([...blocks, newBlock]);
    setShowOptions(false);
  };

  const updateBlock = (id, field, value) => {
    const updatedBlocks = blocks.map(block => {
      if (block.id === id) {
        return { ...block, [field]: value };
      }
      return block;
    });
    updateBlocks(updatedBlocks);
  };

  const deleteBlock = (id) => {
    updateBlocks(blocks.filter(block => block.id !== id));
  };

  const moveBlock = (id, direction) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;

    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    }
    updateBlocks(newBlocks);
  };

  const handleImageUpload = async (blockId, file) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Chỉ chấp nhận file ảnh');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      updateBlock(blockId, 'imageUrl', response.data.imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Upload ảnh thất bại');
    }
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case 'h1':
        return (
          <div className="block-content">
            <input
              type="text"
              className="block-h1-input"
              placeholder="Nhập tiêu đề..."
              value={block.content}
              onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
            />
          </div>
        );

      case 'quote':
        return (
          <div className="block-content">
            <textarea
              className="block-quote-input"
              placeholder="Nhập trích dẫn..."
              value={block.content}
              onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
              rows="3"
            />
          </div>
        );

      case 'body':
        return (
          <div className="block-content">
            <textarea
              className="block-body-input"
              placeholder="Nhập nội dung..."
              value={block.content}
              onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
              rows="6"
            />
          </div>
        );

      case 'image':
        return (
          <div className="block-content">
            {block.imageUrl ? (
              <div className="block-image-preview">
                <img src={block.imageUrl} alt="Uploaded" />
              </div>
            ) : (
              <div className="block-image-upload">
                <label htmlFor={`image-input-${block.id}`} className="image-upload-label">
                  <span className="upload-icon">📷</span>
                  <span>Chọn ảnh để upload</span>
                </label>
                <input
                  id={`image-input-${block.id}`}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload(block.id, e.target.files[0])}
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="block-editor">
      <div className="block-editor-header">
        <h3>Nội Dung Chiến Dịch</h3>
      </div>

      <div className="blocks-container">
        {blocks.map((block, index) => (
          <div key={block.id} className="content-block">
            <div className="block-header">
              <div className="block-type-label">
                {block.type === 'h1' && 'Header Text'}
                {block.type === 'quote' && 'Quote'}
                {block.type === 'body' && 'Body Text'}
                {block.type === 'image' && 'Image'}
              </div>
              <div className="block-actions">
                {index > 0 && (
                  <button
                    type="button"
                    className="block-action-btn"
                    onClick={() => moveBlock(block.id, 'up')}
                    title="Di chuyển lên"
                  >
                    ↑
                  </button>
                )}
                {index < blocks.length - 1 && (
                  <button
                    type="button"
                    className="block-action-btn"
                    onClick={() => moveBlock(block.id, 'down')}
                    title="Di chuyển xuống"
                  >
                    ↓
                  </button>
                )}
                <button
                  type="button"
                  className="block-action-btn block-delete-btn"
                  onClick={() => deleteBlock(block.id)}
                  title="Xóa"
                >
                  🗑️
                </button>
              </div>
            </div>
            {renderBlock(block)}
          </div>
        ))}

        <div className="add-block-section">
          <div className="add-block-divider"></div>
          <button
            type="button"
            className="add-block-btn"
            onClick={() => setShowOptions(!showOptions)}
          >
            + ADD
          </button>
          {showOptions && (
            <div className="block-options">
              <div className="block-option" onClick={() => addBlock('h1')}>
                <div className="block-option-icon">H1</div>
                <div className="block-option-label">Header Text</div>
              </div>
              <div className="block-option" onClick={() => addBlock('quote')}>
                <div className="block-option-icon">"</div>
                <div className="block-option-label">Quote</div>
              </div>
              <div className="block-option" onClick={() => addBlock('body')}>
                <div className="block-option-icon">Bd</div>
                <div className="block-option-label">Body Text</div>
              </div>
              <div className="block-option" onClick={() => addBlock('image')}>
                <div className="block-option-icon">📷</div>
                <div className="block-option-label">Image</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockEditor;

