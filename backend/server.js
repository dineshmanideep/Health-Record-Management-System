require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static assets
// Files are accessible at  http://localhost:5001/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));

// Role-protected routes — each file applies protect + authorize internally
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/nurse', require('./routes/nurse'));
app.use('/api/hospital', require('./routes/hospital'));
app.use('/api/admin', require('./routes/admin'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Health Record Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
const API_URL = process.env.VITE_API_URL || `http://localhost:${PORT}`;

// app.listen(PORT, '0.0.0.0', () => {
app.listen(PORT, () => { 
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access locally: http://localhost:${PORT}`);
  console.log(`Access on network: http://10.102.106.107:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
