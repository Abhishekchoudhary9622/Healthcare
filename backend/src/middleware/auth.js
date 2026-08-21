const { verifyToken }     = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return unauthorized(res, 'No token provided');
    const decoded = verifyToken(header.split(' ')[1]);
    const user = await User.findById(decoded.id).select('_id email role firstName lastName isActive');
    if (!user || !user.isActive) return unauthorized(res, 'User not found or deactivated');
    req.user = { id: user._id.toString(), email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName };
    next();
  } catch (err) {
    return unauthorized(res, err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return forbidden(res, 'Access denied for role: ' + req.user.role);
  next();
};

module.exports = { authenticate, authorize };