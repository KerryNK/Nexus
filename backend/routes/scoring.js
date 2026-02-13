const express = require('express');
const { body, query, validationResult } = require('express-validator');
const SubnetScore = require('../models/SubnetScore');
const ScoringHistory = require('../models/ScoringHistory');
const UserActivity = require('../models/UserActivity');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper to log activity
const logActivity = async (userId, action, metadata = {}, req) => {
  if (!userId) return;
  try {
    await UserActivity.create({
      userId,
      action,
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });
  } catch (error) {
    console.error('Activity logging error:', error);
  }
};

// ==================== GET ALL SCORES ====================
router.get('/', async (req, res) => {
  try {
    const {
      category,
      minScore = 0,
      maxScore = 100,
      sortBy = 'composite',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
      search
    } = req.query;

    // Build filter
    const filter = {
      'scores.composite': { $gte: minScore, $lte: maxScore }
    };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Determine sort field
    const sortField = sortBy === 'composite' ? 'scores.composite' :
                      sortBy === 'marketCap' ? 'metrics.marketCap' :
                      sortBy === 'efficiency' ? 'metrics.emissionEfficiency' :
                      'scores.composite';

    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const total = await SubnetScore.countDocuments(filter);

    // Get paginated results
    const scores = await SubnetScore.find(filter)
      .sort({ [sortField]: sortDirection })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    if (req.user) {
      await logActivity(req.user._id, 'view_leaderboard', { category }, req);
    }

    res.json({
      scores,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// ==================== GET ALL LEADERBOARDS ====================
router.get('/leaderboards', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Top by DeAI Score
    const topScore = await SubnetScore.find()
      .sort({ 'scores.composite': -1 })
      .limit(limit)
      .lean();

    // Top by Market Cap
    const topMarketCap = await SubnetScore.find()
      .sort({ 'metrics.marketCap': -1 })
      .limit(limit)
      .lean();

    // Best Value (high score, low premium)
    const bestValue = await SubnetScore.find()
      .sort({ 'scores.composite': -1, 'metrics.premium': 1 })
      .limit(limit)
      .lean();

    // Top Efficiency
    const topEfficiency = await SubnetScore.find()
      .sort({ 'metrics.emissionEfficiency': -1 })
      .limit(limit)
      .lean();

    // Category Leaders - best subnet per category
    const categories = await SubnetScore.distinct('category');
    const categoryLeaders = {};

    for (const cat of categories) {
      if (cat) {
        const leader = await SubnetScore.findOne({ category: cat })
          .sort({ 'scores.composite': -1 })
          .lean();
        if (leader) {
          categoryLeaders[cat] = leader;
        }
      }
    }

    if (req.user) {
      await logActivity(req.user._id, 'view_leaderboard', {}, req);
    }

    res.json({
      leaderboards: {
        topScore,
        topMarketCap,
        bestValue,
        topEfficiency,
        categoryLeaders
      },
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Get leaderboards error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboards' });
  }
});

// ==================== GET SINGLE SUBNET SCORE ====================
router.get('/:netuid', async (req, res) => {
  try {
    const netuid = parseInt(req.params.netuid);

    const score = await SubnetScore.findOne({ netuid }).lean();

    if (!score) {
      return res.status(404).json({ error: 'Subnet not found' });
    }

    if (req.user) {
      await logActivity(req.user._id, 'view_subnet', { netuid }, req);
    }

    res.json(score);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subnet score' });
  }
});

// ==================== GET SCORING HISTORY ====================
router.get('/:netuid/history', async (req, res) => {
  try {
    const netuid = parseInt(req.params.netuid);
    const days = parseInt(req.query.days) || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const history = await ScoringHistory.find({
      netuid,
      date: { $gte: cutoffDate }
    })
      .sort({ date: 1 })
      .lean();

    res.json({
      netuid,
      days,
      history,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ==================== SEARCH SUBNETS ====================
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const limit = parseInt(req.query.limit) || 20;

    const results = await SubnetScore.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    })
      .sort({ 'scores.composite': -1 })
      .limit(limit)
      .lean();

    if (req.user) {
      await logActivity(req.user._id, 'search', { query }, req);
    }

    res.json({
      query,
      results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==================== GET STATISTICS ====================
router.get('/stats/overview', async (req, res) => {
  try {
    const total = await SubnetScore.countDocuments();
    const avgScore = await SubnetScore.aggregate([
      {
        $group: {
          _id: null,
          avgComposite: { $avg: '$scores.composite' },
          avgPerformance: { $avg: '$scores.performance' },
          totalMarketCap: { $sum: '$metrics.marketCap' }
        }
      }
    ]);

    const categories = await SubnetScore.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgScore: { $avg: '$scores.composite' }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);

    res.json({
      totalSubnets: total,
      averageScores: avgScore[0] || {},
      categoriesBreakdown: categories,
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==================== COMPARE SUBNETS ====================
router.post('/compare', async (req, res) => {
  try {
    const { netuids } = req.body;

    if (!Array.isArray(netuids) || netuids.length === 0) {
      return res.status(400).json({ error: 'netuids array required' });
    }

    const subnets = await SubnetScore.find({
      netuid: { $in: netuids }
    }).lean();

    if (subnets.length === 0) {
      return res.status(404).json({ error: 'No subnets found' });
    }

    // Analyze comparison
    const analysis = {
      count: subnets.length,
      highestScore: subnets.reduce((max, s) => 
        s.scores.composite > max.scores.composite ? s : max
      ),
      lowestScore: subnets.reduce((min, s) => 
        s.scores.composite < min.scores.composite ? s : min
      ),
      lowestPremium: subnets.reduce((min, s) => 
        s.metrics.premium < min.metrics.premium ? s : min
      ),
      highestMarketCap: subnets.reduce((max, s) => 
        (s.metrics.marketCap || 0) > (max.metrics.marketCap || 0) ? s : max
      ),
      averageScore: (subnets.reduce((sum, s) => sum + s.scores.composite, 0) / subnets.length).toFixed(2),
      averageRisk: subnets.map(s => s.risk).filter(Boolean).slice(0, 1)[0]
    };

    if (req.user) {
      await logActivity(req.user._id, 'compare_subnets', { compareSubnets: netuids }, req);
    }

    res.json({
      comparison: subnets,
      analysis,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Comparison failed' });
  }
});

// ==================== USER FAVORITES ====================
router.get('/user/favorites', authMiddleware, async (req, res) => {
  try {
    const favorites = await SubnetScore.find({
      netuid: { $in: req.user.preferences.favoriteSubnets }
    }).lean();

    res.json({
      favorites,
      count: favorites.length,
      totalFavorited: req.user.preferences.favoriteSubnets.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// ==================== USER WATCHLIST ====================
router.get('/user/watchlist', authMiddleware, async (req, res) => {
  try {
    const watchlist = await SubnetScore.find({
      netuid: { $in: req.user.preferences.watchlist }
    }).lean();

    res.json({
      watchlist,
      count: watchlist.length,
      totalWatchlisted: req.user.preferences.watchlist.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// ==================== UPDATE SCORES (Internal) ====================
router.post('/update', async (req, res) => {
  try {
    // This endpoint should be protected by internal API key in production
    const { netuid, name, category, scores, metrics, recommendation, risk } = req.body;

    if (!netuid) {
      return res.status(400).json({ error: 'netuid required' });
    }

    let score = await SubnetScore.findOne({ netuid });

    if (!score) {
      score = new SubnetScore({ netuid, name, category });
    } else {
      if (name) score.name = name;
      if (category) score.category = category;
    }

    if (scores) score.scores = { ...score.scores, ...scores };
    if (metrics) score.metrics = { ...score.metrics, ...metrics };
    if (recommendation) score.recommendation = recommendation;
    if (risk) score.risk = risk;

    score.updatedAt = new Date();
    await score.save();

    // Save to history
    await ScoringHistory.create({
      netuid,
      name: score.name,
      date: new Date(),
      scores: score.scores,
      metrics: score.metrics,
      rank: score.rank,
      recommendation: score.recommendation,
      risk: score.risk
    });

    res.json({
      message: 'Score updated',
      score
    });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

module.exports = router;
