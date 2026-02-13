const mongoose = require('mongoose');

// User Activity Schema - for analytics and tracking
const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'register',
      'view_subnet',
      'add_favorite',
      'remove_favorite',
      'add_watchlist',
      'remove_watchlist',
      'view_leaderboard',
      'search',
      'compare_subnets',
      'update_preferences'
    ],
    index: true
  },
  
  // Additional context about the action
  metadata: {
    netuid: Number,
    query: String,
    ipAddress: String,
    userAgent: String,
    compareSubnets: [Number]
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: false });

// Indexes for efficient querying
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ action: 1, timestamp: -1 });
userActivitySchema.index({ timestamp: -1 });

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

module.exports = UserActivity;
