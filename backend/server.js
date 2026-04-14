require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Connect to MongoDB
connectDB();

const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Dedicated route for assignments
app.use('/uploads/assignments', express.static(path.join(__dirname, 'uploads', 'assignments')));
app.use('/uploads/prescriptions', express.static(path.join(__dirname, 'uploads', 'prescriptions')));
app.use('/uploads/test-results', express.static(path.join(__dirname, 'uploads', 'test-results')));

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access locally: http://localhost:${PORT}`);
  console.log(`CORS origin policy: ${allowedOrigins.length ? allowedOrigins.join(', ') : 'open'}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
