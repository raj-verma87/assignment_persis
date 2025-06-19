function processPayment({ amount, currency, source, apiKey }) {
  // Simulate payment logic
  if (source === 'fail_paypal') {
    return { success: false, error: 'Payment denied', transactionId: null };
  }
  return {
    success: true,
    transactionId: 'paypal_' + Math.random().toString(36).substr(2, 9),
    processor: 'paypal',
    amount,
    currency
  };
}

module.exports = { processPayment }; 