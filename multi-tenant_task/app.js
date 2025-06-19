const express = require('express');
const bodyParser = require('body-parser');

const tenantRoutes = require('./routes/tenants');
const paymentRoutesObj = require('./routes/payments');
const paymentRoutes = paymentRoutesObj.router;
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Tenant management routes
app.use('/tenants', tenantRoutes);

// Payment routes (nested under tenants)
app.use('/tenants/:tenantId/pay', paymentRoutes);

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Multi-Tenant Payment Platform API');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 