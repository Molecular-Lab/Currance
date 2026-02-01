/**
 * Primus zkTLS Integration for Curance
 *
 * Flow:
 * 1. Load env config from server API
 * 2. Initialize SDK with appId and appSecret
 * 3. Generate request params with templateId and userAddress
 * 4. Sign the request
 * 5. Start attestation (triggers Primus Extension popup)
 * 6. Verify attestation result
 */

import { PrimusZKTLS } from "@primuslabs/zktls-js-sdk";
import { loadEnv, getEnv } from "./env";

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

// Pre-configured template IDs
export const CURANCE_TEMPLATES = {
  TEMPLATE_ID: "1bfd0a5c-185b-4e3e-b6ec-565232899005",
  INVOICES: "invoice-template-id-placeholder",
} as const;

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
    // Load env config from server
    const env = await loadEnv();

    // Initialize SDK
    primusZKTLS = new PrimusZKTLS();
    const initResult = await primusZKTLS.init(env.PRIMUS_APP_ID, env.PRIMUS_APP_SECRET);
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
    const templateId = CURANCE_TEMPLATES.TEMPLATE_ID;

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
    const templateId = CURANCE_TEMPLATES.INVOICES;

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
  const env = getEnv();
  return !!env?.PRIMUS_APP_ID;
}

/**
 * Get Primus status
 */
export function getPrimusStatus(): {
  configured: boolean;
  appId: string;
  mode: "production" | "demo";
} {
  const env = getEnv();
  return {
    configured: !!env?.PRIMUS_APP_ID,
    appId: env?.PRIMUS_APP_ID ? `${env.PRIMUS_APP_ID.slice(0, 10)}...` : "",
    mode: env?.PRIMUS_APP_ID ? "production" : "demo",
  };
}
