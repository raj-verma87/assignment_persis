const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL) || 3600,
      maxKeys: parseInt(process.env.MAX_CACHE_SIZE) || 1000
    });
    
    this.providers = {
      openai: this.openaiProvider.bind(this),
      anthropic: this.anthropicProvider.bind(this),
      mock: this.mockProvider.bind(this)
    };
  }

  /**
   * Generate explanation for risk evaluation
   * @param {Object} riskResult - Risk evaluation result
   * @param {Object} transaction - Original transaction data
   * @returns {Promise<string>} Generated explanation
   */
  async generateExplanation(riskResult, transaction) {
    const cacheKey = this.generateCacheKey(riskResult, transaction);
    
    // Check cache first
    const cachedExplanation = this.cache.get(cacheKey);
    if (cachedExplanation) {
      logger.info('Using cached LLM explanation');
      return cachedExplanation;
    }

    try {
      const provider = this.providers[this.provider];
      if (!provider) {
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
      }

      const explanation = await provider(riskResult, transaction);
      
      // Cache the result
      this.cache.set(cacheKey, explanation);
      
      logger.info('Generated new LLM explanation', { provider: this.provider });
      return explanation;
      
    } catch (error) {
      logger.error('Failed to generate LLM explanation', { error: error.message });
      
      // Fallback to mock provider
      if (this.provider !== 'mock') {
        logger.info('Falling back to mock LLM provider');
        return await this.mockProvider(riskResult, transaction);
      }
      
      throw error;
    }
  }

  /**
   * OpenAI provider implementation
   */
  async openaiProvider(riskResult, transaction) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildPrompt(riskResult, transaction);
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a fraud detection expert. Provide clear, concise explanations of risk assessments in 1-2 sentences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Anthropic provider implementation
   */
  async anthropicProvider(riskResult, transaction) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
    
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = this.buildPrompt(riskResult, transaction);
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model,
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You are a fraud detection expert. Provide clear, concise explanations of risk assessments in 1-2 sentences.\n\n${prompt}`
        }
      ]
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });

    return response.data.content[0].text.trim();
  }

  /**
   * Mock provider for testing and fallback
   */
  async mockProvider(riskResult, transaction) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { score, riskLevel, riskFactors } = riskResult;
    
    if (riskLevel === 'high') {
      const factors = riskFactors.map(f => f.type).join(', ');
      return `This transaction is considered high risk due to the following factors: ${factors}.`;
    } else if (riskLevel === 'moderate') {
      return `This transaction shows moderate risk indicators that warrant additional review.`;
    } else {
      return `This transaction appears to be low risk based on current evaluation criteria.`;
    }
  }

  /**
   * Build prompt for LLM
   */
  buildPrompt(riskResult, transaction) {
    const { score, riskLevel, riskFactors } = riskResult;
    const { amount, currency, email } = transaction;
    
    const maskedEmail = this.maskEmail(email);
    
    return `
Risk Assessment Summary:
- Risk Score: ${score} (${riskLevel} risk)
- Transaction Amount: ${amount} ${currency}
- Email: ${maskedEmail}
- Risk Factors Found: ${riskFactors.length}

Risk Factors:
${riskFactors.map(factor => `- ${factor.description} (${factor.severity} severity)`).join('\n')}

Please provide a clear, professional explanation of why this transaction was classified as ${riskLevel} risk. Focus on the most significant contributing factors.`;
  }

  /**
   * Generate cache key for risk evaluation
   */
  generateCacheKey(riskResult, transaction) {
    const keyData = {
      score: Math.round(riskResult.score * 100),
      riskLevel: riskResult.riskLevel,
      amount: transaction.amount,
      currency: transaction.currency,
      emailDomain: transaction.email.split('@')[1],
      factorTypes: riskResult.riskFactors.map(f => f.type).sort()
    };
    
    return `llm_explanation_${JSON.stringify(keyData)}`;
  }

  /**
   * Mask email for privacy
   */
  maskEmail(email) {
    const [local, domain] = email.split('@');
    return local.length > 2 ? local.substring(0, 2) + '***@' + domain : '***@' + domain;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      ttl: this.cache.getStats().ttl
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    logger.info('LLM cache cleared');
  }
}

module.exports = new LLMService(); 