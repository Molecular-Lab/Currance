/**
 * Primus zkTLS Integration for Curance
 *
 * This module handles the attestation and verification flow with Primus zkTLS.
 *
 * Flow:
 * 1. Initialize SDK with appId (appSecret should be on backend)
 * 2. Generate request params with templateId and userAddress
 * 3. Sign the request via backend API
 * 4. Start attestation (triggers Primus verification popup)
 * 5. Verify attestation result
 *
 * References:
 * - https://github.com/primus-labs/zktls-demo/tree/main/production-example
 * - https://dev.primuslabs.xyz/myDevelopment/myProjects
 */

// Types for Primus SDK
// Note: Primus SDK returns attestation as an object, not a string
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

// Environment variables
const PRIMUS_APP_ID = process.env.NEXT_PUBLIC_PRIMUS_APP_ID || "0x9480fd5d007b5f3f62696e20ac4bc716f5419926";
const PRIMUS_APP_SECRET = process.env.NEXT_PUBLIC_PRIMUS_APP_SECRET || "0x1fabd7880c9f95bec0908db719040cfd61c10318de782bdaa35efe87d1591852";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Pre-configured template IDs from Curance
export const CURANCE_TEMPLATES = {
  TEMPLATE_ID: "dd9d3411-aae1-4b97-9080-7780cdeb3166",
  INVOICES: "invoice-template-id-placeholder", // To be configured
} as const;

// Platform detection for Primus SDK
function getPlatformDevice(): "pc" | "android" | "ios" {
  if (typeof navigator === "undefined") return "pc";

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("android")) return "android";
  if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "ios";
  return "pc";
}

/**
 * Initialize Primus SDK (client-side only)
 * Note: In production, appSecret should NEVER be on the client
 */
export async function initPrimusSDK(): Promise<boolean> {
  if (typeof window === "undefined") {
    console.warn("Primus SDK can only be initialized on client side");
    return false;
  }

  try {
    // Dynamic import to avoid SSR issues
    const { PrimusZKTLS } = await import("@primuslabs/zktls-js-sdk");

    const primusZKTLS = new PrimusZKTLS();
    const platform = getPlatformDevice();

    // Initialize with appId and appSecret
    await primusZKTLS.init(PRIMUS_APP_ID, PRIMUS_APP_SECRET, { platform });

    // Store instance globally for reuse
    (window as unknown as { primusZKTLS: typeof primusZKTLS }).primusZKTLS = primusZKTLS;

    console.log("Primus SDK initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Primus SDK:", error);
    return false;
  }
}

/**
 * Get the Primus SDK instance
 */
function getPrimusInstance(): unknown | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { primusZKTLS?: unknown }).primusZKTLS || null;
}

/**
 * Request backend to sign the attestation request
 * This keeps appSecret secure on the server
 */
async function signRequestWithBackend(requestJson: string): Promise<string> {
  const response = await fetch(
    `${API_URL}/api/primus/sign?signParams=${encodeURIComponent(requestJson)}`
  );

  if (!response.ok) {
    throw new Error("Failed to sign request with backend");
  }

  const data = await response.json();
  return data.signedRequest;
}

/**
 * Start attestation flow for health records verification
 *
 * @param templateId - The Primus template ID for health records
 * @param userAddress - User's wallet address
 * @param recordId - The health record ID to verify
 */
export async function attestHealthRecord(
  templateId: string,
  userAddress: string,
  recordId: string
): Promise<AttestationResult> {
  try {
    const primusZKTLS = getPrimusInstance() as {
      generateRequestParams: (
        templateId: string,
        userAddress: string,
        params?: Record<string, string>
      ) => { toJsonString: () => string };
      startAttestation: (signedRequest: string) => Promise<string>;
      verifyAttestation: (attestation: string) => Promise<boolean>;
    } | null;

    if (!primusZKTLS) {
      // Try to initialize if not already done
      await initPrimusSDK();
      const instance = getPrimusInstance();
      if (!instance) {
        throw new Error("Primus SDK not initialized");
      }
    }

    // For demo mode without actual Primus SDK
    if (!PRIMUS_APP_ID) {
      console.log("Demo mode: Simulating Primus attestation for record:", recordId);
      await simulateDelay(2000);
      return {
        success: true,
        attestation: `demo_attestation_${Date.now()}`,
        timestamp: Date.now(),
        data: { record_id: recordId },
      };
    }

    // Production flow with actual Primus SDK
    const primus = getPrimusInstance() as {
      generateRequestParams: (
        templateId: string,
        userAddress: string,
        params?: Record<string, string>
      ) => { toJsonString: () => string };
      startAttestation: (signedRequest: string) => Promise<string>;
    };

    // 1. Generate request params
    const request = primus.generateRequestParams(templateId, userAddress, {
      record_id: recordId,
    });
    const requestJson = request.toJsonString();

    // 2. Sign request via backend (keeps appSecret secure)
    const signedRequest = await signRequestWithBackend(requestJson);

    // 3. Start attestation (triggers Primus popup)
    const attestation = await primus.startAttestation(signedRequest);

    return {
      success: true,
      attestation,
      timestamp: Date.now(),
      data: { record_id: recordId },
    };
  } catch (error) {
    console.error("Attestation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Attestation failed",
    };
  }
}

/**
 * Start attestation flow for invoice verification
 *
 * @param templateId - The Primus template ID for invoices
 * @param userAddress - User's wallet address
 * @param invoiceId - The invoice ID to verify
 */
export async function attestInvoice(
  templateId: string,
  userAddress: string,
  invoiceId: string
): Promise<AttestationResult> {
  try {
    // For demo mode without actual Primus SDK
    if (!PRIMUS_APP_ID) {
      console.log("Demo mode: Simulating Primus attestation for invoice:", invoiceId);
      await simulateDelay(2000);
      return {
        success: true,
        attestation: `demo_attestation_${Date.now()}`,
        timestamp: Date.now(),
        data: { invoice_id: invoiceId },
      };
    }

    const primus = getPrimusInstance() as {
      generateRequestParams: (
        templateId: string,
        userAddress: string,
        params?: Record<string, string>
      ) => { toJsonString: () => string };
      startAttestation: (signedRequest: string) => Promise<string>;
    };

    if (!primus) {
      await initPrimusSDK();
    }

    // 1. Generate request params
    const request = primus.generateRequestParams(templateId, userAddress, {
      invoice_id: invoiceId,
    });
    const requestJson = request.toJsonString();

    // 2. Sign request via backend
    const signedRequest = await signRequestWithBackend(requestJson);

    // 3. Start attestation
    const attestation = await primus.startAttestation(signedRequest);

    return {
      success: true,
      attestation,
      timestamp: Date.now(),
      data: { invoice_id: invoiceId },
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
 * Verify an attestation result
 *
 * @param attestation - The attestation (can be string or object from Primus)
 */
export async function verifyAttestation(
  attestation: string | PrimusAttestationData
): Promise<VerificationResult> {
  try {
    console.log("Verifying attestation:", attestation);
    console.log("Attestation type:", typeof attestation);

    // For demo mode - check if it's a string starting with "demo_"
    const isDemo = typeof attestation === "string" && attestation.startsWith("demo_");
    if (!PRIMUS_APP_ID || isDemo) {
      console.log("Demo mode: Simulating verification");
      await simulateDelay(1000);
      return {
        valid: true,
        data: {},
      };
    }

    const primus = getPrimusInstance() as {
      verifyAttestation: (attestation: string | PrimusAttestationData) => Promise<boolean>;
    };

    if (!primus) {
      throw new Error("Primus SDK not initialized");
    }

    const isValid = await primus.verifyAttestation(attestation);
    console.log("Primus verification result:", isValid);

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
 * Combined flow: Attest and verify health record
 */
export async function attestAndVerifyRecord(
  templateId: string,
  userAddress: string,
  recordId: string
): Promise<VerificationResult> {
  // Step 1: Attest
  const attestResult = await attestHealthRecord(templateId, userAddress, recordId);

  if (!attestResult.success || !attestResult.attestation) {
    return {
      valid: false,
      error: attestResult.error || "Attestation failed",
    };
  }

  // Step 2: Verify (attestation can be string or object)
  const verifyResult = await verifyAttestation(attestResult.attestation);

  if (!verifyResult.valid) {
    return {
      valid: false,
      error: verifyResult.error || "Verification failed",
    };
  }

  return {
    valid: true,
    data: {
      record_id: recordId,
      ...attestResult.data,
    },
  };
}

/**
 * Combined flow: Attest and verify invoice
 */
export async function attestAndVerifyInvoice(
  templateId: string,
  userAddress: string,
  invoiceId: string
): Promise<VerificationResult> {
  // Step 1: Attest
  const attestResult = await attestInvoice(templateId, userAddress, invoiceId);

  if (!attestResult.success || !attestResult.attestation) {
    return {
      valid: false,
      error: attestResult.error || "Attestation failed",
    };
  }

  // Step 2: Verify
  const verifyResult = await verifyAttestation(attestResult.attestation);

  if (!verifyResult.valid) {
    return {
      valid: false,
      error: verifyResult.error || "Verification failed",
    };
  }

  return {
    valid: true,
    data: {
      invoice_id: invoiceId,
      ...attestResult.data,
    },
  };
}

// Helper function for demo delays
function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start attestation flow using pre-configured Curance template
 * This is the simplified flow where user doesn't need to know the template ID
 *
 * @param userAddress - User's wallet address
 */
export async function startHealthRecordAttestation(
  userAddress: string
): Promise<AttestationResult> {
  try {
    // Ensure SDK is initialized
    let primus = getPrimusInstance() as {
      generateRequestParams: (
        templateId: string,
        userAddress: string,
        params?: Record<string, string>
      ) => { toJsonString: () => string };
      sign: (requestJson: string) => Promise<string>;
      startAttestation: (signedRequest: string) => Promise<string>;
    } | null;

    if (!primus) {
      await initPrimusSDK();
      primus = getPrimusInstance() as typeof primus;
      if (!primus) {
        throw new Error("Failed to initialize Primus SDK");
      }
    }

    // Use pre-configured template ID
    const templateId = CURANCE_TEMPLATES.TEMPLATE_ID;

    console.log("Starting attestation with template:", templateId);

    // 1. Generate request params with pre-configured template

    const request = primus.generateRequestParams("1bfd0a5c-185b-4e3e-b6ec-565232899005", userAddress);
    const requestJson = request.toJsonString();

    // 2. Sign the request (using client-side signing for demo)
    const signedRequest = await primus.sign(requestJson);

    // 3. Start attestation - this triggers the Primus Extension popup
    const attestation = await primus.startAttestation(signedRequest);

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
 * Start invoice attestation flow using pre-configured template
 */
export async function startInvoiceAttestation(
  userAddress: string,
  invoiceId: string
): Promise<AttestationResult> {
  try {
    let primus = getPrimusInstance() as {
      generateRequestParams: (
        templateId: string,
        userAddress: string,
        params?: Record<string, string>
      ) => { toJsonString: () => string };
      sign: (requestJson: string) => Promise<string>;
      startAttestation: (signedRequest: string) => Promise<string>;
    } | null;

    if (!primus) {
      await initPrimusSDK();
      primus = getPrimusInstance() as typeof primus;
      if (!primus) {
        throw new Error("Failed to initialize Primus SDK");
      }
    }

    const templateId = CURANCE_TEMPLATES.INVOICES;

    const request = primus.generateRequestParams(templateId, userAddress, {
      invoice_id: invoiceId,
    });
    const requestJson = request.toJsonString();

    const signedRequest = await primus.sign(requestJson);
    const attestation = await primus.startAttestation(signedRequest);

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
 * Check if Primus is available and configured
 */
export function isPrimusConfigured(): boolean {
  return !!PRIMUS_APP_ID;
}

/**
 * Get Primus configuration status
 */
export function getPrimusStatus(): {
  configured: boolean;
  appId: string;
  mode: "production" | "demo";
} {
  return {
    configured: !!PRIMUS_APP_ID,
    appId: PRIMUS_APP_ID ? `${PRIMUS_APP_ID.slice(0, 8)}...` : "",
    mode: PRIMUS_APP_ID ? "production" : "demo",
  };
}
