require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const config = require('./config');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { startScheduler } = require('./jobs/scheduler');
const { initSignalingSocket } = require('./sockets/signaling.socket');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const doctorRoutes = require('./routes/doctor.routes');
const calendarRoutes = require('./routes/calendar.routes');
const chatRoutes = require('./routes/chat.routes');
const assessmentRoutes = require('./routes/assessment.routes');
const recordsRoutes = require('./routes/records.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const ambulanceRoutes = require('./routes/ambulance.routes');
const pharmacyRoutes = require('./routes/pharmacy.routes');
const hospitalRoutes = require('./routes/hospital.routes');
const notificationRoutes = require('./routes/notification.routes');
const telemedicineRoutes = require('./routes/telemedicine.routes');
const consultationRoutes = require('./routes/consultation.routes');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  config.FRONTEND_URL,
  'https://healthcare-frontend-swart.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173'
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) return true;
  return false;
};

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Attach WebRTC Signaling Socket Engine
initSignalingSocket(io);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.options('*', cors());

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: {
      write: (m) => logger.info(m.trim())
    }
  })
);

const isDev = config.NODE_ENV === 'development';

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDev
  })
);

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    skip: () => isDev
  })
);

app.use(
  '/api/auth/register',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    skip: () => isDev
  })
);

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/telemedicine', telemedicineRoutes);
app.use('/api/consultation', consultationRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: 'mongodb',
    realtime: 'socket.io',
    env: config.NODE_ENV
  });
});

const publicPath = path.join(__dirname, '..', 'public');

app.use(
  express.static(publicPath, {
    maxAge: '1d',
    etag: true
  })
);

app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  const fs = require('fs');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).json({
      message: 'HealthSync API is running. Build the frontend with: npm run build:ui',
      api: '/api/*',
      health: '/health'
    });
  }
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();

    server.listen(config.PORT, '0.0.0.0', () => {
      logger.info(
        `HealthSync HTTP & Socket.IO server running on port ${config.PORT} [${config.NODE_ENV}]`
      );
    });

    startScheduler();
  } catch (err) {
    logger.error('Failed to start server: ' + err.message);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  const mongoose = require('mongoose');
  await mongoose.disconnect();
  process.exit(0);
});

module.exports = { app, server, io };
