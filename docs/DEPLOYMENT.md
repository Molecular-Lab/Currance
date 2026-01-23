# Deployment Guide

## Prerequisites

- Node.js 18+
- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash`)
- Private key with Base Sepolia ETH
- WalletConnect Project ID

## Quick Start

### 1. Clone and Setup

```bash
git clone <repo-url>
cd curance
```

### 2. Deploy Contracts

```bash
# Navigate to contracts
cd contracts

# Install dependencies
forge install

# Copy environment file
cp .env.example .env

# Edit .env with your private key
# PRIVATE_KEY=0x...
# BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Deploy
forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify

# Note the deployed addresses from output
```

### 3. Setup Frontend

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with contract addresses and API keys
```

### 4. Run Frontend

```bash
npm run dev
```

Visit `http://localhost:3000`

## Contract Deployment Details

### Deploy Script Output

The deploy script will:
1. Deploy MockUSDC
2. Deploy CurancePolicy with MockUSDC address
3. Mint 1,000,000 USDC to deployer
4. Fund CurancePolicy with 100,000 USDC for settlements
5. Register deployer as a hospital (for testing)

### Verification

Contracts are auto-verified on Base Sepolia explorer.

View at: `https://sepolia.basescan.org/address/<contract-address>`

## Environment Configuration

### contracts/.env

```bash
# Deployer private key (with Base Sepolia ETH)
PRIVATE_KEY=0x...

# RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Optional: For verification
BASESCAN_API_KEY=...
```

### frontend/.env.local

```bash
# Chain
NEXT_PUBLIC_CHAIN_ID=84532

# Contract addresses (from deployment)
NEXT_PUBLIC_POLICY_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

# Reclaim Protocol (get from developer portal)
NEXT_PUBLIC_RECLAIM_APP_ID=...
NEXT_PUBLIC_RECLAIM_APP_SECRET=...

# WalletConnect (get from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

## Reclaim Protocol Setup

### 1. Create Application

1. Go to [Reclaim Developer Portal](https://dev.reclaimprotocol.org/)
2. Create new application
3. Note APP_ID and APP_SECRET

### 2. Configure Provider

For POC, use a generic HTTP provider or create custom:

```json
{
  "providerId": "custom-health-check",
  "url": "https://api.example.com/health",
  "responseType": "json",
  "extractFields": ["score", "date"]
}
```

### 3. Test Verification

Use Reclaim's test mode for development:
- Set `testMode: true` in SDK initialization
- Returns mock proofs for testing

## Network Configuration

### Base Sepolia

| Property | Value |
|----------|-------|
| Chain ID | 84532 |
| RPC URL | https://sepolia.base.org |
| Explorer | https://sepolia.basescan.org |
| Faucet | https://www.alchemy.com/faucets/base-sepolia |

### Getting Test ETH

1. Go to [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Connect wallet
3. Request 0.1 ETH

## Testing the Full Flow

### Setup Two Wallets

1. **Wallet A** (Patient): Will register policy and verify claims
2. **Wallet B** (Hospital): Will create claims

### Step-by-Step Test

1. **Fund Wallets**
   - Get Base Sepolia ETH for both wallets
   - Mint MockUSDC for Wallet A: Call `mint(walletA, 1000000000)` (1000 USDC)

2. **Register Policy (Wallet A)**
   - Go to /register
   - Enter premium (e.g., 100 USDC)
   - Complete Reclaim verification
   - Approve USDC spending
   - Register policy
   - Note the commitment

3. **Create Claim (Wallet B)**
   - Go to /hospital
   - Enter patient's commitment
   - Enter treatment amount (e.g., 50 USDC)
   - Enter invoice reference
   - Create claim
   - Note the claim ID

4. **Verify Claim (Wallet A)**
   - Go to /claim
   - Enter claim ID
   - Load claim details
   - Click verify (secret loaded from localStorage)
   - Watch settlement

5. **Verify Settlement**
   - Check Wallet B balance increased
   - Check policy usage updated

## Troubleshooting

### Contract Deployment

**Error: "Insufficient funds"**
- Get more Base Sepolia ETH from faucet

**Error: "Nonce too high"**
- Reset nonce: `cast nonce $ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL`

### Frontend

**Error: "Chain not configured"**
- Check NEXT_PUBLIC_CHAIN_ID matches 84532
- Ensure wagmi config includes Base Sepolia

**Error: "Contract not deployed"**
- Verify addresses in .env.local match deployed contracts
- Check you're on Base Sepolia network

### Reclaim

**Error: "Invalid APP_ID"**
- Verify APP_ID from Reclaim Developer Portal
- Check environment variable is set correctly

**Error: "Verification timeout"**
- Increase timeout in SDK configuration
- Check user completed verification

## Production Considerations

For production deployment:

1. **Security**
   - Use hardware wallet for deployment
   - Implement time-locks for admin functions
   - Add emergency pause functionality

2. **Upgrades**
   - Deploy behind proxy contract
   - Use transparent or UUPS pattern

3. **Monitoring**
   - Set up event monitoring
   - Alert on unusual activity

4. **Frontend**
   - Deploy to Vercel/Netlify
   - Use environment variables for secrets
   - Enable CSP headers
