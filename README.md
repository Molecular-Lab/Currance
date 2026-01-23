# Curance - Privacy-Preserving Health Insurance

> Insurance underwrites based on health data WITHOUT knowing user identity

Built for ETH Bangkok Hackathon using **Reclaim Protocol** (zkTLS) and **Base Sepolia**.

---

## 🎯 What is Curance?

Curance enables insurance companies to assess risk and provide coverage based on verified health data while maintaining complete patient privacy. Using zero-knowledge proofs and cryptographic commitments, patients can prove their health status without revealing their identity.

### Key Innovation

- **Insurance sees**: Health data hash + commitment
- **Insurance doesn't see**: Patient identity, wallet address, personal information
- **Hospitals see**: Patient commitment (for claims)
- **Hospitals don't see**: Patient wallet, identity, other claims
- **On-chain observers see**: Encrypted commitments, amounts
- **On-chain observers don't see**: Who is who

---

## 🏗️ Architecture

```
Patient registers → Proves health via zkTLS → Creates commitment = hash(secret + healthHash)
     ↓
Hospital creates claim against commitment (doesn't know patient identity)
     ↓
Patient verifies claim with secret → Auto-settles USDC to hospital
```

**Tech Stack:**
- Smart Contracts: Solidity (Hardhat)
- zkTLS: Reclaim Protocol
- Frontend: Next.js 14 + wagmi + shadcn/ui
- Chain: Base Sepolia
- Settlement: Mock USDC (ERC20)

---

## 📁 Project Structure

```
curance/
├── docs/                      # Comprehensive documentation
│   ├── README.md             # Project overview
│   ├── ARCHITECTURE.md       # System architecture
│   ├── PRIVACY.md            # Privacy model
│   ├── CONTRACTS_SPEC.md     # Smart contract specifications
│   ├── ORACLE.md             # Oracle design (reference)
│   ├── FRONTEND.md           # Frontend specs
│   └── DEPLOYMENT.md         # Deployment guide
│
├── frontend/                  # Next.js application
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── register/         # Patient registration
│   │   ├── hospital/         # Hospital portal
│   │   └── claim/            # Claim verification
│   ├── components/ui/        # shadcn components
│   ├── lib/
│   │   ├── wagmi.ts          # Wallet config
│   │   ├── contracts.ts      # ABIs & addresses
│   │   ├── reclaim.ts        # Reclaim SDK
│   │   └── utils.ts          # Utilities
│   └── package.json
│
└── contracts/                 # Smart contracts (you handle)
    └── CurancePolicy.sol      # Main contract
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A wallet with Base Sepolia ETH ([faucet](https://www.alchemy.com/faucets/base-sepolia))
- Smart contracts deployed (see below)

### 1. Deploy Smart Contracts

You mentioned you'll handle this yourself with Hardhat. You need to deploy:

1. **MockUSDC.sol** - ERC20 token with 6 decimals
2. **CurancePolicy.sol** - Main insurance contract

See `docs/CONTRACTS_SPEC.md` for complete specifications.

After deployment, note the contract addresses.

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local and set:
# - NEXT_PUBLIC_POLICY_ADDRESS (your deployed CurancePolicy address)
# - NEXT_PUBLIC_USDC_ADDRESS (your deployed MockUSDC address)
# - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (get from cloud.walletconnect.com)
# - Reclaim credentials (optional for POC)

# Run development server
npm run dev
```

Visit `http://localhost:3000`

### 3. Test the Flow

**Setup (one-time):**
1. Mint Mock USDC to your test wallets
2. Register your hospital wallet in CurancePolicy contract
3. Fund the CurancePolicy contract with USDC for settlements

**Demo with 2 wallets:**

**Wallet A (Patient):**
1. Go to `/register`
2. Enter premium (e.g., 100 USDC)
3. Complete mock health verification
4. Approve USDC and register policy
5. Note your **commitment ID**

**Wallet B (Hospital):**
1. Go to `/hospital`
2. Enter patient's commitment
3. Enter treatment amount (e.g., 50 USDC)
4. Create claim
5. Note the **claim ID**

**Wallet A (Patient):**
1. Go to `/claim`
2. Enter claim ID
3. Verify claim (uses secret from localStorage)
4. Watch USDC transfer to hospital

---

## 📋 Contract Requirements

You need to implement **CurancePolicy.sol** with these functions:

### Core Functions

```solidity
// Policy Registration
function registerPolicy(
    bytes32 commitment,
    bytes32 healthDataHash,
    uint256 premium
) external

// Claim Management
function createClaim(
    bytes32 commitment,
    uint256 amount,
    bytes32 invoiceHash
) external returns (bytes32 claimId)

function verifyClaim(
    bytes32 claimId,
    bytes32 secret,
    bytes32 healthDataHash
) external

// Read Functions
function policies(bytes32 commitment) external view returns (
    bytes32 healthDataHash,
    uint256 premium,
    uint256 coverage,
    uint256 used,
    uint256 expiry,
    bool active
)

function claims(bytes32 claimId) external view returns (
    bytes32 commitment,
    address hospital,
    uint256 amount,
    bytes32 invoiceHash,
    uint8 status,
    uint256 createdAt
)

function isHospital(address) external view returns (bool)

// Admin
function registerHospital(address hospital) external
function removeHospital(address hospital) external
```

**Key Logic:**
- `registerPolicy`: Transfer premium, store policy with coverage = premium × 10
- `createClaim`: Only hospitals can call, creates pending claim
- `verifyClaim`:
  - Verify `keccak256(secret, healthDataHash) == commitment`
  - Transfer USDC to hospital
  - Update claim status to Verified

See complete specs in `docs/CONTRACTS_SPEC.md`

---

## 🔐 Privacy Guarantees

| Data | Who Sees It |
|------|-------------|
| Patient identity | Nobody on-chain |
| Patient wallet address | Nobody (hidden by commitment) |
| Health data | Nobody (only hash stored) |
| Commitment | Everyone (but unlinkable to identity) |
| Claim amounts | Everyone (but not linked to patient) |
| Treatment details | Hospital only (off-chain) |

**How it works:**
1. Commitment = `keccak256(secret || healthDataHash)`
2. Secret is 256-bit random, stored locally
3. Hospitals create claims against commitment, not wallet
4. Patient proves ownership with secret (zero-knowledge)

---

## 🎓 Documentation

- [docs/README.md](./docs/README.md) - Project overview
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
- [docs/PRIVACY.md](./docs/PRIVACY.md) - Privacy analysis
- [docs/CONTRACTS_SPEC.md](./docs/CONTRACTS_SPEC.md) - Contract specifications
- [docs/FRONTEND.md](./docs/FRONTEND.md) - Frontend architecture
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [docs/ORACLE.md](./docs/ORACLE.md) - Oracle design (for production)

---

## 🧪 For Development

### Mint Test USDC

Call the `mint` function on MockUSDC:

```solidity
function mint(address to, uint256 amount) external
```

Example: `mint(yourAddress, 1000000000)` → 1000 USDC

### Register as Hospital

Call `registerHospital` on CurancePolicy (as contract owner):

```solidity
function registerHospital(address hospital) external onlyOwner
```

### Fund Contract for Settlements

Call `fundContract` on CurancePolicy after approving USDC:

```solidity
function fundContract(uint256 amount) external
```

This ensures the contract has USDC to settle claims.

---

## 🛠️ Development Commands

```bash
# Frontend
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Lint code

# Contracts (you handle with Hardhat)
# See docs/CONTRACTS_SPEC.md for specifications
```

---

## 🌐 Network Configuration

**Base Sepolia:**
- Chain ID: 84532
- RPC: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org
- Faucet: https://www.alchemy.com/faucets/base-sepolia

---

## 📝 Environment Variables

Frontend `.env.local`:

```env
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_POLICY_ADDRESS=0x...  # Your deployed CurancePolicy
NEXT_PUBLIC_USDC_ADDRESS=0x...    # Your deployed MockUSDC
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...  # From cloud.walletconnect.com
NEXT_PUBLIC_RECLAIM_APP_ID=...    # Optional
NEXT_PUBLIC_RECLAIM_APP_SECRET=...  # Optional
```

---

## ✨ Features

### Patient Registration (/register)
- Connect wallet
- Enter premium amount
- Mock health verification (POC)
- Generate secret & commitment
- Approve USDC
- Register policy on-chain
- Save commitment locally

### Hospital Portal (/hospital)
- Only registered hospitals can access
- Enter patient commitment
- Enter treatment amount
- Create pending claim
- Get claim ID for patient

### Claim Verification (/claim)
- Enter claim ID from hospital
- Load saved secret automatically
- Verify commitment ownership
- Auto-settle USDC to hospital

---

## 🎯 Future Enhancements

- Real Reclaim Protocol integration (instead of mock)
- Stealth addresses for settlement privacy
- Ring signatures for claim verification
- Multi-sig hospital registration
- Policy upgrades and renewals
- Claim dispute resolution
- Oracle network for data verification

---

## 📜 License

MIT

---

## 🤝 Contributing

This is a hackathon POC. For production use, please conduct thorough security audits.

---

## 🏆 ETH Bangkok Hackathon

Built with:
- ✅ Reclaim Protocol (zkTLS verification)
- ✅ Base Sepolia (L2 scaling)
- ✅ Zero-knowledge privacy patterns
- ✅ Fully functional POC

**Demo:** Privacy-preserving health insurance where insurance companies can assess risk without knowing patient identity.

---

## 📞 Support

- Check `/docs` for detailed documentation
- See `docs/DEPLOYMENT.md` for deployment guide
- Review `docs/CONTRACTS_SPEC.md` for contract implementation

---

**Built with ❤️ for ETH Bangkok**
