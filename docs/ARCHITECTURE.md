# System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  Next.js + wagmi + viem                                         │
│  ├── /register    - Buy policy with health proof                │
│  ├── /dashboard   - View policy, claims                         │
│  ├── /claim       - Submit claim verification                   │
│  └── /hospital    - Hospital creates tx_claim                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      ORACLE SERVICE                             │
│  Node.js + Express                                              │
│  ├── Verify zkTLS proofs                                        │
│  ├── Match claims to policies                                   │
│  └── Enable valid claims on-chain                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     SMART CONTRACTS                             │
│  Solidity + Foundry on Base Sepolia                             │
│  ├── CuranceRegistry.sol  - Policy storage                      │
│  ├── CuranceClaims.sol    - Claim state machine                 │
│  └── MockUSDC.sol         - Test token                          │
└─────────────────────────────────────────────────────────────────┘
```

## Sequence Flows

### Registration Flow

```
User              Hospital           Oracle            Contract
 │                   │                  │                  │
 │ 1. Health Check   │                  │                  │
 │ ─────────────────>│                  │                  │
 │                   │                  │                  │
 │ 2. Health Data    │                  │                  │
 │ <─────────────────│                  │                  │
 │                   │                  │                  │
 │ 3. Create zkTLS Proof (proves health data from hospital)       │
 │ ════════════════════════════════════════════════════           │
 │                   │                  │                  │
 │ 4. Submit Proof + Health Metadata   │                  │
 │ ────────────────────────────────────>│                  │
 │                   │                  │                  │
 │                   │  5. Verify Proof │                  │
 │                   │  ═══════════════ │                  │
 │                   │                  │                  │
 │                   │                  │ 6. registerPolicy│
 │                   │                  │ ────────────────>│
 │                   │                  │                  │
 │ 7. Policy Created │                  │                  │
 │ <───────────────────────────────────────────────────────│
```

**Registration Steps:**

1. User visits hospital for health check
2. Hospital provides health data (BP, BMI, blood work)
3. User creates zkTLS proof proving data came from hospital
4. User submits proof + health metadata to Oracle
5. Oracle verifies zkTLS proof authenticity
6. Oracle calls contract to register policy
7. Policy created with commitment hash (no identity stored)

### Claims Flow

```
User              Hospital           Oracle            Contract
 │                   │                  │                  │
 │ 1. Treatment      │                  │                  │
 │ ─────────────────>│                  │                  │
 │                   │                  │                  │
 │                   │ 2a. createClaim (PENDING)          │
 │                   │ ───────────────────────────────────>│
 │                   │                  │                  │
 │ 2b. Invoice Proof │                  │                  │
 │ <─────────────────│ (pass to user)   │                  │
 │                   │                  │                  │
 │ 3. Create Verification Proof        │                  │
 │ ═════════════════════════           │                  │
 │                   │                  │                  │
 │ 4. Submit Verification              │                  │
 │ ────────────────────────────────────>│                  │
 │                   │                  │                  │
 │                   │  5. Verify Both  │                  │
 │                   │  ═══════════════ │                  │
 │                   │                  │                  │
 │                   │                  │ 6. enableClaim   │
 │                   │                  │ ────────────────>│
 │                   │                  │                  │
 │                   │ 7. Settlement (USDC)               │
 │                   │ <──────────────────────────────────│
```

**Claims Steps:**

1. User receives treatment at hospital
2. Hospital does TWO things simultaneously:
   - 2a. Creates `tx_claim` on-chain (PENDING state)
   - 2b. Creates zkTLS invoice proof and **passes to User**
3. User creates verification proof (combines invoice proof + ownership proof)
4. User submits verification to Oracle
5. Oracle verifies both proofs
6. Oracle enables the claim on-chain
7. Contract auto-settles USDC to hospital

## Components

### Smart Contracts

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| CuranceRegistry | Policy storage | `registerPolicy`, `getPolicy`, `deductCoverage` |
| CuranceClaims | Claim processing | `createClaim`, `enableClaim`, `settleClaim` |
| MockUSDC | Test token | `mint`, `transfer` |

### Oracle Service

| Endpoint | Purpose | Called By |
|----------|---------|-----------|
| `POST /api/register` | Verify health proof | Frontend |
| `POST /api/claims/verify` | Verify claim proofs | Frontend |
| `GET /api/claims/:id/status` | Check claim status | Frontend |

### Frontend Pages

| Page | Purpose | User |
|------|---------|------|
| `/register` | Buy policy | Patient |
| `/dashboard` | View policy | Patient |
| `/claim` | Submit verification | Patient |
| `/hospital` | Create claims | Hospital |

## Data Structures

### Policy (On-Chain)

```solidity
struct Policy {
    bytes32 commitment;      // H(secret || healthDataHash)
    bytes32 healthDataHash;  // Hash of health metrics
    uint256 premium;         // Amount paid
    uint256 coverage;        // Total coverage (premium * 10)
    uint256 usedCoverage;    // Amount claimed
    uint256 registeredAt;    // Timestamp
    uint256 expiresAt;       // Expiry timestamp
    bool active;             // Status
}
```

### Claim (On-Chain)

```solidity
struct Claim {
    bytes32 claimId;
    bytes32 policyCommitment;
    address hospital;
    uint256 amount;
    bytes32 invoiceHash;
    ClaimStatus status;      // PENDING → ENABLED → SETTLED
    uint256 createdAt;
    uint256 settledAt;
}
```

### Commitment Scheme

```
commitment = keccak256(secret || healthDataHash)

- secret: 32 bytes, user keeps private
- healthDataHash: Hash of health metrics from hospital
```

User stores `secret` locally. Required to prove policy ownership during claims.

## Claim State Machine

```
                    ┌──────────────────┐
                    │                  │
                    ▼                  │
┌─────────┐    ┌─────────┐    ┌───────┴───┐    ┌──────────┐
│  NONE   │───>│ PENDING │───>│  ENABLED  │───>│ SETTLED  │
└─────────┘    └─────────┘    └───────────┘    └──────────┘
   Create         │                                  
   Claim          │ Verification                     
                  │ Failed                           
                  ▼                                  
              ┌──────────┐                          
              │ REJECTED │                          
              └──────────┘                          
```

| State | Meaning | Next State |
|-------|---------|------------|
| NONE | Claim doesn't exist | PENDING |
| PENDING | Hospital created, waiting for user | ENABLED or REJECTED |
| ENABLED | Oracle approved | SETTLED |
| SETTLED | Funds transferred | Terminal |
| REJECTED | Verification failed | Terminal |

## Technology Choices

| Component | Technology | Reason |
|-----------|------------|--------|
| Chain | Base L2 | Low gas, Coinbase ecosystem |
| Contracts | Solidity + Foundry | Industry standard |
| zkTLS | Reclaim Protocol | Fastest integration |
| Oracle | Node.js + Express | Simple, fast |
| Frontend | Next.js + wagmi | Modern React stack |
| Settlement | USDC | Stable, liquid |