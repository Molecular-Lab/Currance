# zkTLS Injection Architecture - Curance

This document details **exactly where and how** Primus zkTLS is injected into the Curance architecture, with specific file references, code injection points, and data flow.

---

## 1. High-Level Injection Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT ARCHITECTURE                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────────┐ │
│  │   FRONTEND       │     │   ORACLE         │     │   SMART CONTRACTS            │ │
│  │                  │     │                  │     │                              │ │
│  │  register/page   │────>│  /api/register   │────>│  CuranceRegistry             │ │
│  │  claim/page      │────>│  /api/claims     │────>│  CuranceClaims               │ │
│  │                  │     │                  │     │                              │ │
│  │  ⬇ MOCK DATA     │     │  ⬇ MOCK VERIFY   │     │                              │ │
│  │  generateMock()  │     │  verifyProof()   │     │                              │ │
│  └──────────────────┘     └──────────────────┘     └──────────────────────────────┘ │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ INJECT PRIMUS zkTLS
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PRIMUS INJECTION POINTS                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────────┐ │
│  │ ① FRONTEND       │     │ ② ORACLE         │     │ ③ CONTRACTS (optional)       │ │
│  │                  │     │                  │     │                              │ │
│  │ primus.ts        │     │ primus.ts        │     │ PrimusVerifier.sol           │ │
│  │ └─ SDK init      │     │ └─ ECDSA verify  │     │ └─ On-chain verify           │ │
│  │ └─ submitTask    │     │ └─ Attestor list │     │    (production only)         │ │
│  │ └─ attest()      │     │ └─ Data extract  │     │                              │ │
│  │ └─ verify()      │     │                  │     │                              │ │
│  └──────────────────┘     └──────────────────┘     └──────────────────────────────┘ │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component-by-Component Injection Map

### 2.1 Frontend Injection Points

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND ARCHITECTURE                                │
│                          frontend/                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ app/register/page.tsx (POLICY REGISTRATION)                             │ │
│  │                                                                          │ │
│  │  CURRENT FLOW:                                                           │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Step 2: Verify Health                                             │   │ │
│  │  │                                                                    │   │ │
│  │  │ handleVerifyHealth():                                              │   │ │
│  │  │   const { healthData, healthDataHash } = generateMockHealthData() │   │ │
│  │  │   // ↑ Uses reclaim.ts mock function                               │   │ │
│  │  │                                                                    │   │ │
│  │  │   await registerWithOracle({                                       │   │ │
│  │  │     commitment,                                                    │   │ │
│  │  │     healthDataHash,                                                │   │ │
│  │  │     premium,                                                       │   │ │
│  │  │     proof: { signature: 'mock_signature', ... }  // ← MOCK         │   │ │
│  │  │   })                                                               │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │ │
│  │  INJECTED FLOW (with Primus):                                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Step 2: Verify Health                                             │   │ │
│  │  │                                                                    │   │ │
│  │  │ handleVerifyHealth():                                              │   │ │
│  │  │   // ① Initialize Primus (once)                                    │   │ │
│  │  │   await primusService.initialize(provider)                         │   │ │
│  │  │                                                                    │   │ │
│  │  │   // ② Generate attestation (opens hospital portal)                │   │ │
│  │  │   const result = await primusService.generateHealthAttestation(    │   │ │
│  │  │     address                                                        │   │ │
│  │  │   )                                                                │   │ │
│  │  │   // Returns: { attestation, data: HealthData, dataHash }          │   │ │
│  │  │                                                                    │   │ │
│  │  │   // ③ Send attestation to Oracle                                  │   │ │
│  │  │   await registerWithOracle({                                       │   │ │
│  │  │     commitment,                                                    │   │ │
│  │  │     healthDataHash: result.dataHash,                               │   │ │
│  │  │     premium,                                                       │   │ │
│  │  │     attestation: result.attestation  // ← PRIMUS ATTESTATION       │   │ │
│  │  │   })                                                               │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ app/claim/page.tsx (CLAIMS VERIFICATION)                                │ │
│  │                                                                          │ │
│  │  CURRENT FLOW:                                                           │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │ handleVerifyClaim():                                              │   │ │
│  │  │   await verifyClaimWithOracle({                                   │   │ │
│  │  │     claimId,                                                      │   │ │
│  │  │     invoiceProof: {                                               │   │ │
│  │  │       signature: 'mock_invoice_sig',  // ← MOCK                   │   │ │
│  │  │       invoiceHash: claim.invoiceHash,                             │   │ │
│  │  │       hospitalId: 'hospital_1'                                    │   │ │
│  │  │     },                                                            │   │ │
│  │  │     ownershipProof: { commitment, signature }                     │   │ │
│  │  │   })                                                              │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │ │
│  │  INJECTED FLOW:                                                          │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │ handleVerifyClaim():                                              │   │ │
│  │  │   // ① Generate invoice attestation                               │   │ │
│  │  │   const invoiceResult = await primusService.generateInvoice       │   │ │
│  │  │     Attestation(address, invoiceId)                               │   │ │
│  │  │                                                                   │   │ │
│  │  │   // ② Send to Oracle                                             │   │ │
│  │  │   await verifyClaimWithOracle({                                   │   │ │
│  │  │     claimId,                                                      │   │ │
│  │  │     invoiceAttestation: invoiceResult.attestation,  // ← PRIMUS   │   │ │
│  │  │     ownershipProof: {                                             │   │ │
│  │  │       commitment,                                                 │   │ │
│  │  │       secret: policyData.secret  // Send secret, not signature    │   │ │
│  │  │     }                                                             │   │ │
│  │  │   })                                                              │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Frontend Services Layer

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND SERVICES                                    │
│                          frontend/lib/                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ lib/primus.ts (NEW - PRIMUS SDK WRAPPER)                                │ │
│  │                                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ class PrimusService {                                               │ │ │
│  │  │                                                                     │ │ │
│  │  │   // SDK Instance                                                   │ │ │
│  │  │   private primus: PrimusNetwork                                     │ │ │
│  │  │                                                                     │ │ │
│  │  │   // ① INITIALIZATION                                               │ │ │
│  │  │   async initialize(provider: EthereumProvider): Promise<boolean>    │ │ │
│  │  │   ┌──────────────────────────────────────────────────────────────┐ │ │ │
│  │  │   │ import { PrimusNetwork } from '@primuslabs/network-js-sdk'   │ │ │ │
│  │  │   │ this.primus = new PrimusNetwork()                            │ │ │ │
│  │  │   │ await this.primus.init(provider, chainId)                    │ │ │ │
│  │  │   └──────────────────────────────────────────────────────────────┘ │ │ │
│  │  │                                                                     │ │ │
│  │  │   // ② HEALTH ATTESTATION                                           │ │ │
│  │  │   async generateHealthAttestation(address): Promise<AttestationResult>│ │ │
│  │  │   ┌──────────────────────────────────────────────────────────────┐ │ │ │
│  │  │   │ // Step 1: Submit task to Primus network                     │ │ │ │
│  │  │   │ const task = await this.primus.submitTask({                  │ │ │ │
│  │  │   │   templateId: HEALTH_TEMPLATE_ID,                            │ │ │ │
│  │  │   │   address: userAddress                                       │ │ │ │
│  │  │   │ })                                                           │ │ │ │
│  │  │   │                                                              │ │ │ │
│  │  │   │ // Step 2: Open browser extension → Hospital portal          │ │ │ │
│  │  │   │ const attestResult = await this.primus.attest(task)          │ │ │ │
│  │  │   │                                                              │ │ │ │
│  │  │   │ // Step 3: Poll for signed attestation                       │ │ │ │
│  │  │   │ const attestation = await this.primus.verifyAndPollTaskResult│ │ │ │
│  │  │   │                                                              │ │ │ │
│  │  │   │ return { attestation, data: JSON.parse(attestation.data) }   │ │ │ │
│  │  │   └──────────────────────────────────────────────────────────────┘ │ │ │
│  │  │                                                                     │ │ │
│  │  │   // ③ INVOICE ATTESTATION                                          │ │ │
│  │  │   async generateInvoiceAttestation(address, invoiceId)              │ │ │
│  │  │                                                                     │ │ │
│  │  │   // ④ HELPER FUNCTIONS                                              │ │ │
│  │  │   generateHealthDataHash(data: HealthData): string                  │ │ │
│  │  │   generateInvoiceHash(data: InvoiceData): string                    │ │ │
│  │  │ }                                                                   │ │ │
│  │  │                                                                     │ │ │
│  │  │ // Export singleton                                                 │ │ │
│  │  │ export const primusService = new PrimusService()                    │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ lib/api.ts (UPDATED - ATTESTATION SUPPORT)                              │ │
│  │                                                                          │ │
│  │  interface RegisterRequest {                                             │ │
│  │    commitment: `0x${string}`                                             │ │
│  │    healthDataHash: `0x${string}`                                         │ │
│  │    premium: string                                                       │ │
│  │    attestation?: PrimusAttestation  // ← NEW: Primus attestation        │ │
│  │    proof?: HealthProof              // ← Kept for backward compat       │ │
│  │  }                                                                       │ │
│  │                                                                          │ │
│  │  interface VerifyClaimRequest {                                          │ │
│  │    claimId: `0x${string}`                                                │ │
│  │    invoiceAttestation?: PrimusAttestation  // ← NEW: Primus             │ │
│  │    invoiceProof?: InvoiceProof             // ← Backward compat         │ │
│  │    ownershipProof: OwnershipProof                                        │ │
│  │  }                                                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Oracle Injection Points

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          ORACLE ARCHITECTURE                                  │
│                          oracle/src/                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ services/primus.ts (NEW - ATTESTATION VERIFICATION)                     │ │
│  │                                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    VERIFICATION FLOW                                │ │ │
│  │  │                                                                     │ │ │
│  │  │  Input: PrimusAttestation                                           │ │ │
│  │  │  ┌────────────────────────────────────────────────────────────┐    │ │ │
│  │  │  │ {                                                          │    │ │ │
│  │  │  │   recipient: "0x...",                                      │    │ │ │
│  │  │  │   data: "{...healthData...}",                              │    │ │ │
│  │  │  │   timestamp: 1704067200,                                   │    │ │ │
│  │  │  │   attestors: [{ attestorAddr: "0x...", url: "..." }],      │    │ │ │
│  │  │  │   signatures: ["0x..."]                                    │    │ │ │
│  │  │  │ }                                                          │    │ │ │
│  │  │  └────────────────────────────────────────────────────────────┘    │ │ │
│  │  │                           │                                         │ │ │
│  │  │                           ▼                                         │ │ │
│  │  │  ┌────────────────────────────────────────────────────────────┐    │ │ │
│  │  │  │ STEP 1: Verify each signature                              │    │ │ │
│  │  │  │                                                            │    │ │ │
│  │  │  │ for (signature in attestation.signatures):                 │    │ │ │
│  │  │  │   message = constructAttestationMessage(attestation)       │    │ │ │
│  │  │  │   messageHash = keccak256(message)                         │    │ │ │
│  │  │  │                                                            │    │ │ │
│  │  │  │   // ECDSA Recovery                                        │    │ │ │
│  │  │  │   recoveredAddress = ecrecover(messageHash, signature)     │    │ │ │
│  │  │  │                                                            │    │ │ │
│  │  │  │   if (!trustedAttestors.includes(recoveredAddress)):       │    │ │ │
│  │  │  │     return { valid: false, error: 'Untrusted attestor' }   │    │ │ │
│  │  │  └────────────────────────────────────────────────────────────┘    │ │ │
│  │  │                           │                                         │ │ │
│  │  │                           ▼                                         │ │ │
│  │  │  ┌────────────────────────────────────────────────────────────┐    │ │ │
│  │  │  │ STEP 2: Verify timestamp freshness                         │    │ │ │
│  │  │  │                                                            │    │ │ │
│  │  │  │ if (now - attestation.timestamp > MAX_AGE):                │    │ │ │
│  │  │  │   return { valid: false, error: 'Attestation expired' }    │    │ │ │
│  │  │  └────────────────────────────────────────────────────────────┘    │ │ │
│  │  │                           │                                         │ │ │
│  │  │                           ▼                                         │ │ │
│  │  │  ┌────────────────────────────────────────────────────────────┐    │ │ │
│  │  │  │ STEP 3: Extract and validate data                          │    │ │ │
│  │  │  │                                                            │    │ │ │
│  │  │  │ data = JSON.parse(attestation.data)                        │    │ │ │
│  │  │  │                                                            │    │ │ │
│  │  │  │ // For health: validate healthScore range                  │    │ │ │
│  │  │  │ if (data.healthScore < 70):                                │    │ │ │
│  │  │  │   return { valid: false, error: 'Health score too low' }   │    │ │ │
│  │  │  └────────────────────────────────────────────────────────────┘    │ │ │
│  │  │                           │                                         │ │ │
│  │  │                           ▼                                         │ │ │
│  │  │  Output: { valid: true, data: extractedData }                       │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ routes/register.ts (UPDATED)                                            │ │
│  │                                                                          │ │
│  │  POST /api/register                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                                                                     │ │ │
│  │  │  if (request.attestation) {                                         │ │ │
│  │  │    // ↓ NEW: Use Primus verification                                │ │ │
│  │  │    const result = await verifyHealthAttestation(request.attestation)│ │ │
│  │  │    if (!result.valid) return 400                                    │ │ │
│  │  │    healthData = result.data                                         │ │ │
│  │  │  } else if (request.proof) {                                        │ │ │
│  │  │    // ↓ LEGACY: Keep backward compatibility                         │ │ │
│  │  │    const valid = await verifyHealthProof(request.proof)             │ │ │
│  │  │    if (!valid) return 400                                           │ │ │
│  │  │  }                                                                  │ │ │
│  │  │                                                                     │ │ │
│  │  │  // Continue with registration...                                   │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ routes/claims.ts (UPDATED)                                              │ │
│  │                                                                          │ │
│  │  POST /api/claims/verify                                                 │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                                                                     │ │ │
│  │  │  if (request.invoiceAttestation) {                                  │ │ │
│  │  │    // ↓ NEW: Verify Primus invoice attestation                      │ │ │
│  │  │    const result = await verifyInvoiceAttestation(                   │ │ │
│  │  │      request.invoiceAttestation                                     │ │ │
│  │  │    )                                                                │ │ │
│  │  │    if (!result.valid) return rejectClaim(claimId, result.error)     │ │ │
│  │  │    invoiceData = result.data                                        │ │ │
│  │  │  } else if (request.invoiceProof) {                                 │ │ │
│  │  │    // ↓ LEGACY: Backward compatibility                              │ │ │
│  │  │    const valid = await verifyInvoiceProof(request.invoiceProof)     │ │ │
│  │  │    if (!valid) return rejectClaim(claimId, 'Invalid proof')         │ │ │
│  │  │  }                                                                  │ │ │
│  │  │                                                                     │ │ │
│  │  │  // Verify ownership proof (secret → commitment)                    │ │ │
│  │  │  if (request.ownershipProof.secret) {                               │ │ │
│  │  │    const expectedCommitment = keccak256(                            │ │ │
│  │  │      secret || healthDataHash                                       │ │ │
│  │  │    )                                                                │ │ │
│  │  │    if (expectedCommitment !== claim.policyCommitment)               │ │ │
│  │  │      return rejectClaim(claimId, 'Invalid ownership')               │ │ │
│  │  │  }                                                                  │ │ │
│  │  │                                                                     │ │ │
│  │  │  // All verified → enable claim on-chain                            │ │ │
│  │  │  await enableClaim(claimId)                                         │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End Data Flow with Injection Points

### 3.1 Policy Registration Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                     POLICY REGISTRATION - PRIMUS INJECTION                            │
└──────────────────────────────────────────────────────────────────────────────────────┘

 User                 Primus         Hospital          Oracle           Blockchain
  │                  Extension        Portal           Service           Contracts
  │                     │               │                │                   │
  │─── 1. Click "Verify Health" ──────────────────────────────────────────────────────>│
  │                     │               │                │                   │
  │  ┌──────────────────────────────────────────────────────────────────────────────┐  │
  │  │  INJECTION POINT ①: frontend/app/register/page.tsx                           │  │
  │  │                                                                               │  │
  │  │  // BEFORE (mock):                                                            │  │
  │  │  const { healthData, healthDataHash } = generateMockHealthData()              │  │
  │  │                                                                               │  │
  │  │  // AFTER (Primus):                                                           │  │
  │  │  const result = await primusService.generateHealthAttestation(address)        │  │
  │  │  const { attestation, data: healthData, dataHash } = result                   │  │
  │  └──────────────────────────────────────────────────────────────────────────────┘  │
  │                     │               │                │                   │
  │<──── 2. Open Extension ─────────────│                │                   │
  │                     │               │                │                   │
  │         3. Browser navigates to Hospital Portal      │                   │
  │──────────────────────────────────────>│              │                   │
  │                     │               │                │                   │
  │         4. User logs in & fetches health data        │                   │
  │<─────────────────── 5. TLS Response ─│               │                   │
  │                     │               │                │                   │
  │   ┌─────────────────────────────────────────────────────────────────────────────┐  │
  │   │  PRIMUS EXTENSION INTERCEPTS TLS                                             │  │
  │   │  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
  │   │  │ 1. Witness TLS session with Hospital                                    │ │  │
  │   │  │ 2. Extract health data according to template                            │ │  │
  │   │  │ 3. Create attestation = { data, timestamp, attestors, signatures }      │ │  │
  │   │  │ 4. Sign with attestor private keys                                      │ │  │
  │   │  └─────────────────────────────────────────────────────────────────────────┘ │  │
  │   └─────────────────────────────────────────────────────────────────────────────┘  │
  │                     │               │                │                   │
  │<──── 6. Return Attestation ─────────│                │                   │
  │                     │               │                │                   │
  │  ┌──────────────────────────────────────────────────────────────────────────────┐  │
  │  │  INJECTION POINT ②: frontend/lib/api.ts                                      │  │
  │  │                                                                               │  │
  │  │  await registerWithOracle({                                                   │  │
  │  │    commitment,                                                                │  │
  │  │    healthDataHash: result.dataHash,                                           │  │
  │  │    premium,                                                                   │  │
  │  │    attestation: result.attestation  // ← PRIMUS ATTESTATION HERE             │  │
  │  │  })                                                                           │  │
  │  └──────────────────────────────────────────────────────────────────────────────┘  │
  │                     │               │                │                   │
  │───────────────────────────────────── 7. POST /api/register ──>│          │
  │                     │               │                │                   │
  │  ┌──────────────────────────────────────────────────────────────────────────────┐  │
  │  │  INJECTION POINT ③: oracle/src/routes/register.ts                            │  │
  │  │                                                                               │  │
  │  │  // Verify Primus attestation                                                 │  │
  │  │  const verifyResult = await verifyHealthAttestation(req.body.attestation)     │  │
  │  │                                                                               │  │
  │  │  if (!verifyResult.valid) {                                                   │  │
  │  │    return res.status(400).json({ error: verifyResult.error })                 │  │
  │  │  }                                                                            │  │
  │  │                                                                               │  │
  │  │  // Extract verified health data                                              │  │
  │  │  const healthData = verifyResult.data                                         │  │
  │  └──────────────────────────────────────────────────────────────────────────────┘  │
  │                     │               │                │                   │
  │  ┌──────────────────────────────────────────────────────────────────────────────┐  │
  │  │  INJECTION POINT ④: oracle/src/services/primus.ts                            │  │
  │  │                                                                               │  │
  │  │  verifyHealthAttestation(attestation):                                        │  │
  │  │    1. Reconstruct message from attestation fields                             │  │
  │  │    2. For each signature:                                                     │  │
  │  │       - ECDSA recover signer address                                          │  │
  │  │       - Check signer is in TRUSTED_ATTESTORS list                             │  │
  │  │    3. Check timestamp is fresh (< 1 hour)                                     │  │
  │  │    4. Parse and validate health data from attestation.data                    │  │
  │  │    5. Return { valid: true, data: healthData }                                │  │
  │  └──────────────────────────────────────────────────────────────────────────────┘  │
  │                     │               │                │                   │
  │<──────────────────────────────────── 8. Success ─────│                   │
  │                     │               │                │                   │
  │───────────────────────────────────────────────────────── 9. registerPolicy() ────>│
  │                     │               │                │                   │
  │<──────────────────────────────────────────────────────── 10. Policy Created ──────│
  │                     │               │                │                   │
```

### 3.2 Claims Verification Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                     CLAIMS VERIFICATION - PRIMUS INJECTION                            │
└──────────────────────────────────────────────────────────────────────────────────────┘

 Patient              Primus         Invoice           Oracle           Blockchain
   │                 Extension       System            Service           Contracts
   │                    │               │                │                   │
   │── 1. Enter Claim ID & Click "Verify" ────────────────────────────────────────────>│
   │                    │               │                │                   │
   │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
   │  │  INJECTION POINT ①: frontend/app/claim/page.tsx                             │  │
   │  │                                                                              │  │
   │  │  // BEFORE (mock):                                                           │  │
   │  │  invoiceProof: { signature: 'mock_sig', invoiceHash, hospitalId }            │  │
   │  │                                                                              │  │
   │  │  // AFTER (Primus):                                                          │  │
   │  │  const result = await primusService.generateInvoiceAttestation(              │  │
   │  │    address, invoiceId                                                        │  │
   │  │  )                                                                           │  │
   │  └─────────────────────────────────────────────────────────────────────────────┘  │
   │                    │               │                │                   │
   │<──── 2. Open Extension ────────────│                │                   │
   │                    │               │                │                   │
   │         3. Navigate to Hospital Invoice System      │                   │
   │──────────────────────────────────────>│             │                   │
   │                    │               │                │                   │
   │         4. Fetch invoice details                    │                   │
   │<────────────── 5. TLS Response ────│                │                   │
   │                    │               │                │                   │
   │   ┌────────────────────────────────────────────────────────────────────────────┐  │
   │   │  PRIMUS ATTESTATION GENERATED                                               │  │
   │   │  {                                                                          │  │
   │   │    data: JSON.stringify({                                                   │  │
   │   │      invoiceId: "INV-12345",                                                │  │
   │   │      amount: 500_000_000,  // 500 USDC                                      │  │
   │   │      hospitalAddress: "0x...",                                              │  │
   │   │      treatmentType: "Surgery"                                               │  │
   │   │    }),                                                                      │  │
   │   │    attestors: [{ attestorAddr: "0x..." }],                                  │  │
   │   │    signatures: ["0x..."]                                                    │  │
   │   │  }                                                                          │  │
   │   └────────────────────────────────────────────────────────────────────────────┘  │
   │                    │               │                │                   │
   │<──── 6. Return Attestation ────────│                │                   │
   │                    │               │                │                   │
   │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
   │  │  INJECTION POINT ②: API Call with Attestation                               │  │
   │  │                                                                              │  │
   │  │  await verifyClaimWithOracle({                                               │  │
   │  │    claimId: "0x...",                                                         │  │
   │  │    invoiceAttestation: result.attestation,  // ← PRIMUS                      │  │
   │  │    ownershipProof: {                                                         │  │
   │  │      commitment: policyData.commitment,                                      │  │
   │  │      secret: policyData.secret  // Send secret for verification              │  │
   │  │    }                                                                         │  │
   │  │  })                                                                          │  │
   │  └─────────────────────────────────────────────────────────────────────────────┘  │
   │                    │               │                │                   │
   │──────────────────────────────────────── 7. POST /api/claims/verify ──>│          │
   │                    │               │                │                   │
   │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
   │  │  INJECTION POINT ③: oracle/src/routes/claims.ts                             │  │
   │  │                                                                              │  │
   │  │  // Step 1: Verify invoice attestation                                       │  │
   │  │  const invoiceResult = await verifyInvoiceAttestation(                       │  │
   │  │    req.body.invoiceAttestation                                               │  │
   │  │  )                                                                           │  │
   │  │  if (!invoiceResult.valid) return rejectClaim(...)                           │  │
   │  │                                                                              │  │
   │  │  // Step 2: Verify ownership (secret → commitment)                           │  │
   │  │  const expectedCommitment = keccak256(                                       │  │
   │  │    encodePacked(['bytes32', 'bytes32'],                                      │  │
   │  │      [secret, healthDataHash]                                                │  │
   │  │    )                                                                         │  │
   │  │  )                                                                           │  │
   │  │  if (expectedCommitment !== claim.policyCommitment)                          │  │
   │  │    return rejectClaim(...)                                                   │  │
   │  │                                                                              │  │
   │  │  // Step 3: All valid → enable claim                                         │  │
   │  │  await enableClaim(claimId)                                                  │  │
   │  └─────────────────────────────────────────────────────────────────────────────┘  │
   │                    │               │                │                   │
   │                    │               │                │──── 8. enableClaim() ─────>│
   │                    │               │                │                   │
   │                    │               │                │<──── 9. Auto-transfer ─────│
   │                    │               │                │       USDC to Hospital     │
   │                    │               │                │                   │
   │<──────────────────────────────────────── 10. Success ──────────────────│          │
   │                    │               │                │                   │
```

---

## 4. File Reference Quick Map

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     FILE → INJECTION POINT MAPPING                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┬─────────────────────────────────────────────┐
│ FILE                            │ INJECTION DETAILS                           │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                                 │                                             │
│ FRONTEND                        │                                             │
│                                 │                                             │
│ lib/primus.ts                   │ NEW FILE: Primus SDK wrapper                │
│                                 │ - PrimusService class                       │
│                                 │ - generateHealthAttestation()               │
│                                 │ - generateInvoiceAttestation()              │
│                                 │ - Mock generators for dev                   │
│                                 │                                             │
│ lib/api.ts                      │ UPDATED: Added attestation types            │
│                                 │ - RegisterRequest.attestation               │
│                                 │ - VerifyClaimRequest.invoiceAttestation     │
│                                 │                                             │
│ app/register/page.tsx           │ UPDATE NEEDED:                              │
│                                 │ Line 60-98: handleVerifyHealth()            │
│                                 │ - Replace generateMockHealthData()          │
│                                 │ - Use primusService.generateHealth...       │
│                                 │                                             │
│ app/claim/page.tsx              │ UPDATE NEEDED:                              │
│                                 │ Line 93-121: handleVerifyClaim()            │
│                                 │ - Replace mock invoiceProof                 │
│                                 │ - Use primusService.generateInvoice...      │
│                                 │                                             │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                                 │                                             │
│ ORACLE                          │                                             │
│                                 │                                             │
│ src/services/primus.ts          │ NEW FILE: Attestation verification          │
│                                 │ - verifyPrimusAttestation()                 │
│                                 │ - verifyHealthAttestation()                 │
│                                 │ - verifyInvoiceAttestation()                │
│                                 │ - ECDSA signature recovery                  │
│                                 │                                             │
│ src/routes/register.ts          │ UPDATED: Dual verification path             │
│                                 │ - if (attestation) → verifyHealth...        │
│                                 │ - else if (proof) → legacy verify           │
│                                 │                                             │
│ src/routes/claims.ts            │ UPDATED: Dual verification path             │
│                                 │ - if (invoiceAttestation) → verify...       │
│                                 │ - else if (invoiceProof) → legacy           │
│                                 │                                             │
│ src/config.ts                   │ UPDATED: Added Primus config                │
│                                 │ - primusAppId                               │
│                                 │ - primusAppSecret                           │
│                                 │ - trustedAttestors                          │
│                                 │                                             │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                                 │                                             │
│ ENV FILES                       │                                             │
│                                 │                                             │
│ frontend/.env.example           │ UPDATED:                                    │
│                                 │ - NEXT_PUBLIC_PRIMUS_APP_ID                 │
│                                 │ - NEXT_PUBLIC_PRIMUS_HEALTH_TEMPLATE_ID     │
│                                 │ - NEXT_PUBLIC_PRIMUS_INVOICE_TEMPLATE_ID    │
│                                 │                                             │
│ oracle/.env.example             │ UPDATED:                                    │
│                                 │ - PRIMUS_APP_ID                             │
│                                 │ - PRIMUS_APP_SECRET                         │
│                                 │ - TRUSTED_ATTESTORS                         │
│                                 │                                             │
└─────────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 5. Security Model

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     SECURITY TRUST BOUNDARIES                                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                      │
│   UNTRUSTED ZONE                     │  TRUST BOUNDARY  │     TRUSTED ZONE          │
│   (User-controlled)                  │                  │     (Verified)            │
│                                      │                  │                           │
│  ┌─────────────────────┐             │                  │  ┌─────────────────────┐  │
│  │ User's Browser      │             │                  │  │ Primus Attestors    │  │
│  │                     │             │                  │  │ (Distributed nodes) │  │
│  │ - Can manipulate UI │             │                  │  │                     │  │
│  │ - Can modify JS     │             │                  │  │ - Witness TLS       │  │
│  │ - Can send any data │             │                  │  │ - Sign attestations │  │
│  └─────────────────────┘             │                  │  │ - Public keys known │  │
│           │                          │                  │  └─────────────────────┘  │
│           │ Cannot forge             │                  │            │              │
│           │ attestation              │                  │            │              │
│           │ signatures               │                  │            ▼              │
│           ▼                          │                  │  ┌─────────────────────┐  │
│  ┌─────────────────────┐             │                  │  │ Oracle Service      │  │
│  │ Frontend sends      │             │                  │  │                     │  │
│  │ attestation to      │─────────────│──────────────────│──│ - Verifies ECDSA    │  │
│  │ Oracle              │             │                  │  │ - Checks attestor   │  │
│  └─────────────────────┘             │                  │  │   is in whitelist   │  │
│                                      │                  │  │ - Validates data    │  │
│                                      │                  │  └─────────────────────┘  │
│                                      │                  │            │              │
│                                      │                  │            ▼              │
│                                      │                  │  ┌─────────────────────┐  │
│                                      │                  │  │ Smart Contracts     │  │
│                                      │                  │  │                     │  │
│                                      │                  │  │ - Final settlement  │  │
│                                      │                  │  │ - Immutable         │  │
│                                      │                  │  └─────────────────────┘  │
│                                      │                  │                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

WHAT PRIMUS PREVENTS:
  ✓ Users cannot fake health data (attestors witness real TLS)
  ✓ Users cannot fake invoice data (attestors witness real TLS)
  ✓ Users cannot forge attestor signatures (ECDSA + trusted list)
  ✓ Hospitals cannot learn patient identities (commitment scheme)

WHAT PRIMUS DOES NOT PREVENT:
  ✗ Hospitals providing false data (requires hospital trust)
  ✗ Oracle service downtime (requires redundancy)
  ✗ 51% attack on attestor network (requires decentralization)
```

---

## 6. Development vs Production Mode

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     MODE SWITCHING                                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┬─────────────────────────────────────────────┐
│ DEVELOPMENT MODE                │ PRODUCTION MODE                             │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                                 │                                             │
│ TRUSTED_ATTESTORS=""            │ TRUSTED_ATTESTORS="0x123...,0x456..."       │
│ (empty = accept mock)           │ (only real Primus attestors)                │
│                                 │                                             │
│ Uses:                           │ Uses:                                       │
│ - generateMockHealthAttestation │ - primusService.generateHealthAttestation  │
│ - generateMockInvoiceAttestation│ - primusService.generateInvoiceAttestation │
│                                 │                                             │
│ No browser extension needed     │ Requires Primus Extension installed         │
│                                 │                                             │
│ Signatures are "0x00...00"      │ Signatures are real ECDSA                   │
│                                 │                                             │
│ Attestor check: SKIPPED         │ Attestor check: ENFORCED                    │
│                                 │                                             │
└─────────────────────────────────┴─────────────────────────────────────────────┘

Code check in oracle/src/services/primus.ts:

  const isDevelopment = config.nodeEnv === 'development'
  const trustedAttestors = config.trustedAttestors
    ? config.trustedAttestors.split(',').map(a => a.trim().toLowerCase())
    : []

  // In development with no trusted attestors, accept mock attestations
  if (isDevelopment && trustedAttestors.length === 0) {
    console.log('Development mode: Accepting mock attestor')
    return { valid: true, data: ... }
  }

  // Production: Must verify attestor is in trusted list
  if (!trustedAttestors.includes(recoveredAddress.toLowerCase())) {
    return { valid: false, error: 'Untrusted attestor' }
  }
```

---

## Summary

The Primus zkTLS injection follows this pattern:

1. **Frontend UI** → Triggers Primus SDK → Opens browser extension
2. **Browser Extension** → Navigates to data source → Witnesses TLS → Signs attestation
3. **Frontend** → Sends attestation to Oracle
4. **Oracle** → Verifies ECDSA signatures → Checks attestor whitelist → Extracts data
5. **Oracle** → Calls smart contract with verified data
6. **Smart Contract** → Executes state change (register policy / settle claim)

The key security property is that **users cannot forge attestations** because they don't have the attestors' private keys. The Oracle independently verifies that signatures are from known trusted attestors.
