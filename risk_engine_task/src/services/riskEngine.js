const logger = require('../utils/logger');

class RiskEngine {
  constructor() {
    this.highRiskAmountThreshold = parseFloat(process.env.HIGH_RISK_AMOUNT_THRESHOLD) || 10000;
    this.highRiskEmailDomains = (process.env.HIGH_RISK_EMAIL_DOMAINS || '.ru,.fraud.net,.scam.com')
      .split(',')
      .map(domain => domain.trim().toLowerCase());
    
    // In-memory storage for tracking repeated patterns
    this.seenIPs = new Map();
    this.seenDevices = new Map();
    this.seenEmails = new Map();
  }

  /**
   * Evaluate risk for a transaction
   * @param {Object} transaction - Transaction data
   * @returns {Object} Risk evaluation result
   */
  evaluateRisk(transaction) {
    const { amount, currency, ip, deviceFingerprint, email } = transaction;
    
    logger.info('Evaluating risk for transaction', { 
      amount, 
      currency, 
      ip: this.maskIP(ip), 
      deviceFingerprint: this.maskDevice(deviceFingerprint),
      email: this.maskEmail(email)
    });

    const riskFactors = this.analyzeRiskFactors(transaction);
    const score = this.calculateScore(riskFactors);
    const riskLevel = this.determineRiskLevel(score);

    // Update tracking data
    this.updateTrackingData(transaction);

    const result = {
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      riskLevel,
      riskFactors,
      timestamp: new Date().toISOString()
    };

    logger.info('Risk evaluation completed', { 
      score: result.score, 
      riskLevel: result.riskLevel 
    });

    return result;
  }

  /**
   * Analyze individual risk factors
   */
  analyzeRiskFactors(transaction) {
    const { amount, currency, ip, deviceFingerprint, email } = transaction;
    const factors = [];

    // Amount-based risk
    if (amount > this.highRiskAmountThreshold) {
      factors.push({
        type: 'high_amount',
        severity: 'high',
        description: `Transaction amount (${amount} ${currency}) exceeds threshold (${this.highRiskAmountThreshold} ${currency})`,
        weight: 0.3
      });
    } else if (amount > this.highRiskAmountThreshold * 0.7) {
      factors.push({
        type: 'moderate_amount',
        severity: 'moderate',
        description: `Transaction amount (${amount} ${currency}) is approaching threshold`,
        weight: 0.15
      });
    }

    // Email domain risk
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain && this.highRiskEmailDomains.some(domain => emailDomain.endsWith(domain))) {
      factors.push({
        type: 'suspicious_email_domain',
        severity: 'high',
        description: `Email domain (${emailDomain}) is flagged as high-risk`,
        weight: 0.4
      });
    }

    // IP repetition risk
    const ipCount = this.seenIPs.get(ip) || 0;
    if (ipCount > 5) {
      factors.push({
        type: 'repeated_ip',
        severity: 'high',
        description: `IP address has been used ${ipCount} times previously`,
        weight: 0.25
      });
    } else if (ipCount > 2) {
      factors.push({
        type: 'moderate_ip_repetition',
        severity: 'moderate',
        description: `IP address has been used ${ipCount} times previously`,
        weight: 0.1
      });
    }

    // Device fingerprint repetition risk
    const deviceCount = this.seenDevices.get(deviceFingerprint) || 0;
    if (deviceCount > 3) {
      factors.push({
        type: 'repeated_device',
        severity: 'high',
        description: `Device fingerprint has been used ${deviceCount} times previously`,
        weight: 0.3
      });
    } else if (deviceCount > 1) {
      factors.push({
        type: 'moderate_device_repetition',
        severity: 'moderate',
        description: `Device fingerprint has been used ${deviceCount} times previously`,
        weight: 0.15
      });
    }

    // Email repetition risk
    const emailCount = this.seenEmails.get(email) || 0;
    if (emailCount > 2) {
      factors.push({
        type: 'repeated_email',
        severity: 'moderate',
        description: `Email has been used ${emailCount} times previously`,
        weight: 0.2
      });
    }

    // Geographic risk (basic implementation)
    if (this.isHighRiskCountry(ip)) {
      factors.push({
        type: 'high_risk_country',
        severity: 'moderate',
        description: 'IP originates from a high-risk geographic region',
        weight: 0.2
      });
    }

    return factors;
  }

  /**
   * Calculate risk score based on factors
   */
  calculateScore(riskFactors) {
    if (riskFactors.length === 0) {
      return 0.1; // Base low risk
    }

    let totalScore = 0;
    let totalWeight = 0;

    riskFactors.forEach(factor => {
      const severityMultiplier = factor.severity === 'high' ? 1.0 : 0.6;
      totalScore += factor.weight * severityMultiplier;
      totalWeight += factor.weight;
    });

    // Normalize score to 0-1 range
    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Apply sigmoid-like function to smooth the score
    return Math.min(0.95, Math.max(0.05, normalizedScore));
  }

  /**
   * Determine risk level based on score
   */
  determineRiskLevel(score) {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'moderate';
    return 'low';
  }

  /**
   * Update tracking data for future evaluations
   */
  updateTrackingData(transaction) {
    const { ip, deviceFingerprint, email } = transaction;
    
    this.seenIPs.set(ip, (this.seenIPs.get(ip) || 0) + 1);
    this.seenDevices.set(deviceFingerprint, (this.seenDevices.get(deviceFingerprint) || 0) + 1);
    this.seenEmails.set(email, (this.seenEmails.get(email) || 0) + 1);

    // Cleanup old data to prevent memory leaks
    if (this.seenIPs.size > 10000) {
      this.seenIPs.clear();
    }
    if (this.seenDevices.size > 10000) {
      this.seenDevices.clear();
    }
    if (this.seenEmails.size > 10000) {
      this.seenEmails.clear();
    }
  }

  /**
   * Basic geographic risk assessment
   */
  isHighRiskCountry(ip) {
    // This is a simplified implementation
    // In production, you'd use a proper IP geolocation service
    const highRiskRanges = [
      '198.51.100', // Example high-risk range
      '203.0.113'   // Example high-risk range
    ];
    
    return highRiskRanges.some(range => ip.startsWith(range));
  }

  /**
   * Get statistics for analytics
   */
  getStats() {
    return {
      totalEvaluations: this.seenIPs.size + this.seenDevices.size + this.seenEmails.size,
      uniqueIPs: this.seenIPs.size,
      uniqueDevices: this.seenDevices.size,
      uniqueEmails: this.seenEmails.size,
      highRiskDomains: this.highRiskEmailDomains,
      amountThreshold: this.highRiskAmountThreshold
    };
  }

  // Utility methods for logging (mask sensitive data)
  maskIP(ip) {
    return ip.replace(/\d+\.\d+\.\d+\.(\d+)/, '***.***.***.$1');
  }

  maskDevice(device) {
    return device.length > 4 ? device.substring(0, 4) + '***' : '***';
  }

  maskEmail(email) {
    const [local, domain] = email.split('@');
    return local.length > 2 ? local.substring(0, 2) + '***@' + domain : '***@' + domain;
  }
}

module.exports = new RiskEngine(); 