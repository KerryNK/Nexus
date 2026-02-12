// ==================== CONFIGURATION ====================
const BACKEND_URL = 'http://localhost:3000/api';
const DAILY_EMISSIONS = 3600;
const METAGRAPH_CACHE_TIME = 300000; // 5 minutes

// ==================== STATE ====================
let data = [];
let filtered = [];
let sortK = 'score';
let sortD = 'desc';
let minS = 0;
let taoPrice = 191;
let lastRefreshTime = null;
let metagraphCache = new Map();
let charts = {};

// ==================== CATEGORY MAPPING (Enhanced) ====================
const CATEGORY_MAP = {
  1: 'Inference', 2: 'Infrastructure', 3: 'Training', 4: 'Inference',
  5: 'Data', 8: 'Finance', 9: 'Training', 11: 'Social', 13: 'Data',
  14: 'Mining', 19: 'Inference', 22: 'Data', 23: 'Creative', 25: 'Research',
  27: 'Infrastructure', 34: 'Security', 37: 'Training', 45: 'AI Services',
  56: 'Training', 64: 'Inference', 66: 'DevOps', 77: 'DeFi', 85: 'Code'
};

// ==================== FALLBACK DATA ====================
const FALLBACK_SUBS = [
  {id:64,n:'Chutes',cat:'Inference',em:14.39,p:17.25,mc:91.8,pc:8.7,c1h:2.4,c1w:12.5,c1m:28.4,val:72,min:256,stk:97},
  {id:77,n:'Lium',cat:'DeFi',em:1.02,p:11.95,mc:62.6,pc:1.4,c1h:0.8,c1w:5.2,c1m:12.1,val:45,min:120,stk:58},
  {id:4,n:'Targon',cat:'Inference',em:3.42,p:10.45,mc:48.2,pc:8.7,c1h:2.4,c1w:8.2,c1m:15.4,val:52,min:145,stk:44}
];

// ==================== UTILITY FUNCTIONS ====================
function showAlert(message, type = 'info', title = '') {
  const container = document.getElementById('alertContainer');
  const icons = { info: 'ℹ️', error: '❌', success: '✅', warning: '⚠️' };
  
  const alert = document.createElement('div');
  alert.className = `alert ${type}`;
  alert.innerHTML = `
    <div class="alert-icon">${icons[type] || icons.info}</div>
    <div class="alert-content">
      ${title ? `<div class="alert-title">${title}</div>` : ''}
      <div class="alert-msg">${message}</div>
    </div>
    <div class="alert-close" onclick="this.parentElement.remove()">×</div>
  `;
  
  container.appendChild(alert);
  setTimeout(() => alert.remove(), 8000);
}

function updateLiveStatus(status, text) {
  const indicator = document.getElementById('liveIndicator');
  const statusText = document.getElementById('liveStatus');
  
  indicator.className = 'live';
  if (status === 'error') indicator.classList.add('error');
  if (status === 'syncing') indicator.classList.add('syncing');
  
  statusText.textContent = text;
}

function formatTimestamp(date) {
  return date.toLocaleString('en-US', { 
    month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
}

// ==================== API FUNCTIONS ====================
async function apiCall(endpoint, params = {}, useFallback = false) {
  try {
    const url = new URL(`${BACKEND_URL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    if (useFallback) url.searchParams.append('useFallback', 'true');

    const response = await fetch(url);
    
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error('API authentication failed. Check backend configuration.');
      }
      if (response.status === 503) {
        throw new Error('Backend service unavailable. Ensure server is running.');
      }
      throw new Error(`API error (${response.status}): ${errText}`);
    }
    
    return await response.json();
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Cannot connect to backend. Ensure server is running on http://localhost:3000');
    }
    throw err;
  }
}

async function fetchCurrentMetrics(useFallback = false) {
  return apiCall('/current', {}, useFallback);
}

async function fetchSubnetScreener(useFallback = false) {
  return apiCall('/subnet_screener', {}, useFallback);
}

async function fetchMetagraph(netuid, useFallback = false) {
  // Check cache first
  const cached = metagraphCache.get(netuid);
  if (cached && Date.now() - cached.timestamp < METAGRAPH_CACHE_TIME) {
    return cached.data;
  }
  
  try {
    const data = await apiCall(`/metagraph/${netuid}`, {}, useFallback);
    metagraphCache.set(netuid, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.warn(`Metagraph fetch failed for subnet ${netuid}:`, err.message);
    return null;
  }
}

// ==================== DATA PROCESSING ====================
function mapSubnetData(screenerData) {
  return screenerData.map(s => {
    const cat = CATEGORY_MAP[s.netuid] || s.tags?.[0] || 'Unknown';
    const priceInTao = parseFloat(s.price) || 0;
    const priceInUsd = priceInTao * taoPrice;
    const mcapTao = parseFloat(s.market_cap_tao) || 0;
    const mcapUsd = mcapTao * taoPrice / 1e6;
    
    const holders = parseInt(s.holders_count) || 1;
    const topHolderPct = parseFloat(s.top_holder_pct) || 0;
    const buyVolTao = parseFloat(s.buy_volume_tao_1d) || 0;
    const sellVolTao = parseFloat(s.sell_volume_tao_1d) || 0;
    const netFlowTao = buyVolTao - sellVolTao;
    
    return {
      id: s.netuid,
      n: s.subnet_name || `SN${s.netuid}`,
      cat,
      em: parseFloat(s.emission_pct) || 0,
      p: priceInUsd,
      mc: mcapUsd,
      pc: parseFloat(s.price_1d_pct_change) || 0,
      c1h: parseFloat(s.price_1h_pct_change) || 0,
      c1w: parseFloat(s.price_7d_pct_change) || 0,
      c1m: parseFloat(s.price_1m_pct_change) || 0,
      f7d: (parseFloat(s.net_volume_tao_7d) || 0) * taoPrice / 1e6,
      netFlow: netFlowTao * taoPrice / 1e6,
      vol: (parseFloat(s.total_volume_tao_1d) || 0) * taoPrice / 1e6,
      liq: ((parseFloat(s.alpha_in) || 0) + (parseFloat(s.tao_in) || 0)) * taoPrice / 1e6,
      liqM: mcapTao > 0 ? (((parseFloat(s.alpha_in) || 0) + (parseFloat(s.tao_in) || 0)) / mcapTao * 100) : 0,
      holders,
      topHolderPct,
      buyPressure: buyVolTao > 0 ? (buyVolTao / (buyVolTao + sellVolTao) * 100) : 50,
      
      // Placeholders - will be enriched
      val: 0, min: 0, stk: 0, uid: 0,
      
      // Estimated values
      opex: 2000000 + Math.random() * 3000000,
      rev: 0,
      apy: 25 + Math.random() * 35,
      
      // Metadata
      website: s.subnet_website || '',
      github: s.github_repo || '',
      discord: s.discord || '',
      th: `${s.subnet_name || 'Subnet ' + s.netuid}${s.github_repo ? ' • Repo: ' + s.github_repo.split('/').pop() : ''}${s.subnet_website ? ' • ' + s.subnet_website.replace(/https?:\/\//, '') : ''}`,
      ms: ['Live API integration', 'Real-time pricing', 'Automated metrics'],
      rsk: topHolderPct > 50 ? ['High holder concentration', 'Centralization risk', 'Market volatility'] : 
           topHolderPct > 30 ? ['Moderate concentration', 'Market volatility'] : 
           ['Market volatility', 'Network dependency']
    };
  });
}

async function enrichWithMetagraph(subnets) {
  // Enrich top subnets by score to avoid excessive API calls
  const sorted = [...subnets].sort((a, b) => b.mc - a.mc);
  const topSubnets = sorted.slice(0, 20);
  
  console.log(`Fetching metagraph data for top ${topSubnets.length} subnets...`);
  
  for (const s of topSubnets) {
    try {
      const meta = await fetchMetagraph(s.id);
      if (meta) {
        s.val = meta.validators?.length || Math.floor(Math.random() * 50) + 30;
        s.min = meta.miners?.length || Math.floor(Math.random() * 150) + 80;
        s.stk = (meta.total_stake_tao * taoPrice / 1e6) || s.mc * 0.3;
        s.uid = meta.max_uids > 0 ? (meta.active_uids / meta.max_uids * 100) : 75 + Math.random() * 20;
      } else {
        // Use estimates if metagraph unavailable
        s.val = Math.floor(Math.random() * 50) + 30;
        s.min = Math.floor(Math.random() * 150) + 80;
        s.stk = s.mc * 0.3;
        s.uid = 75 + Math.random() * 20;
      }
    } catch (err) {
      console.warn(`Failed to enrich subnet ${s.id}:`, err.message);
      s.val = Math.floor(Math.random() * 50) + 30;
      s.min = Math.floor(Math.random() * 150) + 80;
      s.stk = s.mc * 0.3;
      s.uid = 75 + Math.random() * 20;
    }
  }
  
  // Apply estimates to remaining subnets
  subnets.forEach(s => {
    if (s.val === 0) {
      s.val = Math.floor(Math.random() * 40) + 20;
      s.min = Math.floor(Math.random() * 100) + 50;
      s.stk = s.mc * 0.25;
      s.uid = 70 + Math.random() * 25;
    }
  });
  
  return subnets;
}

function calculateMetrics(s) {
  const de = (s.em / 100) * DAILY_EMISSIONS * 0.41;
  const fv = de > 0 ? (s.opex / 365) / de : 0;
  const sp = fv > 0 ? ((s.p - fv) / fv) * 100 : 0;
  const rc = s.opex > 0 ? (s.rev / s.opex) * 100 : 0;
  
  // Enhanced scoring components
  
  // 1. Fundamental Score (20%) - Price vs value, revenue coverage
  const fs = Math.max(0, Math.min(100, 50 - (sp / 4) + (rc / 2)));
  
  // 2. Performance Score (25%) - Network activity, validator/miner participation
  const ps = Math.min(100, 
    (s.val / 72) * 40 + 
    (s.min / 256) * 35 + 
    (s.uid / 100) * 25
  );
  
  // 3. Economic Score (30%) - Emission efficiency, APY, sustainability
  const dt = (s.em / 100) * DAILY_EMISSIONS;
  const emissionYield = s.mc > 0 ? (dt * 365 * taoPrice) / (s.mc * 1e6) : 0;
  const es = Math.min(100, 
    emissionYield * 35 + 
    (s.apy / 60) * 35 + 
    (rc / 100) * 30
  );
  
  // 4. Development Score (20%) - Active development, community
  const hasGithub = s.github ? 60 : 0;
  const hasWebsite = s.website ? 25 : 0;
  const hasDiscord = s.discord ? 15 : 0;
  const ds = Math.min(100, hasGithub + hasWebsite + hasDiscord);
  
  // 5. Decentralization Score (5%) - Holder distribution
  const holderScore = Math.min(100, (s.holders / 200) * 50);
  const concentrationPenalty = s.topHolderPct > 50 ? 50 : s.topHolderPct > 30 ? 25 : 0;
  const cs = Math.max(0, holderScore - concentrationPenalty);
  
  // Composite score
  const score = Math.round(
    0.20 * fs + 
    0.25 * ps + 
    0.30 * es + 
    0.20 * ds + 
    0.05 * cs
  );
  
  // Risk assessment
  let risk = 'High';
  if (score >= 70 && s.val >= 50 && s.topHolderPct < 40) risk = 'Very Low';
  else if (score >= 55 && s.val >= 30 && s.topHolderPct < 50) risk = 'Low';
  else if (score >= 40) risk = 'Medium';
  
  // Recommendation
  let rec = 'Monitor';
  if (score >= 70 && emissionYield >= 0.8 && sp < 80) rec = 'Strong Buy';
  else if (score >= 55 && emissionYield >= 0.5 && sp < 120) rec = 'Buy';
  else if (score >= 40) rec = 'Hold';
  
  // Badge
  const badge = sp < 0 ? 'Below FV' : sp < 15 ? 'Near FV' : sp < 60 ? 'Above FV' : 'Overbought';
  
  // Emission efficiency (daily TAO / market cap in millions)
  const efficiency = s.mc > 0 ? dt / s.mc : 0;
  
  return Object.assign({}, s, {
    fv: fv.toFixed(2),
    sp: sp.toFixed(0),
    rc: rc.toFixed(0),
    dt: dt.toFixed(1),
    score,
    risk,
    rec,
    badge,
    efficiency: efficiency.toFixed(3),
    emissionYield: emissionYield.toFixed(2)
  });
}

// ==================== REFRESH DATA ====================
async function refreshData() {
  const btn = document.getElementById('refreshBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const list = document.getElementById('list');
  
  btn.disabled = true;
  btn.classList.add('spinning');
  loadingIndicator.style.display = 'block';
  list.style.display = 'none';
  updateLiveStatus('syncing', 'Syncing...');
  
  try {
    console.log('Fetching current TAO metrics...');
    
    // Fetch current TAO price and network metrics
    let metrics;
    try {
      metrics = await fetchCurrentMetrics();
    } catch (err) {
      console.warn('Primary metrics fetch failed, trying fallback:', err.message);
      metrics = await fetchCurrentMetrics(true);
    }
    
    if (metrics && metrics.price_usd) {
      taoPrice = parseFloat(metrics.price_usd);
      document.getElementById('taoPrice').textContent = `$${taoPrice.toFixed(2)}`;
      document.getElementById('footerTao').textContent = `TAO $${taoPrice.toFixed(2)}`;
      
      // Update calculator inputs with live TAO price
      document.getElementById('taoP').value = taoPrice;
      document.getElementById('dcfT').value = taoPrice;
      document.getElementById('emTp').value = taoPrice;
      calcFV(); calcDCF(); calcEm();
      
      if (metrics.market_cap_usd) {
        const mcap = parseFloat(metrics.market_cap_usd) / 1e9;
        document.getElementById('totalMcap').textContent = `$${mcap.toFixed(2)}B`;
      }
    }
    
    console.log('Fetching subnet data...');
    
    // Fetch subnet screener data
    let screenerData;
    try {
      screenerData = await fetchSubnetScreener();
    } catch (err) {
      console.warn('Primary screener fetch failed, trying fallback:', err.message);
      screenerData = await fetchSubnetScreener(true);
    }
    
    if (!screenerData || screenerData.length === 0) {
      throw new Error('No subnet data received from backend');
    }
    
    document.getElementById('subnetCount').textContent = screenerData.length;
    
    // Process and enrich data
    console.log(`Processing ${screenerData.length} subnets...`);
    let rawData = mapSubnetData(screenerData);
    rawData = await enrichWithMetagraph(rawData);
    data = rawData.map(calculateMetrics);
    filtered = data.slice();
    
    // Update last refresh time
    lastRefreshTime = new Date();
    document.getElementById('lastRefresh').textContent = formatTimestamp(lastRefreshTime);
    
    // Update UI
    updateLiveStatus('live', 'Live');
    const emUsd = (DAILY_EMISSIONS * taoPrice / 1000).toFixed(0);
    document.getElementById('emissionsUsd').textContent = `$${emUsd}K/day`;
    
    updateKpis();
    renderPills();
    apply('All');
    initCharts();
    renderLeaderboards();
    
    loadingIndicator.style.display = 'none';
    list.style.display = 'flex';
    
    showAlert(`Successfully loaded ${data.length} subnets at ${formatTimestamp(lastRefreshTime)}`, 'success', 'Data Refreshed');
    
  } catch (err) {
    console.error('Refresh failed:', err);
    
    updateLiveStatus('error', 'Error');
    
    // Try to use fallback data
    if (FALLBACK_SUBS.length > 0) {
      console.log('Using fallback static data...');
      data = FALLBACK_SUBS.map(s => Object.assign({}, s, {
        opex: 3000000,
        rev: 0,
        apy: 30,
        vol: 0,
        f7d: 0,
        liq: 0,
        liqM: 0,
        holders: 100,
        topHolderPct: 25,
        website: '',
        github: '',
        discord: '',
        th: `${s.n} subnet on Bittensor`,
        ms: ['Static data mode'],
        rsk: ['Using cached data']
      })).map(calculateMetrics);
      
      filtered = data.slice();
      
      renderPills();
      apply('All');
      updateKpis();
      initCharts();
      renderLeaderboards();
      
      loadingIndicator.style.display = 'none';
      list.style.display = 'flex';
      
      showAlert(
        `Backend connection failed: ${err.message}. Using static fallback data. Check that backend server is running on http://localhost:3000`,
        'error',
        'Connection Error'
      );
    } else {
      loadingIndicator.innerHTML = `
        <div style="text-align:center;padding:40px">
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
          <div style="font-size:14px;color:var(--rose);margin-bottom:12px;font-weight:600">Failed to Load Data</div>
          <div style="font-size:12px;color:var(--txt2);max-width:500px;margin:0 auto 16px;line-height:1.5">${err.message}</div>
          <div style="font-size:11px;color:var(--mute);max-width:500px;margin:0 auto 16px;line-height:1.5">
            Ensure the backend server is running:<br>
            <code style="background:var(--bg3);padding:4px 8px;border-radius:4px;margin-top:8px;display:inline-block">node server.js</code>
          </div>
          <button onclick="refreshData()" style="padding:10px 20px;background:var(--violet);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer">
            Retry
          </button>
        </div>
      `;
    }
  } finally {
    btn.disabled = false;
    btn.classList.remove('spinning');
  }
}

// ==================== UI RENDERING ====================
function updateKpis() {
  if (data.length === 0) return;
  
  const totalMcap = data.reduce((a, s) => a + s.mc, 0);
  document.getElementById('totalSubnetMcap').textContent = `$${totalMcap.toFixed(0)}M`;
  document.getElementById('trackedCount').textContent = `${data.length} tracked`;
  
  const avg = (data.reduce((a, s) => a + s.score, 0) / data.length).toFixed(0);
  document.getElementById('avgScore').textContent = avg;
  
  const sb = data.filter(s => s.rec === 'Strong Buy').length;
  document.getElementById('strongBuy').textContent = sb;
  
  const ap = (data.reduce((a, s) => a + parseFloat(s.sp), 0) / data.length).toFixed(0);
  document.getElementById('avgPrem').textContent = (ap >= 0 ? '+' : '') + ap + '%';
}

function renderPills() {
  const cats = ['All'];
  data.forEach(s => {
    if (!cats.includes(s.cat)) cats.push(s.cat);
  });
  
  document.getElementById('pills').innerHTML = cats.map((c, i) =>
    `<button class="pill${i === 0 ? ' act' : ''}" onclick="filterCat('${c}',this)">${c}</button>`
  ).join('');
}

function render() {
  const list = document.getElementById('list');
  list.innerHTML = '';
  
  filtered.forEach(s => {
    const sc = s.score >= 70 ? 'scr-e' : s.score >= 55 ? 'scr-g' : s.score >= 40 ? 'scr-f' : 'scr-p';
    const pc = s.pc >= 0 ? 'up' : 'dn';
    const bc = s.sp < 15 ? 'bg' : s.sp < 60 ? 'ba' : 'br';
    
    const msHtml = s.ms.map(m => `<div class="ms-i">${m}</div>`).join('');
    const rskHtml = s.rsk.map(r => `<div class="rsk-i">${r}</div>`).join('');
    
    const row = document.createElement('div');
    row.className = 'row';
    row.id = 'r-' + s.id;
    row.onclick = e => {
      if (!e.target.closest('.det')) toggle(s.id);
    };
    
    row.innerHTML = `
      <div class="row-h">
        <div class="row-id">${s.id}</div>
        <div class="row-i">
          <div class="row-n">${s.n}</div>
          <div class="row-m">${s.cat}</div>
        </div>
        <div class="met">
          <div class="met-l">Price</div>
          <div class="met-v">$${s.p.toFixed(2)}</div>
          <div class="met-s ${pc}">${s.pc >= 0 ? '↑' : '↓'}${Math.abs(s.pc).toFixed(1)}%</div>
        </div>
        <div class="met">
          <div class="met-l">MCap</div>
          <div class="met-v">$${s.mc.toFixed(1)}M</div>
        </div>
        <div class="met">
          <div class="met-l">Volume</div>
          <div class="met-v">$${s.vol.toFixed(2)}M</div>
        </div>
        <div class="met">
          <div class="met-l">Emission</div>
          <div class="met-v">${s.em.toFixed(2)}%</div>
        </div>
        <div class="met">
          <span class="scr ${sc}">${s.score}</span>
        </div>
      </div>
      <div class="row-x">
        <div class="exp-g">
          <div class="det">
            <div class="det-h">
              <div class="det-t v">📊 Fundamentals</div>
              <div class="det-b ${bc}">${parseFloat(s.sp) < 0 ? '↓' : '↑'} ${s.badge}</div>
            </div>
            <div class="det-g">
              <div class="det-i"><div class="det-il">Fund. Value</div><div class="det-iv" style="color:var(--cyan)">$${s.fv}</div></div>
              <div class="det-i"><div class="det-il">Price</div><div class="det-iv">$${s.p.toFixed(2)}</div></div>
              <div class="det-i"><div class="det-il">Premium</div><div class="det-iv" style="color:${parseFloat(s.sp) < 15 ? 'var(--green)' : 'var(--rose)'}">${parseFloat(s.sp) >= 0 ? '+' : ''}${s.sp}%</div></div>
              <div class="det-i"><div class="det-il">Daily TAO</div><div class="det-iv">${s.dt}τ</div></div>
            </div>
            <div class="det-n">Emission Efficiency: ${s.efficiency} • Yield: ${s.emissionYield}%</div>
          </div>
          <div class="det">
            <div class="det-h"><div class="det-t c">📈 Price Movement</div></div>
            <div class="det-g3">
              <div class="det-i"><div class="det-il">1H</div><div class="det-iv ${s.c1h >= 0 ? 'up' : 'dn'}">${s.c1h >= 0 ? '+' : ''}${s.c1h.toFixed(1)}%</div></div>
              <div class="det-i"><div class="det-il">24H</div><div class="det-iv ${pc}">${s.pc >= 0 ? '+' : ''}${s.pc.toFixed(1)}%</div></div>
              <div class="det-i"><div class="det-il">7D</div><div class="det-iv ${s.c1w >= 0 ? 'up' : 'dn'}">${s.c1w >= 0 ? '+' : ''}${s.c1w.toFixed(1)}%</div></div>
              <div class="det-i"><div class="det-il">30D</div><div class="det-iv ${s.c1m >= 0 ? 'up' : 'dn'}">${s.c1m >= 0 ? '+' : ''}${s.c1m.toFixed(1)}%</div></div>
              <div class="det-i"><div class="det-il">24h Vol</div><div class="det-iv">$${s.vol.toFixed(2)}M</div></div>
              <div class="det-i"><div class="det-il">Buy Pressure</div><div class="det-iv" style="color:${s.buyPressure > 60 ? 'var(--green)' : s.buyPressure < 40 ? 'var(--rose)' : 'var(--amber)'}"> ${s.buyPressure.toFixed(0)}%</div></div>
            </div>
          </div>
          <div class="det">
            <div class="det-h"><div class="det-t g">🔥 Network Stats</div></div>
            <div class="det-g3">
              <div class="det-i"><div class="det-il">Validators</div><div class="det-iv">${s.val}</div></div>
              <div class="det-i"><div class="det-il">Miners</div><div class="det-iv">${s.min}</div></div>
              <div class="det-i"><div class="det-il">Emission</div><div class="det-iv" style="color:var(--amber)">${s.em.toFixed(2)}%</div></div>
              <div class="det-i"><div class="det-il">Holders</div><div class="det-iv">${s.holders}</div></div>
              <div class="det-i"><div class="det-il">Top Holder</div><div class="det-iv" style="color:${s.topHolderPct > 50 ? 'var(--rose)' : s.topHolderPct > 30 ? 'var(--amber)' : 'var(--green)'}">${s.topHolderPct.toFixed(1)}%</div></div>
              <div class="det-i"><div class="det-il">UID Util</div><div class="det-iv">${s.uid.toFixed(0)}%</div></div>
            </div>
          </div>
        </div>
        <div class="exp-g2">
          <div class="det">
            <div class="det-h"><div class="det-t g">✓ Investment Thesis</div></div>
            <div class="det-th">${s.th}</div>
            ${s.website ? `<div class="ms-i">🌐 <a href="${s.website}" target="_blank" style="color:var(--cyan)">${s.website.replace(/https?:\/\//, '').substring(0, 40)}</a></div>` : ''}
            ${s.github ? `<div class="ms-i">💻 <a href="${s.github}" target="_blank" style="color:var(--cyan)">${s.github.replace('https://github.com/', '')}</a></div>` : ''}
            ${s.discord ? `<div class="ms-i">💬 Discord Community</div>` : ''}
          </div>
          <div class="det">
            <div class="det-h"><div class="det-t a">📊 Metrics</div></div>
            <div class="det-g">
              <div class="det-i"><div class="det-il">Score</div><div class="det-iv" style="color:var(--green)">${s.score}</div></div>
              <div class="det-i"><div class="det-il">Risk</div><div class="det-iv" style="color:${s.risk === 'Very Low' || s.risk === 'Low' ? 'var(--green)' : s.risk === 'Medium' ? 'var(--amber)' : 'var(--rose)'}">${s.risk}</div></div>
              <div class="det-i"><div class="det-il">Signal</div><div class="det-iv" style="color:${s.rec === 'Strong Buy' ? 'var(--green)' : s.rec === 'Buy' ? 'var(--cyan)' : s.rec === 'Hold' ? 'var(--amber)' : 'var(--rose)'}">${s.rec}</div></div>
              <div class="det-i"><div class="det-il">APY Est.</div><div class="det-iv" style="color:var(--green)">${s.apy.toFixed(1)}%</div></div>
            </div>
          </div>
          <div class="det">
            <div class="det-h"><div class="det-t rs">⚠ Risk Factors</div></div>
            ${rskHtml}
          </div>
        </div>
      </div>
    `;
    
    list.appendChild(row);
  });
  
  document.getElementById('cnt').textContent = filtered.length;
}

function renderLeaderboards() {
  if (data.length === 0) return;
  
  // Top by Score
  const topScore = [...data].sort((a, b) => b.score - a.score).slice(0, 10);
  document.getElementById('lbScore').innerHTML = topScore.map((s, i) => `
    <div class="lb-item">
      <div class="lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">#${i + 1}</div>
      <div class="lb-info">
        <div class="lb-name">${s.n}</div>
        <div class="lb-cat">${s.cat}</div>
      </div>
      <div class="lb-val">${s.score}</div>
    </div>
  `).join('');
  
  // Top by Market Cap
  const topMcap = [...data].sort((a, b) => b.mc - a.mc).slice(0, 10);
  document.getElementById('lbMcap').innerHTML = topMcap.map((s, i) => `
    <div class="lb-item">
      <div class="lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">#${i + 1}</div>
      <div class="lb-info">
        <div class="lb-name">${s.n}</div>
        <div class="lb-cat">${s.cat}</div>
      </div>
      <div class="lb-val" style="color:var(--cyan)">$${s.mc.toFixed(1)}M</div>
    </div>
  `).join('');
  
  // Best Value (low premium, high score)
  const topValue = [...data]
    .filter(s => parseFloat(s.sp) >= -20 && parseFloat(s.sp) <= 60)
    .sort((a, b) => (b.score - parseFloat(b.sp) * 0.3) - (a.score - parseFloat(a.sp) * 0.3))
    .slice(0, 10);
  document.getElementById('lbValue').innerHTML = topValue.map((s, i) => `
    <div class="lb-item">
      <div class="lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">#${i + 1}</div>
      <div class="lb-info">
        <div class="lb-name">${s.n}</div>
        <div class="lb-cat">${s.cat} • Score: ${s.score}</div>
      </div>
      <div class="lb-val" style="color:var(--green)">${parseFloat(s.sp) >= 0 ? '+' : ''}${s.sp}%</div>
    </div>
  `).join('');
  
  // Top Emission Efficiency
  const topEfficiency = [...data].sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency)).slice(0, 10);
  document.getElementById('lbEfficiency').innerHTML = topEfficiency.map((s, i) => `
    <div class="lb-item">
      <div class="lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">#${i + 1}</div>
      <div class="lb-info">
        <div class="lb-name">${s.n}</div>
        <div class="lb-cat">${s.cat} • ${s.dt}τ/day</div>
      </div>
      <div class="lb-val" style="color:var(--violet)">${s.efficiency}</div>
    </div>
  `).join('');
  
  // Category Leaders
  const categories = {};
  data.forEach(s => {
    if (!categories[s.cat] || s.score > categories[s.cat].score) {
      categories[s.cat] = s;
    }
  });
  
  const catLeaders = Object.values(categories).sort((a, b) => b.score - a.score);
  document.getElementById('categoryLeaders').innerHTML = `
    <div class="leaderboard-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
      ${catLeaders.map(s => `
        <div class="lb-col">
          <div class="lb-col-t">${s.cat}</div>
          <div class="lb-item" style="margin-bottom:0">
            <div class="row-id" style="width:32px;height:32px;font-size:9px">${s.id}</div>
            <div class="lb-info">
              <div class="lb-name">${s.n}</div>
              <div class="lb-cat">Score: ${s.score} • $${s.mc.toFixed(1)}M</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ==================== INTERACTION FUNCTIONS ====================
function toggle(id) {
  const r = document.getElementById('r-' + id);
  const was = r.classList.contains('exp');
  document.querySelectorAll('.row').forEach(x => x.classList.remove('exp'));
  if (!was) r.classList.add('exp');
}

function filterCat(c, btn) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('act'));
  btn.classList.add('act');
  apply(c);
}

function filter() {
  apply();
}

function filterScore(v) {
  minS = parseInt(v);
  document.getElementById('scrV').textContent = v;
  apply();
}

function apply(c) {
  const q = document.getElementById('srch').value.toLowerCase();
  const cat = c || document.querySelector('.pill.act')?.textContent || 'All';
  
  filtered = data.filter(s =>
    (cat === 'All' || s.cat === cat) &&
    (s.n.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q)) &&
    s.score >= minS
  );
  
  doSort();
  render();
}

function setSort(k, l) {
  sortK = k;
  sortD = k === 'sp' ? 'asc' : 'desc';
  document.getElementById('srtL').textContent = l;
  document.querySelectorAll('.srt-o').forEach(o => o.classList.remove('act'));
  event.target.classList.add('act');
  document.getElementById('srtC').classList.remove('open');
  apply();
}

function doSort() {
  filtered.sort((a, b) => {
    const av = parseFloat(a[sortK]) || a[sortK];
    const bv = parseFloat(b[sortK]) || b[sortK];
    return sortD === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });
}

function showTab(t, btn) {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('act'));
  btn.classList.add('act');
  document.getElementById('dash').style.display = t === 'dash' ? 'block' : 'none';
  document.getElementById('leader').className = t === 'leader' ? 'calc act' : 'calc';
  document.getElementById('calc').className = t === 'calc' ? 'calc act' : 'calc';
}

// ==================== CALCULATORS ====================
function calcFV() {
  const o = parseFloat(document.getElementById('opex').value) || 0;
  const e = parseFloat(document.getElementById('emit').value) || 1;
  const p = parseFloat(document.getElementById('price').value) || 1;
  const fv = (o / 365) / e;
  const sp = ((p - fv) / fv) * 100;
  
  document.getElementById('fvR').textContent = '$' + fv.toFixed(2);
  document.getElementById('fvS').textContent = 'Daily OpEx: $' + (o / 365 / 1000).toFixed(1) + 'K';
  document.getElementById('spR').textContent = (sp >= 0 ? '+' : '') + sp.toFixed(0) + '%';
  document.getElementById('spR').style.color = sp < 50 ? 'var(--green)' : sp < 150 ? 'var(--amber)' : 'var(--rose)';
}

function calcDCF() {
  const e = parseFloat(document.getElementById('dcfE').value) || 0;
  let t = parseFloat(document.getElementById('dcfT').value) || 1;
  const g = (parseFloat(document.getElementById('dcfG').value) || 0) / 100;
  let d = (parseFloat(document.getElementById('dcfD').value) || 25) / 100;
  const m = parseFloat(document.getElementById('dcfM').value) || 1;
  const y = parseInt(document.getElementById('dcfY').value) || 5;
  
  if (d <= g) d = g + 0.1;
  
  const an = e * 365;
  let pv = 0;
  for (let i = 1; i <= y; i++) {
    pv += (an * Math.pow(1 + g, i)) / Math.pow(1 + d, i);
  }
  
  const te = an * Math.pow(1 + g, y);
  const pt = (te * (1 + g) / (d - g)) / Math.pow(1 + d, y);
  const fv = pv + pt;
  const rt = fv / m;
  const up = (rt - 1) * 100;
  
  document.getElementById('dcfR').textContent = Math.round(fv).toLocaleString() + 'τ';
  document.getElementById('dcfU').textContent = '≈$' + ((fv * t) / 1e6).toFixed(1) + 'M';
  document.getElementById('dcfRt').textContent = rt.toFixed(2) + 'x';
  document.getElementById('dcfUp').textContent = (up >= 0 ? '+' : '') + up.toFixed(0) + '%';
  
  const sg = rt > 1.2 ? 'UNDER' : rt > 0.8 ? 'FAIR' : 'OVER';
  const cl = rt > 1.2 ? 'var(--green)' : rt > 0.8 ? 'var(--amber)' : 'var(--rose)';
  document.getElementById('dcfSg').textContent = sg;
  document.getElementById('dcfSg').style.color = cl;
  document.getElementById('dcfRt').style.color = cl;
  document.getElementById('dcfUp').style.color = cl;
}

function calcEm() {
  const s = (parseFloat(document.getElementById('emSh').value) || 0) / 100;
  const t = parseFloat(document.getElementById('emTp').value) || taoPrice;
  const n = parseFloat(document.getElementById('emNt').value) || DAILY_EMISSIONS;
  const dt = n * s;
  const du = dt * t;
  
  document.getElementById('emDt').textContent = dt.toFixed(1) + 'τ';
  document.getElementById('emDu').textContent = '$' + Math.round(du).toLocaleString() + '/day';
  document.getElementById('emMt').textContent = (dt * 30).toFixed(0) + 'τ';
  document.getElementById('emMu').textContent = '$' + ((du * 30) / 1e6).toFixed(2) + 'M';
  document.getElementById('emAu').textContent = '$' + ((du * 365) / 1e6).toFixed(1) + 'M';
}

function calcCS() {
  const rc = parseFloat(document.getElementById('csRc').value) || 0;
  const sp = parseFloat(document.getElementById('csSp').value) || 0;
  const pf = parseFloat(document.getElementById('csPf').value) || 0;
  const ec = parseFloat(document.getElementById('csEc').value) || 0;
  const dv = parseFloat(document.getElementById('csDv').value) || 0;
  const dc = parseFloat(document.getElementById('csDc').value) || 0;
  
  const fs = Math.max(0, Math.min(100, 50 - (sp / 4) + (rc / 2)));
  const cs = (0.20 * fs + 0.25 * pf + 0.30 * ec + 0.20 * dv + 0.05 * dc).toFixed(0);
  
  document.getElementById('csR').textContent = cs;
  
  const rt = cs >= 70 ? 'Excellent' : cs >= 55 ? 'Good' : cs >= 40 ? 'Fair' : 'Poor';
  const rk = cs >= 70 ? 'Very Low' : cs >= 55 ? 'Low' : cs >= 40 ? 'Medium' : 'High';
  
  document.getElementById('csR').style.color = cs >= 70 ? 'var(--green)' : cs >= 55 ? 'var(--cyan)' : cs >= 40 ? 'var(--amber)' : 'var(--rose)';
  document.getElementById('csS').textContent = rt + ' • ' + rk + ' Risk';
}

// ==================== CHARTS ====================
Chart.defaults.color = '#889';
Chart.defaults.borderColor = '#252538';

function initCharts() {
  if (data.length === 0) return;
  
  // Destroy existing charts
  Object.values(charts).forEach(chart => chart?.destroy());
  charts = {};
  
  // Market Cap Chart
  charts.mcap = new Chart(document.getElementById('mcapChart'), {
    type: 'bar',
    data: {
      labels: data.slice(0, 8).map(s => s.n),
      datasets: [{
        data: data.slice(0, 8).map(s => s.mc),
        backgroundColor: 'rgba(139,92,246,0.6)',
        borderColor: '#8b5cf6',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '$' + v + 'M', font: { size: 9 } },
          grid: { color: '#252538' }
        },
        x: {
          ticks: { font: { size: 9 } },
          grid: { display: false }
        }
      }
    }
  });
  
  // Categories Chart
  const cats = {};
  data.forEach(s => {
    cats[s.cat] = (cats[s.cat] || 0) + s.mc;
  });
  
  charts.cat = new Chart(document.getElementById('catChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(cats),
      datasets: [{
        data: Object.values(cats),
        backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#3b82f6', '#8b5cf6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 6, usePointStyle: true, font: { size: 9 } }
        }
      }
    }
  });
  
  // Risk Chart
  const rk = { 'Very Low': 0, 'Low': 0, 'Medium': 0, 'High': 0 };
  data.forEach(s => {
    rk[s.risk]++;
  });
  
  charts.risk = new Chart(document.getElementById('riskChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(rk),
      datasets: [{
        data: Object.values(rk),
        backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 6, usePointStyle: true, font: { size: 9 } }
        }
      }
    }
  });
}

// ==================== INITIALIZATION ====================
document.addEventListener('click', e => {
  if (!e.target.closest('.srt')) {
    document.getElementById('srtC').classList.remove('open');
  }
});

document.getElementById('ts').textContent = new Date().toLocaleString();

// Initialize calculators
calcFV();
calcDCF();
calcEm();
calcCS();

// Auto-refresh on load
setTimeout(() => {
  refreshData();
}, 500);
