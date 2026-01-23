# Curance System Architecture

## Complete zkTLS Integration with Primus Labs

---

## 1. High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                              CURANCE PROTOCOL ARCHITECTURE                               │
│                         Privacy-Preserving Health Insurance                              │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              PRESENTATION LAYER                                  │    │
│  │                                                                                  │    │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │    │
│  │   │  /register   │  │  /dashboard  │  │  /hospital   │  │   /claim     │       │    │
│  │   │              │  │              │  │              │  │              │       │    │
│  │   │ Buy Policy   │  │ View Status  │  │ Create Claim │  │ Verify Claim │       │    │
│  │   │ + zkTLS      │  │ + Coverage   │  │ + Invoice    │  │ + Settlement │       │    │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │    │
│  │                                                                                  │    │
│  │   Technology: Next.js 14 + React + wagmi + viem + TailwindCSS                   │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                           │                                              │
│                                           │ HTTP/WebSocket                               │
│                                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              ZKTLS ATTESTATION LAYER                             │    │
│  │                                                                                  │    │
│  │   ┌─────────────────────────────────────────────────────────────────────────┐   │    │
│  │   │                         PRIMUS NETWORK                                   │   │    │
│  │   │                                                                          │   │    │
│  │   │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                    │   │    │
│  │   │  │  Attestor 1 │   │  Attestor 2 │   │  Attestor N │                    │   │    │
│  │   │  │   (Node)    │   │   (Node)    │   │   (Node)    │                    │   │    │
│  │   │  │             │   │             │   │             │                    │   │    │
│  │   │  │ TLS Witness │   │ TLS Witness │   │ TLS Witness │                    │   │    │
│  │   │  │ ECDSA Sign  │   │ ECDSA Sign  │   │ ECDSA Sign  │                    │   │    │
│  │   │  └─────────────┘   └─────────────┘   └─────────────┘                    │   │    │
│  │   │                                                                          │   │    │
│  │   │  Technology: Distributed Attestor Network + MPC-TLS / Proxy-TLS         │   │    │
│  │   └─────────────────────────────────────────────────────────────────────────┘   │    │
│  │                                                                                  │    │
│  │   SDK: @primuslabs/network-js-sdk (Frontend)                                    │    │
│  │        @primuslabs/network-core-sdk (Backend)                                   │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                           │                                              │
│                                           │ Signed Attestations                          │
│                                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              VERIFICATION LAYER                                  │    │
│  │                                                                                  │    │
│  │   ┌─────────────────────────────────────────────────────────────────────────┐   │    │
│  │   │                         CURANCE ORACLE                                   │   │    │
│  │   │                                                                          │   │    │
│  │   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │   │    │
│  │   │  │ POST /register  │  │ POST /verify    │  │ GET /claims     │         │   │    │
│  │   │  │                 │  │                 │  │                 │         │   │    │
│  │   │  │ Verify Health   │  │ Verify Invoice  │  │ Query Status    │         │   │    │
│  │   │  │ Attestation     │  │ + Ownership     │  │                 │         │   │    │
│  │   │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │   │    │
│  │   │                                                                          │   │    │
│  │   │  Technology: Node.js + Express + viem                                    │   │    │
│  │   └─────────────────────────────────────────────────────────────────────────┘   │    │
│  │                                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                           │                                              │
│                                           │ Contract Calls (viem)                        │
│                                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              BLOCKCHAIN LAYER                                    │    │
│  │                                                                                  │    │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │    │
│  │   │ CuranceRegistry │  │  CuranceClaims  │  │    MockUSDC     │                │    │
│  │   │                 │  │                 │  │                 │                │    │
│  │   │ registerPolicy  │  │ createClaim     │  │ transfer        │                │    │
│  │   │ getPolicy       │  │ enableClaim     │  │ approve         │                │    │
│  │   │ isPolicyValid   │  │ rejectClaim     │  │ balanceOf       │                │    │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘                │    │
│  │                                                                                  │    │
│  │   Network: Base Sepolia (Chain ID: 84532)                                       │    │
│  │   Technology: Solidity + Foundry                                                │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. zkTLS Attestation Flow

### 2.1 How Primus zkTLS Works

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                              PRIMUS ZKTLS ATTESTATION FLOW                              │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  USER BROWSER                     PRIMUS NETWORK                   DATA SOURCE          │
│  ════════════                     ══════════════                   ═══════════          │
│                                                                                          │
│  ┌─────────────────┐                                          ┌─────────────────┐       │
│  │                 │                                          │                 │       │
│  │  Curance DApp   │                                          │ Hospital Portal │       │
│  │                 │                                          │    (HTTPS)      │       │
│  │  + Primus       │                                          │                 │       │
│  │    Extension    │                                          │  /api/health    │       │
│  │                 │                                          │  /api/invoice   │       │
│  └────────┬────────┘                                          └────────┬────────┘       │
│           │                                                            │                │
│           │ 1. User triggers attestation                               │                │
│           │    PrimusNetwork.attest({templateId})                      │                │
│           │                                                            │                │
│           ▼                                                            │                │
│  ┌─────────────────────────────────────────────────────────────────────┼───────────┐    │
│  │                                                                     │           │    │
│  │  ┌──────────────────────────────────────────────────────────────────▼────────┐ │    │
│  │  │                                                                           │ │    │
│  │  │  2. PRIMUS EXTENSION intercepts TLS handshake                             │ │    │
│  │  │                                                                           │ │    │
│  │  │     ┌───────────────────────────────────────────────────────────────┐    │ │    │
│  │  │     │  TLS Session Establishment                                     │    │ │    │
│  │  │     │                                                                │    │ │    │
│  │  │     │  Browser ←──── TLS Handshake ────► Hospital Server            │    │ │    │
│  │  │     │          │                    │                                │    │ │    │
│  │  │     │          │   Certificate      │                                │    │ │    │
│  │  │     │          │   Validation       │                                │    │ │    │
│  │  │     │          │                    │                                │    │ │    │
│  │  │     │          ▼                    ▼                                │    │ │    │
│  │  │     │   ┌─────────────────────────────────────┐                     │    │ │    │
│  │  │     │   │  Session Keys Derived (shared)      │                     │    │ │    │
│  │  │     │   └─────────────────────────────────────┘                     │    │ │    │
│  │  │     └───────────────────────────────────────────────────────────────┘    │ │    │
│  │  │                                                                           │ │    │
│  │  └───────────────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                                 │    │
│  │  ┌───────────────────────────────────────────────────────────────────────────┐ │    │
│  │  │                                                                           │ │    │
│  │  │  3. ATTESTOR NETWORK witnesses the session                                │ │    │
│  │  │                                                                           │ │    │
│  │  │     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │ │    │
│  │  │     │  Attestor 1 │    │  Attestor 2 │    │  Attestor 3 │                │ │    │
│  │  │     │             │    │             │    │             │                │ │    │
│  │  │     │  Witnesses: │    │  Witnesses: │    │  Witnesses: │                │ │    │
│  │  │     │  - TLS cert │    │  - TLS cert │    │  - TLS cert │                │ │    │
│  │  │     │  - Response │    │  - Response │    │  - Response │                │ │    │
│  │  │     │  - Timestamp│    │  - Timestamp│    │  - Timestamp│                │ │    │
│  │  │     │             │    │             │    │             │                │ │    │
│  │  │     │  Signs with │    │  Signs with │    │  Signs with │                │ │    │
│  │  │     │  ECDSA key  │    │  ECDSA key  │    │  ECDSA key  │                │ │    │
│  │  │     └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                │ │    │
│  │  │            │                  │                  │                        │ │    │
│  │  │            └──────────────────┼──────────────────┘                        │ │    │
│  │  │                               │                                           │ │    │
│  │  │                               ▼                                           │ │    │
│  │  │     ┌─────────────────────────────────────────────────────────────────┐  │ │    │
│  │  │     │                    ATTESTATION OBJECT                            │  │ │    │
│  │  │     │                                                                  │  │ │    │
│  │  │     │  {                                                               │  │ │    │
│  │  │     │    recipient: "0xUser...",                                       │  │ │    │
│  │  │     │    request: { url, method, headers },                            │  │ │    │
│  │  │     │    data: '{"healthScore": 92, "bmi": "22.5"}',                   │  │ │    │
│  │  │     │    timestamp: 1706054400000,                                     │  │ │    │
│  │  │     │    attestors: [{ addr: "0xAtt1...", url: "..." }, ...],         │  │ │    │
│  │  │     │    signatures: ["0xSig1...", "0xSig2...", "0xSig3..."]          │  │ │    │
│  │  │     │  }                                                               │  │ │    │
│  │  │     └─────────────────────────────────────────────────────────────────┘  │ │    │
│  │  │                                                                           │ │    │
│  │  └───────────────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                                 │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│           │                                                                              │
│           │ 4. Attestation returned to DApp                                             │
│           ▼                                                                              │
│  ┌─────────────────┐                                                                    │
│  │                 │                                                                    │
│  │  Curance DApp   │  5. Sends attestation to Oracle for verification                  │
│  │                 │     POST /api/register { attestation }                             │
│  │                 │                                                                    │
│  └─────────────────┘                                                                    │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Attestation Verification (Oracle)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                           ORACLE ATTESTATION VERIFICATION                                │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  INPUT: PrimusAttestation                                                               │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  {                                                                                 │  │
│  │    recipient: "0xUser123...",                                                      │  │
│  │    request: { url: "https://hospital.com/api/health", ... },                       │  │
│  │    data: '{"healthScore": 92, "bmi": "22.5", "bp": "120/80"}',                    │  │
│  │    timestamp: 1706054400000,                                                       │  │
│  │    attestors: [                                                                    │  │
│  │      { attestorAddr: "0xAtt1...", url: "https://att1.primus.xyz" },               │  │
│  │      { attestorAddr: "0xAtt2...", url: "https://att2.primus.xyz" }                │  │
│  │    ],                                                                              │  │
│  │    signatures: ["0xSig1...", "0xSig2..."]                                         │  │
│  │  }                                                                                 │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│                                         │                                                │
│                                         ▼                                                │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 1: Encode Attestation Data                                                   │  │
│  │                                                                                    │  │
│  │  messageHash = keccak256(                                                          │  │
│  │    encodePacked(                                                                   │  │
│  │      recipient,           // address                                               │  │
│  │      requestHash,         // keccak256(url + header + method + body)              │  │
│  │      responseHash,        // keccak256(responseResolve array)                     │  │
│  │      data,                // string                                                │  │
│  │      attConditions,       // string                                                │  │
│  │      timestamp,           // uint256                                               │  │
│  │      additionParams       // string                                                │  │
│  │    )                                                                               │  │
│  │  )                                                                                 │  │
│  │                                                                                    │  │
│  │  Result: messageHash = 0x7a8b9c...                                                │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│                                         │                                                │
│                                         ▼                                                │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 2: Recover Signers from Signatures                                           │  │
│  │                                                                                    │  │
│  │  For each signature in attestation.signatures:                                     │  │
│  │                                                                                    │  │
│  │    ┌─────────────────────────────────────────────────────────────────────────┐   │  │
│  │    │  signature[0] = "0xSig1..."                                              │   │  │
│  │    │                                                                          │   │  │
│  │    │  recoveredAddress = ecrecover(                                           │   │  │
│  │    │    messageHash,                                                          │   │  │
│  │    │    v,               // Recovery ID (27 or 28)                            │   │  │
│  │    │    r,               // First 32 bytes of signature                       │   │  │
│  │    │    s                // Next 32 bytes of signature                        │   │  │
│  │    │  )                                                                       │   │  │
│  │    │                                                                          │   │  │
│  │    │  Result: recoveredAddress = "0xAtt1..."                                  │   │  │
│  │    └─────────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                                    │  │
│  │    ┌─────────────────────────────────────────────────────────────────────────┐   │  │
│  │    │  signature[1] = "0xSig2..."                                              │   │  │
│  │    │                                                                          │   │  │
│  │    │  recoveredAddress = ecrecover(messageHash, v, r, s)                      │   │  │
│  │    │                                                                          │   │  │
│  │    │  Result: recoveredAddress = "0xAtt2..."                                  │   │  │
│  │    └─────────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│                                         │                                                │
│                                         ▼                                                │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 3: Validate Against Trusted Attestors                                        │  │
│  │                                                                                    │  │
│  │  TRUSTED_ATTESTORS = Set([                                                         │  │
│  │    "0xAtt1...",   // Official Primus Attestor 1                                   │  │
│  │    "0xAtt2...",   // Official Primus Attestor 2                                   │  │
│  │    "0xAtt3...",   // Official Primus Attestor 3                                   │  │
│  │  ])                                                                                │  │
│  │                                                                                    │  │
│  │  verifiedAttestors = []                                                            │  │
│  │                                                                                    │  │
│  │  for each recoveredAddress:                                                        │  │
│  │    if TRUSTED_ATTESTORS.has(recoveredAddress):                                     │  │
│  │      verifiedAttestors.push(recoveredAddress)                                      │  │
│  │                                                                                    │  │
│  │  if verifiedAttestors.length === 0:                                                │  │
│  │    return { valid: false, error: "No valid attestor signatures" }                 │  │
│  │                                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│                                         │                                                │
│                                         ▼                                                │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 4: Additional Validations                                                    │  │
│  │                                                                                    │  │
│  │  ✓ Check timestamp is not in the future                                           │  │
│  │  ✓ Check attestation hasn't expired (24h validity)                                │  │
│  │  ✓ Parse and validate data structure                                              │  │
│  │  ✓ Health score in valid range (0-100)                                            │  │
│  │                                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│                                         │                                                │
│                                         ▼                                                │
│                                                                                          │
│  OUTPUT: VerificationResult                                                             │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  {                                                                                 │  │
│  │    valid: true,                                                                    │  │
│  │    recipient: "0xUser123...",                                                      │  │
│  │    data: { healthScore: 92, bmi: "22.5", bp: "120/80" },                          │  │
│  │    timestamp: 1706054400000,                                                       │  │
│  │    attestors: ["0xAtt1...", "0xAtt2..."]                                          │  │
│  │  }                                                                                 │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Flow Diagrams

### 3.1 Policy Registration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                              POLICY REGISTRATION FLOW                                    │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  PATIENT                HOSPITAL              PRIMUS              ORACLE         CHAIN   │
│  ═══════                ════════              ══════              ══════         ═════   │
│     │                      │                    │                   │              │     │
│     │  1. Health Checkup   │                    │                   │              │     │
│     │─────────────────────>│                    │                   │              │     │
│     │                      │                    │                   │              │     │
│     │  2. Health Data      │                    │                   │              │     │
│     │<─────────────────────│                    │                   │              │     │
│     │     (JSON response)  │                    │                   │              │     │
│     │                      │                    │                   │              │     │
│     │                                                                              │     │
│     │  3. Open Curance /register                                                   │     │
│     │     Enter premium amount                                                     │     │
│     │                                                                              │     │
│     │  4. Click "Verify Health"                                                    │     │
│     │     primusService.generateHealthAttestation()                                │     │
│     │                      │                    │                   │              │     │
│     │  5. PrimusNetwork.submitTask({templateId, address})          │              │     │
│     │──────────────────────────────────────────>│                   │              │     │
│     │                      │                    │                   │              │     │
│     │  6. PrimusNetwork.attest()               │                   │              │     │
│     │──────────────────────────────────────────>│                   │              │     │
│     │                      │                    │                   │              │     │
│     │                      │  7. Attestors      │                   │              │     │
│     │                      │     witness TLS    │                   │              │     │
│     │                      │<═══════════════════│                   │              │     │
│     │                      │                    │                   │              │     │
│     │  8. Signed Attestation returned          │                   │              │     │
│     │<─────────────────────────────────────────│                   │              │     │
│     │                      │                    │                   │              │     │
│     │  9. Generate commitment = H(secret || healthDataHash)        │              │     │
│     │                      │                    │                   │              │     │
│     │  10. POST /api/register { commitment, attestation }          │              │     │
│     │─────────────────────────────────────────────────────────────>│              │     │
│     │                      │                    │                   │              │     │
│     │                      │                    │  11. Verify       │              │     │
│     │                      │                    │      attestation  │              │     │
│     │                      │                    │      signatures   │              │     │
│     │                      │                    │                   │              │     │
│     │  12. { success: true, verified: true }                       │              │     │
│     │<─────────────────────────────────────────────────────────────│              │     │
│     │                      │                    │                   │              │     │
│     │  13. Approve USDC spending                                                   │     │
│     │     usdc.approve(registry, premium)                                          │     │
│     │───────────────────────────────────────────────────────────────────────────────>   │
│     │                      │                    │                   │              │     │
│     │  14. Register policy on-chain                                                │     │
│     │     registry.registerPolicy(commitment, healthDataHash, premium)             │     │
│     │───────────────────────────────────────────────────────────────────────────────>   │
│     │                      │                    │                   │              │     │
│     │  15. PolicyRegistered event                                                  │     │
│     │<───────────────────────────────────────────────────────────────────────────────   │
│     │                      │                    │                   │              │     │
│     │  16. Save secret + commitment to localStorage                │              │     │
│     │                      │                    │                   │              │     │
│     ▼                      ▼                    ▼                   ▼              ▼     │
│                                                                                          │
│  RESULT: Policy created on-chain with:                                                  │
│          - commitment (privacy-preserving identifier)                                   │
│          - healthDataHash (verifiable health metrics)                                   │
│          - coverage = premium * 10                                                      │
│          - expiry = now + 1 year                                                        │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Claims Settlement Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                              CLAIMS SETTLEMENT FLOW                                      │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  PATIENT                HOSPITAL              PRIMUS              ORACLE         CHAIN   │
│  ═══════                ════════              ══════              ══════         ═════   │
│     │                      │                    │                   │              │     │
│     │  1. Receive Treatment│                    │                   │              │     │
│     │─────────────────────>│                    │                   │              │     │
│     │                      │                    │                   │              │     │
│     │                      │  2. Create claim on-chain                             │     │
│     │                      │     claims.createClaim(commitment, amount, invoiceHash)    │
│     │                      │────────────────────────────────────────────────────────>   │
│     │                      │                    │                   │              │     │
│     │                      │  3. ClaimCreated event (claimId)                      │     │
│     │                      │<────────────────────────────────────────────────────────   │
│     │                      │                    │                   │              │     │
│     │  4. Hospital gives claimId to patient (off-chain)            │              │     │
│     │<─────────────────────│                    │                   │              │     │
│     │                      │                    │                   │              │     │
│     │  5. Patient opens Curance /claim                             │              │     │
│     │     Enters claimId                                           │              │     │
│     │                      │                    │                   │              │     │
│     │  6. Load claim from chain                                                    │     │
│     │     claims.getClaim(claimId)                                                 │     │
│     │───────────────────────────────────────────────────────────────────────────────>   │
│     │                      │                    │                   │              │     │
│     │  7. Claim data returned (status: PENDING)                                    │     │
│     │<───────────────────────────────────────────────────────────────────────────────   │
│     │                      │                    │                   │              │     │
│     │  8. Click "Verify Claim"                                     │              │     │
│     │     primusService.generateInvoiceAttestation()               │              │     │
│     │                      │                    │                   │              │     │
│     │  9. Generate invoice zkTLS proof         │                   │              │     │
│     │──────────────────────────────────────────>│                   │              │     │
│     │                      │                    │                   │              │     │
│     │                      │  10. Attestors     │                   │              │     │
│     │                      │      witness TLS   │                   │              │     │
│     │                      │<═══════════════════│                   │              │     │
│     │                      │                    │                   │              │     │
│     │  11. Invoice attestation returned        │                   │              │     │
│     │<─────────────────────────────────────────│                   │              │     │
│     │                      │                    │                   │              │     │
│     │  12. POST /api/claims/verify                                 │              │     │
│     │      { claimId, invoiceAttestation, ownershipProof }         │              │     │
│     │─────────────────────────────────────────────────────────────>│              │     │
│     │                      │                    │                   │              │     │
│     │                      │                    │  13. Verify       │              │     │
│     │                      │                    │      invoice      │              │     │
│     │                      │                    │      attestation  │              │     │
│     │                      │                    │                   │              │     │
│     │                      │                    │  14. Verify       │              │     │
│     │                      │                    │      ownership    │              │     │
│     │                      │                    │      (commitment) │              │     │
│     │                      │                    │                   │              │     │
│     │                      │                    │  15. claims.enableClaim(claimId) │     │
│     │                      │                    │                   │──────────────>     │
│     │                      │                    │                   │              │     │
│     │                      │                    │                   │  16. Auto-   │     │
│     │                      │                    │                   │      settle  │     │
│     │                      │                    │                   │      USDC    │     │
│     │                      │<──────────────────────────────────────────────────────     │
│     │                      │  17. USDC received │                   │              │     │
│     │                      │                    │                   │              │     │
│     │  18. { success: true, status: SETTLED }                      │              │     │
│     │<─────────────────────────────────────────────────────────────│              │     │
│     │                      │                    │                   │              │     │
│     ▼                      ▼                    ▼                   ▼              ▼     │
│                                                                                          │
│  RESULT: Claim settled                                                                  │
│          - Hospital received USDC payment                                               │
│          - Policy coverage reduced by claim amount                                      │
│          - Claim status: SETTLED                                                        │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                                    DATA FLOW DIAGRAM                                     │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              USER BROWSER                                        │   │
│   │                                                                                  │   │
│   │  ┌──────────────────────────────────────────────────────────────────────────┐  │   │
│   │  │                         LOCAL STORAGE                                     │  │   │
│   │  │                                                                           │  │   │
│   │  │  policyData = {                                                           │  │   │
│   │  │    secret: "0x7a8b9c...",        ← Random 32 bytes (NEVER leaves browser) │  │   │
│   │  │    commitment: "0xabc123...",    ← H(secret || healthDataHash)            │  │   │
│   │  │    healthDataHash: "0xdef456...",← H(health metrics)                      │  │   │
│   │  │    registeredAt: 1706054400000                                            │  │   │
│   │  │  }                                                                        │  │   │
│   │  └──────────────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                              │
│                                           │                                              │
│        ┌──────────────────────────────────┼───────────────────────────────────┐         │
│        │                                  │                                    │         │
│        ▼                                  ▼                                    ▼         │
│                                                                                          │
│   ┌─────────────┐                 ┌─────────────┐                   ┌─────────────┐     │
│   │   PRIMUS    │                 │   ORACLE    │                   │   CHAIN     │     │
│   │   NETWORK   │                 │   SERVICE   │                   │  CONTRACTS  │     │
│   └─────────────┘                 └─────────────┘                   └─────────────┘     │
│                                                                                          │
│   RECEIVES:                       RECEIVES:                         STORES:              │
│   ─────────                       ─────────                         ───────              │
│   • Template ID                   • Attestation                     • commitment         │
│   • User address                  • commitment                      • healthDataHash     │
│   • Session data                  • healthDataHash                  • premium            │
│                                   • ownershipProof                  • coverage           │
│   RETURNS:                                                          • usedCoverage       │
│   ────────                        RETURNS:                          • claims[]           │
│   • Signed attestation            ────────                                               │
│   • Extracted data                • Verification result             DOES NOT STORE:     │
│   • Attestor signatures           • TX hash (if claim)              ───────────────     │
│                                                                     • secret             │
│   NEVER SEES:                     NEVER SEES:                       • health data        │
│   ──────────                      ──────────                        • patient identity   │
│   • User identity                 • secret                          • invoice details    │
│   • Raw health data               • Raw health data                                      │
│     (only extracted fields)       • Patient identity                                     │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                            COMPONENT INTERACTION DIAGRAM                                 │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│                                                                                          │
│   FRONTEND COMPONENTS                                                                    │
│   ══════════════════                                                                    │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                  │   │
│   │   /register/page.tsx                      /claim/page.tsx                       │   │
│   │          │                                       │                               │   │
│   │          │                                       │                               │   │
│   │          ▼                                       ▼                               │   │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐  │   │
│   │   │                          lib/primus.ts                                   │  │   │
│   │   │                                                                          │  │   │
│   │   │  primusService                                                           │  │   │
│   │   │    ├─ initialize(provider)                                               │  │   │
│   │   │    ├─ generateHealthAttestation(address) ──► PrimusNetwork.attest()     │  │   │
│   │   │    ├─ generateInvoiceAttestation(address) ──► PrimusNetwork.attest()    │  │   │
│   │   │    ├─ generateHealthDataHash(data)                                       │  │   │
│   │   │    └─ generateInvoiceHash(data)                                          │  │   │
│   │   │                                                                          │  │   │
│   │   │  Mock generators (development)                                           │  │   │
│   │   │    ├─ generateMockHealthAttestation()                                    │  │   │
│   │   │    └─ generateMockInvoiceAttestation()                                   │  │   │
│   │   └─────────────────────────────────────────────────────────────────────────┘  │   │
│   │                          │                                                      │   │
│   │                          ▼                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐  │   │
│   │   │                           lib/api.ts                                     │  │   │
│   │   │                                                                          │  │   │
│   │   │  registerWithOracle({ commitment, healthDataHash, attestation })        │  │   │
│   │   │    └──► POST /api/register                                               │  │   │
│   │   │                                                                          │  │   │
│   │   │  verifyClaimWithOracle({ claimId, invoiceAttestation, ownershipProof }) │  │   │
│   │   │    └──► POST /api/claims/verify                                          │  │   │
│   │   └─────────────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                              │
│                                           │ HTTP                                         │
│                                           ▼                                              │
│                                                                                          │
│   ORACLE COMPONENTS                                                                      │
│   ═════════════════                                                                     │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                  │   │
│   │   routes/register.ts                    routes/claims.ts                        │   │
│   │          │                                     │                                 │   │
│   │          ▼                                     ▼                                 │   │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐  │   │
│   │   │                       services/primus.ts                                 │  │   │
│   │   │                                                                          │  │   │
│   │   │  verifyPrimusAttestation(attestation)                                    │  │   │
│   │   │    ├─ encodeAttestation() ──► messageHash                               │  │   │
│   │   │    ├─ recoverSigner(messageHash, sig) ──► attestorAddress               │  │   │
│   │   │    ├─ isTrustedAttestor(address) ──► boolean                            │  │   │
│   │   │    └─ return { valid, data, attestors }                                  │  │   │
│   │   │                                                                          │  │   │
│   │   │  verifyHealthAttestation(attestation)                                    │  │   │
│   │   │  verifyInvoiceAttestation(attestation)                                   │  │   │
│   │   │  verifyOwnershipProof(secret, hash, commitment)                          │  │   │
│   │   └─────────────────────────────────────────────────────────────────────────┘  │   │
│   │                          │                                                      │   │
│   │                          ▼                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐  │   │
│   │   │                      services/contract.ts                                │  │   │
│   │   │                                                                          │  │   │
│   │   │  walletClient (Oracle's private key)                                     │  │   │
│   │   │    ├─ enableClaim(claimId) ──► CuranceClaims.enableClaim()              │  │   │
│   │   │    └─ rejectClaim(claimId, reason) ──► CuranceClaims.rejectClaim()      │  │   │
│   │   │                                                                          │  │   │
│   │   │  publicClient (read-only)                                                │  │   │
│   │   │    ├─ getClaim(claimId)                                                  │  │   │
│   │   │    ├─ getClaimStatus(claimId)                                            │  │   │
│   │   │    ├─ isPolicyValid(commitment)                                          │  │   │
│   │   │    └─ getPolicy(commitment)                                              │  │   │
│   │   └─────────────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                              │
│                                           │ viem RPC                                     │
│                                           ▼                                              │
│                                                                                          │
│   BLOCKCHAIN CONTRACTS                                                                   │
│   ════════════════════                                                                  │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                  │   │
│   │   CuranceRegistry.sol                   CuranceClaims.sol                       │   │
│   │   ───────────────────                   ──────────────────                       │   │
│   │                                                                                  │   │
│   │   registerPolicy(                       createClaim(                            │   │
│   │     commitment,                           commitment,                           │   │
│   │     healthDataHash,                       amount,                               │   │
│   │     premium                               invoiceHash                           │   │
│   │   )                                     ) → claimId                             │   │
│   │                                                                                  │   │
│   │   getPolicy(commitment)                 enableClaim(claimId)                    │   │
│   │     → Policy struct                       → auto-transfers USDC                 │   │
│   │                                                                                  │   │
│   │   isPolicyValid(commitment)             rejectClaim(claimId, reason)            │   │
│   │     → bool                                                                       │   │
│   │                                         getClaim(claimId)                        │   │
│   │   deductCoverage(commitment, amount)      → Claim struct                        │   │
│   │                                                                                  │   │
│   │                                         getClaimStatus(claimId)                  │   │
│   │                                           → ClaimStatus enum                    │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Model

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                                    SECURITY MODEL                                        │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  TRUST ASSUMPTIONS                                                                       │
│  ════════════════                                                                       │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │   ENTITY              TRUST LEVEL        VERIFICATION METHOD                    │   │
│  │   ──────              ───────────        ───────────────────                    │   │
│  │                                                                                  │   │
│  │   Hospital            TRUSTED            Licensed medical entity                │   │
│  │                                          Legal liability for fraud              │   │
│  │                                          Physical location verification         │   │
│  │                                                                                  │   │
│  │   Primus Attestors    TRUSTED            Known addresses (whitelist)            │   │
│  │                                          ECDSA signature verification           │   │
│  │                                          Decentralized network (no SPOF)        │   │
│  │                                                                                  │   │
│  │   Oracle              SEMI-TRUSTED       Open-source verification logic         │   │
│  │                                          Only calls enableClaim on valid proof  │   │
│  │                                          Future: TEE / multi-party oracle       │   │
│  │                                                                                  │   │
│  │   Smart Contracts     TRUSTLESS          Immutable code on-chain               │   │
│  │                                          Auditable by anyone                    │   │
│  │                                          No admin backdoors                     │   │
│  │                                                                                  │   │
│  │   Patient             UNTRUSTED          Must provide zkTLS proof               │   │
│  │                                          Cannot self-report health data         │   │
│  │                                          Must prove policy ownership            │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│                                                                                          │
│  PRIVACY GUARANTEES                                                                      │
│  ══════════════════                                                                     │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │                        HOSPITAL    ORACLE    CHAIN     INSURER                  │   │
│  │   DATA                 ────────    ──────    ─────     ───────                  │   │
│  │                                                                                  │   │
│  │   Patient Identity        ✓          ✗        ✗          ✗                      │   │
│  │   Health Metrics          ✓          ✓*       ✗          ✓*                     │   │
│  │   Treatment Details       ✓          ✓*       ✗          ✓*                     │   │
│  │   Commitment Hash         ✗          ✓        ✓          ✓                      │   │
│  │   Secret                  ✗          ✗**      ✗          ✗                      │   │
│  │   Policy Balance          ✗          ✓        ✓          ✓                      │   │
│  │   Claim Amounts           ✓          ✓        ✓          ✓                      │   │
│  │                                                                                  │   │
│  │   * Only extracted fields from attestation, not raw data                        │   │
│  │   ** Secret passed for verification but not stored                              │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│                                                                                          │
│  CRYPTOGRAPHIC PRIMITIVES                                                               │
│  ════════════════════════                                                               │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │   PRIMITIVE              USAGE                      SECURITY PROPERTY            │   │
│  │   ─────────              ─────                      ─────────────────            │   │
│  │                                                                                  │   │
│  │   keccak256              Commitment generation      Collision resistance        │   │
│  │                          Data hashing               Pre-image resistance        │   │
│  │                                                                                  │   │
│  │   ECDSA secp256k1        Attestor signatures        Unforgeable signatures      │   │
│  │                          Address recovery            Known signer verification  │   │
│  │                                                                                  │   │
│  │   TLS 1.3                Data source auth           Server authentication       │   │
│  │                          Transport encryption        Data integrity             │   │
│  │                                                                                  │   │
│  │   Commitment Scheme      Identity hiding            Hiding: H(x) reveals nothing│   │
│  │   H(secret || data)      Ownership proof            Binding: Can't find x' != x │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                              DEPLOYMENT ARCHITECTURE                                     │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│                                                                                          │
│   DEVELOPMENT ENVIRONMENT                                                               │
│   ═══════════════════════                                                               │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                  │   │
│   │   localhost:3000              localhost:3001              Base Sepolia          │   │
│   │   ──────────────              ──────────────              ────────────          │   │
│   │                                                                                  │   │
│   │   ┌────────────┐              ┌────────────┐              ┌────────────┐        │   │
│   │   │  Frontend  │───HTTP───────│   Oracle   │───RPC────────│  Contracts │        │   │
│   │   │  (Next.js) │              │  (Express) │              │ (Solidity) │        │   │
│   │   └────────────┘              └────────────┘              └────────────┘        │   │
│   │        │                           │                                             │   │
│   │        │                           │                                             │   │
│   │        └─────────── Mock Mode ─────┘                                             │   │
│   │                  (No Primus Extension needed)                                    │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│                                                                                          │
│   PRODUCTION ENVIRONMENT                                                                │
│   ══════════════════════                                                                │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                  │   │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐  │   │
│   │   │                            CLOUDFLARE                                    │  │   │
│   │   │                         (CDN + DDoS Protection)                          │  │   │
│   │   └─────────────────────────────────────────────────────────────────────────┘  │   │
│   │                                    │                                            │   │
│   │                    ┌───────────────┼───────────────┐                           │   │
│   │                    │               │               │                           │   │
│   │                    ▼               ▼               ▼                           │   │
│   │                                                                                  │   │
│   │   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐       │   │
│   │   │                    │  │                    │  │                    │       │   │
│   │   │  VERCEL            │  │  RAILWAY           │  │  BASE MAINNET     │       │   │
│   │   │  ───────           │  │  ───────           │  │  ───────────      │       │   │
│   │   │                    │  │                    │  │                    │       │   │
│   │   │  Frontend          │  │  Oracle Service    │  │  Smart Contracts  │       │   │
│   │   │  (Next.js SSR)     │  │  (Node.js)         │  │  (Immutable)      │       │   │
│   │   │                    │  │                    │  │                    │       │   │
│   │   │  • Auto-scaling    │  │  • Auto-scaling    │  │  • CuranceRegistry│       │   │
│   │   │  • Edge caching    │  │  • Health checks   │  │  • CuranceClaims  │       │   │
│   │   │  • Preview deploys │  │  • Logging         │  │  • USDC           │       │   │
│   │   │                    │  │  • Monitoring      │  │                    │       │   │
│   │   └────────────────────┘  └────────────────────┘  └────────────────────┘       │   │
│   │            │                       │                        │                   │   │
│   │            │                       │                        │                   │   │
│   │            │                       ▼                        │                   │   │
│   │            │              ┌────────────────────┐            │                   │   │
│   │            │              │                    │            │                   │   │
│   │            │              │  PRIMUS NETWORK    │            │                   │   │
│   │            │              │  ───────────────   │            │                   │   │
│   │            │              │                    │            │                   │   │
│   │            │              │  Distributed       │            │                   │   │
│   │            └──────────────│  Attestor Network  │────────────┘                   │   │
│   │                           │                    │                                │   │
│   │                           │  • Multi-region    │                                │   │
│   │                           │  • High availability                               │   │
│   │                           │  • Load balanced   │                                │   │
│   │                           │                    │                                │   │
│   │                           └────────────────────┘                                │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│                                                                                          │
│   ENVIRONMENT VARIABLES                                                                 │
│   ═════════════════════                                                                │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                  │   │
│   │   FRONTEND (.env.local)                 ORACLE (.env)                           │   │
│   │   ─────────────────────                 ────────────                            │   │
│   │                                                                                  │   │
│   │   NEXT_PUBLIC_CHAIN_ID=8453            PORT=3001                               │   │
│   │   NEXT_PUBLIC_REGISTRY_ADDRESS=0x...   NODE_ENV=production                     │   │
│   │   NEXT_PUBLIC_CLAIMS_ADDRESS=0x...     PRIVATE_KEY=0x...                       │   │
│   │   NEXT_PUBLIC_USDC_ADDRESS=0x...       RPC_URL=https://mainnet.base.org        │   │
│   │   NEXT_PUBLIC_ORACLE_URL=https://...   REGISTRY_ADDRESS=0x...                  │   │
│   │   NEXT_PUBLIC_PRIMUS_APP_ID=...        CLAIMS_ADDRESS=0x...                    │   │
│   │   NEXT_PUBLIC_PRIMUS_HEALTH_TEMPLATE=  PRIMUS_APP_ID=...                       │   │
│   │   NEXT_PUBLIC_PRIMUS_INVOICE_TEMPLATE= PRIMUS_APP_SECRET=...                   │   │
│   │                                         TRUSTED_ATTESTORS=0x...,0x...          │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. File Structure

```
curance/
├── frontend/                          # Next.js Application
│   ├── app/
│   │   ├── page.tsx                   # Landing page
│   │   ├── register/page.tsx          # Policy registration
│   │   ├── dashboard/page.tsx         # Policy status
│   │   ├── hospital/page.tsx          # Hospital claim creation
│   │   └── claim/page.tsx             # Claim verification
│   ├── lib/
│   │   ├── primus.ts                  # Primus SDK integration
│   │   ├── api.ts                     # Oracle API client
│   │   ├── contracts.ts               # Contract ABIs & addresses
│   │   └── utils.ts                   # Crypto & storage helpers
│   └── components/ui/                 # shadcn/ui components
│
├── oracle/                            # Express API Service
│   └── src/
│       ├── index.ts                   # Express server
│       ├── config.ts                  # Environment config
│       ├── types.ts                   # TypeScript interfaces
│       ├── routes/
│       │   ├── register.ts            # POST /api/register
│       │   └── claims.ts              # POST /api/claims/verify
│       └── services/
│           ├── primus.ts              # Attestation verification
│           ├── contract.ts            # viem contract clients
│           └── proof.ts               # Legacy proof verification
│
├── contracts/                         # Solidity Contracts
│   └── src/
│       ├── CuranceRegistry.sol        # Policy storage
│       ├── CuranceClaims.sol          # Claim processing
│       └── MockUSDC.sol               # Test token
│
└── docs/
    ├── SYSTEM_ARCHITECTURE.md         # This file
    ├── PRIMUS_INTEGRATION.md          # Integration guide
    ├── ARCHITECTURE.md                # High-level architecture
    ├── PRIVACY.md                     # Privacy model
    └── CONTRACTS.md                   # Contract specifications
```

---

## 9. Quick Reference

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Verify health attestation |
| `/api/claims/verify` | POST | Verify & settle claim |
| `/api/claims/:id` | GET | Get claim details |
| `/api/claims/:id/status` | GET | Get claim status |
| `/health` | GET | Oracle health check |

### Contract Functions

| Contract | Function | Caller |
|----------|----------|--------|
| Registry | `registerPolicy()` | Patient |
| Registry | `getPolicy()` | Anyone |
| Registry | `isPolicyValid()` | Oracle |
| Claims | `createClaim()` | Hospital |
| Claims | `enableClaim()` | Oracle only |
| Claims | `getClaim()` | Anyone |

### Primus Templates

| Template | Purpose | Data Extracted |
|----------|---------|----------------|
| Health Check | Registration | healthScore, bmi, bp, checkupDate |
| Invoice | Claims | invoiceId, amount, hospitalId, date |

---

*Last Updated: January 2025*
*Version: 1.0.0*
