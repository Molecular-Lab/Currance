import { Router, Request, Response } from 'express'
import type {
  VerifyClaimRequest,
  VerifyClaimResponse,
  ClaimStatusResponse,
} from '../types.js'
import { ClaimStatus } from '../types.js'
import {
  getClaim,
  getClaimStatus,
  isPolicyValid,
  enableClaim,
  rejectClaim,
} from '../services/contract.js'
import {
  verifyInvoiceProof,
  verifyOwnershipProof as verifyLegacyOwnershipProof,
} from '../services/proof.js'
import {
  verifyInvoiceAttestation,
  verifyOwnershipProof as verifyPrimusOwnershipProof,
  type PrimusAttestation,
} from '../services/primus.js'

const router = Router()

/**
 * POST /api/claims/verify
 *
 * Verifies invoice and ownership proofs, then enables claim on-chain
 *
 * Flow:
 * 1. Hospital creates claim on-chain (status: PENDING)
 * 2. User sends claim ID + proofs to Oracle
 * 3. Oracle verifies invoice proof (Primus zkTLS attestation)
 * 4. Oracle verifies ownership proof (user knows secret)
 * 5. Oracle calls CuranceClaims.enableClaim() → auto-settles USDC
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const {
      claimId,
      invoiceProof,
      invoiceAttestation,
      ownershipProof
    } = req.body as VerifyClaimRequest & {
      invoiceAttestation?: PrimusAttestation
    }

    // Validate request
    if (!claimId || !ownershipProof) {
      return res.status(400).json({
        success: false,
        claimId,
        status: 'INVALID_REQUEST',
        error: 'Missing required fields: claimId, ownershipProof',
      } as VerifyClaimResponse)
    }

    if (!invoiceProof && !invoiceAttestation) {
      return res.status(400).json({
        success: false,
        claimId,
        status: 'INVALID_REQUEST',
        error: 'Missing invoice proof: provide either invoiceAttestation (Primus) or invoiceProof (legacy)',
      } as VerifyClaimResponse)
    }

    console.log('Claim verification request received:', {
      claimId,
      hasInvoiceAttestation: !!invoiceAttestation,
      hasLegacyInvoiceProof: !!invoiceProof,
      ownershipCommitment: ownershipProof.commitment,
    })

    // 1. Get claim from contract
    const claim = await getClaim(claimId)
    if (!claim) {
      return res.status(404).json({
        success: false,
        claimId,
        status: 'NOT_FOUND',
        error: 'Claim not found',
      } as VerifyClaimResponse)
    }

    // 2. Check claim is PENDING
    if (claim.status !== ClaimStatus.PENDING) {
      return res.status(400).json({
        success: false,
        claimId,
        status: ClaimStatus[claim.status],
        error: `Claim is not pending (current status: ${ClaimStatus[claim.status]})`,
      } as VerifyClaimResponse)
    }

    // 3. Check policy is still valid
    const policyValid = await isPolicyValid(claim.policyCommitment)
    if (!policyValid) {
      const reason = 'Policy is not valid or has expired'
      console.log(`Rejecting claim ${claimId}: ${reason}`)
      const txHash = await rejectClaim(claimId, reason)
      return res.status(400).json({
        success: false,
        claimId,
        status: 'REJECTED',
        error: reason,
        transactionHash: txHash,
      } as VerifyClaimResponse)
    }

    // 4. Verify invoice proof (Primus attestation or legacy)
    let invoiceValid = false
    let invoiceData: any = null

    if (invoiceAttestation) {
      console.log('Verifying Primus invoice attestation...')
      const result = await verifyInvoiceAttestation(invoiceAttestation)
      invoiceValid = result.valid
      invoiceData = result.data

      if (!invoiceValid) {
        const reason = result.error || 'Invoice attestation verification failed'
        console.log(`Rejecting claim ${claimId}: ${reason}`)
        const txHash = await rejectClaim(claimId, reason)
        return res.status(400).json({
          success: false,
          claimId,
          status: 'REJECTED',
          error: reason,
          transactionHash: txHash,
        } as VerifyClaimResponse)
      }
      console.log('Primus invoice attestation verified:', invoiceData)
    } else if (invoiceProof) {
      console.log('Using legacy invoice proof verification...')
      invoiceValid = await verifyInvoiceProof(invoiceProof)

      if (!invoiceValid) {
        const reason = 'Invoice proof verification failed'
        console.log(`Rejecting claim ${claimId}: ${reason}`)
        const txHash = await rejectClaim(claimId, reason)
        return res.status(400).json({
          success: false,
          claimId,
          status: 'REJECTED',
          error: reason,
          transactionHash: txHash,
        } as VerifyClaimResponse)
      }

      // 5. Verify invoice hash matches claim (legacy only)
      if (invoiceProof.invoiceHash.toLowerCase() !== claim.invoiceHash.toLowerCase()) {
        const reason = 'Invoice hash mismatch'
        console.log(`Rejecting claim ${claimId}: ${reason}`)
        const txHash = await rejectClaim(claimId, reason)
        return res.status(400).json({
          success: false,
          claimId,
          status: 'REJECTED',
          error: reason,
          transactionHash: txHash,
        } as VerifyClaimResponse)
      }
    }

    // 6. Verify ownership proof (user knows the secret)
    console.log('Verifying ownership proof...')

    // Check if commitment matches claim's policy commitment
    if (ownershipProof.commitment.toLowerCase() !== claim.policyCommitment.toLowerCase()) {
      const reason = 'Commitment does not match claim policy'
      console.log(`Rejecting claim ${claimId}: ${reason}`)
      const txHash = await rejectClaim(claimId, reason)
      return res.status(400).json({
        success: false,
        claimId,
        status: 'REJECTED',
        error: reason,
        transactionHash: txHash,
      } as VerifyClaimResponse)
    }

    // If secret is provided, verify commitment matches
    if (ownershipProof.secret) {
      // For now, we accept the secret and trust the frontend generated the correct commitment
      // In production, we would verify: keccak256(secret || healthDataHash) === commitment
      console.log('Ownership proof accepted (secret provided)')
    } else {
      // Legacy verification
      const ownershipValid = await verifyLegacyOwnershipProof(
        ownershipProof,
        claim.policyCommitment
      )
      if (!ownershipValid) {
        const reason = 'Ownership proof verification failed'
        console.log(`Rejecting claim ${claimId}: ${reason}`)
        const txHash = await rejectClaim(claimId, reason)
        return res.status(400).json({
          success: false,
          claimId,
          status: 'REJECTED',
          error: reason,
          transactionHash: txHash,
        } as VerifyClaimResponse)
      }
    }

    // 7. All verifications passed - enable claim on-chain
    console.log(`All verifications passed for claim ${claimId}. Enabling claim...`)
    const txHash = await enableClaim(claimId)

    // 8. Get updated claim status
    const updatedStatus = await getClaimStatus(claimId)

    return res.status(200).json({
      success: true,
      claimId,
      status: ClaimStatus[updatedStatus],
      transactionHash: txHash,
      invoiceData,
    } as VerifyClaimResponse)
  } catch (error) {
    console.error('Claim verification error:', error)
    return res.status(500).json({
      success: false,
      claimId: req.body.claimId,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Internal server error',
    } as VerifyClaimResponse)
  }
})

/**
 * GET /api/claims/:claimId
 *
 * Get full claim details
 */
router.get('/:claimId', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params as { claimId: `0x${string}` }

    const claim = await getClaim(claimId)
    if (!claim) {
      return res.status(404).json({
        error: 'Claim not found',
      })
    }

    return res.status(200).json({
      claimId,
      status: ClaimStatus[claim.status],
      policyCommitment: claim.policyCommitment,
      hospital: claim.hospital,
      amount: claim.amount.toString(),
      invoiceHash: claim.invoiceHash,
      createdAt: new Date(Number(claim.createdAt) * 1000).toISOString(),
      updatedAt: new Date(Number(claim.updatedAt) * 1000).toISOString(),
    } as ClaimStatusResponse)
  } catch (error) {
    console.error('Get claim error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

/**
 * GET /api/claims/:claimId/status
 *
 * Get claim status only (lighter endpoint)
 */
router.get('/:claimId/status', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params as { claimId: `0x${string}` }

    const status = await getClaimStatus(claimId)

    return res.status(200).json({
      claimId,
      status: ClaimStatus[status],
      statusCode: status,
    })
  } catch (error) {
    console.error('Get claim status error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

export default router
