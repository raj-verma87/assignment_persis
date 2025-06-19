const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  next();
}

function requireRole(role, checkTenant = false) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    if (checkTenant && req.user.tenantId && req.user.tenantId !== req.params.tenantId) {
      return res.status(403).json({ error: 'Forbidden: wrong tenant' });
    }
    next();
  };
}

function requireAnyRole(roles, checkTenant = false) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    if (checkTenant && req.user.tenantId && req.user.tenantId !== req.params.tenantId) {
      return res.status(403).json({ error: 'Forbidden: wrong tenant' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, requireAnyRole }; 