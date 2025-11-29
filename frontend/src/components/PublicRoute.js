import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * PublicRoute - Chỉ cho phép truy cập khi CHƯA login
 * Nếu đã login thì redirect về home
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  // Nếu đã login, redirect về home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;

