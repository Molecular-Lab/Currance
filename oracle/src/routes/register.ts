import { Router, Request, Response } from 'express'
import type { RegisterRequest, RegisterResponse } from '../types.js'
import { verifyHealthProof } from '../services/proof.js'
import { verifyHealthAttestation, type PrimusAttestation } from '../services/primus.js'

const router = Router()

/**
 * POST /api/register
 *
 * Verifies health proof before user registers policy on-chain
 *
 * Flow:
 * 1. User sends health proof (Primus attestation) to Oracle
 * 2. Oracle verifies zkTLS attestation signatures
 * 3. Oracle returns verification result
 * 4. Frontend calls CuranceRegistry.registerPolicy() directly
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { commitment, healthDataHash, premium, proof, attestation } = req.body as RegisterRequest & {
      attestation?: PrimusAttestation
    }

    // Validate request
    if (!commitment || !healthDataHash || !premium) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Missing required fields: commitment, healthDataHash, premium',
      } as RegisterResponse)
    }

    console.log('Registration request received:', {
      commitment,
      healthDataHash,
      premium,
      hasAttestation: !!attestation,
      hasLegacyProof: !!proof,
    })

    // If Primus attestation is provided, verify it
    if (attestation) {
      console.log('Verifying Primus attestation...')
      const result = await verifyHealthAttestation(attestation)

      if (!result.valid) {
        console.log('Primus attestation verification failed:', result.error)
        return res.status(400).json({
          success: false,
          verified: false,
          error: result.error || 'Health attestation verification failed',
        } as RegisterResponse)
      }

      console.log('Primus attestation verified successfully')
      console.log('Health data:', result.data)
      console.log('Verified attestors:', result.attestors)

      return res.status(200).json({
        success: true,
        verified: true,
        data: {
          healthData: result.data,
          attestors: result.attestors,
          timestamp: result.timestamp,
        },
      } as RegisterResponse)
    }

    // Fallback to legacy proof verification (for backward compatibility)
    if (proof) {
      console.log('Using legacy proof verification...')
      const verified = await verifyHealthProof(proof)

      if (!verified) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Health proof verification failed',
        } as RegisterResponse)
      }

      console.log('Legacy proof verified successfully for commitment:', commitment)

      return res.status(200).json({
        success: true,
        verified: true,
      } as RegisterResponse)
    }

    // No proof provided
    return res.status(400).json({
      success: false,
      verified: false,
      error: 'Missing proof: provide either attestation (Primus) or proof (legacy)',
    } as RegisterResponse)
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({
      success: false,
      verified: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    } as RegisterResponse)
  }
})

export default router
