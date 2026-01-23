# 🚀 Curance Quick Start Guide

Get the complete Oracle-integrated Curance POC running in 15 minutes.

## Prerequisites

- [x] Node.js 20+ installed
- [x] Two wallets with Base Sepolia ETH ([faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet))
- [x] Hardhat (for contract deployment)

## Step 1: Deploy Contracts (5 min)

Deploy to Base Sepolia using Hardhat. See `docs/CONTRACTS.md` for full contract code.

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network base-sepolia
```

**Save these addresses:**
```
✅ CuranceRegistry: 0x...
✅ CuranceClaims: 0x...
✅ MockUSDC: 0x...
✅ Oracle address: 0x... (your Oracle wallet)
```

**Mint test USDC to your test wallet:**
```bash
# Using Hardhat console or Etherscan
MockUSDC.mint(YOUR_WALLET_ADDRESS, 1000000000)  # 1000 USDC
```

## Step 2: Setup Oracle (3 min)

```bash
cd oracle
npm install
cp .env.example .env
```

**Edit `oracle/.env`:**
```env
PORT=3001
PRIVATE_KEY=0x...           # Oracle wallet private key
RPC_URL=https://sepolia.base.org
REGISTRY_ADDRESS=0x...      # From Step 1
CLAIMS_ADDRESS=0x...        # From Step 1
```

**Fund Oracle wallet:**
- Send Base Sepolia ETH to Oracle address (for gas)

**Start Oracle:**
```bash
npm run dev
```

**Verify Oracle is running:**
```bash
curl http://localhost:3001/health
```

Expected output:
```json
{
  "service": "curance-oracle",
  "status": "healthy",
  "contracts": {
    "registry": "0x...",
    "claims": "0x..."
  }
}
```

## Step 3: Setup Frontend (3 min)

```bash
cd frontend
npm install
cp .env.example .env.local
```

**Edit `frontend/.env.local`:**
```env
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...      # From Step 1
NEXT_PUBLIC_CLAIMS_ADDRESS=0x...        # From Step 1
NEXT_PUBLIC_USDC_ADDRESS=0x...          # From Step 1
NEXT_PUBLIC_ORACLE_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...  # Get from cloud.walletconnect.com
```

**Start Frontend:**
```bash
npm run dev
```

Visit: http://localhost:3000

## Step 4: Test Full Flow (4 min)

### 4.1 Register Policy (Wallet A - Patient)

1. Connect Wallet A to http://localhost:3000/register
2. Enter premium: **100 USDC**
3. Click **"Generate Mock Health Verification"**
   - Oracle verifies health proof ✅
4. Click **"Approve USDC"**
5. Click **"Register Policy"**
   - Policy created with **1000 USDC coverage** ✅
6. **Copy your commitment** (e.g., `0x1234...abcd`)

### 4.2 View Dashboard

1. Visit http://localhost:3000/dashboard
2. Verify:
   - Coverage: **1000 USDC** ✅
   - Used: **0 USDC** ✅
   - Status: **Active** ✅

### 4.3 Create Claim (Wallet B - Hospital)

1. **Switch to Wallet B**
2. Visit http://localhost:3000/hospital
3. Enter patient's commitment (from 4.1.6)
4. Enter amount: **50 USDC**
5. Enter invoice: **INV-2024-001**
6. Click **"Create Claim"**
   - Claim created with status: **PENDING** ✅
7. **Copy Claim ID** (e.g., `0x5678...efab`)

### 4.4 Verify Claim (Wallet A - Patient)

1. **Switch back to Wallet A**
2. Visit http://localhost:3000/claim
3. Enter Claim ID (from 4.3.7)
4. Click **"Load Claim"**
   - Shows: 50 USDC, Hospital: Wallet B, Status: PENDING ✅
5. Click **"Verify Claim"**
   - Oracle verifies proofs ✅
   - Oracle enables claim ✅
   - **50 USDC sent to Hospital** ✅
   - Status: **SETTLED** ✅

### 4.5 Check Results

**Dashboard (Wallet A):**
- Used: **50 USDC** ✅
- Remaining: **950 USDC** ✅

**Hospital Wallet (Wallet B):**
- USDC Balance: **+50 USDC** ✅

## ✅ Success!

You've successfully demonstrated:

✅ Privacy-preserving policy registration (Oracle verifies health proof)
✅ Anonymous claim creation (Hospital doesn't know patient identity)
✅ Claim verification via Oracle (off-chain proof verification)
✅ Automatic USDC settlement (Oracle triggers payment)
✅ Full 3-layer architecture (Frontend → Oracle → Contracts)

## 🎯 What Just Happened?

### Registration Flow
```
1. Frontend → Oracle: "Verify health proof"
2. Oracle: "Verified!" (mock)
3. Frontend → CuranceRegistry: "Register policy"
4. Policy created: 100 USDC → 1000 USDC coverage
```

### Claim Flow
```
1. Hospital → CuranceClaims: "Create claim for 50 USDC"
   Status: PENDING
2. Patient → Oracle: "Verify this claim"
3. Oracle verifies proofs:
   - Invoice proof (hospital authentic) ✅
   - Ownership proof (patient owns policy) ✅
4. Oracle → CuranceClaims: "Enable claim"
5. Smart contract: Settle 50 USDC to hospital
   Status: SETTLED
```

## 🐛 Troubleshooting

### Oracle not starting?
```bash
# Check .env file
cat oracle/.env

# Verify all addresses are set
# Fund Oracle wallet with ETH
```

### Frontend can't connect?
```bash
# Check Oracle is running
curl http://localhost:3001/health

# Verify .env.local has correct addresses
cat frontend/.env.local
```

### Transaction fails?
- Ensure wallet has Base Sepolia ETH for gas
- Verify you're on Base Sepolia network (chainId: 84532)
- Check you have USDC minted to your wallet

### Claim won't settle?
- Ensure Oracle wallet has ETH for gas
- Verify Oracle address matches contract deployment
- Check claim status is PENDING before verifying

## 📚 Next Steps

### Learn More
- Read `ORACLE_INTEGRATION_GUIDE.md` for detailed setup
- Check `docs/ARCHITECTURE.md` for system design
- Review `oracle/README.md` for Oracle details

### Deploy to Production
1. Integrate real Reclaim Protocol (replace mock verification)
2. Deploy Oracle to Railway/Render
3. Deploy Frontend to Vercel
4. Deploy contracts to Base Mainnet

### Enhance Features
- Add hospital registry and authorization
- Implement policy renewal
- Add multi-token support (beyond USDC)
- Build analytics dashboard

## 💡 Key Files

| File | Purpose |
|------|---------|
| `oracle/src/routes/register.ts` | Health proof verification |
| `oracle/src/routes/claims.ts` | Claim verification + settlement |
| `frontend/lib/api.ts` | Oracle API client |
| `frontend/app/register/page.tsx` | Policy registration |
| `frontend/app/claim/page.tsx` | Claim verification |
| `frontend/app/dashboard/page.tsx` | Policy dashboard |

## 🎉 Demo Tips

When presenting:

1. **Start with problem**: Identity leakage in health insurance
2. **Show architecture diagram**: Frontend → Oracle → Contracts
3. **Demo registration**: Emphasize Oracle verification (off-chain)
4. **Show dashboard**: Prove policy exists on-chain
5. **Demo claim flow**: Hospital creates, Oracle verifies, auto-settles
6. **Highlight privacy**: No identity revealed, only commitments

---

**Time to Demo:** ~15 minutes total

**Built with:** Next.js, Reclaim Protocol (zkTLS), Base Sepolia, Solidity

**Ready for:** ETH Bangkok Hackathon presentation 🇹🇭

Need help? Check the full documentation in `docs/` or review Oracle logs for errors.
