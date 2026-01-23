import { erc20Abi, parseAbi } from "viem"

// Contract addresses - set these after deployment
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`
export const CLAIMS_ADDRESS = (process.env.NEXT_PUBLIC_CLAIMS_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`

// Re-export ERC20 ABI for USDC
export { erc20Abi }

// CuranceRegistry ABI (handles policy registration and management)
export const registryAbi = parseAbi([
  'function registerPolicy(bytes32 commitment, bytes32 healthDataHash, uint256 premium) external',
  'function getPolicy(bytes32 commitment) view returns (uint256 premium, uint256 coverageAmount, uint256 usedCoverage, uint256 startTime, uint256 expiryTime, bool isActive)',
  'function isPolicyValid(bytes32 commitment) view returns (bool)',
  'function getRemainingCoverage(bytes32 commitment) view returns (uint256)',
  'event PolicyRegistered(bytes32 indexed commitment, uint256 coverageAmount, uint256 expiryTime)',
])

// CuranceClaims ABI (handles claim creation and settlement)
export const claimsAbi = parseAbi([
  'function createClaim(bytes32 policyCommitment, uint256 amount, bytes32 invoiceHash) external returns (bytes32)',
  'function getClaim(bytes32 claimId) view returns (bytes32 policyCommitment, address hospital, uint256 amount, bytes32 invoiceHash, uint8 status, uint256 createdAt, uint256 updatedAt)',
  'function getClaimStatus(bytes32 claimId) view returns (uint8)',
  'function enableClaim(bytes32 claimId) external',
  'function rejectClaim(bytes32 claimId, string calldata reason) external',
  'event ClaimCreated(bytes32 indexed claimId, bytes32 indexed policyCommitment, address indexed hospital, uint256 amount)',
  'event ClaimEnabled(bytes32 indexed claimId)',
  'event ClaimSettled(bytes32 indexed claimId, uint256 amount)',
  'event ClaimRejected(bytes32 indexed claimId, string reason)',
])

// Claim status enum (matches smart contract)
export enum ClaimStatus {
  NONE = 0,
  PENDING = 1,
  VERIFIED = 2,
  ENABLED = 3,
  SETTLED = 4,
  REJECTED = 5,
}

export function getClaimStatusLabel(status: number): string {
  switch (status) {
    case ClaimStatus.NONE:
      return "None"
    case ClaimStatus.PENDING:
      return "Pending"
    case ClaimStatus.VERIFIED:
      return "Verified"
    case ClaimStatus.ENABLED:
      return "Enabled"
    case ClaimStatus.SETTLED:
      return "Settled"
    case ClaimStatus.REJECTED:
      return "Rejected"
    default:
      return "Unknown"
  }
}

// Type definitions for contract responses
export interface PolicyData {
  premium: bigint
  coverageAmount: bigint
  usedCoverage: bigint
  startTime: bigint
  expiryTime: bigint
  isActive: boolean
}

export interface ClaimData {
  policyCommitment: `0x${string}`
  hospital: `0x${string}`
  amount: bigint
  invoiceHash: `0x${string}`
  status: ClaimStatus
  createdAt: bigint
  updatedAt: bigint
}
