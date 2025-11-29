import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ProfileDropdown.css';

const ProfileDropdown = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  // Lấy chữ cái đầu của tên để hiển thị avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Normalize Google avatar URL để đảm bảo hiển thị đúng
  const normalizeAvatarUrl = (url) => {
    if (!url) return null;
    
    // Nếu là Google avatar URL (lh3.googleusercontent.com)
    if (url.includes('googleusercontent.com')) {
      // Loại bỏ các tham số cũ nếu có
      const baseUrl = url.split('?')[0].split('=')[0];
      // Thêm tham số để đảm bảo kích thước và format
      // =s96-c: size 96px, crop to circle
      return `${baseUrl}=s96-c`;
    }
    
    return url;
  };

  // State để track avatar load errors
  const [avatarError, setAvatarError] = useState(false);
  
  // Reset avatar error khi user thay đổi
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
      >
        <div className="profile-avatar">
          {user.avatar && !avatarError ? (
            <img 
              src={normalizeAvatarUrl(user.avatar)} 
              alt={user.fullname}
              onError={() => setAvatarError(true)}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="avatar-initials">{getInitials(user.fullname)}</span>
          )}
        </div>
        <svg
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="profile-dropdown-menu">
          <div className="profile-menu-header">
            <div className="profile-menu-avatar">
              {user.avatar && !avatarError ? (
                <img 
                  src={normalizeAvatarUrl(user.avatar)} 
                  alt={user.fullname}
                  onError={() => setAvatarError(true)}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="avatar-initials">{getInitials(user.fullname)}</span>
              )}
            </div>
            <div className="profile-menu-info">
              <div className="profile-menu-name">{user.fullname}</div>
              <div className="profile-menu-email">{user.email}</div>
            </div>
          </div>
          <div className="profile-menu-divider"></div>
          <button onClick={handleProfileClick} className="profile-menu-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z"
                fill="currentColor"
              />
              <path
                d="M8 10C4.68629 10 2 12.6863 2 16H14C14 12.6863 11.3137 10 8 10Z"
                fill="currentColor"
              />
            </svg>
            <span>Profile</span>
          </button>
          <button onClick={handleLogoutClick} className="profile-menu-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M10 11L14 7L10 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 7H6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;

