const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Fix: Missing Security BUG: The verification is weak. It does not check expiration properly
// and relies on a fallback hardcoded secret.
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = ['http://localhost:3000', 'https://haqms-shubhang.vercel.app'];
if (process.env.FRONTEND_URL) {
  const cleanUrl = process.env.FRONTEND_URL.replace(/\/$/, '').trim();
  if (cleanUrl && !allowedOrigins.includes(cleanUrl)) {
    allowedOrigins.push(cleanUrl);
  }
}

// Enable CORS for frontend origin and support credentials for HttpOnly cookies
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Body parser
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reports', reportRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Hospital Appointment and Queue Management System (HAQMS) Backend API',
    status: 'Running',
    version: '1.0.0-deliberate-bugs'
  });
});

// GLOBAL ERROR HANDLER
// BUG FIXED: Improper error handling. It returns the raw error stack trace to the client,
// which leaks details about database types, schema layout, and file paths.
app.use((err, req, res, next) => {
  console.error('[CRITICAL-ERROR]:', err);
  res.status(500).json({
    message: 'An unexpected internal server error occurred!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Listen on port
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`   HAQMS BACKEND SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`   ENVIRONMENT: ${process.env.NODE_ENV}`);
  console.log(`===================================================`);
});

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Intentionally do not exit process so candidates see unhandled promise logs
});
