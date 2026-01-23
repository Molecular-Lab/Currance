import { Address } from 'viem'

// Request/Response Types

export interface RegisterRequest {
  commitment: `0x${string}`
  healthDataHash: `0x${string}`
  premium: string
  proof: HealthProof
}

export interface RegisterResponse {
  success: boolean
  verified: boolean
  error?: string
}

export interface VerifyClaimRequest {
  claimId: `0x${string}`
  invoiceProof: InvoiceProof
  ownershipProof: OwnershipProof
}

export interface VerifyClaimResponse {
  success: boolean
  claimId: `0x${string}`
  status: string
  transactionHash?: `0x${string}`
  error?: string
}

export interface ClaimStatusResponse {
  claimId: `0x${string}`
  status: ClaimStatus
  policyCommitment: `0x${string}`
  hospital: Address
  amount: string
  invoiceHash: `0x${string}`
  createdAt: string
  updatedAt: string
}

// Proof Types

export interface HealthProof {
  signature: string
  timestamp: number
  hospitalId: string
  // TODO: Add Reclaim Protocol proof structure
  // proof?: ReclaimProof
}

export interface InvoiceProof {
  signature: string
  invoiceHash: `0x${string}`
  hospitalId: string
  // TODO: Add Reclaim Protocol proof structure
  // proof?: ReclaimProof
}

export interface OwnershipProof {
  commitment: `0x${string}`
  signature: string
  // User proves they know the secret that generated the commitment
}

// Claim Status Enum (matches smart contract)
export enum ClaimStatus {
  NONE = 0,
  PENDING = 1,
  VERIFIED = 2,
  ENABLED = 3,
  SETTLED = 4,
  REJECTED = 5
}

// Smart Contract Types (from chain)

export interface Policy {
  premium: bigint
  coverageAmount: bigint
  usedCoverage: bigint
  startTime: bigint
  expiryTime: bigint
  isActive: boolean
}

export interface Claim {
  policyCommitment: `0x${string}`
  hospital: Address
  amount: bigint
  invoiceHash: `0x${string}`
  status: ClaimStatus
  createdAt: bigint
  updatedAt: bigint
}
