const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const riskRoutes = require('./routes/riskRoutes');
const statsRoutes = require('./routes/statsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', riskRoutes);
app.use('/api/v1', statsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Risk Engine server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app; 