# DeAI Nexus Terminal - Live Bittensor Analytics Dashboard

A professional-grade analytics dashboard for Bittensor subnets with real-time data from TAO.app API, comprehensive scoring system, and beautiful visualizations.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Features

### Live Data Integration
- **Real-time TAO price** and network metrics
- **Live subnet data** from TAO.app API
- **Automatic fallback** to Taostats API
- **Metagraph enrichment** for accurate validator/miner counts
- **Smart caching** to optimize API usage

### Comprehensive Scoring System
- **5-component DeAI Score** (Fundamental 20%, Performance 25%, Economic 30%, Development 20%, Consensus 5%)
- **Risk assessment** (Very Low, Low, Medium, High)
- **Investment signals** (Strong Buy, Buy, Hold, Monitor)
- **Emission efficiency** calculations
- **Premium vs Fundamental Value** analysis

### Advanced Leaderboards
- 🏆 **Top 10 by DeAI Score** - Best overall performers
- 💰 **Top 10 by Market Cap** - Largest subnets
- 📈 **Best Value Picks** - Low premium, high quality
- ⚡ **Emission Efficiency** - Best daily TAO per market cap ratio
- 🎯 **Category Leaders** - Top subnet in each category

### Professional UI/UX
- Dark/light theme toggle
- Responsive design (desktop, tablet, mobile)
- Interactive charts (Chart.js)
- Expandable subnet details
- Advanced filtering and sorting
- Real-time status indicators

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn**
- **API Key** from TAO.app or Taostats (see below)

## 🔑 Getting API Keys

### Option 1: TAO.app API (Recommended)

1. Join Bittensor Discord: https://discord.gg/bittensor
2. Go to `#developers` or `#api` channel
3. Request API access with a brief description of your use case:
   ```
   Hi team! Building a community subnet analytics dashboard (DeAI Nexus).
   Could I get access to the TAO.app API for live subnet data?
   Non-commercial use, will share the project. Thanks!
   ```
4. Follow instructions from the team to get your key

### Option 2: Taostats API (Fallback)

1. Visit https://dash.taostats.io
2. Sign up with Google/GitHub/Email
3. Navigate to API section
4. Click "Create API Key"
5. Copy your key (starts with `tskey_...`)

**Note:** You can configure both for maximum reliability (TAO.app primary, Taostats fallback).

## 🛠️ Installation

### 1. Clone or Download

```bash
# If you received this as a zip, extract it
# Or clone from your repository:
# git clone https://github.com/yourusername/deai-nexus.git
cd deai-nexus-backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `cors` - CORS middleware
- `dotenv` - Environment variable management

### 3. Configure API Keys

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your API keys
nano .env   # or use any text editor
```

Add your API keys to `.env`:

```bash
# Primary (TAO.app)
TAO_APP_API_KEY=your_tao_app_key_here

# Fallback (Taostats) - optional but recommended
TAOSTATS_API_KEY=tskey_your_taostats_key_here

# Server config
PORT=3000
NODE_ENV=development
```

**Security Note:** Never commit `.env` to git. It's already in `.gitignore`.

## 🚀 Running the Application

### Start the Backend Server

```bash
npm start
```

You should see:

```
╔════════════════════════════════════════════════════════╗
║         DeAI Nexus Backend Server                     ║
╠════════════════════════════════════════════════════════╣
║ Status: Running on http://localhost:3000              ║
║ TAO.app API Key: ✓ Configured                         ║
║ Taostats API Key: ✓ Configured                        ║
║                                                        ║
║ Endpoints:                                             ║
║  GET /health          - Health check                   ║
║  GET /api/current     - Current TAO metrics            ║
║  GET /api/subnet_screener - All subnets data           ║
║  GET /api/metagraph/:netuid - Subnet metagraph         ║
╚════════════════════════════════════════════════════════╝
```

### Open the Frontend

Simply open `index.html` in your web browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html

# Or use a local server (recommended for development)
npx http-server -p 8080
```

Then visit `http://localhost:8080`

### Test the Setup

1. Click the **Refresh** button in the dashboard
2. Watch the live status indicator
3. Data should load within 5-10 seconds
4. Check browser console (F12) for any errors

## 📊 Using the Dashboard

### Dashboard Tab
- **KPI Cards**: Overview of total market cap, emissions, average scores
- **Charts**: Visual breakdown of market caps, categories, and risk levels
- **Filters**: 
  - Category pills (All, Inference, DeFi, Training, etc.)
  - Score slider (minimum score threshold)
  - Search bar (subnet name or category)
- **Sorting**: Click dropdown to sort by Score, Market Cap, Premium, Emission, etc.
- **Details**: Click any subnet row to expand full metrics

### Leaderboard Tab
- **Top Performers**: See top 10 in each category
- **Category Leaders**: Best subnet per category
- Compare subnets across multiple dimensions

### DeAI Metrics Tab
- **Fundamental Value Calculator**: Estimate intrinsic value based on OpEx
- **DCF Calculator**: Discounted cash flow valuation
- **Emissions Calculator**: Daily/monthly/annual revenue from emissions
- **Composite Score Builder**: Understand scoring methodology

## 🔧 Advanced Configuration

### Custom Port

Change `PORT` in `.env`:

```bash
PORT=5000
```

And update `BACKEND_URL` in `app.js`:

```javascript
const BACKEND_URL = 'http://localhost:5000/api';
```

### Production Deployment

For production, use a process manager like PM2:

```bash
npm install -g pm2
pm2 start server.js --name deai-nexus
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

Example Nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        root /path/to/deai-nexus;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## 🐛 Troubleshooting

### Backend won't start

**Error:** `Cannot find module 'express'`
```bash
# Solution: Install dependencies
npm install
```

**Error:** `Port 3000 already in use`
```bash
# Solution: Change port in .env or kill the process
lsof -ti:3000 | xargs kill -9
# Or use a different port
PORT=3001 npm start
```

### Frontend can't connect to backend

**Error:** `Failed to fetch` or `NetworkError`

1. **Check backend is running:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok",...}`

2. **Check CORS:** Backend has CORS enabled, but if using different ports for frontend, ensure `BACKEND_URL` in `app.js` is correct.

3. **Check browser console** (F12) for specific error messages

### API errors

**Error:** `API authentication failed`

1. **Verify API key** in `.env` is correct (no extra spaces/quotes)
2. **Check key validity:**
   ```bash
   curl -H "X-API-Key: YOUR_KEY" https://api.tao.app/api/beta/current
   ```
3. **Try fallback:** Set `TAOSTATS_API_KEY` in `.env`

**Error:** `No subnet data received`

- API might be rate-limited
- Try refreshing after a minute
- Check backend logs for specific error

### Data not loading / showing static fallback

This means backend connection failed. Check:

1. Backend server is running (`npm start`)
2. No firewall blocking port 3000
3. `BACKEND_URL` in `app.js` matches server port

## 📁 Project Structure

```
deai-nexus-backend/
├── index.html          # Frontend HTML (dashboard UI)
├── app.js              # Frontend JavaScript (all logic)
├── server.js           # Backend Node.js server (API proxy)
├── package.json        # Node.js dependencies
├── .env.example        # Example environment variables
├── .env                # Your API keys (git-ignored)
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🔒 Security Best Practices

1. **Never commit `.env`** - It's in `.gitignore` for a reason
2. **Never expose API keys** - They're proxied through backend
3. **Use environment variables** - Don't hardcode secrets
4. **HTTPS in production** - Use SSL certificates (Let's Encrypt)
5. **Rate limiting** - Consider adding to backend for public deployments

## 🚀 Performance Tips

### Reduce API Calls

The dashboard caches metagraph data for 5 minutes. Adjust in `app.js`:

```javascript
const METAGRAPH_CACHE_TIME = 600000; // 10 minutes
```

### Limit Metagraph Enrichment

By default, only top 20 subnets get detailed metagraph data. Adjust in `app.js`:

```javascript
const topSubnets = sorted.slice(0, 30); // Increase to 30
```

**Warning:** More API calls = slower load time and higher rate limit usage.

## 📝 Customization

### Add Custom Categories

Edit `CATEGORY_MAP` in `app.js`:

```javascript
const CATEGORY_MAP = {
  // ... existing mappings
  99: 'Your Custom Category',
};
```

### Modify Scoring Weights

In `calculateMetrics()` function in `app.js`:

```javascript
const score = Math.round(
  0.25 * fs +  // Increase fundamental weight
  0.20 * ps +
  0.30 * es +
  0.20 * ds +
  0.05 * cs
);
```

### Change Theme Colors

Edit CSS variables in `index.html`:

```css
:root {
  --violet: #8b5cf6;  /* Change primary color */
  --cyan: #06b6d4;    /* Change accent */
  /* ... etc */
}
```

## 🤝 Contributing

This is a community tool. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify for your needs.

## 🙏 Acknowledgments

- **Bittensor Team** - For the amazing protocol
- **TAO.app** - For the comprehensive API
- **Taostats** - For the reliable fallback data
- **Community** - For feedback and support

## 📞 Support

- **Issues:** Open an issue on GitHub
- **Discord:** Join Bittensor Discord for community support
- **Documentation:** Check TAO.app and Taostats docs for API details

## 🎉 What's Next?

Future improvements:

- [ ] Historical price charts
- [ ] Portfolio tracking
- [ ] Price alerts
- [ ] Export to CSV/Excel
- [ ] Mobile app version
- [ ] WebSocket for real-time updates
- [ ] User accounts and saved preferences

---

**Happy Analyzing! 🚀**

Built with ❤️ for the Bittensor community.
