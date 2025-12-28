import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CampaignDetail from './pages/CampaignDetail';
import CreateCampaign from './pages/CreateCampaign';
import MyCampaigns from './pages/MyCampaigns';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Browse from './pages/Browse';
import PaymentPage from './pages/PaymentPage';
import SolanaPaymentPage from './pages/SolanaPaymentPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/payment/solana" element={<SolanaPaymentPage />} />
            <Route
              path="/create-campaign"
              element={
                <ProtectedRoute>
                  <CreateCampaign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-campaign/:id"
              element={
                <ProtectedRoute>
                  <CreateCampaign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-campaigns"
              element={
                <ProtectedRoute>
                  <MyCampaigns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

