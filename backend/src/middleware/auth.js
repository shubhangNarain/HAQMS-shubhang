const jwt = require('jsonwebtoken');

// Fix: Missing Security BUG: The verification is weak. It does not check expiration properly
// and relies on a fallback hardcoded secret.
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
const authenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.split(' ')[1];
    if (headerToken && headerToken !== 'null' && headerToken !== 'undefined') {
      token = headerToken;
    }
  }
  
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
      const parts = c.trim().split('=');
      const k = parts[0];
      const v = parts.slice(1).join('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {});
    token = cookies['haqms_token'];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // SECURITY BUG: The verification is weak. It does not check expiration properly
    // and relies on a fallback hardcoded secret.

    // Fix: remove ignoreExpiration from the jwt.verify method to enfore standard token
    // expiry validation
    // const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user details to request object
    req.user = decoded;
    next();
  } catch (error) {
    // IMPROPER ERROR HANDLING: Leaks full error details including secret key mismatches to the client
    return res.status(401).json({ error: 'Invalid token.', details: error.message });
  }
};

// Role authorization middleware
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User context missing.' });
    }

    // Role-based verification
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires role: ${roles.join(' or ')}` });
    }

    next();
  };
};

// Delegates to the generic authorize middleware — DRY and consistent with all other role checks.
// This eliminates the risk of someone accidentally commenting out a standalone role block.
const authorizeAdminOnlyLegacy = authorize('ADMIN');

module.exports = {
  authenticate,
  authorize,
  authorizeAdminOnlyLegacy,
};
