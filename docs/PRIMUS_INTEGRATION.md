# Primus zkTLS Integration Guide

Complete step-by-step guide for integrating Primus zkTLS into Curance for privacy-preserving health insurance.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Primus Developer Hub Setup](#3-step-1-primus-developer-hub-setup)
4. [Step 2: Frontend SDK Integration](#4-step-2-frontend-sdk-integration)
5. [Step 3: Oracle Verification Service](#5-step-3-oracle-verification-service)
6. [Step 4: Smart Contract Integration](#6-step-4-smart-contract-integration)
7. [Step 5: End-to-End Testing](#7-step-5-end-to-end-testing)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture Overview

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CURANCE + PRIMUS ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   REGISTRATION FLOW                                                          │
│   ════════════════                                                          │
│                                                                              │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│   │ Patient  │───>│   Hospital   │───>│   Primus     │───>│   Curance   │  │
│   │ Browser  │    │   Portal     │    │   Network    │    │   Oracle    │  │
│   └──────────┘    └──────────────┘    └──────────────┘    └─────────────┘  │
│        │                                     │                    │         │
│        │ 1. Visit hospital                   │                    │         │
│        │ 2. Get health check                 │                    │         │
│        │ 3. Open Curance /register           │                    │         │
│        │ 4. Trigger zkTLS attestation ──────>│                    │         │
│        │    (Primus Extension)               │                    │         │
│        │                                     │                    │         │
│        │ 5. Attestors witness TLS session    │                    │         │
│        │    & sign attestation               │                    │         │
│        │                                     │                    │         │
│        │ 6. Receive signed attestation <─────│                    │         │
│        │                                                          │         │
│        │ 7. Send attestation to Oracle ──────────────────────────>│         │
│        │                                                          │         │
│        │ 8. Oracle verifies attestor signatures                   │         │
│        │    & extracts health data                                │         │
│        │                                                          │         │
│        │ 9. Return verification result <──────────────────────────│         │
│        │                                                                    │
│        │ 10. Register policy on-chain ─────────────────────────────> Chain  │
│        │                                                                    │
│                                                                              │
│   CLAIMS FLOW                                                               │
│   ═══════════                                                               │
│                                                                              │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│   │ Patient  │<───│   Hospital   │    │   Primus     │───>│   Curance   │  │
│   │          │    │              │    │   Network    │    │   Oracle    │  │
│   └──────────┘    └──────────────┘    └──────────────┘    └─────────────┘  │
│        │                 │                   │                    │         │
│        │ 1. Receive treatment                │                    │         │
│        │                 │                   │                    │         │
│        │                 │ 2. Create claim on-chain ────────────────> Chain │
│        │                 │    (status: PENDING)                   │         │
│        │                 │                   │                    │         │
│        │ 3. Get claimId <─                   │                    │         │
│        │                                     │                    │         │
│        │ 4. Open Curance /claim              │                    │         │
│        │ 5. Create invoice zkTLS proof ─────>│                    │         │
│        │                                     │                    │         │
│        │ 6. Receive attestation <────────────│                    │         │
│        │                                                          │         │
│        │ 7. Send attestation + ownership proof ──────────────────>│         │
│        │                                                          │         │
│        │ 8. Oracle verifies both proofs                           │         │
│        │ 9. Oracle calls enableClaim() ─────────────────────────────> Chain │
│        │                                                          │         │
│        │ 10. USDC auto-settled to hospital <────────────────────────> Chain │
│        │                                                          │         │
│        │ 11. Return success <─────────────────────────────────────│         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role | Technology |
|-----------|------|------------|
| **Frontend** | Generate zkTLS proofs via Primus SDK | Next.js + @primuslabs/network-js-sdk |
| **Primus Network** | Witness TLS sessions, sign attestations | Distributed attestor nodes |
| **Oracle** | Verify attestations, call contracts | Express + viem |
| **Smart Contracts** | Store policies, process claims, settle USDC | Solidity on Base Sepolia |

---

## 2. Prerequisites

### Required Accounts & Tools

- [ ] **Primus Developer Account** - https://dev.primuslabs.xyz
- [ ] **Primus Browser Extension** - Required for attestation generation
- [ ] **Node.js 18+** - Runtime for Oracle and Frontend
- [ ] **Base Sepolia ETH** - For gas fees
- [ ] **Test USDC** - For policy premiums and settlements

### Environment Setup

```bash
# Clone the repository (if not already done)
cd /Users/wtshai/Work/Hackathon/ETHChaingmai/curance

# Install dependencies
cd frontend && npm install
cd ../oracle && npm install
```

---

## 3. Step 1: Primus Developer Hub Setup

### 3.1 Create Developer Account

1. Visit https://dev.primuslabs.xyz
2. Connect your wallet (MetaMask recommended)
3. Complete account registration

### 3.2 Create Project

1. Click "Create Project"
2. Enter project details:
   - **Name**: `Curance Health Insurance`
   - **Description**: `Privacy-preserving health insurance using zkTLS`
3. Save the credentials:
   ```
   appId: app_xxxxxxxxxxxxxx
   appSecret: secret_xxxxxxxxxxxxxx  (SAVE THIS - shown only once!)
   ```

### 3.3 Create Health Check Template

This template extracts health data from hospital portals.

1. Click "Create Template"
2. Configure the template:

```yaml
Template Name: curance-health-check
Description: Extract health check data from hospital portal

# Request Configuration
URL: https://hospital-portal.example.com/api/patient/health-record
Method: GET
Headers:
  Authorization: Bearer {{access_token}}
  Content-Type: application/json

# Response Data Extraction
Response Fields:
  - Key: healthScore
    Parse Type: int
    JSON Path: $.data.healthScore

  - Key: bmi
    Parse Type: string
    JSON Path: $.data.bmi

  - Key: bloodPressure
    Parse Type: string
    JSON Path: $.data.bloodPressure

  - Key: checkupDate
    Parse Type: string
    JSON Path: $.data.checkupDate

  - Key: hospitalId
    Parse Type: string
    JSON Path: $.data.hospitalId

# Optional: Conditions (for boolean results)
Conditions:
  - Field: healthScore
    Operator: ">"
    Value: "70"
```

3. Save and note the **Template ID**: `tmpl_xxxxxxxxxxxxxx`

### 3.4 Create Invoice Template

This template extracts invoice data for claims verification.

```yaml
Template Name: curance-invoice
Description: Extract invoice data from hospital billing system

# Request Configuration
URL: https://hospital-portal.example.com/api/invoice/{{invoiceId}}
Method: GET
Headers:
  Authorization: Bearer {{access_token}}
  Content-Type: application/json

# Response Data Extraction
Response Fields:
  - Key: invoiceId
    Parse Type: string
    JSON Path: $.data.id

  - Key: amount
    Parse Type: int
    JSON Path: $.data.amount

  - Key: currency
    Parse Type: string
    JSON Path: $.data.currency

  - Key: hospitalId
    Parse Type: string
    JSON Path: $.data.hospitalId

  - Key: hospitalAddress
    Parse Type: string
    JSON Path: $.data.walletAddress

  - Key: patientRef
    Parse Type: string
    JSON Path: $.data.patientReference

  - Key: treatmentType
    Parse Type: string
    JSON Path: $.data.treatment

  - Key: invoiceDate
    Parse Type: string
    JSON Path: $.data.date
```

### 3.5 Environment Variables

Add credentials to your environment files:

**Frontend (`frontend/.env.local`):**
```env
# Primus zkTLS Configuration
NEXT_PUBLIC_PRIMUS_APP_ID=app_xxxxxxxxxxxxxx
NEXT_PUBLIC_PRIMUS_HEALTH_TEMPLATE_ID=tmpl_xxxxxxxxxxxxxx
NEXT_PUBLIC_PRIMUS_INVOICE_TEMPLATE_ID=tmpl_xxxxxxxxxxxxxx

# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_ORACLE_URL=http://localhost:3001

# Contract Addresses (update after deployment)
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CLAIMS_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

**Oracle (`oracle/.env`):**
```env
# Server Configuration
PORT=3001

# Blockchain Configuration
PRIVATE_KEY=0x...  # Oracle wallet private key
RPC_URL=https://sepolia.base.org

# Contract Addresses
REGISTRY_ADDRESS=0x...
CLAIMS_ADDRESS=0x...

# Primus Configuration
PRIMUS_APP_ID=app_xxxxxxxxxxxxxx
PRIMUS_APP_SECRET=secret_xxxxxxxxxxxxxx

# Trusted Attestors (Primus network attestors)
# Get these from Primus documentation or their contract
TRUSTED_ATTESTORS=0xAttestor1,0xAttestor2,0xAttestor3
```

---

## 4. Step 2: Frontend SDK Integration

### 4.1 Install Primus SDK

```bash
cd frontend
npm install @primuslabs/network-js-sdk
```

### 4.2 Create Primus Service

Create `frontend/lib/primus.ts`:

```typescript
/**
 * Primus zkTLS Integration Service
 *
 * Handles attestation generation for:
 * - Health check verification (registration)
 * - Invoice verification (claims)
 */

import { PrimusNetwork } from '@primuslabs/network-js-sdk';
import { keccak256, toHex, encodePacked } from 'viem';

// ============================================================================
// Configuration
// ============================================================================

const PRIMUS_CONFIG = {
  appId: process.env.NEXT_PUBLIC_PRIMUS_APP_ID || '',
  healthTemplateId: process.env.NEXT_PUBLIC_PRIMUS_HEALTH_TEMPLATE_ID || '',
  invoiceTemplateId: process.env.NEXT_PUBLIC_PRIMUS_INVOICE_TEMPLATE_ID || '',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'),
};

// ============================================================================
// Types
// ============================================================================

export interface AttNetworkRequest {
  url: string;
  header: string;
  method: string;
  body: string;
}

export interface AttNetworkResponseResolve {
  keyName: string;
  parseType: string;
  parsePath: string;
}

export interface Attestor {
  attestorAddr: string;
  url: string;
}

export interface PrimusAttestation {
  recipient: string;
  request: AttNetworkRequest;
  responseResolve: AttNetworkResponseResolve[];
  data: string;
  attConditions: string;
  timestamp: number;
  additionParams: string;
  attestors: Attestor[];
  signatures: string[];
}

export interface HealthData {
  healthScore: number;
  bmi: string;
  bloodPressure: string;
  checkupDate: string;
  hospitalId: string;
}

export interface InvoiceData {
  invoiceId: string;
  amount: number;
  currency: string;
  hospitalId: string;
  hospitalAddress: string;
  patientRef: string;
  treatmentType: string;
  invoiceDate: string;
}

export interface AttestationResult {
  success: boolean;
  attestation?: PrimusAttestation;
  data?: HealthData | InvoiceData;
  dataHash?: string;
  error?: string;
}

// ============================================================================
// Primus Service Class
// ============================================================================

class PrimusService {
  private primus: PrimusNetwork | null = null;
  private initialized = false;

  /**
   * Check if Primus is configured
   */
  isConfigured(): boolean {
    return !!(
      PRIMUS_CONFIG.appId &&
      PRIMUS_CONFIG.healthTemplateId &&
      PRIMUS_CONFIG.invoiceTemplateId
    );
  }

  /**
   * Check if Primus Extension is installed
   */
  isExtensionInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    // Primus extension injects this into window
    return !!(window as any).primus || !!(window as any).ethereum?.isPrimus;
  }

  /**
   * Initialize Primus SDK
   * Must be called before any attestation operations
   */
  async initialize(provider: any): Promise<boolean> {
    if (this.initialized && this.primus) {
      return true;
    }

    try {
      this.primus = new PrimusNetwork();

      // Log supported chains
      console.log('Primus supported chains:', this.primus.supportedChainIds);

      // Initialize with provider and chain
      await this.primus.init(provider, PRIMUS_CONFIG.chainId);

      this.initialized = true;
      console.log('Primus SDK initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Primus SDK:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Generate health check attestation
   * Used during policy registration
   */
  async generateHealthAttestation(
    userAddress: string
  ): Promise<AttestationResult> {
    if (!this.primus || !this.initialized) {
      return {
        success: false,
        error: 'Primus SDK not initialized. Call initialize() first.',
      };
    }

    try {
      console.log('Starting health check attestation...');

      // Step 1: Submit task to Primus network
      const submitTaskParams = {
        templateId: PRIMUS_CONFIG.healthTemplateId,
        address: userAddress,
      };

      console.log('Submitting task:', submitTaskParams);
      const taskResult = await this.primus.submitTask(submitTaskParams);
      console.log('Task submitted:', taskResult);

      // Step 2: Perform attestation (opens hospital portal)
      const attestParams = {
        ...submitTaskParams,
        ...taskResult,
      };

      console.log('Starting attestation...');
      const attestResult = await this.primus.attest(attestParams);
      console.log('Attestation result:', attestResult);

      // Step 3: Verify and poll for result
      const verifyParams = {
        taskId: attestResult[0].taskId,
        reportTxHash: attestResult[0].reportTxHash,
      };

      console.log('Verifying attestation...');
      const finalResult = await this.primus.verifyAndPollTaskResult(verifyParams);
      console.log('Final result:', finalResult);

      // Step 4: Extract health data from attestation
      const attestation = finalResult as PrimusAttestation;
      const healthData = JSON.parse(attestation.data) as HealthData;

      // Step 5: Generate health data hash
      const dataHash = this.generateHealthDataHash(healthData);

      return {
        success: true,
        attestation,
        data: healthData,
        dataHash,
      };
    } catch (error) {
      console.error('Health attestation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Attestation failed',
      };
    }
  }

  /**
   * Generate invoice attestation
   * Used during claims verification
   */
  async generateInvoiceAttestation(
    userAddress: string,
    invoiceId?: string
  ): Promise<AttestationResult> {
    if (!this.primus || !this.initialized) {
      return {
        success: false,
        error: 'Primus SDK not initialized. Call initialize() first.',
      };
    }

    try {
      console.log('Starting invoice attestation...');

      // Step 1: Submit task
      const submitTaskParams = {
        templateId: PRIMUS_CONFIG.invoiceTemplateId,
        address: userAddress,
        // Pass invoice ID if provided (for URL substitution)
        ...(invoiceId && { params: { invoiceId } }),
      };

      const taskResult = await this.primus.submitTask(submitTaskParams);

      // Step 2: Perform attestation
      const attestParams = {
        ...submitTaskParams,
        ...taskResult,
      };

      const attestResult = await this.primus.attest(attestParams);

      // Step 3: Verify and poll
      const verifyParams = {
        taskId: attestResult[0].taskId,
        reportTxHash: attestResult[0].reportTxHash,
      };

      const finalResult = await this.primus.verifyAndPollTaskResult(verifyParams);

      // Step 4: Extract invoice data
      const attestation = finalResult as PrimusAttestation;
      const invoiceData = JSON.parse(attestation.data) as InvoiceData;

      // Step 5: Generate invoice hash
      const dataHash = this.generateInvoiceHash(invoiceData);

      return {
        success: true,
        attestation,
        data: invoiceData,
        dataHash,
      };
    } catch (error) {
      console.error('Invoice attestation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Attestation failed',
      };
    }
  }

  /**
   * Generate hash of health data
   * This hash is stored on-chain with the policy
   */
  generateHealthDataHash(healthData: HealthData): string {
    const encoded = encodePacked(
      ['uint256', 'string', 'string', 'string', 'string'],
      [
        BigInt(healthData.healthScore),
        healthData.bmi,
        healthData.bloodPressure,
        healthData.checkupDate,
        healthData.hospitalId,
      ]
    );
    return keccak256(encoded);
  }

  /**
   * Generate hash of invoice data
   * This hash is stored on-chain with the claim
   */
  generateInvoiceHash(invoiceData: InvoiceData): string {
    const encoded = encodePacked(
      ['string', 'uint256', 'string', 'string', 'string'],
      [
        invoiceData.invoiceId,
        BigInt(invoiceData.amount),
        invoiceData.hospitalId,
        invoiceData.hospitalAddress,
        invoiceData.invoiceDate,
      ]
    );
    return keccak256(encoded);
  }

  /**
   * Serialize attestation for API transmission
   */
  serializeAttestation(attestation: PrimusAttestation): string {
    return JSON.stringify(attestation);
  }

  /**
   * Deserialize attestation from API
   */
  deserializeAttestation(json: string): PrimusAttestation {
    return JSON.parse(json) as PrimusAttestation;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const primusService = new PrimusService();

// ============================================================================
// Mock Implementation (for development without Primus Extension)
// ============================================================================

export function generateMockHealthAttestation(
  userAddress: string
): AttestationResult {
  const healthData: HealthData = {
    healthScore: Math.floor(Math.random() * 15) + 85, // 85-99
    bmi: (Math.random() * 5 + 20).toFixed(1), // 20-25
    bloodPressure: `${Math.floor(Math.random() * 20) + 110}/${Math.floor(Math.random() * 10) + 70}`,
    checkupDate: new Date().toISOString().split('T')[0],
    hospitalId: 'hospital_mock_001',
  };

  const dataHash = keccak256(
    encodePacked(
      ['uint256', 'string', 'string', 'string', 'string'],
      [
        BigInt(healthData.healthScore),
        healthData.bmi,
        healthData.bloodPressure,
        healthData.checkupDate,
        healthData.hospitalId,
      ]
    )
  );

  const mockAttestation: PrimusAttestation = {
    recipient: userAddress,
    request: {
      url: 'https://mock-hospital.example.com/api/health',
      header: '{}',
      method: 'GET',
      body: '',
    },
    responseResolve: [
      { keyName: 'healthScore', parseType: 'int', parsePath: '$.data.healthScore' },
      { keyName: 'bmi', parseType: 'string', parsePath: '$.data.bmi' },
    ],
    data: JSON.stringify(healthData),
    attConditions: '[]',
    timestamp: Date.now(),
    additionParams: '{"mock": true}',
    attestors: [
      {
        attestorAddr: '0x0000000000000000000000000000000000000001',
        url: 'https://mock-attestor.primuslabs.xyz',
      },
    ],
    signatures: ['0x' + '00'.repeat(65)], // Mock signature
  };

  return {
    success: true,
    attestation: mockAttestation,
    data: healthData,
    dataHash,
  };
}

export function generateMockInvoiceAttestation(
  userAddress: string,
  amount: number = 500
): AttestationResult {
  const invoiceData: InvoiceData = {
    invoiceId: `INV-${Date.now()}`,
    amount: amount * 1_000_000, // Convert to USDC decimals
    currency: 'USDC',
    hospitalId: 'hospital_mock_001',
    hospitalAddress: '0x0000000000000000000000000000000000000002',
    patientRef: `PAT-${Math.random().toString(36).substring(7)}`,
    treatmentType: 'General Consultation',
    invoiceDate: new Date().toISOString().split('T')[0],
  };

  const dataHash = keccak256(
    encodePacked(
      ['string', 'uint256', 'string', 'string', 'string'],
      [
        invoiceData.invoiceId,
        BigInt(invoiceData.amount),
        invoiceData.hospitalId,
        invoiceData.hospitalAddress,
        invoiceData.invoiceDate,
      ]
    )
  );

  const mockAttestation: PrimusAttestation = {
    recipient: userAddress,
    request: {
      url: 'https://mock-hospital.example.com/api/invoice',
      header: '{}',
      method: 'GET',
      body: '',
    },
    responseResolve: [
      { keyName: 'invoiceId', parseType: 'string', parsePath: '$.data.id' },
      { keyName: 'amount', parseType: 'int', parsePath: '$.data.amount' },
    ],
    data: JSON.stringify(invoiceData),
    attConditions: '[]',
    timestamp: Date.now(),
    additionParams: '{"mock": true}',
    attestors: [
      {
        attestorAddr: '0x0000000000000000000000000000000000000001',
        url: 'https://mock-attestor.primuslabs.xyz',
      },
    ],
    signatures: ['0x' + '00'.repeat(65)],
  };

  return {
    success: true,
    attestation: mockAttestation,
    data: invoiceData,
    dataHash,
  };
}
```

### 4.3 Update Registration Page

Update `frontend/app/register/page.tsx` to use Primus:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, keccak256, encodePacked } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Wallet,
  FileCheck,
  Send,
  ArrowRight,
  ArrowLeft,
  ExternalLink
} from "lucide-react";

import {
  REGISTRY_ADDRESS,
  USDC_ADDRESS,
  registryAbi,
  erc20Abi
} from "@/lib/contracts";
import {
  primusService,
  generateMockHealthAttestation,
  type PrimusAttestation,
  type HealthData
} from "@/lib/primus";
import {
  generateSecret,
  generateCommitment,
  savePolicyData,
  formatUSDC
} from "@/lib/utils";
import { registerWithOracle } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

type Step = "input" | "verify" | "approve" | "register" | "complete";

interface StepInfo {
  id: Step;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS: StepInfo[] = [
  { id: "input", label: "Premium", icon: <Wallet className="w-4 h-4" /> },
  { id: "verify", label: "Verify Health", icon: <FileCheck className="w-4 h-4" /> },
  { id: "approve", label: "Approve USDC", icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: "register", label: "Register", icon: <Send className="w-4 h-4" /> },
  { id: "complete", label: "Complete", icon: <Shield className="w-4 h-4" /> },
];

const COVERAGE_MULTIPLIER = 10n;

// ============================================================================
// Component
// ============================================================================

export default function RegisterPage() {
  // Wallet state
  const { address, isConnected } = useAccount();

  // Form state
  const [step, setStep] = useState<Step>("input");
  const [premium, setPremium] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Primus state
  const [useMockProof, setUseMockProof] = useState(false);
  const [primusInitialized, setPrimusInitialized] = useState(false);

  // Verification state
  const [healthAttestation, setHealthAttestation] = useState<PrimusAttestation | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthDataHash, setHealthDataHash] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [commitment, setCommitment] = useState<string>("");

  // Contract interactions
  const { writeContract: approveUsdc, data: approveHash } = useWriteContract();
  const { writeContract: registerPolicy, data: registerHash } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isRegistering, isSuccess: registerSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize Primus on mount
  useEffect(() => {
    const initPrimus = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const initialized = await primusService.initialize((window as any).ethereum);
        setPrimusInitialized(initialized);

        // Check if extension is available
        if (!primusService.isExtensionInstalled()) {
          console.log('Primus extension not installed, using mock mode');
          setUseMockProof(true);
        }
      }
    };

    initPrimus();
  }, []);

  // Handle approve success
  useEffect(() => {
    if (approveSuccess) {
      setStep("register");
    }
  }, [approveSuccess]);

  // Handle register success
  useEffect(() => {
    if (registerSuccess && secret && healthDataHash && commitment) {
      // Save policy data to localStorage
      savePolicyData({
        secret,
        healthDataHash,
        commitment,
        registeredAt: Date.now(),
      });
      setStep("complete");
    }
  }, [registerSuccess, secret, healthDataHash, commitment]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleVerifyHealth = async () => {
    setError("");
    setIsLoading(true);

    try {
      let result;

      if (useMockProof || !primusInitialized) {
        // Use mock attestation for development
        console.log('Using mock health attestation');
        result = generateMockHealthAttestation(address!);
      } else {
        // Use real Primus attestation
        console.log('Generating real Primus attestation...');
        result = await primusService.generateHealthAttestation(address!);
      }

      if (!result.success || !result.attestation || !result.data || !result.dataHash) {
        throw new Error(result.error || 'Failed to generate attestation');
      }

      // Store attestation data
      setHealthAttestation(result.attestation);
      setHealthData(result.data as HealthData);
      setHealthDataHash(result.dataHash);

      // Generate secret and commitment
      const newSecret = generateSecret();
      const newCommitment = generateCommitment(newSecret, result.dataHash);
      setSecret(newSecret);
      setCommitment(newCommitment);

      // Verify with Oracle
      const oracleResult = await registerWithOracle({
        commitment: newCommitment,
        healthDataHash: result.dataHash,
        premium: parseUnits(premium, 6).toString(),
        attestation: result.attestation,
      });

      if (!oracleResult.success) {
        throw new Error(oracleResult.error || 'Oracle verification failed');
      }

      console.log('Oracle verification successful:', oracleResult);
      setStep("approve");
    } catch (err) {
      console.error('Health verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUsdc = async () => {
    setError("");

    try {
      const premiumAmount = parseUnits(premium, 6);

      approveUsdc({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [REGISTRY_ADDRESS, premiumAmount],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleRegisterPolicy = async () => {
    setError("");

    try {
      const premiumAmount = parseUnits(premium, 6);

      registerPolicy({
        address: REGISTRY_ADDRESS,
        abi: registryAbi,
        functionName: 'registerPolicy',
        args: [
          commitment as `0x${string}`,
          healthDataHash as `0x${string}`,
          premiumAmount,
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const premiumAmount = premium ? parseUnits(premium, 6) : 0n;
  const coverageAmount = premiumAmount * COVERAGE_MULTIPLIER;
  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  // ============================================================================
  // Render
  // ============================================================================

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to register for insurance.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Register Policy</h1>
        <p className="text-muted-foreground">
          Get coverage with privacy-preserving health verification
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2
                ${i <= currentStepIndex
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground text-muted-foreground'
                }`}
            >
              {s.icon}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2
                  ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStepIndex].label}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Input Premium */}
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="premium">Premium Amount (USDC)</Label>
                <Input
                  id="premium"
                  type="number"
                  placeholder="100"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  min="1"
                />
              </div>

              {premium && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Premium:</span>
                    <span className="font-mono">{premium} USDC</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Coverage (10x):</span>
                    <span className="font-mono text-green-600">
                      {formatUSDC(coverageAmount)} USDC
                    </span>
                  </div>
                </div>
              )}

              {/* Mode indicator */}
              <div className="flex items-center gap-2">
                <Badge variant={useMockProof ? "secondary" : "default"}>
                  {useMockProof ? "Mock Mode" : "Primus zkTLS"}
                </Badge>
                {!primusService.isExtensionInstalled() && (
                  <span className="text-xs text-muted-foreground">
                    Install Primus Extension for real verification
                  </span>
                )}
              </div>

              <Button
                onClick={() => setStep("verify")}
                disabled={!premium || parseFloat(premium) <= 0}
                className="w-full"
              >
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Verify Health */}
          {step === "verify" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">How it works:</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Click the button below to start verification</li>
                  <li>
                    {useMockProof
                      ? "Mock health data will be generated"
                      : "Log into your hospital portal when prompted"}
                  </li>
                  <li>
                    {useMockProof
                      ? "Data is simulated for development"
                      : "Primus attestors witness & sign your health data"}
                  </li>
                  <li>Oracle verifies the attestation</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                >
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handleVerifyHealth}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 w-4 h-4" />
                      {useMockProof ? "Generate Mock Verification" : "Start zkTLS Verification"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Approve USDC */}
          {step === "approve" && (
            <div className="space-y-4">
              {healthData && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">
                    Health Verified
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>Health Score: {healthData.healthScore}</p>
                    <p>BMI: {healthData.bmi}</p>
                    <p>Blood Pressure: {healthData.bloodPressure}</p>
                    <p>Checkup Date: {healthData.checkupDate}</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  Approve <strong>{premium} USDC</strong> to be transferred for your insurance premium.
                </p>
              </div>

              <Button
                onClick={handleApproveUsdc}
                disabled={isApproving}
                className="w-full"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 w-4 h-4" />
                    Approve USDC
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 4: Register Policy */}
          {step === "register" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Premium:</span>
                  <span className="font-mono">{premium} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Coverage:</span>
                  <span className="font-mono text-green-600">
                    {formatUSDC(coverageAmount)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Commitment:</span>
                  <span className="font-mono">
                    {commitment.slice(0, 10)}...{commitment.slice(-8)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleRegisterPolicy}
                disabled={isRegistering}
                className="w-full"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 w-4 h-4" />
                    Register Policy
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-green-600">
                  Policy Registered!
                </h3>
                <p className="text-muted-foreground">
                  Your insurance policy is now active.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg text-left space-y-2">
                <div className="flex justify-between">
                  <span>Coverage:</span>
                  <span className="font-mono text-green-600">
                    {formatUSDC(coverageAmount)} USDC
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Commitment (share with hospital):</span>
                  <p className="font-mono text-xs break-all mt-1">{commitment}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1"
                >
                  View Dashboard
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(commitment);
                  }}
                  className="flex-1"
                >
                  Copy Commitment
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.4 Update Claims Page

Update `frontend/app/claim/page.tsx` to use Primus for invoice verification:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  Search
} from "lucide-react";

import {
  CLAIMS_ADDRESS,
  claimsAbi,
  ClaimStatus,
  getClaimStatusLabel
} from "@/lib/contracts";
import {
  primusService,
  generateMockInvoiceAttestation,
  type PrimusAttestation,
  type InvoiceData
} from "@/lib/primus";
import { loadPolicyData, formatUSDC } from "@/lib/utils";
import { verifyClaimWithOracle } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface PolicyData {
  secret: string;
  commitment: string;
  healthDataHash: string;
  registeredAt: number;
}

// ============================================================================
// Component
// ============================================================================

export default function ClaimPage() {
  const { address, isConnected } = useAccount();

  // State
  const [claimId, setClaimId] = useState("");
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [useMockProof, setUseMockProof] = useState(true);

  // Primus state
  const [invoiceAttestation, setInvoiceAttestation] = useState<PrimusAttestation | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  // Load policy data on mount
  useEffect(() => {
    const data = loadPolicyData();
    setPolicyData(data);

    // Check Primus availability
    if (primusService.isExtensionInstalled() && primusService.isConfigured()) {
      setUseMockProof(false);
    }
  }, []);

  // Read claim from contract
  const { data: claim, isLoading: claimLoading, refetch: refetchClaim } = useReadContract({
    address: CLAIMS_ADDRESS,
    abi: claimsAbi,
    functionName: 'getClaim',
    args: claimId ? [claimId as `0x${string}`] : undefined,
    query: {
      enabled: !!claimId && claimId.startsWith('0x') && claimId.length === 66,
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleGenerateInvoiceProof = async () => {
    setError("");

    try {
      let result;

      if (useMockProof) {
        // Get amount from claim data
        const claimAmount = claim ? Number(claim[2]) / 1_000_000 : 500;
        result = generateMockInvoiceAttestation(address!, claimAmount);
      } else {
        // Initialize Primus if needed
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          await primusService.initialize((window as any).ethereum);
        }
        result = await primusService.generateInvoiceAttestation(address!);
      }

      if (!result.success || !result.attestation) {
        throw new Error(result.error || 'Failed to generate invoice proof');
      }

      setInvoiceAttestation(result.attestation);
      setInvoiceData(result.data as InvoiceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate proof');
    }
  };

  const handleVerifyClaim = async () => {
    setError("");
    setIsVerifying(true);

    try {
      if (!policyData) {
        throw new Error("No policy data found. Please register a policy first.");
      }

      if (!claim) {
        throw new Error("Claim not found. Please enter a valid claim ID.");
      }

      // Generate invoice attestation if not already done
      let attestation = invoiceAttestation;
      if (!attestation) {
        const result = useMockProof
          ? generateMockInvoiceAttestation(address!, Number(claim[2]) / 1_000_000)
          : await primusService.generateInvoiceAttestation(address!);

        if (!result.success || !result.attestation) {
          throw new Error(result.error || 'Failed to generate invoice proof');
        }
        attestation = result.attestation;
        setInvoiceAttestation(attestation);
      }

      // Verify with Oracle
      const result = await verifyClaimWithOracle({
        claimId: claimId as `0x${string}`,
        invoiceAttestation: attestation,
        ownershipProof: {
          commitment: policyData.commitment,
          secret: policyData.secret,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      setVerificationSuccess(true);

      // Refetch claim to get updated status
      setTimeout(() => {
        refetchClaim();
      }, 2000);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const claimStatus = claim ? Number(claim[4]) : ClaimStatus.NONE;
  const canVerify = claim && claimStatus === ClaimStatus.PENDING && policyData;

  // ============================================================================
  // Render
  // ============================================================================

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to verify claims.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Verify Claim</h1>
        <p className="text-muted-foreground">
          Prove your policy ownership to settle insurance claims
        </p>
      </div>

      {/* Policy Status */}
      {policyData ? (
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Policy loaded. Commitment: {policyData.commitment.slice(0, 10)}...
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No policy found. Please register a policy first.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Claim Lookup */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Claim
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="claimId">Claim ID</Label>
            <Input
              id="claimId"
              placeholder="0x..."
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the claim ID provided by the hospital
            </p>
          </div>

          {claimLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading claim...
            </div>
          )}

          {claim && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <Badge variant={claimStatus === ClaimStatus.SETTLED ? "default" : "secondary"}>
                  {getClaimStatusLabel(claimStatus)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-mono">{formatUSDC(claim[2])} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Hospital:</span>
                <span className="font-mono text-xs">
                  {(claim[1] as string).slice(0, 10)}...
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification */}
      {canVerify && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Verify & Settle
            </CardTitle>
            <CardDescription>
              Generate proof of invoice and policy ownership
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode indicator */}
            <div className="flex items-center gap-2">
              <Badge variant={useMockProof ? "secondary" : "default"}>
                {useMockProof ? "Mock Mode" : "Primus zkTLS"}
              </Badge>
            </div>

            {/* Invoice attestation status */}
            {invoiceAttestation && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Invoice proof generated successfully
                </AlertDescription>
              </Alert>
            )}

            <div className="p-4 bg-muted rounded-lg text-sm">
              <h4 className="font-semibold mb-2">Verification process:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Generate zkTLS proof of hospital invoice</li>
                <li>Sign proof with your policy secret</li>
                <li>Oracle verifies both proofs</li>
                <li>USDC automatically sent to hospital</li>
              </ol>
            </div>

            <Button
              onClick={handleVerifyClaim}
              disabled={isVerifying || !policyData}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 w-4 h-4" />
                  Verify & Settle Claim
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {verificationSuccess && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-600">
                  Claim Verified!
                </h3>
                <p className="text-muted-foreground">
                  Payment has been sent to the hospital.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 4.5 Update API Client

Update `frontend/lib/api.ts` to handle Primus attestations:

```typescript
/**
 * Oracle API Client
 *
 * Handles communication with the Curance Oracle service
 * for attestation verification and claim processing.
 */

import type { PrimusAttestation } from './primus';

// ============================================================================
// Configuration
// ============================================================================

const ORACLE_URL = process.env.NEXT_PUBLIC_ORACLE_URL || 'http://localhost:3001';

// ============================================================================
// Types
// ============================================================================

export interface RegisterRequest {
  commitment: string;
  healthDataHash: string;
  premium: string;
  attestation: PrimusAttestation;
}

export interface RegisterResponse {
  success: boolean;
  verified?: boolean;
  commitment?: string;
  healthDataHash?: string;
  error?: string;
}

export interface VerifyClaimRequest {
  claimId: `0x${string}`;
  invoiceAttestation: PrimusAttestation;
  ownershipProof: {
    commitment: string;
    secret: string;
  };
}

export interface VerifyClaimResponse {
  success: boolean;
  claimId?: string;
  txHash?: string;
  status?: string;
  amount?: string;
  hospital?: string;
  error?: string;
}

export interface ClaimStatusResponse {
  success: boolean;
  claimId?: string;
  status?: string;
  statusCode?: number;
  error?: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Register policy with Oracle verification
 * Sends Primus attestation for verification before on-chain registration
 */
export async function registerWithOracle(
  params: RegisterRequest
): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${ORACLE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commitment: params.commitment,
        healthDataHash: params.healthDataHash,
        premium: params.premium,
        attestation: params.attestation,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: data.success,
      verified: data.data?.verified,
      commitment: data.data?.commitment,
      healthDataHash: data.data?.healthDataHash,
      error: data.error,
    };
  } catch (error) {
    console.error('Register with Oracle error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Verify claim with Oracle
 * Sends invoice attestation and ownership proof for verification
 * Oracle will call enableClaim() on success
 */
export async function verifyClaimWithOracle(
  params: VerifyClaimRequest
): Promise<VerifyClaimResponse> {
  try {
    const response = await fetch(`${ORACLE_URL}/api/claims/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        claimId: params.claimId,
        invoiceAttestation: params.invoiceAttestation,
        ownershipProof: params.ownershipProof,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: data.success,
      claimId: data.data?.claimId,
      txHash: data.data?.txHash,
      status: data.data?.status,
      amount: data.data?.amount,
      hospital: data.data?.hospital,
      error: data.error,
    };
  } catch (error) {
    console.error('Verify claim with Oracle error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get claim status from Oracle
 */
export async function getClaimStatus(
  claimId: string
): Promise<ClaimStatusResponse> {
  try {
    const response = await fetch(`${ORACLE_URL}/api/claims/${claimId}/status`);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: data.success,
      claimId: data.data?.claimId,
      status: data.data?.status,
      statusCode: data.data?.statusCode,
      error: data.error,
    };
  } catch (error) {
    console.error('Get claim status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check Oracle health
 */
export async function checkOracleHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ORACLE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## 5. Step 3: Oracle Verification Service

### 5.1 Install Dependencies

```bash
cd oracle
npm install @primuslabs/network-core-sdk
```

### 5.2 Update Oracle Types

Update `oracle/src/types.ts`:

```typescript
/**
 * Oracle Service Types
 *
 * Types for Primus attestation verification and claim processing
 */

// ============================================================================
// Primus Attestation Types
// ============================================================================

export interface AttNetworkRequest {
  url: string;
  header: string;
  method: string;
  body: string;
}

export interface AttNetworkResponseResolve {
  keyName: string;
  parseType: string;
  parsePath: string;
}

export interface Attestor {
  attestorAddr: string;
  url: string;
}

export interface PrimusAttestation {
  recipient: string;
  request: AttNetworkRequest;
  responseResolve: AttNetworkResponseResolve[];
  data: string;
  attConditions: string;
  timestamp: number;
  additionParams: string;
  attestors: Attestor[];
  signatures: string[];
}

// ============================================================================
// Health Data Types
// ============================================================================

export interface HealthData {
  healthScore: number;
  bmi: string;
  bloodPressure: string;
  checkupDate: string;
  hospitalId: string;
}

export interface InvoiceData {
  invoiceId: string;
  amount: number;
  currency: string;
  hospitalId: string;
  hospitalAddress: string;
  patientRef: string;
  treatmentType: string;
  invoiceDate: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface RegisterRequest {
  commitment: string;
  healthDataHash: string;
  premium: string;
  attestation: PrimusAttestation;
}

export interface VerifyClaimRequest {
  claimId: string;
  invoiceAttestation: PrimusAttestation;
  ownershipProof: {
    commitment: string;
    secret: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Verification Result Types
// ============================================================================

export interface AttestationVerificationResult {
  valid: boolean;
  recipient?: string;
  data?: HealthData | InvoiceData;
  timestamp?: number;
  attestors?: string[];
  error?: string;
}
```

### 5.3 Create Primus Verification Service

Create `oracle/src/services/primus.ts`:

```typescript
/**
 * Primus Attestation Verification Service
 *
 * Verifies zkTLS attestations from Primus network by:
 * 1. Encoding attestation data
 * 2. Recovering signer addresses from signatures
 * 3. Checking signers against trusted attestors
 */

import {
  keccak256,
  encodePacked,
  recoverMessageAddress,
  encodeAbiParameters,
  parseAbiParameters,
  toHex,
  concat,
  slice
} from 'viem';
import { config } from '../config.js';
import type {
  PrimusAttestation,
  AttestationVerificationResult,
  HealthData,
  InvoiceData
} from '../types.js';

// ============================================================================
// Configuration
// ============================================================================

// Trusted Primus attestors (get from Primus documentation or contract)
// These are the official Primus network attestors
const TRUSTED_ATTESTORS: Set<string> = new Set(
  (config.trustedAttestors || '').split(',').map(a => a.toLowerCase().trim()).filter(Boolean)
);

// For development/testing, accept mock attestors
const MOCK_ATTESTOR = '0x0000000000000000000000000000000000000001'.toLowerCase();
const ALLOW_MOCK = process.env.NODE_ENV !== 'production';

// Attestation validity period (24 hours)
const ATTESTATION_VALIDITY_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Attestation Encoding
// ============================================================================

/**
 * Encode attestation request for hashing
 */
function encodeRequest(request: PrimusAttestation['request']): `0x${string}` {
  const encoded = encodePacked(
    ['string', 'string', 'string', 'string'],
    [request.url, request.header, request.method, request.body]
  );
  return keccak256(encoded);
}

/**
 * Encode response resolve array for hashing
 */
function encodeResponseResolve(
  resolves: PrimusAttestation['responseResolve']
): `0x${string}` {
  let combined = '0x' as `0x${string}`;

  for (const resolve of resolves) {
    const encoded = encodePacked(
      ['string', 'string', 'string'],
      [resolve.keyName, resolve.parseType, resolve.parsePath]
    );
    combined = keccak256(concat([combined, encoded]));
  }

  return combined;
}

/**
 * Encode full attestation for signature verification
 */
function encodeAttestation(attestation: PrimusAttestation): `0x${string}` {
  const requestHash = encodeRequest(attestation.request);
  const responseHash = encodeResponseResolve(attestation.responseResolve);

  const encoded = encodePacked(
    ['address', 'bytes32', 'bytes32', 'string', 'string', 'uint256', 'string'],
    [
      attestation.recipient as `0x${string}`,
      requestHash,
      responseHash,
      attestation.data,
      attestation.attConditions,
      BigInt(attestation.timestamp),
      attestation.additionParams,
    ]
  );

  return keccak256(encoded);
}

/**
 * Encode attestation as EIP-191 personal sign message
 */
function getSignableMessage(attestation: PrimusAttestation): `0x${string}` {
  const messageHash = encodeAttestation(attestation);
  // EIP-191: "\x19Ethereum Signed Message:\n32" + messageHash
  return messageHash;
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Recover signer address from signature
 */
async function recoverSigner(
  messageHash: `0x${string}`,
  signature: string
): Promise<string | null> {
  try {
    // Signature should be 65 bytes (130 hex chars + 0x)
    if (signature.length !== 132) {
      console.error('Invalid signature length:', signature.length);
      return null;
    }

    const recovered = await recoverMessageAddress({
      message: { raw: messageHash },
      signature: signature as `0x${string}`,
    });

    return recovered.toLowerCase();
  } catch (error) {
    console.error('Failed to recover signer:', error);
    return null;
  }
}

/**
 * Check if address is a trusted attestor
 */
function isTrustedAttestor(address: string): boolean {
  const normalized = address.toLowerCase();

  // Check trusted attestors
  if (TRUSTED_ATTESTORS.has(normalized)) {
    return true;
  }

  // In development, allow mock attestor
  if (ALLOW_MOCK && normalized === MOCK_ATTESTOR) {
    console.log('Accepting mock attestor in development mode');
    return true;
  }

  return false;
}

// ============================================================================
// Main Verification Functions
// ============================================================================

/**
 * Verify Primus attestation
 *
 * @param attestation - The attestation to verify
 * @returns Verification result with extracted data
 */
export async function verifyPrimusAttestation(
  attestation: PrimusAttestation
): Promise<AttestationVerificationResult> {
  try {
    console.log('Verifying Primus attestation...');
    console.log('Recipient:', attestation.recipient);
    console.log('Timestamp:', attestation.timestamp);
    console.log('Attestors:', attestation.attestors.length);
    console.log('Signatures:', attestation.signatures.length);

    // 1. Check attestation has signatures
    if (!attestation.signatures || attestation.signatures.length === 0) {
      return {
        valid: false,
        error: 'No signatures in attestation',
      };
    }

    // 2. Check attestation timestamp
    const now = Date.now();
    if (attestation.timestamp > now) {
      return {
        valid: false,
        error: 'Attestation timestamp is in the future',
      };
    }

    if (now - attestation.timestamp > ATTESTATION_VALIDITY_MS) {
      return {
        valid: false,
        error: 'Attestation has expired',
      };
    }

    // 3. Encode attestation for signature verification
    const messageHash = getSignableMessage(attestation);
    console.log('Message hash:', messageHash);

    // 4. Verify each signature
    const verifiedAttestors: string[] = [];

    for (let i = 0; i < attestation.signatures.length; i++) {
      const signature = attestation.signatures[i];
      const signer = await recoverSigner(messageHash, signature);

      if (!signer) {
        console.warn(`Failed to recover signer for signature ${i}`);
        continue;
      }

      console.log(`Signature ${i} recovered signer:`, signer);

      if (isTrustedAttestor(signer)) {
        verifiedAttestors.push(signer);
        console.log(`Signature ${i} verified from trusted attestor`);
      } else {
        console.warn(`Signer ${signer} is not a trusted attestor`);
      }
    }

    // 5. Require at least one valid attestor signature
    if (verifiedAttestors.length === 0) {
      return {
        valid: false,
        error: 'No valid attestor signatures found',
      };
    }

    // 6. Parse attestation data
    let data: HealthData | InvoiceData;
    try {
      data = JSON.parse(attestation.data);
    } catch {
      return {
        valid: false,
        error: 'Failed to parse attestation data',
      };
    }

    console.log('Attestation verified successfully');
    console.log('Verified attestors:', verifiedAttestors);

    return {
      valid: true,
      recipient: attestation.recipient,
      data,
      timestamp: attestation.timestamp,
      attestors: verifiedAttestors,
    };
  } catch (error) {
    console.error('Attestation verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify health attestation specifically
 */
export async function verifyHealthAttestation(
  attestation: PrimusAttestation
): Promise<AttestationVerificationResult> {
  const result = await verifyPrimusAttestation(attestation);

  if (!result.valid) {
    return result;
  }

  // Validate health data structure
  const healthData = result.data as HealthData;
  if (
    typeof healthData.healthScore !== 'number' ||
    typeof healthData.bmi !== 'string' ||
    typeof healthData.bloodPressure !== 'string'
  ) {
    return {
      valid: false,
      error: 'Invalid health data structure',
    };
  }

  // Validate health score is reasonable
  if (healthData.healthScore < 0 || healthData.healthScore > 100) {
    return {
      valid: false,
      error: 'Health score out of valid range',
    };
  }

  return result;
}

/**
 * Verify invoice attestation specifically
 */
export async function verifyInvoiceAttestation(
  attestation: PrimusAttestation
): Promise<AttestationVerificationResult> {
  const result = await verifyPrimusAttestation(attestation);

  if (!result.valid) {
    return result;
  }

  // Validate invoice data structure
  const invoiceData = result.data as InvoiceData;
  if (
    typeof invoiceData.invoiceId !== 'string' ||
    typeof invoiceData.amount !== 'number' ||
    typeof invoiceData.hospitalId !== 'string'
  ) {
    return {
      valid: false,
      error: 'Invalid invoice data structure',
    };
  }

  // Validate amount is positive
  if (invoiceData.amount <= 0) {
    return {
      valid: false,
      error: 'Invoice amount must be positive',
    };
  }

  return result;
}

/**
 * Verify ownership proof (secret + commitment)
 */
export function verifyOwnershipProof(
  secret: string,
  healthDataHash: string,
  expectedCommitment: string
): boolean {
  try {
    // Reconstruct commitment: keccak256(secret || healthDataHash)
    const computed = keccak256(
      encodePacked(['bytes32', 'bytes32'], [secret as `0x${string}`, healthDataHash as `0x${string}`])
    );

    return computed.toLowerCase() === expectedCommitment.toLowerCase();
  } catch (error) {
    console.error('Ownership verification error:', error);
    return false;
  }
}
```

### 5.4 Update Oracle Config

Update `oracle/src/config.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Blockchain
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',

  // Contracts
  registryAddress: process.env.REGISTRY_ADDRESS as `0x${string}`,
  claimsAddress: process.env.CLAIMS_ADDRESS as `0x${string}`,

  // Primus
  primusAppId: process.env.PRIMUS_APP_ID || '',
  primusAppSecret: process.env.PRIMUS_APP_SECRET || '',
  trustedAttestors: process.env.TRUSTED_ATTESTORS || '',
};

// Validate required config
const required = ['privateKey', 'rpcUrl', 'registryAddress', 'claimsAddress'];
for (const key of required) {
  if (!config[key as keyof typeof config]) {
    console.warn(`Warning: Missing required config: ${key}`);
  }
}
```

### 5.5 Update Registration Route

Update `oracle/src/routes/register.ts`:

```typescript
import { Router } from 'express';
import { verifyHealthAttestation } from '../services/primus.js';
import type { RegisterRequest, ApiResponse } from '../types.js';

const router = Router();

/**
 * POST /api/register
 *
 * Verify health attestation before policy registration.
 */
router.post('/', async (req, res) => {
  try {
    const body: RegisterRequest = req.body;

    console.log('Registration request received');
    console.log('Commitment:', body.commitment);
    console.log('Health data hash:', body.healthDataHash);

    // Validate request
    if (!body.commitment || !body.healthDataHash || !body.attestation) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: commitment, healthDataHash, attestation',
      };
      return res.status(400).json(response);
    }

    // Verify the Primus attestation
    console.log('Verifying Primus health attestation...');
    const verificationResult = await verifyHealthAttestation(body.attestation);

    if (!verificationResult.valid) {
      console.log('Attestation verification failed:', verificationResult.error);
      const response: ApiResponse = {
        success: false,
        error: verificationResult.error || 'Invalid health attestation',
      };
      return res.status(400).json(response);
    }

    console.log('Attestation verified successfully');
    console.log('Health data:', verificationResult.data);

    // Return verification result
    const response: ApiResponse = {
      success: true,
      data: {
        verified: true,
        commitment: body.commitment,
        healthDataHash: body.healthDataHash,
        healthData: verificationResult.data,
        attestors: verificationResult.attestors,
        timestamp: verificationResult.timestamp,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Registration error:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

export default router;
```

### 5.6 Update Claims Route

Update `oracle/src/routes/claims.ts`:

```typescript
import { Router } from 'express';
import { verifyInvoiceAttestation, verifyOwnershipProof } from '../services/primus.js';
import {
  enableClaim,
  rejectClaim,
  getClaimStatus,
  getClaim,
  isPolicyValid,
  getPolicy
} from '../services/contract.js';
import type { VerifyClaimRequest, ApiResponse, InvoiceData } from '../types.js';

const router = Router();

const STATUS_MAP = ['NONE', 'PENDING', 'VERIFIED', 'ENABLED', 'SETTLED', 'REJECTED'];

/**
 * POST /api/claims/verify
 *
 * Verify claim with invoice attestation and ownership proof.
 */
router.post('/verify', async (req, res) => {
  try {
    const body: VerifyClaimRequest = req.body;
    const claimId = body.claimId as `0x${string}`;

    console.log('Claim verification request received');
    console.log('Claim ID:', claimId);

    // Validate request
    if (!body.claimId || !body.invoiceAttestation || !body.ownershipProof) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields',
      };
      return res.status(400).json(response);
    }

    // 1. Check claim exists and is pending
    const status = await getClaimStatus(claimId);
    console.log('Current claim status:', STATUS_MAP[status]);

    if (status !== 1) { // 1 = PENDING
      const response: ApiResponse = {
        success: false,
        error: `Invalid claim status: ${STATUS_MAP[status] || 'UNKNOWN'}. Expected PENDING.`,
      };
      return res.status(400).json(response);
    }

    // 2. Get claim details
    const claim = await getClaim(claimId);
    console.log('Claim details:', claim);

    // 3. Verify invoice attestation (Primus zkTLS)
    console.log('Verifying invoice attestation...');
    const invoiceResult = await verifyInvoiceAttestation(body.invoiceAttestation);

    if (!invoiceResult.valid) {
      console.log('Invoice attestation invalid:', invoiceResult.error);
      await rejectClaim(claimId, 'Invalid invoice attestation');
      const response: ApiResponse = {
        success: false,
        error: invoiceResult.error || 'Invalid invoice attestation',
      };
      return res.status(400).json(response);
    }

    const invoiceData = invoiceResult.data as InvoiceData;
    console.log('Invoice data verified:', invoiceData);

    // 4. Verify ownership proof
    console.log('Verifying ownership proof...');

    // Get policy to retrieve health data hash
    const policy = await getPolicy(claim.policyCommitment);

    // Verify the secret produces the correct commitment
    // Note: In production, we'd verify a ZK proof instead of the raw secret
    const ownershipValid = verifyOwnershipProof(
      body.ownershipProof.secret,
      policy.healthDataHash as string, // Get from policy or frontend
      body.ownershipProof.commitment
    );

    if (!ownershipValid) {
      console.log('Ownership proof invalid');
      await rejectClaim(claimId, 'Invalid ownership proof');
      const response: ApiResponse = {
        success: false,
        error: 'Invalid ownership proof - commitment mismatch',
      };
      return res.status(400).json(response);
    }

    // 5. Verify commitment matches claim
    if (body.ownershipProof.commitment.toLowerCase() !== claim.policyCommitment.toLowerCase()) {
      console.log('Commitment mismatch');
      await rejectClaim(claimId, 'Commitment mismatch');
      const response: ApiResponse = {
        success: false,
        error: 'Policy commitment does not match claim',
      };
      return res.status(400).json(response);
    }

    // 6. Verify policy is still valid
    const policyValid = await isPolicyValid(claim.policyCommitment);
    if (!policyValid) {
      console.log('Policy not valid');
      await rejectClaim(claimId, 'Policy not valid or expired');
      const response: ApiResponse = {
        success: false,
        error: 'Policy not valid or expired',
      };
      return res.status(400).json(response);
    }

    // 7. All verifications passed - enable the claim
    console.log('All verifications passed. Enabling claim...');
    const receipt = await enableClaim(claimId);
    console.log('Claim enabled. TX:', receipt.transactionHash);

    const response: ApiResponse = {
      success: true,
      data: {
        claimId,
        txHash: receipt.transactionHash,
        status: 'SETTLED',
        amount: claim.amount.toString(),
        hospital: claim.hospital,
        invoiceData,
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

### 5.7 Update Oracle .env.example

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Blockchain Configuration
PRIVATE_KEY=0x...your_oracle_private_key
RPC_URL=https://sepolia.base.org

# Contract Addresses (update after deployment)
REGISTRY_ADDRESS=0x...
CLAIMS_ADDRESS=0x...

# Primus Configuration
PRIMUS_APP_ID=app_xxxxxxxxxxxxxx
PRIMUS_APP_SECRET=secret_xxxxxxxxxxxxxx

# Trusted Attestors (comma-separated, get from Primus documentation)
# These are the official Primus network attestor addresses
TRUSTED_ATTESTORS=0xAttestor1Address,0xAttestor2Address

# For Base Sepolia testnet, use these Primus attestors:
# (Check https://docs.primuslabs.xyz for current addresses)
```

---

## 6. Step 4: Smart Contract Integration

### 6.1 Optional: On-Chain Verification

If you want to verify attestations on-chain (in addition to Oracle verification), integrate with Primus contracts.

**Base Sepolia Primus Contract:** `0x3B6c58aa44e1Cd3012C1204E63148CC339933F13`

Update your contracts to call Primus verification:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPrimusZKTLS.sol";

contract CuranceClaimsWithPrimus {
    IPrimusZKTLS public primusVerifier;

    constructor(address _primusAddress) {
        primusVerifier = IPrimusZKTLS(_primusAddress);
    }

    function verifyAndEnableClaim(
        bytes32 claimId,
        Attestation calldata attestation
    ) external {
        // Verify attestation on-chain
        primusVerifier.verifyAttestation(attestation);

        // If verification passes (no revert), enable the claim
        _enableClaim(claimId);
    }
}
```

### 6.2 Contract Addresses Reference

| Network | Primus Contract |
|---------|-----------------|
| Base Mainnet | `0xCE7cefB3B5A7eB44B59F60327A53c9Ce53B0afdE` |
| Base Sepolia | `0x3B6c58aa44e1Cd3012C1204E63148CC339933F13` |
| Ethereum Sepolia | Various (check docs) |

---

## 7. Step 5: End-to-End Testing

### 7.1 Start Services

**Terminal 1: Oracle**
```bash
cd oracle
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

**Terminal 2: Frontend**
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### 7.2 Test Registration Flow

1. **Install Primus Extension** (optional, for real zkTLS)
   - Download from Primus Labs
   - Or use mock mode for testing

2. **Connect Wallet**
   - Open http://localhost:3000
   - Connect MetaMask (Base Sepolia)

3. **Register Policy**
   - Go to /register
   - Enter premium amount (e.g., 100 USDC)
   - Click "Verify Health"
   - If using mock mode: generates fake health data
   - If using Primus: opens hospital portal for zkTLS
   - Approve USDC transfer
   - Register policy on-chain

4. **Verify Success**
   - Check console for attestation verification logs
   - Policy should be visible on /dashboard
   - Commitment stored in localStorage

### 7.3 Test Claims Flow

1. **Create Claim (Hospital)**
   - Open new browser/incognito with different wallet
   - Go to /hospital
   - Enter patient's commitment
   - Enter treatment amount
   - Create claim on-chain

2. **Verify Claim (Patient)**
   - Go back to patient wallet
   - Go to /claim
   - Enter claim ID
   - Click "Verify & Settle"
   - Invoice attestation generated
   - Oracle verifies and settles

3. **Verify Settlement**
   - Check claim status: SETTLED
   - Hospital receives USDC
   - Policy coverage updated

### 7.4 Debug Checklist

- [ ] Oracle health check: `curl http://localhost:3001/health`
- [ ] Frontend loads without errors
- [ ] Wallet connects to Base Sepolia
- [ ] Mock attestation generates valid data
- [ ] Oracle accepts attestation
- [ ] Contract calls succeed
- [ ] USDC transfers complete

---

## 8. Troubleshooting

### Common Issues

**1. "No valid attestor signatures found"**
- Check TRUSTED_ATTESTORS in Oracle .env
- In development, mock attestor should be auto-accepted
- Get real attestor addresses from Primus docs

**2. "Primus SDK not initialized"**
- Ensure wallet is connected before calling primus methods
- Check browser console for initialization errors
- Verify chain ID matches (84532 for Base Sepolia)

**3. "Attestation has expired"**
- Attestations valid for 24 hours
- Generate fresh attestation for registration/claims

**4. "Policy not found"**
- Check localStorage for saved policy data
- Verify commitment matches between frontend and contract

**5. "Transaction reverted"**
- Check Oracle wallet has ETH for gas
- Verify contract addresses are correct
- Check claim status before verifying

### Getting Help

- **Primus Discord**: https://discord.gg/primuslabs
- **Primus Docs**: https://docs.primuslabs.xyz
- **GitHub Issues**: https://github.com/primus-labs

---

## Summary

### Files Created/Updated

**Frontend:**
- `frontend/lib/primus.ts` - Primus SDK integration
- `frontend/lib/api.ts` - Updated Oracle API client
- `frontend/app/register/page.tsx` - Updated with Primus
- `frontend/app/claim/page.tsx` - Updated with Primus

**Oracle:**
- `oracle/src/types.ts` - Primus attestation types
- `oracle/src/services/primus.ts` - Attestation verification
- `oracle/src/routes/register.ts` - Updated verification
- `oracle/src/routes/claims.ts` - Updated verification
- `oracle/src/config.ts` - Added Primus config

**Environment:**
- `frontend/.env.local` - Added Primus credentials
- `oracle/.env` - Added Primus and attestor config

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        CURANCE FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. REGISTRATION                                                 │
│     Patient → Primus SDK → Hospital Portal → Attestation        │
│     Attestation → Oracle (verify sigs) → OK                     │
│     Patient → CuranceRegistry.registerPolicy()                  │
│                                                                  │
│  2. CLAIMS                                                       │
│     Hospital → CuranceClaims.createClaim() → PENDING            │
│     Patient → Primus SDK → Invoice Portal → Attestation         │
│     Attestation + Secret → Oracle (verify both)                 │
│     Oracle → CuranceClaims.enableClaim() → SETTLED              │
│     USDC → Hospital                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Security Considerations

1. **Never expose appSecret in frontend** - Use for backend only
2. **Validate attestation timestamps** - Prevent replay attacks
3. **Check trusted attestors** - Only accept Primus network signatures
4. **Verify commitment matches** - Prevent claim hijacking
5. **Rate limit Oracle endpoints** - Prevent DoS
