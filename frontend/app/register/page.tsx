"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  generateSecret,
  generateCommitment,
  savePolicyData,
  formatUSDC,
  shortenAddress
} from "@/lib/utils";
import { generateMockHealthData } from "@/lib/reclaim";
import { REGISTRY_ADDRESS, USDC_ADDRESS, registryAbi, erc20Abi } from "@/lib/contracts";
import { registerWithOracle } from "@/lib/api";
import { Shield, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Step = "input" | "verify" | "approve" | "register" | "complete";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>("input");
  const [premium, setPremium] = useState("");
  const [secret, setSecret] = useState<`0x${string}` | null>(null);
  const [healthDataHash, setHealthDataHash] = useState<`0x${string}` | null>(null);
  const [commitment, setCommitment] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState("");

  // Contract writes
  const { writeContract: approve, data: approveHash, error: approveError } = useWriteContract();
  const { writeContract: registerPolicy, data: registerHash, error: registerError } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isLoading: isRegistering, isSuccess: registerSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });

  // Read policy data after registration
  const { data: policyData } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: "getPolicy",
    args: commitment ? [commitment] : undefined,
    query: {
      enabled: !!commitment && registerSuccess,
    },
  });

  // Health verification with Oracle (in production, this would use actual Reclaim Protocol)
  const handleVerifyHealth = async () => {
    setError("");
    try {
      // Generate mock health data
      const { healthData, healthDataHash: hash } = generateMockHealthData();

      // Generate secret and commitment
      const newSecret = generateSecret();
      const newCommitment = generateCommitment(newSecret, hash);

      // Call Oracle API for verification
      const result = await registerWithOracle({
        commitment: newCommitment,
        healthDataHash: hash,
        premium: parseUnits(premium, 6).toString(),
        proof: {
          signature: 'mock_signature_' + Date.now(),
          timestamp: Date.now(),
          hospitalId: 'hospital_1',
        }
      });

      if (result.success && result.verified) {
        setSecret(newSecret);
        setHealthDataHash(hash);
        setCommitment(newCommitment);
        setStep("approve");

        console.log("Health verification successful:", {
          healthScore: healthData.healthScore,
          commitment: newCommitment,
        });
      } else {
        setError(result.error || "Oracle verification failed");
      }
    } catch (err) {
      setError("Health verification failed. Please try again.");
      console.error(err);
    }
  };

  // Approve USDC spending
  const handleApprove = () => {
    if (!premium) {
      setError("Please enter premium amount");
      return;
    }

    setError("");
    const premiumAmount = parseUnits(premium, 6);

    approve({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [REGISTRY_ADDRESS, premiumAmount],
    });
  };

  // Register policy
  const handleRegister = () => {
    if (!commitment || !healthDataHash || !premium) {
      setError("Missing required data");
      return;
    }

    setError("");
    const premiumAmount = parseUnits(premium, 6);

    registerPolicy({
      address: REGISTRY_ADDRESS,
      abi: registryAbi,
      functionName: "registerPolicy",
      args: [commitment, healthDataHash, premiumAmount],
    });
  };

  // Save policy data to localStorage when registration succeeds
  if (registerSuccess && commitment && secret && healthDataHash && step !== "complete") {
    savePolicyData({
      secret,
      healthDataHash,
      commitment,
      registeredAt: Date.now(),
    });
    setStep("complete");
  }

  // Auto-advance to register step after approval
  if (approveSuccess && step === "approve") {
    setStep("register");
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to register a policy</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="container mx-auto max-w-2xl py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Register Policy</h1>
          </div>
          <p className="text-gray-600">
            Purchase insurance coverage with privacy-preserving health verification
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-between mb-8">
          {["Input", "Verify", "Approve", "Register", "Complete"].map((label, idx) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  ["input", "verify", "approve", "register", "complete"].indexOf(step) >= idx
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {idx + 1}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{label}</span>
            </div>
          ))}
        </div>

        {/* Error display */}
        {(error || approveError || registerError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || approveError?.message || registerError?.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Premium Input */}
        {step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Enter Premium</CardTitle>
              <CardDescription>Choose your coverage amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="premium">Premium Amount (USDC)</Label>
                <Input
                  id="premium"
                  type="number"
                  placeholder="100"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  min="1"
                  step="1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Coverage: {premium ? parseFloat(premium) * 10 : 0} USDC (10x premium)
                </p>
              </div>

              <Button
                onClick={() => {
                  if (!premium || parseFloat(premium) <= 0) {
                    setError("Please enter a valid premium amount");
                    return;
                  }
                  setStep("verify");
                }}
                className="w-full"
              >
                Continue to Verification
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Health Verification */}
        {step === "verify" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Verify Health Data</CardTitle>
              <CardDescription>Prove your health data using zkTLS (mock for POC)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>POC Mode</AlertTitle>
                <AlertDescription>
                  In production, this would use Reclaim Protocol to verify real health data from
                  trusted sources. For this demo, we'll generate mock health data.
                </AlertDescription>
              </Alert>

              <Button onClick={handleVerifyHealth} className="w-full">
                Generate Mock Health Verification
              </Button>

              <Button
                onClick={() => setStep("input")}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Approve USDC */}
        {step === "approve" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Approve USDC</CardTitle>
              <CardDescription>Allow the contract to spend your USDC</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Premium:</span>
                  <span className="font-mono">{premium} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Coverage:</span>
                  <span className="font-mono">{parseFloat(premium) * 10} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Your Commitment:</span>
                  <span className="font-mono text-xs">{commitment && shortenAddress(commitment)}</span>
                </div>
              </div>

              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve USDC"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Register Policy */}
        {step === "register" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Register Policy</CardTitle>
              <CardDescription>Submit your policy to the blockchain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>USDC Approved</AlertTitle>
                <AlertDescription>
                  You can now register your policy on-chain.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleRegister}
                disabled={isRegistering}
                className="w-full"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Policy"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && policyData && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <CardTitle>Policy Registered!</CardTitle>
              </div>
              <CardDescription>Your insurance policy is now active</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Coverage:</span>
                  <Badge variant="secondary">{formatUSDC(policyData[1])} USDC</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Premium Paid:</span>
                  <span className="font-mono">{formatUSDC(policyData[0])} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Used:</span>
                  <span className="font-mono">{formatUSDC(policyData[2])} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge>{policyData[5] ? "Active" : "Inactive"}</Badge>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important: Save Your Commitment</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Your commitment has been saved to browser storage:</p>
                  <code className="block bg-gray-100 p-2 rounded text-xs break-all">
                    {commitment}
                  </code>
                  <p className="text-xs text-gray-600">
                    Share this commitment with hospitals to create claims. Your secret is stored
                    locally and never shared.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
                <Link href="/claim" className="flex-1">
                  <Button className="w-full">Verify Claims</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
