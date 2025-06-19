const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testRiskEvaluation() {
  console.log('🚀 Testing AI-Powered Risk Engine\n');

  // Test cases
  const testCases = [
    {
      name: 'Low Risk Transaction',
      data: {
        amount: 100,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@example.com'
      }
    },
    {
      name: 'High Risk - Suspicious Email Domain',
      data: {
        amount: 100,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@fraud.net'
      }
    },
    {
      name: 'High Risk - Large Amount',
      data: {
        amount: 15000,
        currency: 'USD',
        ip: '192.168.1.1',
        deviceFingerprint: 'device123',
        email: 'user@example.com'
      }
    },
    {
      name: 'High Risk - Multiple Factors',
      data: {
        amount: 15000,
        currency: 'USD',
        ip: '198.51.100.22',
        deviceFingerprint: 'abc123',
        email: 'user@fraud.net'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`📤 Request:`, JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await axios.post(`${BASE_URL}/evaluate-risk`, testCase.data);
      
      console.log(`📥 Response:`);
      console.log(`   Score: ${response.data.score}`);
      console.log(`   Risk Level: ${response.data.riskLevel}`);
      console.log(`   Explanation: ${response.data.explanation}`);
      console.log(`   Risk Factors: ${response.data.riskFactors.length}`);
      
      if (response.data.riskFactors.length > 0) {
        response.data.riskFactors.forEach(factor => {
          console.log(`     - ${factor.description} (${factor.severity})`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
    }
    
    console.log('─'.repeat(50));
  }
}

async function testAnalytics() {
  console.log('\n📊 Testing Analytics Endpoints\n');
  
  try {
    // Get fraud stats
    console.log('📈 Getting fraud statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/fraud-stats`);
    console.log('Fraud Stats:', JSON.stringify(statsResponse.data, null, 2));
    
    // Get risk level breakdown
    console.log('\n📊 Getting risk level breakdown...');
    const levelsResponse = await axios.get(`${BASE_URL}/fraud-stats/risk-levels`);
    console.log('Risk Levels:', JSON.stringify(levelsResponse.data, null, 2));
    
  } catch (error) {
    console.error(`❌ Analytics Error: ${error.message}`);
  }
}

async function testHealthChecks() {
  console.log('\n🏥 Testing Health Checks\n');
  
  const healthEndpoints = [
    '/health',
    '/api/v1/evaluate-risk/health',
    '/api/v1/fraud-stats/health'
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      const response = await axios.get(`http://localhost:3000${endpoint}`);
      console.log(`✅ ${endpoint}: ${response.data.status}`);
    } catch (error) {
      console.error(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function main() {
  try {
    await testHealthChecks();
    await testRiskEvaluation();
    await testAnalytics();
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.log('\n💡 Make sure the server is running on http://localhost:3000');
    console.log('   Run: npm start');
  }
}

// Run the tests
main(); 