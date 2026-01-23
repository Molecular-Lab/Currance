"use client";

import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { keccak256, encodePacked } from "viem";

const APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID || "";
const APP_SECRET = process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET || "";

// Health data provider ID - you'll need to create this on Reclaim Developer Portal
// For POC, we'll use a mock provider or create a custom one
const HEALTH_PROVIDER_ID = "your-health-provider-id";

export interface HealthData {
  healthScore: number;
  lastCheckupDate: string;
  timestamp: number;
}

export interface ReclaimVerificationResult {
  success: boolean;
  healthData?: HealthData;
  healthDataHash?: `0x${string}`;
  proof?: unknown;
  error?: string;
}

// Initialize Reclaim verification request
export async function createHealthVerificationRequest(): Promise<{
  requestUrl: string;
  statusUrl: string;
  sessionId: string;
} | null> {
  if (!APP_ID || !APP_SECRET) {
    console.error("Reclaim APP_ID or APP_SECRET not configured");
    return null;
  }

  try {
    const reclaimProofRequest = await ReclaimProofRequest.init(
      APP_ID,
      APP_SECRET,
      HEALTH_PROVIDER_ID
    );

    const requestUrl = await reclaimProofRequest.getRequestUrl();
    const statusUrl = reclaimProofRequest.getStatusUrl();

    // Start listening for proof
    await reclaimProofRequest.startSession({
      onSuccess: (proofs) => {
        console.log("Verification successful:", proofs);
      },
      onError: (error) => {
        console.error("Verification error:", error);
      },
    });

    return {
      requestUrl,
      statusUrl,
      sessionId: statusUrl.split("/").pop() || "",
    };
  } catch (error) {
    console.error("Failed to create Reclaim request:", error);
    return null;
  }
}

// For POC: Generate mock health data and hash
// In production, this would come from actual Reclaim verification
export function generateMockHealthData(): {
  healthData: HealthData;
  healthDataHash: `0x${string}`;
} {
  const healthData: HealthData = {
    healthScore: 85 + Math.floor(Math.random() * 15), // 85-99
    lastCheckupDate: new Date().toISOString().split("T")[0],
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Generate hash from health data
  const healthDataHash = keccak256(
    encodePacked(
      ["uint256", "uint256"],
      [BigInt(healthData.healthScore), BigInt(healthData.timestamp)]
    )
  );

  return { healthData, healthDataHash };
}

// Verify a Reclaim proof (called after user completes verification)
export async function verifyReclaimProof(
  proof: unknown
): Promise<ReclaimVerificationResult> {
  try {
    // In production, you would verify the proof signature here
    // For POC, we'll accept the proof and extract data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proofData = proof as any;

    // Extract health data from proof
    const healthData: HealthData = {
      healthScore: proofData?.extractedData?.healthScore || 90,
      lastCheckupDate: proofData?.extractedData?.date || new Date().toISOString(),
      timestamp: Math.floor(Date.now() / 1000),
    };

    const healthDataHash = keccak256(
      encodePacked(
        ["uint256", "uint256"],
        [BigInt(healthData.healthScore), BigInt(healthData.timestamp)]
      )
    );

    return {
      success: true,
      healthData,
      healthDataHash,
      proof,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

// Check if Reclaim is configured
export function isReclaimConfigured(): boolean {
  return Boolean(APP_ID && APP_SECRET);
}
