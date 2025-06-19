const express = require('express');
const app = express();
const paymentProviders = require('./paymentProvider');
const CircuitBreaker = require('./circuitBreaker');
const { generateSummary } = require('./llm');
const Metrics = require('./metrics');
const persistence = require('./persistence');

app.use(express.json());

const PROVIDER_NAMES = ['stripe', 'paypal'];

// Per-provider state
const state = {};
PROVIDER_NAMES.forEach(name => {
  state[name] = {
    circuitBreaker: null,
    metrics: null,
    totalAttempts: 0,
    totalFailures: 0,
    lastAutoSummary: null
  };
});

// Helper to save state
async function saveState() {
  const persistObj = {};
  for (const name of PROVIDER_NAMES) {
    persistObj[name] = {
      circuitBreaker: {
        state: state[name].circuitBreaker.getState(),
        failureCount: state[name].circuitBreaker.getFailureCount(),
        lastFailure: state[name].circuitBreaker.getLastFailure(),
        nextAttempt: state[name].circuitBreaker.nextAttempt,
        failureThreshold: state[name].circuitBreaker.failureThreshold,
        cooldownTime: state[name].circuitBreaker.cooldownTime
      },
      metrics: state[name].metrics.getMetrics(),
      totalAttempts: state[name].totalAttempts,
      totalFailures: state[name].totalFailures
    };
  }
  await persistence.saveState(persistObj);
}

// Load persisted state on startup
async function initialize() {
  const persisted = await persistence.loadState();
  for (const name of PROVIDER_NAMES) {
    if (persisted && persisted[name] && persisted[name].circuitBreaker) {
      state[name].circuitBreaker = new CircuitBreaker({
        failureThreshold: persisted[name].circuitBreaker.failureThreshold || 5,
        cooldownTime: persisted[name].circuitBreaker.cooldownTime || 30000
      });
      state[name].circuitBreaker.state = persisted[name].circuitBreaker.state;
      state[name].circuitBreaker.failureCount = persisted[name].circuitBreaker.failureCount;
      state[name].circuitBreaker.lastFailure = persisted[name].circuitBreaker.lastFailure ? new Date(persisted[name].circuitBreaker.lastFailure) : null;
      state[name].circuitBreaker.nextAttempt = persisted[name].circuitBreaker.nextAttempt;
      state[name].metrics = new Metrics();
      if (persisted[name].metrics) {
        Object.assign(state[name].metrics, persisted[name].metrics);
      }
      state[name].totalAttempts = persisted[name].totalAttempts || 0;
      state[name].totalFailures = persisted[name].totalFailures || 0;
    } else {
      state[name].circuitBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownTime: 30000 });
      state[name].metrics = new Metrics();
      state[name].totalAttempts = 0;
      state[name].totalFailures = 0;
    }
  }
}

// Patch circuit breaker to record transitions and persist
function patchCircuitBreakerPersistence(provider) {
  const cb = state[provider].circuitBreaker;
  const metrics = state[provider].metrics;
  const origOnSuccess = cb.onSuccess.bind(cb);
  cb.onSuccess = async function () {
    if (this.state !== 'closed') {
      metrics.recordCircuitTransition('closed');
    }
    origOnSuccess();
    await saveState();
  };
  const origOnFailure = cb.onFailure.bind(cb);
  cb.onFailure = async function () {
    const prevState = this.state;
    origOnFailure();
    if (prevState !== this.state) {
      metrics.recordCircuitTransition(this.state);
      // If circuit just opened, generate and store LLM summary
      if (this.state === 'open') {
        state[provider].lastAutoSummary = generateSummary({
          failureCount: cb.getFailureCount(),
          lastFailure: cb.getLastFailure(),
          circuitState: cb.getState(),
          windowMinutes: 10,
          totalAttempts: state[provider].totalAttempts,
          totalFailures: state[provider].totalFailures
        }).summary;
      }
    }
    await saveState();
  };
}

async function retryWithBackoff(fn, retries = 3, delays = [500, 1000, 2000]) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < delays.length) {
        await new Promise(res => setTimeout(res, delays[i]));
      }
    }
  }
  throw lastError;
}

app.post('/pay', async (req, res) => {
  const { provider, amount, currency, source } = req.body;
  if (!provider || !PROVIDER_NAMES.includes(provider)) {
    return res.status(400).json({ status: 'error', reason: 'Missing or invalid provider.' });
  }
  const cb = state[provider].circuitBreaker;
  const metrics = state[provider].metrics;
  if (!cb.canRequest()) {
    return res.status(503).json({
      status: 'error',
      reason: `Circuit breaker for ${provider} is open. Payment attempts are temporarily blocked.`
    });
  }
  if (!amount || !currency || !source) {
    return res.status(400).json({ status: 'error', reason: 'Missing payment fields.' });
  }
  let isTestRequest = false;
  if (cb.getState() === 'half-open') {
    isTestRequest = true;
  }
  state[provider].totalAttempts++;
  let attempts = 0;
  try {
    const result = await retryWithBackoff(async () => {
      attempts++;
      return paymentProviders[provider].processPayment({ amount, currency, source });
    });
    metrics.recordRetry(attempts - 1);
    metrics.recordSuccess();
    await cb.onSuccess();
    await saveState();
    return res.json({ status: 'success', providerResult: result });
  } catch (err) {
    metrics.recordRetry(attempts - 1);
    metrics.recordFailure();
    await cb.onFailure();
    state[provider].totalFailures++;
    await saveState();
    const reason = err.message || 'Unknown error';
    return res.status(500).json({ status: 'error', reason });
  }
});

// Helper to get provider from query or default
function getProviderFromQuery(req) {
  const provider = req.query.provider;
  if (!provider || !PROVIDER_NAMES.includes(provider)) {
    return PROVIDER_NAMES[0]; // default to first provider
  }
  return provider;
}

app.get('/status', (req, res) => {
  const provider = getProviderFromQuery(req);
  const cb = state[provider].circuitBreaker;
  res.json({
    provider,
    circuitState: cb.getState(),
    failureCount: cb.getFailureCount(),
    lastFailure: cb.getLastFailure()
  });
});

app.get('/status/summary', (req, res) => {
  const provider = getProviderFromQuery(req);
  const cb = state[provider].circuitBreaker;
  const summary = generateSummary({
    failureCount: cb.getFailureCount(),
    lastFailure: cb.getLastFailure(),
    circuitState: cb.getState(),
    windowMinutes: 10,
    totalAttempts: state[provider].totalAttempts,
    totalFailures: state[provider].totalFailures
  });
  res.json({ provider, ...summary, lastAutoSummary: state[provider].lastAutoSummary });
});

app.get('/metrics', (req, res) => {
  const provider = getProviderFromQuery(req);
  res.json({ provider, ...state[provider].metrics.getMetrics() });
});

const PORT = process.env.PORT || 3000;

initialize().then(() => {
  PROVIDER_NAMES.forEach(patchCircuitBreakerPersistence);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 