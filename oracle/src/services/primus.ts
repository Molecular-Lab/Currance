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
  concat,
  type Hex
} from 'viem';
import { config } from '../config.js';

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

export interface AttestationVerificationResult {
  valid: boolean;
  recipient?: string;
  data?: HealthData | InvoiceData;
  timestamp?: number;
  attestors?: string[];
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const TRUSTED_ATTESTORS: Set<string> = new Set(
  (config.trustedAttestors || '').split(',').map(a => a.toLowerCase().trim()).filter(Boolean)
);

const MOCK_ATTESTOR = '0x0000000000000000000000000000000000000001'.toLowerCase();
const ALLOW_MOCK = config.nodeEnv !== 'production';
const ATTESTATION_VALIDITY_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Attestation Encoding
// ============================================================================

function encodeRequest(request: AttNetworkRequest): Hex {
  const encoded = encodePacked(
    ['string', 'string', 'string', 'string'],
    [request.url, request.header, request.method, request.body]
  );
  return keccak256(encoded);
}

function encodeResponseResolve(resolves: AttNetworkResponseResolve[]): Hex {
  let combined = '0x' as Hex;

  for (const resolve of resolves) {
    const encoded = encodePacked(
      ['string', 'string', 'string'],
      [resolve.keyName, resolve.parseType, resolve.parsePath]
    );
    combined = keccak256(concat([combined, encoded]));
  }

  return combined;
}

function encodeAttestation(attestation: PrimusAttestation): Hex {
  const requestHash = encodeRequest(attestation.request);
  const responseHash = encodeResponseResolve(attestation.responseResolve);

  const encoded = encodePacked(
    ['address', 'bytes32', 'bytes32', 'string', 'string', 'uint256', 'string'],
    [
      attestation.recipient as Hex,
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

function getSignableMessage(attestation: PrimusAttestation): Hex {
  return encodeAttestation(attestation);
}

// ============================================================================
// Signature Verification
// ============================================================================

async function recoverSigner(
  messageHash: Hex,
  signature: string
): Promise<string | null> {
  try {
    if (signature.length !== 132) {
      console.error('Invalid signature length:', signature.length);
      return null;
    }

    const recovered = await recoverMessageAddress({
      message: { raw: messageHash },
      signature: signature as Hex,
    });

    return recovered.toLowerCase();
  } catch (error) {
    console.error('Failed to recover signer:', error);
    return null;
  }
}

function isTrustedAttestor(address: string): boolean {
  const normalized = address.toLowerCase();

  if (TRUSTED_ATTESTORS.has(normalized)) {
    return true;
  }

  if (ALLOW_MOCK && normalized === MOCK_ATTESTOR) {
    console.log('Accepting mock attestor in development mode');
    return true;
  }

  return false;
}

// ============================================================================
// Main Verification Functions
// ============================================================================

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
    if (attestation.timestamp > now + 60000) { // Allow 1 min clock skew
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

export async function verifyHealthAttestation(
  attestation: PrimusAttestation
): Promise<AttestationVerificationResult> {
  const result = await verifyPrimusAttestation(attestation);

  if (!result.valid) {
    return result;
  }

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

  if (healthData.healthScore < 0 || healthData.healthScore > 100) {
    return {
      valid: false,
      error: 'Health score out of valid range',
    };
  }

  return result;
}

export async function verifyInvoiceAttestation(
  attestation: PrimusAttestation
): Promise<AttestationVerificationResult> {
  const result = await verifyPrimusAttestation(attestation);

  if (!result.valid) {
    return result;
  }

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

  if (invoiceData.amount <= 0) {
    return {
      valid: false,
      error: 'Invoice amount must be positive',
    };
  }

  return result;
}

export function verifyOwnershipProof(
  secret: string,
  healthDataHash: string,
  expectedCommitment: string
): boolean {
  try {
    const computed = keccak256(
      encodePacked(['bytes32', 'bytes32'], [secret as Hex, healthDataHash as Hex])
    );

    return computed.toLowerCase() === expectedCommitment.toLowerCase();
  } catch (error) {
    console.error('Ownership verification error:', error);
    return false;
  }
}
