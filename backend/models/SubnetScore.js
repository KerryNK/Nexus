const mongoose = require('mongoose');

// SubnetScore Schema
const subnetScoreSchema = new mongoose.Schema({
  netuid: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  category: String,
  
  // Comprehensive scoring breakdown
  scores: {
    composite: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    fundamental: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    performance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    economic: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    development: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    decentralization: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Market metrics
  metrics: {
    price: Number,
    marketCap: Number,
    volume24h: Number,
    emission: Number,
    fundamentalValue: Number,
    premium: Number,
    emissionEfficiency: Number,
    validators: Number,
    miners: Number,
    holders: Number,
    topHolderPct: Number
  },

  // Investment signals
  recommendation: {
    type: String,
    enum: ['Strong Buy', 'Buy', 'Hold', 'Monitor'],
    default: 'Monitor'
  },

  // Risk level
  risk: {
    type: String,
    enum: ['Very Low', 'Low', 'Medium', 'High'],
    default: 'Medium'
  },

  // Rankings
  rank: {
    overall: Number,
    byCategory: Number,
    byMarketCap: Number,
    byEfficiency: Number
  },

  // Last update timestamp
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for fast querying
subnetScoreSchema.index({ 'scores.composite': -1 });
subnetScoreSchema.index({ 'metrics.marketCap': -1 });
subnetScoreSchema.index({ category: 1 });
subnetScoreSchema.index({ updatedAt: -1 });

const SubnetScore = mongoose.model('SubnetScore', subnetScoreSchema);

module.exports = SubnetScore;
