import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { keccak256, encodePacked, toHex } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shorten address for display
export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format USDC amount (6 decimals)
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1_000_000).toFixed(2);
}

// Parse USDC input to bigint
export function parseUSDC(amount: string): bigint {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return BigInt(0);
  return BigInt(Math.floor(parsed * 1_000_000));
}

// Generate random secret (32 bytes)
export function generateSecret(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

// Generate commitment from secret and health data hash
export function generateCommitment(
  secret: `0x${string}`,
  healthDataHash: `0x${string}`
): `0x${string}` {
  return keccak256(encodePacked(["bytes32", "bytes32"], [secret, healthDataHash]));
}

// Generate health data hash from mock data
export function generateHealthDataHash(data: {
  score: number;
  timestamp: number;
}): `0x${string}` {
  return keccak256(
    encodePacked(["uint256", "uint256"], [BigInt(data.score), BigInt(data.timestamp)])
  );
}

// Local storage helpers for policy data
const POLICY_STORAGE_KEY = "curance_policy_data";

interface PolicyStorageData {
  secret: string;
  healthDataHash: string;
  commitment: string;
  registeredAt: number;
}

export function savePolicyData(data: PolicyStorageData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(data));
}

export function loadPolicyData(): PolicyStorageData | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(POLICY_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearPolicyData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(POLICY_STORAGE_KEY);
}
