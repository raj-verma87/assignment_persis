const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { signToken } = require('../utils/jwt');

const USERS_FILE = path.join(__dirname, '../data/users.json');

function getAllUsers() {
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = getAllUsers().find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ userId: user.userId, username: user.username, role: user.role, tenantId: user.tenantId });
  res.json({ token });
});

module.exports = router; 