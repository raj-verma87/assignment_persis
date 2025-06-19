const jwt = require('jsonwebtoken');

const SECRET = 'super_jwt_secret_123'; // In production, use env var
const EXPIRES_IN = '1h';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { signToken, verifyToken }; 