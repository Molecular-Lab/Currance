/**
 * Primus zkTLS Integration for Curance
 *
 * Flow:
 * 1. Initialize SDK with appId and appSecret from ENV
 * 2. Generate request params with templateId and userAddress
 * 3. Sign the request
 * 4. Start attestation (triggers Primus Extension popup)
 * 5. Verify attestation result
 */

import { PrimusZKTLS } from "@primuslabs/zktls-js-sdk";
import { ENV } from "./env";

// Types
export interface PrimusAttestationData {
  [key: string]: unknown;
}

export interface AttestationResult {
  success: boolean;
  attestation?: string | PrimusAttestationData;
  timestamp?: number;
  data?: Record<string, unknown>;
  error?: string;
}

export interface VerificationResult {
  valid: boolean;
  data?: {
    record_id?: string;
    invoice_id?: string;
    amount?: number;
    [key: string]: unknown;
  };
  error?: string;
}

// Template IDs getter
export function getTemplateIds() {
  return {
    RECORD_TEMPLATE_ID: ENV.RECORD_TEMPLATE_ID,
    CLAIM_TEMPLATE_ID: ENV.CLAIM_TEMPLATE_ID,
  };
}

// Primus SDK instance
let primusZKTLS: PrimusZKTLS | null = null;
let isInitialized = false;

/**
 * Initialize Primus SDK
 */
export async function initPrimusSDK(): Promise<boolean> {
  if (typeof window === "undefined") {
    console.warn("Primus SDK can only be initialized on client side");
    return false;
  }

  if (isInitialized && primusZKTLS) {
    return true;
  }

  try {
    // Initialize SDK with ENV values
    primusZKTLS = new PrimusZKTLS();
    const initResult = await primusZKTLS.init(ENV.PRIMUS_APP_ID, ENV.PRIMUS_APP_SECRET);
    console.log("Primus SDK initialized:", initResult);

    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize Primus SDK:", error);
    return false;
  }
}

/**
 * Get Primus SDK instance
 */
function getPrimus(): PrimusZKTLS {
  if (!primusZKTLS) {
    throw new Error("Primus SDK not initialized. Call initPrimusSDK() first.");
  }
  return primusZKTLS;
}

/**
 * Start health record attestation flow
 */
export async function startHealthRecordAttestation(
  userAddress: string
): Promise<AttestationResult> {
  try {
    // Ensure SDK is initialized
    if (!isInitialized) {
      const success = await initPrimusSDK();
      if (!success) {
        throw new Error("Failed to initialize Primus SDK");
      }
    }

    const primus = getPrimus();
    const templateId = ENV.RECORD_TEMPLATE_ID;

    console.log("Starting attestation with template:", templateId);
    console.log("User address:", userAddress);

    // 1. Generate request params
    const request = primus.generateRequestParams(templateId, userAddress);

    // 2. Convert to string
    const requestStr = request.toJsonString();

    // 3. Sign request
    const signedRequestStr = await primus.sign(requestStr);

    // 4. Start attestation - triggers Primus Extension popup
    const attestation = await primus.startAttestation(signedRequestStr);
    console.log("Attestation result:", attestation);

    return {
      success: true,
      attestation,
      timestamp: Date.now(),
      data: { template_id: templateId },
    };
  } catch (error) {
    console.error("Health record attestation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Attestation failed",
    };
  }
}

/**
 * Start invoice attestation flow
 */
export async function startInvoiceAttestation(
  userAddress: string,
  invoiceId: string
): Promise<AttestationResult> {
  try {
    if (!isInitialized) {
      const success = await initPrimusSDK();
      if (!success) {
        throw new Error("Failed to initialize Primus SDK");
      }
    }

    const primus = getPrimus();
    const templateId = ENV.RECORD_TEMPLATE_ID;

    // Generate request with invoice_id param
    const request = primus.generateRequestParams(templateId, userAddress);
    const requestStr = request.toJsonString();
    const signedRequestStr = await primus.sign(requestStr);
    const attestation = await primus.startAttestation(signedRequestStr);

    return {
      success: true,
      attestation,
      timestamp: Date.now(),
      data: { template_id: templateId, invoice_id: invoiceId },
    };
  } catch (error) {
    console.error("Invoice attestation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Attestation failed",
    };
  }
}

/**
 * Verify attestation
 */
export async function verifyAttestation(
  attestation: string | PrimusAttestationData
): Promise<VerificationResult> {
  try {
    if (!isInitialized) {
      const success = await initPrimusSDK();
      if (!success) {
        throw new Error("Failed to initialize Primus SDK");
      }
    }

    const primus = getPrimus();
    const isValid = await primus.verifyAttestation(attestation);
    console.log("Verification result:", isValid);

    return {
      valid: isValid,
      data: isValid ? {} : undefined,
    };
  } catch (error) {
    console.error("Verification failed:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Check if Primus is configured
 */
export function isPrimusConfigured(): boolean {
  return !!ENV.PRIMUS_APP_ID;
}

/**
 * Get Primus status
 */
export function getPrimusStatus(): {
  configured: boolean;
  appId: string;
  mode: "production" | "demo";
} {
  return {
    configured: !!ENV.PRIMUS_APP_ID,
    appId: ENV.PRIMUS_APP_ID ? `${ENV.PRIMUS_APP_ID.slice(0, 10)}...` : "",
    mode: ENV.PRIMUS_APP_ID ? "production" : "demo",
  };
}
