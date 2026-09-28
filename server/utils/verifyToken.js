const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const User = require('../models/User');

/**
 * Middleware to verify JWT token
 */
const verifyToken = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id: userId, role?: string }

        // If role is missing from token payload, fetch it once from User model
        if (!req.user.role && decoded.id) {
            try {
                const userDoc = await User.findById(decoded.id).select('role');
                if (userDoc) {
                    req.user.role = userDoc.role;
                }
            } catch (uErr) {
                console.error('Error fetching user role in verifyToken:', uErr);
            }
        }

        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = verifyToken;
