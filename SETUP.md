# Curance Setup Guide

## Step-by-Step Setup Instructions

### 1. Smart Contracts (You Do This)

You mentioned you'll use Hardhat. Here's what you need to do:

#### A. Create Contract Files

Based on `docs/CONTRACTS_SPEC.md`, implement:

1. **MockUSDC.sol**
   - Standard ERC20
   - 6 decimals
   - Public `mint(address, uint256)` function

2. **CurancePolicy.sol**
   - See full specs in `docs/CONTRACTS_SPEC.md`
   - Key functions: `registerPolicy`, `createClaim`, `verifyClaim`
   - Admin functions: `registerHospital`, `fundContract`

#### B. Deploy to Base Sepolia

```bash
# Your Hardhat commands (example)
npx hardhat compile
npx hardhat run scripts/deploy.js --network baseSepolia
```

#### C. Post-Deployment

After deployment, you need to:

1. **Note the contract addresses:**
   - MockUSDC address: `0x...`
   - CurancePolicy address: `0x...`

2. **Mint USDC for testing:**
   ```solidity
   // Call on MockUSDC
   mint(yourWallet, 1000000000) // 1000 USDC
   ```

3. **Register hospital wallet:**
   ```solidity
   // Call on CurancePolicy (as owner)
   registerHospital(hospitalWallet)
   ```

4. **Fund contract for settlements:**
   ```solidity
   // Approve USDC first
   MockUSDC.approve(CurancePolicyAddress, 100000000000)

   // Then fund
   CurancePolicy.fundContract(100000000000) // 100k USDC
   ```

---

### 2. Frontend Setup

#### A. Install Dependencies

```bash
cd frontend
npm install
```

#### B. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Chain
NEXT_PUBLIC_CHAIN_ID=84532

# Contract addresses (from your deployment)
NEXT_PUBLIC_POLICY_ADDRESS=0xYourCurancePolicyAddress
NEXT_PUBLIC_USDC_ADDRESS=0xYourMockUSDCAddress

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Reclaim Protocol (optional for POC - uses mock data)
NEXT_PUBLIC_RECLAIM_APP_ID=
NEXT_PUBLIC_RECLAIM_APP_SECRET=
```

#### C. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

### 3. Testing the Full Flow

#### Setup (One-Time)

**Wallet A** (Patient Wallet):
```solidity
// Mint 1000 USDC
MockUSDC.mint(walletA, 1000000000)
```

**Wallet B** (Hospital Wallet):
```solidity
// Register as hospital (call as contract owner)
CurancePolicy.registerHospital(walletB)
```

---

#### Test Flow

**Step 1: Patient Registers Policy (Wallet A)**

1. Connect Wallet A to app
2. Navigate to `/register`
3. Enter premium: `100` USDC
4. Click "Continue to Verification"
5. Click "Generate Mock Health Verification"
6. Click "Approve USDC"
   - Approve the transaction in wallet
7. Click "Register Policy"
   - Confirm transaction
8. **Save your commitment ID** (shown on screen)

Example commitment:
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Step 2: Hospital Creates Claim (Wallet B)**

1. Switch to Wallet B
2. Navigate to `/hospital`
3. Verify you see "Registered Hospital" badge
4. Enter patient commitment (from Step 1)
5. Enter treatment amount: `50` USDC
6. Enter invoice reference: `INV-001`
7. Click "Create Claim"
   - Confirm transaction
8. **Copy the Claim ID** (shown on screen)

Example claim ID:
```
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Step 3: Patient Verifies Claim (Wallet A)**

1. Switch back to Wallet A
2. Navigate to `/claim`
3. Paste the Claim ID
4. Click "Load Claim"
5. Review claim details:
   - Hospital address matches Wallet B
   - Amount is 50 USDC
   - Commitment matches yours
   - Status is "Pending"
6. Click "Verify Claim & Settle Payment"
   - Confirm transaction
7. Wait for confirmation
8. Status changes to "Verified"

**Step 4: Verify Settlement**

Check Wallet B balance:
- Should have received 50 USDC

Check policy:
- Used amount increased by 50 USDC
- Remaining coverage decreased by 50 USDC

---

### 4. Troubleshooting

#### Frontend Not Starting

```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Make sure you're using Node 18+
node --version
```

#### Contract Calls Failing

**"Insufficient funds"**
- Make sure you have Base Sepolia ETH
- Get from faucet: https://www.alchemy.com/faucets/base-sepolia

**"Not a hospital"**
- Ensure wallet is registered: `CurancePolicy.isHospital(address)`
- Register if needed: `CurancePolicy.registerHospital(address)`

**"Invalid commitment"**
- Make sure you copied the full commitment (0x... with 66 characters)
- Check it matches exactly

**"Policy not found"**
- Verify policy was registered: `CurancePolicy.policies(commitment)`
- Check transaction succeeded

#### USDC Transfer Failed

**"Transfer amount exceeds allowance"**
- Approve USDC first: `MockUSDC.approve(policyAddress, amount)`

**"Transfer amount exceeds balance"**
- Mint more USDC: `MockUSDC.mint(yourAddress, amount)`

**Contract has insufficient balance**
- Fund the contract:
  ```solidity
  MockUSDC.approve(policyAddress, 100000000000)
  CurancePolicy.fundContract(100000000000)
  ```

---

### 5. Development Tips

#### View Contract State

```javascript
// In browser console on frontend
import { readContract } from 'wagmi/actions'

// Check if hospital
const isHosp = await readContract({
  address: '0xPolicyAddress',
  abi: curancePolicyAbi,
  functionName: 'isHospital',
  args: ['0xYourAddress']
})

// Check policy
const policy = await readContract({
  address: '0xPolicyAddress',
  abi: curancePolicyAbi,
  functionName: 'policies',
  args: ['0xYourCommitment']
})
```

#### Clear Local Storage

If you need to reset policy data:

```javascript
// In browser console
localStorage.removeItem('curance_policy_data')
```

#### Test Multiple Policies

Use different wallets or clear localStorage between tests.

---

### 6. Project Structure Quick Reference

```
curance/
├── docs/                  # All documentation
├── frontend/              # Next.js app (ready to run)
│   ├── app/              # Pages
│   ├── components/ui/    # UI components
│   └── lib/              # Utils, contracts, wagmi
└── contracts/            # Your Hardhat project
```

---

### 7. Next Steps After Setup

1. ✅ Deploy contracts
2. ✅ Configure frontend .env.local
3. ✅ Install frontend dependencies
4. ✅ Start dev server
5. ✅ Test registration flow
6. ✅ Test claim creation
7. ✅ Test claim verification
8. 🎉 Demo ready!

---

### 8. For Production

See `docs/DEPLOYMENT.md` for production deployment guide.

Key changes needed:
- Use real Reclaim Protocol integration
- Deploy to mainnet
- Use real USDC
- Add multi-sig for admin
- Add time-locks
- Security audit

---

## Quick Commands Cheat Sheet

```bash
# Frontend
cd frontend
npm install
npm run dev         # Start dev server
npm run build       # Production build

# Testing
# Use 2 browser windows with different wallets
# Window 1: Wallet A (patient)
# Window 2: Wallet B (hospital)

# Contract interaction (via frontend UI)
# - Register: /register
# - Create claim: /hospital
# - Verify claim: /claim
```

---

## Need Help?

1. Check `docs/` for detailed documentation
2. Review `docs/CONTRACTS_SPEC.md` for contract requirements
3. See `docs/FRONTEND.md` for frontend architecture
4. Read `docs/DEPLOYMENT.md` for deployment steps

---

**You're all set! Deploy your contracts and start the frontend.** 🚀
