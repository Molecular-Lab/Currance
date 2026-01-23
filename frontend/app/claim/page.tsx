"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { loadPolicyData, formatUSDC, shortenAddress } from "@/lib/utils";
import { CLAIMS_ADDRESS, claimsAbi, getClaimStatusLabel, ClaimStatus } from "@/lib/contracts";
import { verifyClaimWithOracle } from "@/lib/api";
import { FileCheck, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [claimId, setClaimId] = useState("");
  const [hasLoadedPolicy, setHasLoadedPolicy] = useState(false);
  const [policyData, setPolicyData] = useState<{
    secret: string;
    healthDataHash: string;
    commitment: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Load policy data from localStorage on mount
  useEffect(() => {
    const stored = loadPolicyData();
    if (stored) {
      setPolicyData({
        secret: stored.secret,
        healthDataHash: stored.healthDataHash,
        commitment: stored.commitment,
      });
      setHasLoadedPolicy(true);
    } else {
      setHasLoadedPolicy(true);
    }
  }, []);

  // Read claim data from CuranceClaims contract
  const { data: claim, isLoading: isLoadingClaim, refetch: refetchClaim } = useReadContract({
    address: CLAIMS_ADDRESS,
    abi: claimsAbi,
    functionName: "getClaim",
    args: claimId && claimId.startsWith("0x") && claimId.length === 66
      ? [claimId as `0x${string}`]
      : undefined,
    query: {
      enabled: !!claimId && claimId.startsWith("0x") && claimId.length === 66,
    },
  });

  const handleLoadClaim = () => {
    setError("");

    if (!claimId.trim()) {
      setError("Please enter a claim ID");
      return;
    }

    if (!claimId.startsWith("0x") || claimId.length !== 66) {
      setError("Invalid claim ID format. Must be a 32-byte hex string (0x...)");
      return;
    }

    // Trigger refetch
    refetchClaim();
  };

  const handleVerifyClaim = async () => {
    setError("");

    if (!policyData) {
      setError("No policy data found. Please register a policy first.");
      return;
    }

    if (!claim) {
      setError("Claim not loaded. Please load the claim first.");
      return;
    }

    // Check if claim is pending
    if (claim[4] !== ClaimStatus.PENDING) {
      setError(`Claim status is ${getClaimStatusLabel(claim[4])}. Only pending claims can be verified.`);
      return;
    }

    try {
      setIsVerifying(true);

      // Call Oracle API to verify claim
      const result = await verifyClaimWithOracle({
        claimId: claimId as `0x${string}`,
        invoiceProof: {
          signature: 'mock_invoice_sig_' + Date.now(),
          invoiceHash: claim[3], // invoiceHash from claim
          hospitalId: 'hospital_1',
        },
        ownershipProof: {
          commitment: policyData.commitment as `0x${string}`,
          signature: 'mock_ownership_sig_' + Date.now(),
        }
      });

      if (result.success) {
        // Wait a bit then refetch claim to see updated status
        setTimeout(() => refetchClaim(), 3000);
      } else {
        setError(result.error || "Claim verification failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to verify claims</CardDescription>
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

  if (hasLoadedPolicy && !policyData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              No Policy Found
            </CardTitle>
            <CardDescription>You need to register a policy first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Policy Required</AlertTitle>
              <AlertDescription>
                No policy data found in browser storage. Please register a policy before verifying
                claims.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Link href="/register" className="flex-1">
                <Button className="w-full">Register Policy</Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4">
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
            <FileCheck className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold">Verify Claim</h1>
          </div>
          <p className="text-gray-600">
            Enter your claim ID to verify ownership and settle payment
          </p>
        </div>

        {/* Policy info */}
        {policyData && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Policy Loaded</AlertTitle>
            <AlertDescription>
              <p className="text-xs mt-1">Your commitment:</p>
              <code className="text-xs">{shortenAddress(policyData.commitment)}</code>
            </AlertDescription>
          </Alert>
        )}

        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Claim ID input */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Load Claim</CardTitle>
            <CardDescription>Enter the claim ID provided by the hospital</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="claimId">Claim ID</Label>
              <Input
                id="claimId"
                placeholder="0x..."
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                32-byte hex string from hospital
              </p>
            </div>

            <Button
              onClick={handleLoadClaim}
              disabled={isLoadingClaim}
              className="w-full"
            >
              {isLoadingClaim ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load Claim"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Claim details and verification */}
        {claim && claim[1] !== "0x0000000000000000000000000000000000000000" && (
          <Card>
            <CardHeader>
              <CardTitle>Claim Details</CardTitle>
              <CardDescription>Review and verify this claim</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hospital:</span>
                  <code className="text-xs">{shortenAddress(claim[1])}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="font-mono font-bold text-lg">{formatUSDC(claim[2])} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge
                    variant={
                      claim[4] === ClaimStatus.Verified
                        ? "default"
                        : claim[4] === ClaimStatus.Rejected
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {getClaimStatusLabel(claim[4])}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Commitment Match:</span>
                  <span className="text-xs">
                    {claim[0] === policyData?.commitment ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Mismatch
                      </Badge>
                    )}
                  </span>
                </div>
              </div>

              {claim[4] === ClaimStatus.PENDING && claim[0] === policyData?.commitment && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Ready to Verify</AlertTitle>
                    <AlertDescription>
                      This claim matches your policy commitment. Verifying will automatically transfer{" "}
                      {formatUSDC(claim[2])} USDC to the hospital.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleVerifyClaim}
                    disabled={isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Claim & Settle Payment"
                    )}
                  </Button>
                </>
              )}

              {(claim[4] === ClaimStatus.SETTLED || claim[4] === ClaimStatus.ENABLED) && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Claim Verified</AlertTitle>
                  <AlertDescription>
                    This claim has been successfully verified and payment has been settled to the hospital.
                  </AlertDescription>
                </Alert>
              )}

              {claim[0] !== policyData?.commitment && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Commitment Mismatch</AlertTitle>
                  <AlertDescription>
                    This claim was not created for your policy. The commitment does not match.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How Verification Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="font-bold text-purple-600">1.</span>
                <span>Enter the claim ID received from the hospital</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-purple-600">2.</span>
                <span>System loads your secret from browser storage</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-purple-600">3.</span>
                <span>Click verify to prove you own the policy</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-purple-600">4.</span>
                <span>Smart contract validates and automatically transfers USDC to hospital</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
