// Simulates a flaky payment provider with 30% failure rate
function makeFlakyProvider(providerPrefix) {
  return function processPayment({ amount, currency, source }) {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        const fail = Math.random() < 0.3; // 30% chance to fail
        if (fail) {
          reject(new Error(`${providerPrefix} error: simulated failure`));
        } else {
          resolve({
            status: 'success',
            amount,
            currency,
            source,
            providerId: `${providerPrefix}_` + Math.floor(Math.random() * 1000000)
          });
        }
      }, 200); // Simulate 200ms provider response
    });
  };
}

module.exports = {
  stripe: { processPayment: makeFlakyProvider('stripe') },
  paypal: { processPayment: makeFlakyProvider('paypal') }
}; 