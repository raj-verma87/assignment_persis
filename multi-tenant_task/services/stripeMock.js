function processPayment({ amount, currency, source, apiKey }) {
  // Simulate payment logic
  if (source === 'fail_card') {
    return { success: false, error: 'Card declined', transactionId: null };
  }
  return {
    success: true,
    transactionId: 'stripe_' + Math.random().toString(36).substr(2, 9),
    processor: 'stripe',
    amount,
    currency
  };
}

module.exports = { processPayment }; 