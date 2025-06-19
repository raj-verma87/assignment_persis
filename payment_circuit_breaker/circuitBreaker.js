class CircuitBreaker {
  constructor({ failureThreshold = 5, cooldownTime = 30000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownTime = cooldownTime; // ms
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailure = null;
    this.nextAttempt = null;
  }

  canRequest() {
    if (this.state === 'open') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'half-open';
        return true; // allow one test request
      }
      return false;
    }
    return true;
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
    this.lastFailure = null;
    this.nextAttempt = null;
  }

  onFailure() {
    this.failureCount++;
    this.lastFailure = new Date();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.cooldownTime;
    }
  }

  getState() {
    return this.state;
  }

  getFailureCount() {
    return this.failureCount;
  }

  getLastFailure() {
    return this.lastFailure;
  }
}

module.exports = CircuitBreaker; 