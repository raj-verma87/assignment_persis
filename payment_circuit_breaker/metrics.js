class Metrics {
  constructor() {
    this.totalRetries = 0;
    this.totalSuccesses = 0;
    this.totalFailures = 0;
    this.circuitTransitions = [];
  }

  recordRetry(attempts) {
    this.totalRetries += attempts;
  }

  recordSuccess() {
    this.totalSuccesses++;
  }

  recordFailure() {
    this.totalFailures++;
  }

  recordCircuitTransition(state) {
    this.circuitTransitions.push({
      state,
      timestamp: new Date().toISOString(),
    });
  }

  getMetrics() {
    return {
      totalRetries: this.totalRetries,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      circuitTransitions: this.circuitTransitions,
    };
  }
}

module.exports = Metrics; 