require('dotenv').config();
const express      = require('express');
const path         = require('path');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const config       = require('./config');
const logger       = require('./config/logger');
const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { startScheduler } = require('./jobs/scheduler');

// Routes
const authRoutes        = require('./routes/auth.routes');
const adminRoutes       = require('./routes/admin.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const doctorRoutes      = require('./routes/doctor.routes');
const calendarRoutes    = require('./routes/calendar.routes');
const chatRoutes        = require('./routes/chat.routes');

const app = express();

// ── Security & Middleware ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // allow React inline scripts
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: [config.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: (m) => logger.info(m.trim()) } }));

// ── Rate Limiting (skipped in dev) ────────────────────────────────────────
const isDev = config.NODE_ENV === 'development';
app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false, skip: () => isDev }));
app.use('/api/auth/login',    rateLimit({ windowMs: 15*60*1000, max: 200, skip: () => isDev }));
app.use('/api/auth/register', rateLimit({ windowMs: 15*60*1000, max: 200, skip: () => isDev }));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctor',       doctorRoutes);
app.use('/api/calendar',     calendarRoutes);
app.use('/api/chat',         chatRoutes);

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'mongodb', env: config.NODE_ENV }));

// ── Serve Built React Frontend ────────────────────────────────────────────
// The frontend is built into backend/public by `npm run build:ui`
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath, {
  maxAge: '1d',
  etag: true,
}));

// SPA Fallback — all non-API routes serve index.html (React Router handles them)
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  // Check if index.html exists (i.e. frontend has been built)
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).json({
      message: 'HealthSync API is running. Build the frontend with: npm run build:ui',
      api: '/api/*',
      health: '/health',
    });
  }
});

// ── Error Handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();
    app.listen(config.PORT, () => {
      logger.info(`HealthSync running at http://localhost:${config.PORT} [${config.NODE_ENV}]`);
    });
    startScheduler();
  } catch (err) {
    logger.error('Failed to start: ' + err.message);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  const mongoose = require('mongoose');
  await mongoose.disconnect();
  process.exit(0);
});

module.exports = app;
