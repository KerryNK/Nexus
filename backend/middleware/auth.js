const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user to request
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Check if user has admin role
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'analyst') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  
  next();
};

// Check if user has analyst role
const analystMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'analyst' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Analyst role required.' });
  }
  
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  analystMiddleware
};
