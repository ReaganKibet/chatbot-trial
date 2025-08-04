// ================================
// src/routes/admin.js - Admin Panel Routes
// ================================
// Routes for the admin dashboard interface
const express = require('express');
const router = express.Router();
const path = require('path');

// Serve admin panel static files
router.use('/static', express.static(path.join(__dirname, '../../admin-panel/public')));

// Admin dashboard home
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/views/dashboard.html'));
});

// Customer management page
router.get('/customers', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/views/customers.html'));
});

// Product management page
router.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/views/products.html'));
});

// Analytics page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/views/analytics.html'));
});

// Conversations page
router.get('/conversations', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/views/conversations.html'));
});

module.exports = router;

