const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const scanRoutes = require('./routes/scanRoutes');
const manifestRoutes = require('./routes/manifestRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust reverse proxy headers (e.g. X-Forwarded-For on Render/Vercel)
app.set('trust proxy', 1);

// 1. HTTP Security Headers (Helmet protects against common web vulnerabilities)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
  })
);

// 2. CORS configuration (Crucial to allow cookies sharing across different ports/origins)
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || origin === 'null' || origin.startsWith('file://')) {
        return callback(null, true);
      }
      const isLocal = allowedOrigins.includes(origin) || 
                      origin.startsWith('http://localhost:') || 
                      origin.startsWith('https://localhost:') || 
                      origin.startsWith('http://127.0.0.1:') || 
                      origin.startsWith('https://127.0.0.1:') || 
                      origin.includes('192.168.') || 
                      origin.includes('10.') || 
                      origin.includes('172.') ||
                      origin.includes('onrender.com') ||
                      (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',').includes(origin));
      if (isLocal) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 3. Body Parsing Middleware
app.use(express.json({ limit: '10mb' })); // Allow larger JSON payloads for manifest uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Cookie Parsing Middleware
app.use(cookieParser());

// 4.5 Serve Static Frontend files from parent directory (Dynamic Fallback)
const fs = require('fs');
const rootDir = path.join(__dirname, '..');
const frontendDir = path.join(rootDir, 'Frontend');

if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
} else {
  app.use(express.static(rootDir));
}

// 5. Custom Zero-Dependency MongoDB Injection Protection Sanitizer
const sanitizeMongoQueries = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$')) {
          delete obj[key]; // Deletes MongoDB operators like $gt, $ne, $where
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};
app.use(sanitizeMongoQueries);

// 6. Apply General API Rate Limiter
app.use('/api', apiLimiter);

// 6.5 Intercept API requests when MongoDB database connection is offline
app.use('/api', (req, res, next) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is currently offline. Please configure your MONGODB_URI environment variable on the Render dashboard or whitelist your Render server IP on MongoDB Atlas.'
    });
  }
  next();
});

// 7. Route Mounts
app.use('/api', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/manifests', manifestRoutes);

// Root Redirect to Frontend dashboard
app.get('/', (req, res) => {
  const rootIndex = path.join(__dirname, '..', 'index.html');
  const frontendIndex = path.join(__dirname, '..', 'Frontend', 'index.html');
  if (fs.existsSync(frontendIndex)) {
    res.sendFile(frontendIndex);
  } else {
    res.sendFile(rootIndex);
  }
});

// Root Ping Route
app.get('/ping', (req, res) => {
  res.status(200).json({ success: true, message: 'JCMS Security Gateway Online.' });
});

// 8. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint route not found.' });
});

// 9. Global Express Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[JCMS Global Error Handler]:', err.stack || err.message);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error. Please contact admin.'
  });
});

module.exports = app;
