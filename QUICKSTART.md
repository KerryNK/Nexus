# DeAI Nexus Terminal - Quick Start Guide

## ⚡ 5-Minute Setup

Get your Bittensor analytics dashboard running in 5 minutes!

### Step 1: Extract Files (If Zipped)

```bash
unzip deai-nexus-backend.zip
cd deai-nexus-backend
```

### Step 2: Install Node.js (If Not Installed)

**macOS:**
```bash
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download from https://nodejs.org/

Verify installation:
```bash
node --version  # Should show v18.0.0 or higher
npm --version
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs `express`, `cors`, and `dotenv`.

### Step 4: Get API Key

**FASTEST:** Use Taostats (self-service)

1. Visit https://dash.taostats.io
2. Sign up (Google/GitHub/Email)
3. Create API key
4. Copy it

**BEST:** Get TAO.app key (request via Discord)

1. Join https://discord.gg/bittensor
2. Ask in `#developers` for TAO.app API access
3. Mention you're building DeAI Nexus dashboard

### Step 5: Configure API Key

```bash
# Copy example to .env
cp .env.example .env

# Edit .env (use nano, vim, or any text editor)
nano .env
```

Add your key:

```bash
# If you got Taostats key:
TAOSTATS_API_KEY=tskey_your_key_here

# Or if you got TAO.app key:
TAO_APP_API_KEY=your_key_here

# Save and exit (Ctrl+X, then Y, then Enter)
```

### Step 6: Start the Backend

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
╚════════════════════════════════════════════════════════╝
```

✅ Backend is running!

### Step 7: Open Dashboard

**Option A: Double-click**
- Open file explorer
- Double-click `index.html`

**Option B: Command line**

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

**Option C: Local server (recommended)**

```bash
# In a NEW terminal window (keep backend running)
npx http-server -p 8080

# Then visit:
# http://localhost:8080
```

### Step 8: Load Data

1. Dashboard opens in browser
2. Click **Refresh** button (top right)
3. Wait 5-10 seconds
4. Data loads! 🎉

---

## 🎯 What You Should See

### Header
- TAO price (e.g., $191.00)
- Subnet count (e.g., 128)
- Market cap
- Live indicator (green "Live")

### KPI Cards
- Subnet MCap
- Daily Emissions
- Avg Score
- Strong Buy signals
- Avg Premium

### Charts
- Market cap distribution
- Category breakdown
- Risk profile

### Subnet List
- All subnets with scores
- Click to expand details
- Filter by category
- Search by name

---

## ❌ Troubleshooting

### "Cannot find module 'express'"

```bash
npm install
```

### "Port 3000 already in use"

```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use different port
# Edit .env and change: PORT=3001
# Edit app.js and change: const BACKEND_URL = 'http://localhost:3001/api';
```

### "Failed to fetch" or data won't load

1. **Check backend is running:**
   Open http://localhost:3000/health in browser
   Should show: `{"status":"ok",...}`

2. **Check API key is correct:**
   - No extra spaces
   - No quotes around the key
   - Correct format (TAO.app or Taostats)

3. **Try fallback:**
   If TAO.app key fails, get Taostats key

### "API authentication failed"

Your API key might be:
- Invalid/expired
- Not activated yet
- Wrong format

**Solution:** 
- Double-check key in `.env`
- Try requesting a new key
- Use Taostats as fallback

---

## 📱 Using the Dashboard

### Filter Data

1. **By Category:** Click category pills (All, Inference, DeFi, etc.)
2. **By Score:** Drag the "Min" slider
3. **By Name:** Type in search box

### Sort Data

Click the sort dropdown and choose:
- DeAI Score (default)
- Fund. Value
- Premium
- Market Cap
- Emission %
- 24H Change
- Emission Efficiency

### View Details

Click any subnet row to see:
- Fundamentals (FV, premium, daily TAO)
- Price movement (1H, 24H, 7D, 30D)
- Network stats (validators, miners, holders)
- Investment thesis
- Risk factors

### Explore Tabs

- **📊 Dashboard:** Main view with all subnets
- **🏆 Leaderboard:** Top performers in each category
- **🧮 DeAI Metrics:** Calculators and methodology

---

## 🔄 Keeping Data Fresh

Click **Refresh** button anytime to reload latest data.

**Auto-refresh:** Refreshes automatically on page load.

---

## 🎉 You're Done!

Enjoy your professional Bittensor analytics dashboard!

### Next Steps:

1. **Explore subnets** - Click rows to see details
2. **Find opportunities** - Check leaderboard for strong buys
3. **Understand scoring** - Read methodology in DeAI Metrics tab
4. **Customize** - Edit categories, colors, weights (see README.md)

### Need Help?

- **Read full docs:** `README.md`
- **Setup issues:** Check `.env` and API keys
- **Bittensor Discord:** https://discord.gg/bittensor

---

**Built with ❤️ for the Bittensor community**

Happy analyzing! 🚀
