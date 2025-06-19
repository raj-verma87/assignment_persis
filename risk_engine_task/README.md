# AI-Powered Risk Engine with LLM Explanations

A fraud scoring microservice that evaluates the risk level of payment attempts using custom heuristics and generates AI-powered explanations for risk assessments.

## Features

- **Risk Evaluation**: Comprehensive fraud scoring based on multiple risk factors
- **LLM Integration**: AI-powered explanations using OpenAI or Anthropic
- **Caching**: Intelligent caching of LLM responses to minimize API calls
- **Analytics**: Fraud statistics and system monitoring
- **Fallback Logic**: Graceful degradation when LLM services are unavailable
- **Security**: Input validation, rate limiting, and secure logging

## Architecture

```
src/
├── server.js              # Main application entry point
├── middleware/
│   ├── errorHandler.js    # Global error handling
│   └── validation.js      # Request validation
├── routes/
│   ├── riskRoutes.js      # Risk evaluation endpoints
│   └── statsRoutes.js     # Analytics endpoints
├── services/
│   ├── riskEngine.js      # Core risk evaluation logic
│   └── llmService.js      # LLM integration and caching
└── utils/
    └── logger.js          # Structured logging
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp env.example .env
   ```

4. Configure your environment variables in `.env`

5. Start the server:
   ```bash
   npm start
   ```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

### Risk Evaluation

**POST** `/api/v1/evaluate-risk`

Evaluates the risk of a transaction and generates an AI explanation.

**Request Body:**
```json
{
  "amount": 5000,
  "currency": "USD",
  "ip": "198.51.100.22",
  "deviceFingerprint": "abc123",
  "email": "user@fraud.net"
}
```

**Response:**
```json
{
  "score": 0.87,
  "riskLevel": "high",
  "explanation": "This transaction is considered high risk due to the use of a flagged domain (fraud.net), high transaction amount, and previously seen device fingerprint.",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "riskFactors": [
    {
      "type": "suspicious_email_domain",
      "severity": "high",
      "description": "Email domain (fraud.net) is flagged as high-risk"
    },
    {
      "type": "high_amount",
      "severity": "high", 
      "description": "Transaction amount (5000 USD) exceeds threshold (10000 USD)"
    }
  ]
}
```

### Analytics

**GET** `/api/v1/fraud-stats`

Returns comprehensive fraud detection statistics.

**GET** `/api/v1/fraud-stats/risk-levels`

Returns breakdown of risk level distributions.

**POST** `/api/v1/fraud-stats/cache/clear`

Clears the LLM response cache.

### Health Checks

**GET** `/health`

**GET** `/api/v1/evaluate-risk/health`

**GET** `/api/v1/fraud-stats/health`

## Risk Factors

The risk engine evaluates transactions based on the following factors:

### High-Risk Indicators
- **Email Domains**: Flagged domains (e.g., `.ru`, `fraud.net`, `.scam.com`)
- **Transaction Amount**: Amounts exceeding configurable threshold
- **IP Repetition**: Multiple transactions from the same IP
- **Device Repetition**: Multiple transactions from the same device
- **Geographic Risk**: IPs from high-risk regions

### Scoring Algorithm
- Risk factors are weighted based on severity
- Scores are normalized to 0.0-1.0 range
- Risk levels: low (0.0-0.4), moderate (0.4-0.7), high (0.7-1.0)

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# LLM Configuration
LLM_PROVIDER=openai                    # openai, anthropic, mock
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Risk Engine Configuration
HIGH_RISK_AMOUNT_THRESHOLD=10000
HIGH_RISK_EMAIL_DOMAINS=.ru,.fraud.net,.scam.com
CACHE_TTL=3600
MAX_CACHE_SIZE=1000

# Logging
LOG_LEVEL=info
```

## LLM Integration

### Supported Providers

1. **OpenAI**: GPT-3.5-turbo or GPT-4
2. **Anthropic**: Claude models
3. **Mock**: Fallback provider for testing

### Caching

- LLM responses are cached based on risk factors
- Configurable TTL and cache size
- Automatic cache cleanup to prevent memory leaks

### Fallback Strategy

- Primary LLM provider fails → Fallback to mock provider
- Graceful degradation ensures service availability
- Detailed error logging for debugging

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Development

### Code Quality

```bash
npm run lint
```

### Project Structure

- **Services**: Core business logic
- **Routes**: API endpoint handlers
- **Middleware**: Request processing and validation
- **Utils**: Shared utilities and logging

### Best Practices

- Input validation using Joi
- Structured logging with Winston
- Error handling with custom middleware
- Security headers with Helmet
- CORS configuration for cross-origin requests


### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production LLM API keys
3. Set appropriate log levels
4. Configure monitoring and alerting

### Monitoring

- Health check endpoints for load balancers
- Structured logging for log aggregation
- Memory usage monitoring
- Cache hit rate tracking

## Security Considerations

- Input validation and sanitization
- Rate limiting (implement as needed)
- Secure logging (PII masking)
- API key management
- HTTPS enforcement in production

## Performance

- In-memory caching for LLM responses
- Efficient risk factor calculation
- Memory leak prevention
- Configurable cleanup intervals



Fraud Logic & LLM Usage
Fraud Scoring Heuristics
High-risk email domains: Emails from domains like .ru, fraud.net, etc., are flagged as risky.
Large transaction amount: Transactions above a certain threshold are considered higher risk.
Repeat IP or device fingerprint: If the IP address or device fingerprint has been seen in previous transactions, risk increases.
Other best practices: Additional rules may include currency anomalies, rapid repeat attempts, or mismatched geolocation.
Each rule contributes to a composite fraud score between 0.0 (safe) and 1.0 (very risky). The score is then mapped to a riskLevel:
low (score < 0.4)
moderate (0.4 ≤ score < 0.7)
high (score ≥ 0.7)


LLM Explanation
After scoring, the service calls a Large Language Model (LLM) to generate a human-readable explanation. The prompt summarizes which factors contributed to the risk score, making the decision transparent and auditable.
Caching: LLM responses are cached to minimize repeat prompts for similar transactions.
Provider Simulation: The system can simulate different LLM providers or use fallback logic if the primary LLM is unavailable.

Assumptions & Tradeoffs
Heuristic-based scoring: The risk engine uses simple, transparent rules for scoring. This is easy to audit but may not catch sophisticated fraud patterns.
LLM explanations: Relying on an LLM for explanations improves transparency but introduces latency and potential cost. Caching mitigates this.
Data persistence: For demo purposes, repeat IPs and device fingerprints may be tracked in-memory. In production, a persistent store is recommended.
LLM provider abstraction: The system is designed to allow easy swapping or fallback between LLM providers, but only basic simulation is implemented.
Security: The service assumes input is sanitized and does not implement authentication or rate limiting. These should be added for production use.


## License

MIT License - see LICENSE file for details. 