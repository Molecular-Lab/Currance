# Curance Protocol

Privacy-preserving crypto-native health insurance using zkTLS.

## What is Curance?

Curance is a decentralized health insurance protocol that separates user identity from health data using zero-knowledge proofs. Insurance companies can underwrite policies based on biological data without knowing who the person is.

## Core Innovation

Traditional insurance links identity to health data. Curance breaks this:

```
Traditional:  Identity + Health Data → Underwriting → Policy tied to Identity
Curance:      Health Data ONLY → Underwriting → Policy tied to Commitment
```

## Key Features

- **Anonymous Underwriting** - Insurance prices risk from health metrics, not identity
- **Privacy-Preserving Claims** - Hospital and insurance never share user data
- **Instant Settlement** - Smart contract pays hospital immediately on verification
- **Dual Proof System** - Both hospital and user must verify for claims

## Documentation

| Document | Description |
|----------|-------------|
| [BUSINESS.md](./BUSINESS.md) | Business model, market, value proposition |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, flows, components |
| [PRIVACY.md](./PRIVACY.md) | Privacy model and trust assumptions |
| [CONTRACTS.md](./CONTRACTS.md) | Smart contract specifications |
| [ORACLE.md](./ORACLE.md) | Oracle service specifications |
| [FRONTEND.md](./FRONTEND.md) | Frontend specifications |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Build, deploy, and test guide |

## Quick Start

```bash
# Build contracts
cd contracts && forge build

# Start oracle
cd oracle && npm run dev

# Start frontend
cd frontend && npm run dev
```

## Tech Stack

- **Chain:** Base L2 (low gas)
- **Contracts:** Solidity + Foundry
- **zkTLS:** Reclaim Protocol (mock for POC)
- **Oracle:** Node.js + Express
- **Frontend:** Next.js + wagmi
- **Settlement:** USDC

## Project Structure

```
curance/
├── contracts/          # Solidity smart contracts
├── oracle/             # Verification oracle service
├── frontend/           # User interface
└── docs/               # Documentation
```

## License

MIT