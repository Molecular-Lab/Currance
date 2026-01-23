# Privacy Model

## Core Principle

Curance separates **identity** from **health data** using cryptographic commitments.

```
Traditional Insurance:
┌─────────────────────────────────────────┐
│ Identity + Health Data → Single Record  │
│ Insurer knows: Abdul, 21, Bangkok,      │
│                BP: 120/80, BMI: 22      │
└─────────────────────────────────────────┘

Curance:
┌─────────────────────────────────────────┐
│ Health Data → Anonymous Policy          │
│ Insurer knows: Anonymous Profile #7a3f  │
│                BP: 120/80, BMI: 22      │
│ Insurer does NOT know: Name, location   │
└─────────────────────────────────────────┘
```

## Privacy Matrix

| Data | Hospital | Insurance | On-Chain |
|------|----------|-----------|----------|
| User Real Identity | ✓ Knows | ✗ Hidden | ✗ Hidden |
| Health Metrics | ✓ Knows | ✓ Knows | ✗ Hidden |
| Insurance Status | ✗ Hidden | ✓ Knows | Hash only |
| Treatment Details | ✓ Knows | ✓ Knows | ✗ Hidden |
| Claim History | ✗ Hidden | ✓ Knows | Hash only |
| Policy Balance | ✗ Hidden | ✓ Knows | ✗ Hidden |

## What Each Party Sees

### Hospital Sees
- Patient's real identity (required for treatment)
- Patient's health data
- Treatment provided
- Invoice amount

### Hospital Does NOT See
- Patient's insurance coverage amount
- Patient's claim history
- Whether patient has insurance at all

### Insurance Sees
- Anonymous health metrics for pricing
- Treatment details for claims
- Policy commitment (hash)
- Claim amounts

### Insurance Does NOT See
- Patient's real name
- Patient's location
- Patient's other identifying info

### Blockchain Sees
- Commitment hashes
- Claim IDs
- Settlement amounts
- Timestamps

### Blockchain Does NOT See
- Any personal data
- Health information
- Treatment details

## Commitment Scheme

```
User generates:
  secret = random 32 bytes (kept private)
  
User computes:
  healthDataHash = keccak256(healthMetrics)
  commitment = keccak256(secret || healthDataHash)

On-chain stores:
  commitment (not secret, not healthDataHash)

To prove ownership:
  User reveals secret → verifier computes commitment → matches on-chain
```

### Why This Works

1. **Hiding**: Cannot derive `secret` from `commitment` (hash is one-way)
2. **Binding**: Cannot find different `secret` that produces same `commitment`
3. **Ownership**: Only person with `secret` can prove they own the policy

## Trust Assumptions

### Hospital: Trusted
- Licensed medical entity
- Legal liability for fraud
- No incentive to fake invoices (reputation risk)
- Verified via: Medical license, physical location

### User: Partially Trusted
- Cannot be trusted to self-report health (hence zkTLS)
- Trusted to not share their secret
- Verified via: zkTLS proof of hospital data

### Oracle: Trusted (for now)
- Correctly verifies proofs
- Calls contract honestly
- Verified via: Open source code, audits
- Future: Decentralize with TEE or multi-party

### Smart Contract: Trustless
- Code is law
- Anyone can verify
- Verified via: Audits, formal verification

## zkTLS: How It Works

zkTLS proves that data came from a specific TLS session without revealing the data.

### Registration zkTLS
```
User visits: hospital-portal.com/health-check
Browser creates proof that:
  - Data came from hospital-portal.com (verified TLS cert)
  - Data contains health metrics
  - Data was retrieved on specific date
User submits proof (not raw data) to Oracle
```

### Claims zkTLS
```
Hospital creates proof that:
  - Invoice exists in their system
  - Invoice has specific amount
  - Invoice is for specific treatment
Hospital passes proof to User
User combines with ownership proof
User submits to Oracle
```

## Attack Vectors & Mitigations

### Attack: Identity Inference
**Threat**: Insurance infers identity from health data patterns
**Mitigation**: 
- Only aggregate health metrics shared, not detailed records
- No location data, no timestamps that could identify

### Attack: Sybil Registration
**Threat**: User registers multiple policies with same health data
**Mitigation**:
- One-time health proof (commitment prevents reuse)
- Time-bound proofs (health check must be recent)

### Attack: Proof Replay
**Threat**: User reuses old health proof
**Mitigation**:
- Timestamp in zkTLS proof
- Oracle checks proof freshness

### Attack: Hospital Collusion
**Threat**: Hospital creates fake invoices
**Mitigation**:
- Hospital is licensed, regulated entity
- Reputation and legal risk
- Audit trail on-chain

### Attack: Oracle Manipulation
**Threat**: Oracle approves fraudulent claims
**Mitigation** (current): 
- Trusted operator (Curance team)
- Open source verification logic
**Mitigation** (future):
- TEE-based oracle (Intel SGX)
- Multi-party oracle network
- Optimistic verification with challenges

## Privacy Limitations

### What Curance CANNOT Hide

1. **Treatment Details**: Insurance needs to know what was treated to verify coverage
2. **Claim Amounts**: Required for payment
3. **Hospital Identity**: Settlement goes to hospital address

### Why These Are Acceptable

- Treatment details stay off-chain (only in Oracle)
- Insurer still doesn't know WHO got treatment
- Hospital identity is public anyway

## Comparison with Traditional Insurance

| Aspect | Traditional | Curance |
|--------|-------------|---------|
| Application | Full KYC, medical history | Health metrics only |
| Underwriting | Identity-based pricing | Anonymous metrics pricing |
| Claims | Paper forms, manual review | Cryptographic proofs |
| Settlement | 7-30 days | Minutes |
| Data Exposure | Full profile to insurer | Minimal data |

## Future Privacy Enhancements

### Range Proofs
Instead of revealing exact values:
```
Current: BP = 120/80
Future:  Prove: "BP is in healthy range" (no exact value)
```

### Nullifier-Based Claims
Prevent linkability between claims:
```
Current: Same commitment for all claims (linkable)
Future:  Different nullifier per claim (unlinkable)
```

### Full ZK Underwriting
```
Current: Health data visible to Oracle
Future:  ZK proof that "health data meets criteria"
         Oracle never sees actual values
```