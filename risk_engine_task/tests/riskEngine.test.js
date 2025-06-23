const riskEngine = require('../src/services/riskEngine');

describe('RiskEngine', () => {
  beforeEach(() => {
    // Reset the engine state for each test
    riskEngine.seenIPs.clear();
    riskEngine.seenDevices.clear();
    riskEngine.seenEmails.clear();
  });

  describe('evaluateRisk', () => {
    test('should return low risk for normal transaction', () => {
      const transaction = {
        amount: 100,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@example.com'
      };

      const result = riskEngine.evaluateRisk(transaction);

      expect(result.score).toBeGreaterThanOrEqual(0.05);
      expect(result.score).toBeLessThan(0.4);
      expect(result.riskLevel).toBe('low');
      expect(result.riskFactors).toHaveLength(0);
    });

    test('should detect high-risk email domain', () => {
      const transaction = {
        amount: 100,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@fraud.net'
      };

      const result = riskEngine.evaluateRisk(transaction);

      expect(result.score).toBeGreaterThan(0.4);
      expect(result.riskLevel).toBe('high');
      expect(result.riskFactors).toHaveLength(1);
      expect(result.riskFactors[0].type).toBe('suspicious_email_domain');
    });

    test('should detect high transaction amount', () => {
      const transaction = {
        amount: 15000,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@example.com'
      };

      const result = riskEngine.evaluateRisk(transaction);

      expect(result.score).toBeGreaterThan(0.4);
      expect(result.riskLevel).toBe('high');
      expect(result.riskFactors).toHaveLength(1);
      expect(result.riskFactors[0].type).toBe('high_amount');
    });

    test('should detect repeated IP address', () => {
      const transaction = {
        amount: 100,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@example.com'
      };

      // Simulate multiple uses of the same IP
      for (let i = 0; i < 6; i++) {
        riskEngine.evaluateRisk(transaction);
      }

      const result = riskEngine.evaluateRisk(transaction);

      expect(result.score).toBeGreaterThan(0.4);
      expect(result.riskLevel).toBe('high');
      expect(result.riskFactors.some(f => f.type === 'repeated_ip')).toBe(true);
    });

    test('should detect repeated device fingerprint', () => {
      const transaction = {
        amount: 100,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@example.com'
      };

      // Simulate multiple uses of the same device
      for (let i = 0; i < 4; i++) {
        riskEngine.evaluateRisk(transaction);
      }

      const result = riskEngine.evaluateRisk(transaction);

      expect(result.score).toBeGreaterThan(0.4);
      expect(result.riskLevel).toBe('high');
      expect(result.riskFactors.some(f => f.type === 'repeated_device')).toBe(true);
    });

    test('should combine multiple risk factors', () => {
      const transaction = {
        amount: 15000,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@fraud.net'
      };

      const result = riskEngine.evaluateRisk(transaction);

      expect(result.score).toBeGreaterThan(0.7);
      expect(result.riskLevel).toBe('high');
      expect(result.riskFactors.length).toBeGreaterThan(1);
    });
  });

  describe('determineRiskLevel', () => {
    test('should classify scores correctly', () => {
      expect(riskEngine.determineRiskLevel(0.1)).toBe('low');
      expect(riskEngine.determineRiskLevel(0.3)).toBe('low');
      expect(riskEngine.determineRiskLevel(0.5)).toBe('moderate');
      expect(riskEngine.determineRiskLevel(0.6)).toBe('moderate');
      expect(riskEngine.determineRiskLevel(0.8)).toBe('high');
      expect(riskEngine.determineRiskLevel(0.9)).toBe('high');
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', () => {
      const transaction = {
        amount: 100,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@example.com'
      };

      riskEngine.evaluateRisk(transaction);

      const stats = riskEngine.getStats();

      expect(stats.uniqueIPs).toBe(1);
      expect(stats.uniqueDevices).toBe(1);
      expect(stats.uniqueEmails).toBe(1);
      expect(stats.highRiskDomains).toContain('fraud.net');
      expect(stats.amountThreshold).toBe(10000);
    });
  });
}); 