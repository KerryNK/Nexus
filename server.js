require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURATION ====================
const TAO_BASE = 'https://api.tao.app/api/beta';
const TAOSTATS_BASE = 'https://api.taostats.io/v2';

const TAO_KEY = process.env.TAO_APP_API_KEY;
const TAOSTATS_KEY = process.env.TAOSTATS_API_KEY;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== ENDPOINT MAPPING ====================
function mapEndpointToTaostats(endpoint) {
  const mapping = {
    'current': '/network',
    'subnet_screener': '/subnets',
  };
  
  // Handle metagraph endpoints
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
    timestamp: new Date().toISOString(),
    tao_key_configured: !!TAO_KEY,
    taostats_key_configured: !!TAOSTATS_KEY
  });
});

// Proxy for TAO.app API endpoints
app.get('/api/:endpoint(*)', async (req, res) => {
  const { endpoint } = req.params;
  const useFallback = req.query.useFallback === 'true';
  const params = { ...req.query };
  delete params.useFallback;
  
  console.log(`Fetching ${endpoint} (fallback: ${useFallback})`);
  
  try {
    let url, headers;
    
    if (useFallback && TAOSTATS_KEY) {
      // Use Taostats as fallback
      const taostatsEndpoint = mapEndpointToTaostats(endpoint);
      url = new URL(`${TAOSTATS_BASE}${taostatsEndpoint}`);
      headers = {
        'Authorization': `Bearer ${TAOSTATS_KEY}`,
        'Accept': 'application/json'
      };
      console.log(`Using Taostats fallback: ${url}`);
    } else if (TAO_KEY) {
      // Use TAO.app primary
      url = new URL(`${TAO_BASE}/${endpoint}`);
      headers = {
        'X-API-Key': TAO_KEY,
        'Accept': 'application/json'
      };
      console.log(`Using TAO.app: ${url}`);
    } else {
      return res.status(500).json({
        error: 'No API key configured',
        message: 'Please configure TAO_APP_API_KEY or TAOSTATS_API_KEY in .env file'
      });
    }
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    // Make the API call
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error ${response.status}: ${errorText}`);
      
      // If primary fails and we haven't tried fallback yet, try it
      if (!useFallback && TAOSTATS_KEY && response.status === 401) {
        console.log('Primary API failed with 401, trying fallback...');
        return res.redirect(`${req.path}?${new URLSearchParams({...params, useFallback: 'true'}).toString()}`);
      }
      
      return res.status(response.status).json({
        error: `API request failed (${response.status})`,
        message: errorText,
        endpoint: endpoint
      });
    }
    
    const data = await response.json();
    
    // Transform Taostats data to match TAO.app format if needed
    if (useFallback) {
      const transformed = transformTaostatsData(endpoint, data);
      return res.json(transformed);
    }
    
    res.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== DATA TRANSFORMATION ====================
function transformTaostatsData(endpoint, data) {
  // Transform Taostats response format to match TAO.app format
  
  if (endpoint === 'current' || endpoint === 'network') {
    // Taostats network endpoint returns different structure
    return {
      price_usd: data.tao_price || data.price || 191,
      market_cap_usd: data.market_cap || data.mcap || 2030000000,
      volume_24h: data.volume_24h || 0,
      ...data
    };
  }
  
  if (endpoint === 'subnet_screener' || endpoint === 'subnets') {
    // Ensure consistent field names
    if (Array.isArray(data)) {
      return data.map(subnet => ({
        netuid: subnet.netuid || subnet.id,
        subnet_name: subnet.name || subnet.subnet_name,
        emission_pct: subnet.emission || subnet.emission_pct || 0,
        price: subnet.price || 0,
        market_cap_tao: subnet.mcap_tao || subnet.market_cap_tao || 0,
        price_1h_pct_change: subnet.price_change_1h || 0,
        price_1d_pct_change: subnet.price_change_24h || subnet.price_1d_pct_change || 0,
        price_7d_pct_change: subnet.price_change_7d || subnet.price_7d_pct_change || 0,
        price_1m_pct_change: subnet.price_change_30d || subnet.price_1m_pct_change || 0,
        total_volume_tao_1d: subnet.volume_24h || 0,
        net_volume_tao_7d: subnet.volume_7d || 0,
        buy_volume_tao_1d: subnet.buy_volume_24h || 0,
        sell_volume_tao_1d: subnet.sell_volume_24h || 0,
        alpha_in: subnet.liquidity_alpha || subnet.alpha_in || 0,
        alpha_out: subnet.alpha_out || 0,
        tao_in: subnet.liquidity_tao || subnet.tao_in || 0,
        holders_count: subnet.holders || subnet.holders_count || 0,
        top_holder_pct: subnet.top_holder_percent || subnet.top_holder_pct || 0,
        github_repo: subnet.github || subnet.github_repo || '',
        subnet_website: subnet.website || subnet.subnet_website || '',
        discord: subnet.discord || '',
        tags: subnet.tags || [],
        ...subnet
      }));
    }
  }
  
  if (endpoint.startsWith('metagraph/')) {
    // Ensure consistent metagraph structure
    return {
      validators: data.validators || [],
      miners: data.miners || [],
      total_stake_tao: data.total_stake || 0,
      active_uids: data.active_uids || 0,
      max_uids: data.max_uids || 256,
      ...data
    };
  }
  
  return data;
}

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         DeAI Nexus Backend Server                     ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║ Status: Running on http://localhost:${PORT}              ║`);
  console.log(`║ TAO.app API Key: ${TAO_KEY ? '✓ Configured' : '✗ Not configured'}                      ║`);
  console.log(`║ Taostats API Key: ${TAOSTATS_KEY ? '✓ Configured' : '✗ Not configured'}                   ║`);
  console.log('║                                                        ║');
  console.log('║ Endpoints:                                             ║');
  console.log('║  GET /health          - Health check                   ║');
  console.log('║  GET /api/current     - Current TAO metrics            ║');
  console.log('║  GET /api/subnet_screener - All subnets data           ║');
  console.log('║  GET /api/metagraph/:netuid - Subnet metagraph         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (!TAO_KEY && !TAOSTATS_KEY) {
    console.warn('⚠️  WARNING: No API keys configured!');
    console.warn('⚠️  Please add TAO_APP_API_KEY or TAOSTATS_API_KEY to your .env file');
    console.warn('');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
