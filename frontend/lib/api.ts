/**
 * Oracle API Client
 *
 * Handles communication with the Oracle service for proof verification
 * Supports both Primus zkTLS attestations and legacy proofs
 */

import type { PrimusAttestation } from './primus'

const ORACLE_URL = process.env.NEXT_PUBLIC_ORACLE_URL || 'http://localhost:3001'

// ============================================================================
// Legacy Types (backward compatibility)
// ============================================================================

export interface HealthProof {
  signature: string
  timestamp: number
  hospitalId: string
}

export interface InvoiceProof {
  signature: string
  invoiceHash: `0x${string}`
  hospitalId: string
}

export interface OwnershipProof {
  commitment: `0x${string}`
  signature?: string
  secret?: string
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface RegisterRequest {
  commitment: `0x${string}`
  healthDataHash: `0x${string}`
  premium: string
  // Primus attestation (preferred)
  attestation?: PrimusAttestation
  // Legacy proof (backward compatibility)
  proof?: HealthProof
}

export interface RegisterResponse {
  success: boolean
  verified: boolean
  data?: {
    healthData?: any
    attestors?: string[]
    timestamp?: number
  }
  error?: string
}

export interface VerifyClaimRequest {
  claimId: `0x${string}`
  // Primus attestation (preferred)
  invoiceAttestation?: PrimusAttestation
  // Legacy proof (backward compatibility)
  invoiceProof?: InvoiceProof
  ownershipProof: OwnershipProof
}

export interface VerifyClaimResponse {
  success: boolean
  claimId: `0x${string}`
  status: string
  transactionHash?: `0x${string}`
  invoiceData?: any
  error?: string
}

export interface ClaimStatusResponse {
  claimId: `0x${string}`
  status: string
  statusCode: number
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Register with Oracle - Verify health proof before policy registration
 *
 * @param params - Registration parameters with attestation or legacy proof
 * @returns Registration response with verification result
 */
export async function registerWithOracle(params: RegisterRequest): Promise<RegisterResponse> {
  try {
    console.log('Registering with Oracle:', {
      commitment: params.commitment,
      hasAttestation: !!params.attestation,
      hasLegacyProof: !!params.proof,
    })

    const response = await fetch(`${ORACLE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: data.error || 'Oracle registration failed',
      }
    }

    return {
      success: data.success,
      verified: data.verified || data.success,
      data: data.data,
      error: data.error,
    }
  } catch (error) {
    console.error('Oracle registration error:', error)
    return {
      success: false,
      verified: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Verify claim with Oracle - Verify proofs and enable claim on-chain
 *
 * @param params - Claim verification parameters
 * @returns Verification response with transaction hash on success
 */
export async function verifyClaimWithOracle(
  params: VerifyClaimRequest
): Promise<VerifyClaimResponse> {
  try {
    console.log('Verifying claim with Oracle:', {
      claimId: params.claimId,
      hasInvoiceAttestation: !!params.invoiceAttestation,
      hasLegacyInvoiceProof: !!params.invoiceProof,
    })

    const response = await fetch(`${ORACLE_URL}/api/claims/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        claimId: params.claimId,
        status: data.status || 'ERROR',
        error: data.error || 'Claim verification failed',
      }
    }

    return {
      success: data.success,
      claimId: data.claimId || params.claimId,
      status: data.status,
      transactionHash: data.transactionHash,
      invoiceData: data.invoiceData,
      error: data.error,
    }
  } catch (error) {
    console.error('Claim verification error:', error)
    return {
      success: false,
      claimId: params.claimId,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Get claim status from Oracle
 */
export async function getClaimStatus(claimId: `0x${string}`): Promise<ClaimStatusResponse | null> {
  try {
    const response = await fetch(`${ORACLE_URL}/api/claims/${claimId}/status`)

    if (!response.ok) {
      console.error('Failed to get claim status:', response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Get claim status error:', error)
    return null
  }
}

/**
 * Get full claim details from Oracle
 */
export async function getClaimDetails(claimId: `0x${string}`) {
  try {
    const response = await fetch(`${ORACLE_URL}/api/claims/${claimId}`)

    if (!response.ok) {
      console.error('Failed to get claim details:', response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Get claim details error:', error)
    return null
  }
}

/**
 * Health check for Oracle service
 */
export async function checkOracleHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ORACLE_URL}/health`)
    return response.ok
  } catch (error) {
    console.error('Oracle health check failed:', error)
    return false
  }
}

/**
 * Get Oracle service info
 */
export async function getOracleInfo(): Promise<{
  status: string
  contracts: {
    registry: string
    claims: string
  }
} | null> {
  try {
    const response = await fetch(`${ORACLE_URL}/health`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Get Oracle info error:', error)
    return null
  }
}
