require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4000;

// ==================== CONFIGURATION ====================
const TAO_BASE = 'https://api.tao.app/api/beta';
const TAOSTATS_BASE = 'https://api.taostats.io/v2';
const TAODAILY_URL = 'https://taodaily.com';

const TAO_KEY = process.env.TAO_APP_API_KEY;
const TAOSTATS_KEY = process.env.TAOSTATS_API_KEY;

// ==================== CACHING ====================
const cache = {
    current: { data: null, expiry: 0 },
    subnet_screener: { data: null, expiry: 0 },
    taodaily: { data: null, expiry: 0 },
    metagraph: {}
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for API data
const TAODAILY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for TaoDaily

function getCached(key) {
    if (cache[key] && Date.now() < cache[key].expiry) {
        return cache[key].data;
    }
    return null;
}

function setCached(key, data, ttl = CACHE_TTL) {
    cache[key] = {
        data,
        expiry: Date.now() + ttl
    };
}

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    console.log(`[${timestamp}] ${method} ${path}`);
    next();
});

// ==================== ENDPOINT MAPPING ====================
function mapEndpointToTaostats(endpoint) {
    const mapping = {
        'current': '/network',
        'subnet_screener': '/subnets',
    };

    if (endpoint.startsWith('metagraph/')) {
        const netuid = endpoint.split('/')[1];
        return `/subnets/${netuid}/metagraph`;
    }

    return mapping[endpoint] || `/${endpoint}`;
}

// ==================== TAODAILY SCRAPING ====================
async function fetchTaoDailyNews() {
    const cached = getCached('taodaily');
    if (cached) return cached;

    try {
        const res = await fetch(TAODAILY_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DeAI-Nexus/1.0)'
            }
        });

        if (!res.ok) throw new Error('Failed to fetch TaoDaily');

        const html = await res.text();

        // Simple parsing: extract article titles and links
        const articles = [];
        const regex = /<h[2-3].*?<a\s+href="([^"]*)"[^>]*>([^<]+)<\/a>/g;
        let match;

        while ((match = regex.exec(html)) && articles.length < 5) {
            articles.push({
                title: match[2].trim(),
                url: match[1].startsWith('http') ? match[1] : TAODAILY_URL + match[1],
                source: 'The TAO Daily',
                date: new Date().toLocaleDateString()
            });
        }

        if (articles.length === 0) {
            // Fallback: return placeholder
            articles.push({
                title: 'Visit The TAO Daily for latest Bittensor news',
                url: TAODAILY_URL,
                source: 'The TAO Daily',
                date: new Date().toLocaleDateString()
            });
        }

        setCached('taodaily', articles, TAODAILY_CACHE_TTL);
        return articles;
    } catch (err) {
        console.error('TaoDaily fetch error:', err.message);
        // Return cached or empty
        return cached || [];
    }
}

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        tao_key_configured: !!TAO_KEY,
        taostats_key_configured: !!TAOSTATS_KEY,
        version: '3.0'
    });
});

// Root - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Nexus-Pro.html'));
});

// API Proxy for TAO.app and Taostats
app.get('/api/:endpoint(*)', async (req, res) => {
    const { endpoint } = req.params;
    const useFallback = req.query.useFallback === 'true';
    const params = { ...req.query };
    delete params.useFallback;

    console.log(`Fetching ${endpoint} (fallback: ${useFallback})`);

    try {
        // Check cache first
        const cached = getCached(endpoint);
        if (cached && !params.nocache) {
            console.log(`Using cached data for ${endpoint}`);
            return res.json(cached);
        }

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
                message: 'Please configure TAO_APP_API_KEY or TAOSTATS_API_KEY in .env file',
                docs: 'https://github.com/yourusername/nexus#api-setup'
            });
        }

        // Add query parameters
        Object.keys(params).forEach(key => {
            if (key !== 'nocache') {
                url.searchParams.append(key, params[key]);
            }
        });

        // Make the API call with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url.toString(), {
            headers,
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error ${response.status}: ${errorText}`);

            // If primary fails with 401 and we haven't tried fallback yet, try it
            if (!useFallback && TAOSTATS_KEY && response.status === 401) {
                console.log('Primary API failed with 401, trying fallback...');
                const fallbackUrl = `${req.path}?${new URLSearchParams({ ...params, useFallback: 'true' }).toString()}`;
                return res.redirect(fallbackUrl);
            }

            return res.status(response.status).json({
                error: `API request failed (${response.status})`,
                message: errorText || 'Unknown error',
                endpoint: endpoint
            });
        }

        const data = await response.json();

        // Transform Taostats data to match TAO.app format if needed
        const transformed = transformTaostatsData(endpoint, data);

        // Cache the response
        setCached(endpoint, transformed);

        res.json(transformed);

    } catch (error) {
        console.error('Proxy error:', error.message);

        if (error.name === 'AbortError') {
            return res.status(504).json({
                error: 'API request timeout',
                message: 'Request took too long. Server may be busy.',
                endpoint: endpoint
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// TaoDaily News endpoint
app.get('/api/taodaily', async (req, res) => {
    try {
        const articles = await fetchTaoDailyNews();
        res.json({
            source: 'The TAO Daily',
            articles,
            cached: getCached('taodaily') ? true : false,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('TaoDaily endpoint error:', err);
        res.status(500).json({
            error: 'Failed to fetch TaoDaily news',
            message: err.message
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
                fdv_tao: subnet.fdv_tao || subnet.market_cap_tao || 0,
                price_1h_pct_change: subnet.price_change_1h || 0,
                price_1d_pct_change: subnet.price_change_24h || subnet.price_1d_pct_change || 0,
                price_7d_pct_change: subnet.price_change_7d || subnet.price_7d_pct_change || 0,
                price_1m_pct_change: subnet.price_change_30d || subnet.price_1m_pct_change || 0,
                total_volume_tao_1d: subnet.volume_24h || 0,
                holders_count: subnet.holders || subnet.holders_count || 0,
                top_holder_pct: subnet.top_holder_percent || subnet.top_holder_pct || 0,
                github_repo: subnet.github || subnet.github_repo || '',
                subnet_website: subnet.website || subnet.subnet_website || '',
                discord: subnet.discord || '',
                tags: subnet.tags || [],
                description: subnet.description || '',
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
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        message: 'Endpoint does not exist'
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    const startTime = new Date().toISOString();
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         DeAI Nexus Backend Server v3.0                ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Status: Running on http://localhost:${PORT.toString().padEnd(37 - 'localhost:'.length)}║`);
    console.log(`║ TAO.app API Key: ${TAO_KEY ? '✓ Configured' : '✗ Not configured'}`.padEnd(57) + '║');
    console.log(`║ Taostats API Key: ${TAOSTATS_KEY ? '✓ Configured' : '✗ Not configured'}`.padEnd(57) + '║');
    console.log('║                                                        ║');
    console.log('║ Available Endpoints:                                   ║');
    console.log('║  GET /                            - Dashboard          ║');
    console.log('║  GET /health                      - Health check       ║');
    console.log('║  GET /api/current                 - TAO metrics        ║');
    console.log('║  GET /api/subnet_screener         - All subnets        ║');
    console.log('║  GET /api/metagraph/:netuid       - Subnet metagraph   ║');
    console.log('║  GET /api/taodaily                - TaoDaily news      ║');
    console.log('║                                                        ║');
    console.log('║ Caching: API responses (5min), TaoDaily (24h)          ║');
    console.log('║ Fallback: Taostats if TAO.app fails (401)              ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    if (!TAO_KEY && !TAOSTATS_KEY) {
        console.warn('⚠️  WARNING: No API keys configured!');
        console.warn('⚠️  Please add TAO_APP_API_KEY or TAOSTATS_API_KEY to your .env file');
        console.warn('');
    }

    console.log('Server started at ' + startTime);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\nSIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    process.exit(0);
});
