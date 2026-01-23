# Curance Oracle Service

The Oracle service is the **trusted off-chain verifier** that validates zkTLS proofs and enables claims on-chain.

## Architecture Role

```
Frontend → Oracle API → Smart Contracts
```

The Oracle:
- **Verifies health proofs** before policy registration (off-chain)
- **Verifies invoice + ownership proofs** before enabling claims
- **Calls `enableClaim()`** on CuranceClaims contract (only Oracle can do this)
- **Auto-settles USDC** to hospitals when proofs are valid

## Setup

### 1. Install Dependencies

```bash
cd oracle
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
PORT=3001

# Oracle Wallet (this wallet will call enableClaim())
PRIVATE_KEY=0x...

# RPC URL for Base Sepolia
RPC_URL=https://sepolia.base.org

# Contract Addresses (from deployment)
REGISTRY_ADDRESS=0x...
CLAIMS_ADDRESS=0x...
```

**Important:** The `PRIVATE_KEY` address must match the `oracle` address set in the CuranceClaims contract constructor.

### 3. Run Development Server

```bash
npm run dev
```

Server starts on `http://localhost:3001`

### 4. Verify Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "service": "curance-oracle",
  "status": "healthy",
  "timestamp": "2024-01-19T...",
  "contracts": {
    "registry": "0x...",
    "claims": "0x..."
  }
}
```

## API Endpoints

### POST /api/register

Verify health proof before policy registration.

**Request:**
```json
{
  "commitment": "0x...",
  "healthDataHash": "0x...",
  "premium": "100000000",
  "proof": {
    "signature": "mock_signature_123",
    "timestamp": 1705660800000,
    "hospitalId": "hospital_1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "verified": true
}
```

### POST /api/claims/verify

Verify claim proofs and enable claim on-chain.

**Request:**
```json
{
  "claimId": "0x...",
  "invoiceProof": {
    "signature": "mock_invoice_sig",
    "invoiceHash": "0x...",
    "hospitalId": "hospital_1"
  },
  "ownershipProof": {
    "commitment": "0x...",
    "signature": "mock_ownership_sig"
  }
}
```

**Response:**
```json
{
  "success": true,
  "claimId": "0x...",
  "status": "ENABLED",
  "transactionHash": "0x..."
}
```

### GET /api/claims/:claimId

Get full claim details.

### GET /api/claims/:claimId/status

Get claim status only.

## Proof Verification (POC vs Production)

### Current (POC - Mock Verification)

The Oracle currently uses **mock proof verification** in `src/services/proof.ts`:

```typescript
export async function verifyHealthProof(proof: HealthProof): Promise<boolean> {
  // Mock verification - accepts all proofs with valid structure
  console.log('Verifying health proof (MOCK)')

  // Basic validation
  if (!proof.signature || !proof.hospitalId || !proof.timestamp) {
    return false
  }

  return true
}
```

This is **sufficient for the POC** to demonstrate the architecture.

### Production (Real Reclaim Protocol Integration)

For production, replace mock verification with Reclaim Protocol SDK:

```typescript
import { ReclaimClient } from '@reclaimprotocol/js-sdk'

const reclaimClient = new ReclaimClient(process.env.RECLAIM_APP_ID!)

export async function verifyHealthProof(proof: ReclaimProof): Promise<boolean> {
  try {
    const verified = await reclaimClient.verifyProof(proof)
    return verified
  } catch (error) {
    console.error('Reclaim proof verification failed:', error)
    return false
  }
}
```

Steps to integrate:
1. Create app on [Reclaim Protocol Dashboard](https://dev.reclaimprotocol.org/)
2. Get `APP_ID` and `APP_SECRET`
3. Add to `.env`: `RECLAIM_APP_ID=...` and `RECLAIM_APP_SECRET=...`
4. Install SDK: `npm install @reclaimprotocol/js-sdk`
5. Update `src/services/proof.ts` with real verification

## Building for Production

```bash
npm run build
npm start
```

Or use Docker:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Security Considerations

### Private Key Management

**NEVER commit the `.env` file to git!**

For production:
- Use a **secret manager** (AWS Secrets Manager, HashiCorp Vault, etc.)
- Use environment variables injected by your deployment platform
- Rotate Oracle wallet keys periodically

### Oracle Wallet Funding

The Oracle wallet needs ETH for gas:
- **Base Sepolia (Testnet):** Get free ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- **Base Mainnet:** Fund with real ETH

Monitor wallet balance and set up alerts for low balances.

### CORS Configuration

Update CORS origins for production:

```typescript
// src/index.ts
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['https://your-frontend.com'],
  credentials: true,
}))
```

Add to `.env`:
```
CORS_ORIGINS=https://your-frontend.com,https://admin.your-frontend.com
```

## Monitoring & Logs

The Oracle logs all operations:

```
[2024-01-19T10:30:00.000Z] POST /api/register
Verifying health proof (MOCK): {
  hospitalId: 'hospital_1',
  timestamp: 1705660800000
}
Health proof verified successfully (MOCK)
```

For production:
- Use structured logging (Winston, Pino)
- Send logs to aggregation service (Datadog, CloudWatch)
- Set up alerts for verification failures

## Troubleshooting

### "Missing required environment variable"

Ensure all required variables are set in `.env`:
- `PRIVATE_KEY`
- `RPC_URL`
- `REGISTRY_ADDRESS`
- `CLAIMS_ADDRESS`

### "Failed to connect to chain"

Check `RPC_URL` is correct and accessible:
```bash
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### "Failed to enable claim on-chain"

Possible issues:
1. **Oracle wallet has no ETH** - Fund the wallet
2. **Oracle address not authorized** - Ensure Oracle wallet address matches contract's `oracle` variable
3. **Claim not in PENDING status** - Check claim status first
4. **Policy invalid/expired** - Verify policy is active

Check contract logs and transaction reverts on [BaseScan](https://sepolia.basescan.org/).

## Development

### Project Structure

```
oracle/
├── src/
│   ├── config.ts           # Environment configuration
│   ├── types.ts            # TypeScript type definitions
│   ├── index.ts            # Express server setup
│   ├── routes/
│   │   ├── register.ts     # POST /api/register
│   │   └── claims.ts       # /api/claims/* endpoints
│   └── services/
│       ├── contract.ts     # viem contract interactions
│       └── proof.ts        # zkTLS proof verification
├── package.json
├── tsconfig.json
└── .env
```

### Testing

You can test the Oracle endpoints using `curl`:

**Test Registration:**
```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "healthDataHash": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "premium": "100000000",
    "proof": {
      "signature": "mock_sig_123",
      "timestamp": 1705660800000,
      "hospitalId": "hospital_1"
    }
  }'
```

**Test Claim Verification:**
```bash
curl -X POST http://localhost:3001/api/claims/verify \
  -H "Content-Type: application/json" \
  -d '{
    "claimId": "0x...",
    "invoiceProof": {
      "signature": "mock_invoice_sig",
      "invoiceHash": "0x...",
      "hospitalId": "hospital_1"
    },
    "ownershipProof": {
      "commitment": "0x...",
      "signature": "mock_ownership_sig"
    }
  }'
```

## Next Steps

1. ✅ Deploy contracts (CuranceRegistry, CuranceClaims, MockUSDC)
2. ✅ Get contract addresses
3. ✅ Update `.env` with addresses
4. ✅ Fund Oracle wallet with ETH
5. ✅ Start Oracle service: `npm run dev`
6. ✅ Start Frontend: `cd ../frontend && npm run dev`
7. ✅ Test full flow with 2 wallets

For production:
- [ ] Integrate real Reclaim Protocol verification
- [ ] Set up production RPC provider (Alchemy, Infura)
- [ ] Deploy Oracle service to cloud (Railway, Render, AWS)
- [ ] Configure monitoring and alerts
- [ ] Set up automated backups
