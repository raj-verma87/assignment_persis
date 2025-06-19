const fs = require('fs');
const path = require('path');
const { encrypt } = require('../utils/encryption');
const { v4: uuidv4 } = require('uuid');

const TENANTS_FILE = path.join(__dirname, '../data/tenants.json');

function getAllTenants() {
  const data = fs.readFileSync(TENANTS_FILE, 'utf8');
  return JSON.parse(data);
}

function getTenantById(tenantId) {
  const tenants = getAllTenants();
  return tenants.find(t => t.tenantId === tenantId);
}

function addTenant({ name, preferredProcessor, apiKey }) {
  const tenants = getAllTenants();
  const tenantId = uuidv4();
  const encryptedKey = encrypt(apiKey);
  const newTenant = { tenantId, name, preferredProcessor, apiKey: encryptedKey };
  tenants.push(newTenant);
  fs.writeFileSync(TENANTS_FILE, JSON.stringify(tenants, null, 2));
  return { tenantId, name, preferredProcessor };
}

module.exports = { getAllTenants, getTenantById, addTenant }; 