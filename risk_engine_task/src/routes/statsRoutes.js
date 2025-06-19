const express = require('express');
const riskEngine = require('../services/riskEngine');
const llmService = require('../services/llmService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /fraud-stats
 * Get fraud detection statistics and analytics
 */
router.get('/fraud-stats', (req, res, next) => {
  try {
    const riskStats = riskEngine.getStats();
    const llmStats = llmService.getCacheStats();
    
    const stats = {
      riskEngine: {
        totalEvaluations: riskStats.totalEvaluations,
        uniqueIPs: riskStats.uniqueIPs,
        uniqueDevices: riskStats.uniqueDevices,
        uniqueEmails: riskStats.uniqueEmails,
        highRiskDomains: riskStats.highRiskDomains,
        amountThreshold: riskStats.amountThreshold
      },
      llmService: {
        provider: llmService.provider,
        cacheKeys: llmStats.keys,
        cacheHits: llmStats.hits,
        cacheMisses: llmStats.misses,
        cacheHitRate: llmStats.hits + llmStats.misses > 0 
          ? Math.round((llmStats.hits / (llmStats.hits + llmStats.misses)) * 100) 
          : 0
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Fraud stats requested', { 
      totalEvaluations: stats.riskEngine.totalEvaluations,
      cacheHitRate: stats.llmService.cacheHitRate 
    });

    res.status(200).json(stats);
    
  } catch (error) {
    logger.error('Error getting fraud stats', { error: error.message });
    next(error);
  }
});

/**
 * GET /fraud-stats/risk-levels
 * Get breakdown of risk levels
 */
router.get('/fraud-stats/risk-levels', (req, res, next) => {
  try {
    // This would typically come from a database
    // For now, we'll return a mock response
    const riskLevels = {
      low: {
        count: 150,
        percentage: 60,
        averageScore: 0.15
      },
      moderate: {
        count: 75,
        percentage: 30,
        averageScore: 0.55
      },
      high: {
        count: 25,
        percentage: 10,
        averageScore: 0.85
      },
      total: 250
    };

    res.status(200).json(riskLevels);
    
  } catch (error) {
    logger.error('Error getting risk level stats', { error: error.message });
    next(error);
  }
});

/**
 * POST /fraud-stats/cache/clear
 * Clear LLM cache
 */
router.post('/fraud-stats/cache/clear', (req, res, next) => {
  try {
    llmService.clearCache();
    
    res.status(200).json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
    next(error);
  }
});

/**
 * GET /fraud-stats/health
 * Health check for stats service
 */
router.get('/fraud-stats/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'fraud-stats',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 