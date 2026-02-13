require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const scoringRoutes = require('./routes/scoring');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deai-nexus';


// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT) || 100,
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// ==================== BODY PARSING MIDDLEWARE ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// ==================== CORS MIDDLEWARE ====================
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ==================== STATIC FILES ====================
app.use(express.static(path.join(__dirname, '../frontend')));

// ==================== LOGGING MIDDLEWARE ====================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});


// ==================== DATABASE CONNECTION ====================
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✓ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ==================== DATA API / PROXY SETUP ====================

// Data API endpoints (fetch from external APIs)
const fetch = require('node-fetch');

const TAO_BASE = 'https://api.tao.app/api/beta';
const TAOSTATS_BASE = 'https://api.taostats.io/v2';
const TAO_KEY = process.env.TAO_APP_API_KEY;
const TAOSTATS_KEY = process.env.TAOSTATS_API_KEY;

// Helper function to fetch from APIs
async function fetchFromAPI(endpoint, useAlt = false) {
  try {
    if (useAlt && TAOSTATS_KEY) {
      const taostatsPath = mapEndpointToTaostats(endpoint);
      const response = await fetch(`${TAOSTATS_BASE}${taostatsPath}`, {
        headers: {
          'Authorization': `Bearer ${TAOSTATS_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) return response.json();
    }

    if (TAO_KEY) {
      const response = await fetch(`${TAO_BASE}/${endpoint}`, {
        headers: {
          'X-API-Key': TAO_KEY,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) return response.json();
    }

    return null;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error.message);
    return null;
  }
}

// Map endpoints to Taostats
function mapEndpointToTaostats(endpoint) {
  const mapping = {
    'current': '/network',
    'subnet_screener': '/subnets'
  };

  if (endpoint.startsWith('metagraph/')) {
    const netuid = endpoint.split('/')[1];
    return `/subnets/${netuid}/metagraph`;
  }

  return mapping[endpoint] || `/${endpoint}`;
}

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scoring', scoringRoutes);

// Proxy for TAO.app API endpoints
app.get('/api/current', async (req, res) => {
  try {
    const data = await fetchFromAPI('current', true);
    if (data) {
      res.json(data);
    } else {
      res.status(503).json({ error: 'Data API unavailable' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current data' });
  }
});

// Subnet screener (all subnets)
app.get('/api/subnet_screener', async (req, res) => {
  try {
    const data = await fetchFromAPI('subnet_screener', true);
    if (data) {
      res.json(data);
    } else {
      res.status(503).json({ error: 'Data API unavailable' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subnet screener data' });
  }
});

// Metagraph data for specific subnet
app.get('/api/metagraph/:netuid', async (req, res) => {
  try {
    const endpoint = `metagraph/${req.params.netuid}`;
    const data = await fetchFromAPI(endpoint, true);
    if (data) {
      res.json(data);
    } else {
      res.status(503).json({ error: 'Data API unavailable' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metagraph' });
  }
});

// ==================== FRONTEND ROUTES ====================

// Serve index.html for all non-API routes (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== SERVER STARTUP ====================

const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         DeAI Nexus Backend Server v2.0                        ║');
  console.log('║         With Authentication & Scoring Board                   ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║ Status: Running on http://localhost:${PORT}                      ║`);
  console.log(`║ Database: ${mongoose.connection.readyState === 1 ? '✓ Connected' : '✗ Disconnected' }                                         ║`);
  console.log(`║ TAO.app API: ${TAO_KEY ? '✓ Configured' : '✗ Not configured'}                                     ║`);
  console.log(`║ Taostats API: ${TAOSTATS_KEY ? '✓ Configured' : '✗ Not configured'}                                   ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (!TAO_KEY && !TAOSTATS_KEY) {
    console.warn('⚠️  Warning: No API keys configured. Data endpoints will not work.');
    console.warn('   Set TAO_APP_API_KEY or TAOSTATS_API_KEY in .env file.\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
