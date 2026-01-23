# Oracle Integration Setup Guide

This guide explains how to set up and test the complete 3-layer Oracle architecture for Curance.

## ✅ What Was Built

### 1. Oracle Service (NEW)

Complete Node.js/Express service in `oracle/`:

```
oracle/
├── src/
│   ├── config.ts           # Environment configuration
│   ├── types.ts            # TypeScript interfaces
│   ├── index.ts            # Express server
│   ├── routes/
│   │   ├── register.ts     # POST /api/register
│   │   └── claims.ts       # POST /api/claims/verify, GET /api/claims/:id
│   └── services/
│       ├── contract.ts     # viem wallet/public clients
│       └── proof.ts        # zkTLS proof verification (mock for POC)
├── package.json
├── tsconfig.json
└── .env.example
```

**Key Features:**
- Verifies health proofs before policy registration
- Verifies invoice + ownership proofs before claim settlement
- Only entity authorized to call `enableClaim()` on-chain
- Mock proof verification ready for Reclaim Protocol integration

### 2. Updated Frontend

**Updated Files:**
- `frontend/lib/contracts.ts` - Split into `registryAbi` + `claimsAbi`
- `frontend/lib/api.ts` (NEW) - Oracle API client
- `frontend/app/register/page.tsx` - Calls Oracle for health verification
- `frontend/app/claim/page.tsx` - Calls Oracle for claim verification
- `frontend/app/hospital/page.tsx` - Uses new `claimsAbi`
- `frontend/app/dashboard/page.tsx` (NEW) - View policy details
- `frontend/app/page.tsx` - Added dashboard link
- `frontend/.env.example` - Added Oracle URL

### 3. Contract ABIs

Frontend now uses 2 separate contract ABIs:

**CuranceRegistry ABI** - Policy management:
```typescript
export const registryAbi = parseAbi([
  'function registerPolicy(bytes32 commitment, bytes32 healthDataHash, uint256 premium) external',
  'function getPolicy(bytes32 commitment) view returns (...)',
  'function isPolicyValid(bytes32 commitment) view returns (bool)',
])
```

**CuranceClaims ABI** - Claim management:
```typescript
export const claimsAbi = parseAbi([
  'function createClaim(bytes32 policyCommitment, uint256 amount, bytes32 invoiceHash) external returns (bytes32)',
  'function getClaim(bytes32 claimId) view returns (...)',
  'function enableClaim(bytes32 claimId) external',  // Oracle only
])
```

## 🚀 Setup Instructions

### Step 1: Deploy Smart Contracts

You need to deploy 3 contracts to Base Sepolia:

1. **CuranceRegistry.sol** - Policy management
2. **CuranceClaims.sol** - Claim management
3. **MockUSDC.sol** - Test token

See `docs/CONTRACTS.md` for full contract code.

**Deploy with Hardhat:**

```bash
npx hardhat run scripts/deploy.js --network base-sepolia
```

**Save these addresses:**
```
CuranceRegistry deployed to: 0x...
CuranceClaims deployed to: 0x...
MockUSDC deployed to: 0x...
Oracle address: 0x...  (your Oracle wallet address)
```

### Step 2: Setup Oracle Service

```bash
cd oracle
npm install
```

Create `.env` from template:

```bash
cp .env.example .env
```

Edit `oracle/.env`:

```env
PORT=3001
PRIVATE_KEY=0x...  # Oracle wallet private key
RPC_URL=https://sepolia.base.org
REGISTRY_ADDRESS=0x...  # From deployment
CLAIMS_ADDRESS=0x...    # From deployment
```

**Important:** The `PRIVATE_KEY` address MUST match the Oracle address used in contract deployment.

**Fund Oracle Wallet:**
- Get Base Sepolia ETH from [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- Oracle needs ETH for gas when calling `enableClaim()`

**Start Oracle:**

```bash
npm run dev
```

Should see:

```
🚀 Curance Oracle Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server:     http://localhost:3001
🏥 Registry:   0x...
📋 Claims:     0x...
🔗 Network:    Base Sepolia
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Endpoints:
   GET  /health
   POST /api/register
   POST /api/claims/verify
   GET  /api/claims/:claimId
   GET  /api/claims/:claimId/status

✨ Ready to verify proofs and enable claims!
```

**Test Oracle:**

```bash
curl http://localhost:3001/health
```

Expected:

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

### Step 3: Setup Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...  # From deployment
NEXT_PUBLIC_CLAIMS_ADDRESS=0x...    # From deployment
NEXT_PUBLIC_USDC_ADDRESS=0x...      # From deployment
NEXT_PUBLIC_ORACLE_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...  # Get from cloud.walletconnect.com
```

**Start Frontend:**

```bash
npm run dev
```

Visit http://localhost:3000

## 🧪 End-to-End Test

### Preparation

**You need 2 wallets:**
- **Wallet A (Patient)** - For registering policy and verifying claims
- **Wallet B (Hospital)** - For creating claims

**Both wallets need:**
- Base Sepolia ETH ([faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet))

**Mint USDC to Wallet A:**
```bash
# Using Hardhat console or Etherscan
MockUSDC.mint(walletA_address, 1000000000)  // 1000 USDC (6 decimals)
```

### Test Flow

#### 1. Register Policy (Wallet A - Patient)

1. Connect Wallet A to http://localhost:3000/register
2. Enter premium: `100` USDC
3. Click "Continue to Verification"
4. Click "Generate Mock Health Verification"
   - ✅ Frontend calls Oracle: `POST /api/register`
   - ✅ Oracle verifies health proof (mock)
   - ✅ Oracle returns success
5. Click "Approve USDC"
   - ✅ Approves CuranceRegistry to spend 100 USDC
6. Click "Register Policy"
   - ✅ Calls `CuranceRegistry.registerPolicy(commitment, healthDataHash, 100 USDC)`
   - ✅ Policy created: Coverage = 1000 USDC (10x premium)
7. **Copy your commitment** - you'll share this with the hospital

**Oracle Logs (should see):**

```
[2024-01-19T...] POST /api/register
Registration request received: {
  commitment: '0x...',
  healthDataHash: '0x...',
  premium: '100000000'
}
Verifying health proof (MOCK): {
  hospitalId: 'hospital_1',
  timestamp: 1705660800000
}
Health proof verified successfully (MOCK)
```

#### 2. View Dashboard (Wallet A)

1. Visit http://localhost:3000/dashboard
2. Should see:
   - **Total Coverage:** 1000 USDC
   - **Remaining Coverage:** 1000 USDC
   - **Used Coverage:** 0 USDC
   - **Status:** Active
   - **Your commitment:** 0x...

#### 3. Create Claim (Wallet B - Hospital)

1. **Switch to Wallet B**
2. Visit http://localhost:3000/hospital
3. Enter **patient's commitment** (from step 1.7)
4. Enter **treatment amount:** `50` USDC
5. Enter **invoice reference:** `INV-2024-001`
6. Click "Create Claim"
   - ✅ Calls `CuranceClaims.createClaim(commitment, 50 USDC, invoiceHash)`
   - ✅ Claim created with status: PENDING
7. **Copy the Claim ID** - share with patient

#### 4. Verify Claim (Wallet A - Patient)

1. **Switch back to Wallet A**
2. Visit http://localhost:3000/claim
3. Enter **claim ID** (from step 3.7)
4. Click "Load Claim"
   - ✅ Reads claim from `CuranceClaims.getClaim()`
   - Shows: Amount = 50 USDC, Hospital = Wallet B, Status = PENDING
5. Verify commitment matches
6. Click "Verify Claim"
   - ✅ Frontend calls Oracle: `POST /api/claims/verify`
   - ✅ Oracle verifies invoice proof (mock)
   - ✅ Oracle verifies ownership proof (mock)
   - ✅ Oracle calls `CuranceClaims.enableClaim(claimId)`
   - ✅ Claim auto-settles: 50 USDC transferred to Hospital
   - ✅ Status: PENDING → ENABLED → SETTLED

**Oracle Logs (should see):**

```
[2024-01-19T...] POST /api/claims/verify
Claim verification request received: {
  claimId: '0x...',
  invoiceHospitalId: 'hospital_1'
}
Verifying invoice proof (MOCK)
Invoice proof verified successfully (MOCK)
Verifying ownership proof (MOCK)
Ownership proof verified successfully (MOCK)
All verifications passed for claim 0x.... Enabling claim...
Enabling claim 0x...
Claim enabled. Transaction hash: 0x...
```

#### 5. Check Dashboard Again (Wallet A)

1. Refresh http://localhost:3000/dashboard
2. Should now see:
   - **Total Coverage:** 1000 USDC
   - **Remaining Coverage:** 950 USDC ✅
   - **Used Coverage:** 50 USDC ✅
   - **Status:** Active

#### 6. Verify Hospital Received Payment (Wallet B)

Check Wallet B's USDC balance:

```bash
# Should have received 50 USDC
MockUSDC.balanceOf(walletB_address)
```

## ✨ What Just Happened?

### Registration Flow

```
1. Frontend generates commitment = hash(secret, healthDataHash)
2. Frontend → Oracle: "Verify this health proof"
3. Oracle: "Proof valid!" (mock verification)
4. Frontend → CuranceRegistry: registerPolicy(commitment, healthDataHash, premium)
5. Policy created on-chain with coverage = premium × 10
```

### Claim Flow

```
1. Hospital → CuranceClaims: createClaim(commitment, amount, invoiceHash)
   Status: PENDING
2. Hospital shares claim ID with Patient
3. Patient → Oracle: "Verify this claim with proofs"
4. Oracle verifies:
   - Invoice proof (hospital's zkTLS proof) ✅
   - Ownership proof (patient knows secret) ✅
   - Policy is valid ✅
   - Commitment matches ✅
5. Oracle → CuranceClaims: enableClaim(claimId)
6. Smart contract auto-settles USDC to hospital
   Status: PENDING → ENABLED → SETTLED
```

## 🔑 Key Architecture Points

### 1. Oracle is the ONLY Authority

```solidity
// CuranceClaims.sol
modifier onlyOracle() {
    require(msg.sender == oracle, "Only oracle can call");
    _;
}

function enableClaim(bytes32 claimId) external onlyOracle {
    // Only Oracle can execute this
    // Triggers USDC settlement
}
```

### 2. Frontend Never Directly Enables Claims

**Old (wrong) flow:**
```
Frontend → CuranceClaims.verifyClaim(secret) → settle
```

**New (correct) flow:**
```
Frontend → Oracle (verify proofs) → CuranceClaims.enableClaim() → settle
```

This ensures:
- Only verified proofs can settle claims
- No direct secret revelation on-chain
- Oracle acts as trusted intermediary

### 3. 2-Contract System

**CuranceRegistry:**
- Manages policies
- Tracks coverage amounts
- Validates policy status

**CuranceClaims:**
- Creates claims (hospitals)
- Enables claims (Oracle only)
- Settles USDC automatically
- References CuranceRegistry for validation

## 🐛 Troubleshooting

### Oracle Issues

**"Cannot connect to chain"**
- Check `RPC_URL` in Oracle `.env`
- Test: `curl -X POST $RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`

**"Failed to enable claim on-chain"**
- Ensure Oracle wallet has ETH for gas
- Verify Oracle address matches contract's `oracle` variable
- Check claim status is PENDING

**Oracle logs show errors**
- Check contract addresses in `.env`
- Ensure contracts are deployed
- Verify Oracle wallet is funded

### Frontend Issues

**"Oracle registration failed"**
- Check Oracle is running: `curl http://localhost:3001/health`
- Verify `NEXT_PUBLIC_ORACLE_URL` in `.env.local`
- Check browser console for errors

**Contract read errors**
- Ensure wallet connected to Base Sepolia (chainId: 84532)
- Verify contract addresses in `.env.local`
- Check contracts are deployed

**Transaction reverts**
- View transaction on [BaseScan Sepolia](https://sepolia.basescan.org/)
- Check error message
- Verify sufficient USDC balance

### Contract Issues

**"Policy not found"**
- Ensure policy was registered successfully
- Check commitment is correct
- View policy on BaseScan

**"Claim rejected"**
- Check Oracle logs for rejection reason
- Verify policy is still active
- Ensure sufficient coverage remaining

## 🔮 Next Steps

### For Production

1. **Integrate Real Reclaim Protocol:**
   ```typescript
   // oracle/src/services/proof.ts
   import { ReclaimClient } from '@reclaimprotocol/js-sdk'

   const client = new ReclaimClient(APP_ID)
   const verified = await client.verifyProof(proof)
   ```

2. **Deploy to Production:**
   - Oracle → Railway/Render
   - Frontend → Vercel
   - Contracts → Base Mainnet

3. **Add Features:**
   - Hospital registry and authorization
   - Policy renewal
   - Multi-token support
   - Claim appeals
   - Analytics dashboard

### Testing Checklist

- [ ] Deploy contracts to Base Sepolia
- [ ] Fund Oracle wallet with ETH
- [ ] Start Oracle service
- [ ] Verify `/health` endpoint works
- [ ] Start Frontend
- [ ] Mint USDC to Wallet A
- [ ] Register policy with Wallet A
- [ ] Check dashboard shows policy
- [ ] Create claim with Wallet B
- [ ] Verify claim with Wallet A
- [ ] Confirm USDC transferred to Wallet B
- [ ] Check dashboard shows updated coverage

## 📚 Additional Resources

- **ARCHITECTURE.md** - Complete system architecture
- **CONTRACTS.md** - Full smart contract code
- **ORACLE.md** - Oracle implementation details
- **FRONTEND.md** - Frontend specifications
- **oracle/README.md** - Oracle setup guide

## 🎉 Success Criteria

You've successfully integrated the Oracle when:

✅ Oracle service starts without errors
✅ `/health` endpoint returns contract addresses
✅ Frontend can register policy (calls Oracle, then contract)
✅ Dashboard shows policy details correctly
✅ Hospital can create claims (PENDING status)
✅ Patient can verify claims (calls Oracle)
✅ Oracle enables claim and settles USDC
✅ Dashboard shows updated coverage
✅ Hospital receives USDC payment

---

**Need Help?**

Check logs:
- Oracle logs: Terminal where Oracle is running
- Frontend logs: Browser console (F12)
- Contract events: BaseScan Sepolia

If stuck, review the full documentation in `docs/` or check Oracle logs for detailed error messages.
