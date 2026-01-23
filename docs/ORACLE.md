# Oracle Service Specification

## Overview

The Oracle service verifies zkTLS proofs and manages claim lifecycle by interacting with smart contracts.

## Directory Structure

```
oracle/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── types.ts
│   ├── routes/
│   │   ├── register.ts
│   │   └── claims.ts
│   └── services/
│       ├── contract.ts
│       └── proof.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## package.json

```json
{
  "name": "curance-oracle",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "viem": "^2.0.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.6.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

## .env.example

```
PORT=3001
PRIVATE_KEY=0x...
RPC_URL=https://sepolia.base.org
REGISTRY_ADDRESS=0x...
CLAIMS_ADDRESS=0x...
```

---

## src/config.ts

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  registryAddress: process.env.REGISTRY_ADDRESS as `0x${string}`,
  claimsAddress: process.env.CLAIMS_ADDRESS as `0x${string}`,
};
```

---

## src/types.ts

```typescript
export interface HealthProof {
  signature: string;
  timestamp: number;
  hospitalId: string;
}

export interface InvoiceProof {
  signature: string;
  invoiceHash: string;
  hospitalId: string;
}

export interface OwnershipProof {
  commitment: string;
  signature: string;
}

export interface RegisterRequest {
  commitment: string;
  healthDataHash: string;
  premium: string;
  proof: HealthProof;
}

export interface VerifyClaimRequest {
  claimId: string;
  invoiceProof: InvoiceProof;
  ownershipProof: OwnershipProof;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## src/services/contract.ts

```typescript
import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseAbi 
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';

const account = privateKeyToAccount(config.privateKey);

export const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

const registryAbi = parseAbi([
  'function registerPolicy(bytes32 commitment, bytes32 healthDataHash, uint256 premium) external',
  'function getPolicy(bytes32 commitment) view returns (uint256, uint256, uint256, uint256, uint256, bool)',
  'function isPolicyValid(bytes32 commitment) view returns (bool)',
]);

const claimsAbi = parseAbi([
  'function enableClaim(bytes32 claimId) external',
  'function rejectClaim(bytes32 claimId, string reason) external',
  'function getClaimStatus(bytes32 claimId) view returns (uint8)',
  'function getClaim(bytes32 claimId) view returns (bytes32, address, uint256, bytes32, uint8, uint256, uint256)',
]);

export async function enableClaim(claimId: `0x${string}`) {
  const hash = await walletClient.writeContract({
    address: config.claimsAddress,
    abi: claimsAbi,
    functionName: 'enableClaim',
    args: [claimId],
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

export async function rejectClaim(claimId: `0x${string}`, reason: string) {
  const hash = await walletClient.writeContract({
    address: config.claimsAddress,
    abi: claimsAbi,
    functionName: 'rejectClaim',
    args: [claimId, reason],
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

export async function getClaimStatus(claimId: `0x${string}`): Promise<number> {
  const status = await publicClient.readContract({
    address: config.claimsAddress,
    abi: claimsAbi,
    functionName: 'getClaimStatus',
    args: [claimId],
  });
  return Number(status);
}

export async function getClaim(claimId: `0x${string}`) {
  const result = await publicClient.readContract({
    address: config.claimsAddress,
    abi: claimsAbi,
    functionName: 'getClaim',
    args: [claimId],
  });
  return {
    policyCommitment: result[0],
    hospital: result[1],
    amount: result[2],
    invoiceHash: result[3],
    status: Number(result[4]),
    createdAt: result[5],
    settledAt: result[6],
  };
}

export async function isPolicyValid(commitment: `0x${string}`): Promise<boolean> {
  return await publicClient.readContract({
    address: config.registryAddress,
    abi: registryAbi,
    functionName: 'isPolicyValid',
    args: [commitment],
  });
}

export async function getPolicy(commitment: `0x${string}`) {
  const result = await publicClient.readContract({
    address: config.registryAddress,
    abi: registryAbi,
    functionName: 'getPolicy',
    args: [commitment],
  });
  return {
    premium: result[0],
    coverage: result[1],
    usedCoverage: result[2],
    registeredAt: result[3],
    expiresAt: result[4],
    active: result[5],
  };
}
```

---

## src/services/proof.ts

```typescript
import type { HealthProof, InvoiceProof, OwnershipProof } from '../types.js';

/**
 * Mock proof verification for POC.
 * In production, integrate with Reclaim Protocol SDK.
 */

export function verifyHealthProof(proof: HealthProof): boolean {
  // TODO: Integrate with Reclaim Protocol
  // For POC, validate structure exists
  if (!proof.signature || !proof.timestamp || !proof.hospitalId) {
    return false;
  }
  
  // Check timestamp is recent (within 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (proof.timestamp < thirtyDaysAgo) {
    return false;
  }
  
  return true;
}

export function verifyInvoiceProof(proof: InvoiceProof): boolean {
  // TODO: Integrate with Reclaim Protocol
  if (!proof.signature || !proof.invoiceHash || !proof.hospitalId) {
    return false;
  }
  return true;
}

export function verifyOwnershipProof(proof: OwnershipProof): boolean {
  // TODO: Verify ZK proof of secret knowledge
  // For POC, just check structure
  if (!proof.commitment || !proof.signature) {
    return false;
  }
  return true;
}

/**
 * Future: Reclaim Protocol Integration
 * 
 * import { ReclaimClient } from '@reclaimprotocol/js-sdk';
 * 
 * const reclaimClient = new ReclaimClient(APP_ID);
 * 
 * export async function verifyReclaimProof(proof: ReclaimProof): Promise<boolean> {
 *   return await reclaimClient.verifyProof(proof);
 * }
 */
```

---

## src/routes/register.ts

```typescript
import { Router } from 'express';
import { verifyHealthProof } from '../services/proof.js';
import type { RegisterRequest, ApiResponse } from '../types.js';

const router = Router();

/**
 * POST /api/register
 * 
 * Verify health proof before policy registration.
 * Frontend calls this, then registers policy on-chain.
 */
router.post('/', async (req, res) => {
  try {
    const body: RegisterRequest = req.body;
    
    // Validate request
    if (!body.commitment || !body.healthDataHash || !body.proof) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields',
      };
      return res.status(400).json(response);
    }
    
    // Verify the health proof
    const isValid = verifyHealthProof(body.proof);
    
    if (!isValid) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid health proof',
      };
      return res.status(400).json(response);
    }
    
    // Return verification result
    const response: ApiResponse = {
      success: true,
      data: {
        verified: true,
        commitment: body.commitment,
        healthDataHash: body.healthDataHash,
        hospitalId: body.proof.hospitalId,
      },
    };
    
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

export default router;
```

---

## src/routes/claims.ts

```typescript
import { Router } from 'express';
import { verifyInvoiceProof, verifyOwnershipProof } from '../services/proof.js';
import { 
  enableClaim, 
  rejectClaim, 
  getClaimStatus, 
  getClaim,
  isPolicyValid 
} from '../services/contract.js';
import type { VerifyClaimRequest, ApiResponse } from '../types.js';

const router = Router();

const STATUS_MAP = ['NONE', 'PENDING', 'VERIFIED', 'ENABLED', 'SETTLED', 'REJECTED'];

/**
 * POST /api/claims/verify
 * 
 * Verify claim proofs and enable settlement.
 */
router.post('/verify', async (req, res) => {
  try {
    const body: VerifyClaimRequest = req.body;
    const claimId = body.claimId as `0x${string}`;
    
    // Validate request
    if (!body.claimId || !body.invoiceProof || !body.ownershipProof) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields',
      };
      return res.status(400).json(response);
    }
    
    // Check claim exists and is pending
    const status = await getClaimStatus(claimId);
    if (status !== 1) { // 1 = PENDING
      const response: ApiResponse = {
        success: false,
        error: `Invalid claim status: ${STATUS_MAP[status] || 'UNKNOWN'}`,
      };
      return res.status(400).json(response);
    }
    
    // Get claim details
    const claim = await getClaim(claimId);
    
    // Verify invoice proof (from hospital)
    const invoiceValid = verifyInvoiceProof(body.invoiceProof);
    if (!invoiceValid) {
      await rejectClaim(claimId, 'Invalid invoice proof');
      const response: ApiResponse = {
        success: false,
        error: 'Invalid invoice proof',
      };
      return res.status(400).json(response);
    }
    
    // Verify ownership proof (from user)
    const ownershipValid = verifyOwnershipProof(body.ownershipProof);
    if (!ownershipValid) {
      await rejectClaim(claimId, 'Invalid ownership proof');
      const response: ApiResponse = {
        success: false,
        error: 'Invalid ownership proof',
      };
      return res.status(400).json(response);
    }
    
    // Verify commitment matches
    if (body.ownershipProof.commitment.toLowerCase() !== claim.policyCommitment.toLowerCase()) {
      await rejectClaim(claimId, 'Commitment mismatch');
      const response: ApiResponse = {
        success: false,
        error: 'Policy commitment does not match claim',
      };
      return res.status(400).json(response);
    }
    
    // Verify policy is still valid
    const policyValid = await isPolicyValid(claim.policyCommitment);
    if (!policyValid) {
      await rejectClaim(claimId, 'Policy not valid');
      const response: ApiResponse = {
        success: false,
        error: 'Policy not valid or expired',
      };
      return res.status(400).json(response);
    }
    
    // Enable the claim (auto-settles)
    const receipt = await enableClaim(claimId);
    
    const response: ApiResponse = {
      success: true,
      data: {
        claimId,
        txHash: receipt.transactionHash,
        status: 'SETTLED',
        amount: claim.amount.toString(),
        hospital: claim.hospital,
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error('Verify claim error:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/claims/:claimId
 * 
 * Get claim details.
 */
router.get('/:claimId', async (req, res) => {
  try {
    const claimId = req.params.claimId as `0x${string}`;
    const claim = await getClaim(claimId);
    
    const response: ApiResponse = {
      success: true,
      data: {
        claimId,
        policyCommitment: claim.policyCommitment,
        hospital: claim.hospital,
        amount: claim.amount.toString(),
        invoiceHash: claim.invoiceHash,
        status: STATUS_MAP[claim.status] || 'UNKNOWN',
        statusCode: claim.status,
        createdAt: Number(claim.createdAt),
        settledAt: Number(claim.settledAt),
      },
    };
    
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/claims/:claimId/status
 * 
 * Get claim status only.
 */
router.get('/:claimId/status', async (req, res) => {
  try {
    const claimId = req.params.claimId as `0x${string}`;
    const status = await getClaimStatus(claimId);
    
    const response: ApiResponse = {
      success: true,
      data: {
        claimId,
        status: STATUS_MAP[status] || 'UNKNOWN',
        statusCode: status,
      },
    };
    
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

export default router;
```

---

## src/index.ts

```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import registerRoutes from './routes/register.js';
import claimsRoutes from './routes/claims.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    contracts: {
      registry: config.registryAddress,
      claims: config.claimsAddress,
    }
  });
});

// Routes
app.use('/api/register', registerRoutes);
app.use('/api/claims', claimsRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

app.listen(config.port, () => {
  console.log(`\n🔮 Curance Oracle running on port ${config.port}`);
  console.log(`   Registry: ${config.registryAddress}`);
  console.log(`   Claims:   ${config.claimsAddress}\n`);
});
```

---

## API Reference

### POST /api/register

Verify health proof before registration.

**Request:**
```json
{
  "commitment": "0x...",
  "healthDataHash": "0x...",
  "premium": "100000000",
  "proof": {
    "signature": "...",
    "timestamp": 1704067200000,
    "hospitalId": "hospital_1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "commitment": "0x...",
    "healthDataHash": "0x...",
    "hospitalId": "hospital_1"
  }
}
```

### POST /api/claims/verify

Verify and settle a claim.

**Request:**
```json
{
  "claimId": "0x...",
  "invoiceProof": {
    "signature": "...",
    "invoiceHash": "0x...",
    "hospitalId": "hospital_1"
  },
  "ownershipProof": {
    "commitment": "0x...",
    "signature": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claimId": "0x...",
    "txHash": "0x...",
    "status": "SETTLED",
    "amount": "50000000",
    "hospital": "0x..."
  }
}
```

### GET /api/claims/:claimId

Get claim details.

**Response:**
```json
{
  "success": true,
  "data": {
    "claimId": "0x...",
    "policyCommitment": "0x...",
    "hospital": "0x...",
    "amount": "50000000",
    "status": "SETTLED",
    "createdAt": 1704067200,
    "settledAt": 1704067500
  }
}
```

---

## Build & Run

```bash
# Install dependencies
npm install

# Development (hot reload)
npm run dev

# Production build
npm run build
npm start
```