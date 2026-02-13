const mongoose = require('mongoose');

// Scoring History Schema - tracks scoring changes over time
const scoringHistorySchema = new mongoose.Schema({
  netuid: {
    type: Number,
    required: true,
    index: true
  },
  name: String,
  
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Scores at this point in time
  scores: {
    composite: Number,
    fundamental: Number,
    performance: Number,
    economic: Number,
    development: Number,
    decentralization: Number
  },
  
  // Metrics at this point in time
  metrics: {
    price: Number,
    marketCap: Number,
    volume24h: Number,
    emission: Number,
    fundamentalValue: Number,
    premium: Number,
    emissionEfficiency: Number
  },
  
  // Ranking at this point in time
  rank: {
    overall: Number,
    byCategory: Number,
    byMarketCap: Number
  },
  
  recommendation: String,
  risk: String
}, { timestamps: false });

// Compound index for efficient time-series queries
scoringHistorySchema.index({ netuid: 1, date: -1 });
scoringHistorySchema.index({ date: -1 });

const ScoringHistory = mongoose.model('ScoringHistory', scoringHistorySchema);

module.exports = ScoringHistory;
