const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Tăng limit cho JSON body
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Tăng limit cho URL-encoded body
app.use('/uploads', express.static('uploads'));
app.use('/uploads/content-images', express.static('uploads/content-images'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join campaign room
  socket.on('join-campaign', (campaignId) => {
    socket.join(`campaign-${campaignId}`);
    console.log(`User ${socket.id} joined campaign ${campaignId}`);
  });

  // Leave campaign room
  socket.on('leave-campaign', (campaignId) => {
    socket.leave(`campaign-${campaignId}`);
    console.log(`User ${socket.id} left campaign ${campaignId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Check SMTP configuration on startup
const { verifyConnection } = require('./services/emailService');
// Start campaign scheduler
const { startCampaignScheduler } = require('./services/campaignScheduler');

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Verify SMTP connection
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('Checking SMTP configuration...');
    const smtpReady = await verifyConnection();
    if (smtpReady) {
      console.log('✅ SMTP is ready to send emails');
    } else {
      console.warn('⚠️  SMTP connection failed. OTP email feature may not work.');
      console.warn('   Please check your SMTP configuration in .env file');
    }
  } else {
    console.warn('⚠️  SMTP configuration is missing. OTP email feature will not work.');
    console.warn('   Please add SMTP_USER and SMTP_PASS to your .env file');
  }

  // Start campaign scheduler (check every 60 minutes)
  // Có thể config qua env: CAMPAIGN_CHECK_INTERVAL_MINUTES
  const checkInterval = parseInt(process.env.CAMPAIGN_CHECK_INTERVAL_MINUTES) || 60;
  startCampaignScheduler(checkInterval);
});

module.exports = { app, io };

