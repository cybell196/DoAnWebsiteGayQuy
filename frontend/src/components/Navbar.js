import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import ProfileDropdown from './ProfileDropdown';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            Fundraise App
          </Link>
          <div className="navbar-links">
            <Link to="/browse">Chiến Dịch</Link>
            {user ? (
              <>
                <Link to="/create-campaign">Tạo Chiến Dịch</Link>
                <Link to="/my-campaigns">Chiến Dịch Của Tôi</Link>
                {user.role === 'ADMIN' && (
                  <Link to="/admin">Admin</Link>
                )}
                <NotificationBell />
                <ProfileDropdown user={user} onLogout={handleLogout} />
              </>
            ) : (
              <>
                <Link to="/login">Đăng Nhập</Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Đăng Ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

