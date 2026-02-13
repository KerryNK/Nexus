const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper to create JWT token
const createToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Helper to log user activity
const logActivity = async (userId, action, metadata = {}, req) => {
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

// ==================== REGISTRATION ====================
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      role: 'user',
      preferences: {
        theme: 'dark',
        minScore: 0,
        favoriteSubnets: [],
        watchlist: []
      }
    });

    await user.save();

    // Log activity
    await logActivity(user._id, 'register', {}, req);

    // Create token
    const token = createToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ==================== LOGIN ====================
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Username or email required'),
  body('password')
    .notEmpty()
    .withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username },
        { email: username }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log activity
    await logActivity(user._id, 'login', {}, req);

    // Create token
    const token = createToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== GET CURRENT USER ====================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: req.user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ==================== LOGOUT ====================
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await logActivity(req.user._id, 'logout', {}, req);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ==================== UPDATE PREFERENCES ====================
router.put('/preferences', authMiddleware, [
  body('theme').optional().isIn(['dark', 'light']),
  body('defaultCategory').optional().isString(),
  body('minScore').optional().isInt({ min: 0, max: 100 }),
  body('sortBy').optional().isString(),
  body('itemsPerPage').optional().isInt({ min: 5, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { theme, defaultCategory, minScore, sortBy, itemsPerPage } = req.body;

    // Update preferences
    if (theme) req.user.preferences.theme = theme;
    if (defaultCategory) req.user.preferences.defaultCategory = defaultCategory;
    if (minScore !== undefined) req.user.preferences.minScore = minScore;
    if (sortBy) req.user.preferences.sortBy = sortBy;
    if (itemsPerPage) req.user.preferences.itemsPerPage = itemsPerPage;

    await req.user.save();
    await logActivity(req.user._id, 'update_preferences', {}, req);

    res.json({
      message: 'Preferences updated',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ==================== CHANGE PASSWORD ====================
router.put('/password', authMiddleware, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ==================== FAVORITES ====================
router.post('/favorites/:netuid', authMiddleware, [
  body('netuid').isInt().toInt()
], async (req, res) => {
  try {
    const netuid = parseInt(req.params.netuid);

    if (!req.user.preferences.favoriteSubnets.includes(netuid)) {
      req.user.preferences.favoriteSubnets.push(netuid);
      await req.user.save();
    }

    await logActivity(req.user._id, 'add_favorite', { netuid }, req);

    res.json({
      message: 'Added to favorites',
      favorites: req.user.preferences.favoriteSubnets
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/favorites/:netuid', authMiddleware, async (req, res) => {
  try {
    const netuid = parseInt(req.params.netuid);

    req.user.preferences.favoriteSubnets = 
      req.user.preferences.favoriteSubnets.filter(id => id !== netuid);
    await req.user.save();

    await logActivity(req.user._id, 'remove_favorite', { netuid }, req);

    res.json({
      message: 'Removed from favorites',
      favorites: req.user.preferences.favoriteSubnets
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// ==================== WATCHLIST ====================
router.post('/watchlist/:netuid', authMiddleware, async (req, res) => {
  try {
    const netuid = parseInt(req.params.netuid);

    if (!req.user.preferences.watchlist.includes(netuid)) {
      req.user.preferences.watchlist.push(netuid);
      await req.user.save();
    }

    await logActivity(req.user._id, 'add_watchlist', { netuid }, req);

    res.json({
      message: 'Added to watchlist',
      watchlist: req.user.preferences.watchlist
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

router.delete('/watchlist/:netuid', authMiddleware, async (req, res) => {
  try {
    const netuid = parseInt(req.params.netuid);

    req.user.preferences.watchlist = 
      req.user.preferences.watchlist.filter(id => id !== netuid);
    await req.user.save();

    await logActivity(req.user._id, 'remove_watchlist', { netuid }, req);

    res.json({
      message: 'Removed from watchlist',
      watchlist: req.user.preferences.watchlist
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

module.exports = router;
