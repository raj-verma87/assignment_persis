function generateSummary({ failureCount, lastFailure, circuitState, windowMinutes = 10, totalAttempts, totalFailures }) {
  const failureRate = totalAttempts > 0 ? Math.round((totalFailures / totalAttempts) * 100) : 0;
  let summary = `In the last ${windowMinutes} minutes, ${failureRate}% of payment attempts failed`;
  if (failureRate > 50) {
    summary += ' due to provider instability.';
  } else {
    summary += '.';
  }
  summary += ` The circuit breaker was triggered and is currently ${circuitState},`;
  if (circuitState === 'open') {
    summary += ' blocking new attempts.';
  } else if (circuitState === 'half-open') {
    summary += ' allowing a test request.';
  } else {
    summary += ' allowing normal operation.';
  }
  if (lastFailure) {
    summary += ` Last failure at ${lastFailure.toISOString()}.`;
  }
  return { summary };
}

module.exports = { generateSummary }; 