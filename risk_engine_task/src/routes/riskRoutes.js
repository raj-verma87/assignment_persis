const express = require('express');
const { validateRequest, riskEvaluationSchema } = require('../middleware/validation');
const riskEngine = require('../services/riskEngine');
const llmService = require('../services/llmService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /evaluate-risk
 * Evaluate risk for a transaction and generate LLM explanation
 */
router.post('/evaluate-risk', validateRequest(riskEvaluationSchema), async (req, res, next) => {
  try {
    const transaction = req.body;
    
    logger.info('Risk evaluation request received', {
      amount: transaction.amount,
      currency: transaction.currency,
      ip: riskEngine.maskIP(transaction.ip),
      email: riskEngine.maskEmail(transaction.email)
    });

    // Evaluate risk
    const riskResult = riskEngine.evaluateRisk(transaction);
    
    // Generate LLM explanation
    const explanation = await llmService.generateExplanation(riskResult, transaction);
    
    const response = {
      score: riskResult.score,
      riskLevel: riskResult.riskLevel,
      explanation,
      timestamp: riskResult.timestamp,
      riskFactors: riskResult.riskFactors.map(factor => ({
        type: factor.type,
        severity: factor.severity,
        description: factor.description
      }))
    };

    logger.info('Risk evaluation completed successfully', {
      score: response.score,
      riskLevel: response.riskLevel
    });

    res.status(200).json(response);
    
  } catch (error) {
    logger.error('Error in risk evaluation', { error: error.message });
    next(error);
  }
});

/**
 * GET /evaluate-risk/health
 * Health check for risk evaluation service
 */
router.get('/evaluate-risk/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'risk-evaluation',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 