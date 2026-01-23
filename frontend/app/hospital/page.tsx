"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { keccak256, encodePacked, toHex } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { parseUSDC, formatUSDC, shortenAddress } from "@/lib/utils";
import { CLAIMS_ADDRESS, claimsAbi } from "@/lib/contracts";
import { Hospital, ArrowLeft, CheckCircle, AlertCircle, Loader2, Copy } from "lucide-react";

export default function HospitalPage() {
  const { address, isConnected } = useAccount();
  const [patientCommitment, setPatientCommitment] = useState("");
  const [treatmentAmount, setTreatmentAmount] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [claimId, setClaimId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // For POC, we'll allow any address to create claims
  // In production, you would have a hospital registry check
  const isHospital = true;

  // Create claim transaction
  const { writeContract: createClaim, data: txHash, error: txError } = useWriteContract();
  const { isLoading: isCreating, isSuccess: claimCreated, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Extract claimId from transaction logs
  if (claimCreated && receipt && !claimId) {
    try {
      const log = receipt.logs.find((log) =>
        log.topics[0] === keccak256(toHex("ClaimCreated(bytes32,bytes32,address,uint256)"))
      );
      if (log) {
        setClaimId(log.topics[1]);
      }
    } catch (err) {
      console.error("Failed to extract claim ID:", err);
    }
  }

  const handleCreateClaim = () => {
    setError("");

    // Validation
    if (!patientCommitment.startsWith("0x") || patientCommitment.length !== 66) {
      setError("Invalid commitment format. Must be a 32-byte hex string (0x...)");
      return;
    }

    if (!treatmentAmount || parseFloat(treatmentAmount) <= 0) {
      setError("Please enter a valid treatment amount");
      return;
    }

    if (!invoiceRef.trim()) {
      setError("Please enter an invoice reference");
      return;
    }

    const amount = parseUSDC(treatmentAmount);
    const invoiceHash = keccak256(toHex(invoiceRef));

    createClaim({
      address: CLAIMS_ADDRESS,
      abi: claimsAbi,
      functionName: "createClaim",
      args: [patientCommitment as `0x${string}`, amount, invoiceHash],
    });
  };

  const handleCopyClaimId = () => {
    if (claimId) {
      navigator.clipboard.writeText(claimId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setPatientCommitment("");
    setTreatmentAmount("");
    setInvoiceRef("");
    setClaimId(null);
    setError("");
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to access the hospital portal</CardDescription>
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

  if (!isHospital) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
              Access Denied
            </CardTitle>
            <CardDescription>This wallet is not registered as a hospital</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hospital Registration Required</AlertTitle>
              <AlertDescription>
                Only registered hospital addresses can create claims. Please contact the protocol
                administrator to register your address.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600 mb-1">Your address:</p>
              <code className="text-xs">{address}</code>
            </div>

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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
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
            <Hospital className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold">Hospital Portal</h1>
          </div>
          <p className="text-gray-600">
            Create claims for patient treatments without knowing their identity
          </p>
          <Badge variant="secondary" className="mt-2">
            Registered Hospital: {shortenAddress(address || "")}
          </Badge>
        </div>

        {/* Error display */}
        {(error || txError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || txError?.message}</AlertDescription>
          </Alert>
        )}

        {/* Claim form or success message */}
        {!claimId ? (
          <Card>
            <CardHeader>
              <CardTitle>Create New Claim</CardTitle>
              <CardDescription>
                Enter the patient's commitment and treatment details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Privacy Notice</AlertTitle>
                <AlertDescription>
                  The patient will provide their commitment ID. This allows you to create a claim
                  without knowing their wallet address or identity.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="commitment">Patient Commitment</Label>
                <Input
                  id="commitment"
                  placeholder="0x..."
                  value={patientCommitment}
                  onChange={(e) => setPatientCommitment(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  32-byte hex string provided by patient
                </p>
              </div>

              <div>
                <Label htmlFor="amount">Treatment Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="50.00"
                  value={treatmentAmount}
                  onChange={(e) => setTreatmentAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="invoice">Invoice Reference</Label>
                <Input
                  id="invoice"
                  placeholder="INV-2024-001"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Internal reference for your records
                </p>
              </div>

              <Button
                onClick={handleCreateClaim}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Claim...
                  </>
                ) : (
                  "Create Claim"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <CardTitle>Claim Created Successfully</CardTitle>
              </div>
              <CardDescription>Share this claim ID with the patient</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Claim ID:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white p-2 rounded text-xs break-all">
                      {claimId}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyClaimId}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-mono">{treatmentAmount} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Invoice:</span>
                    <span className="font-mono">{invoiceRef}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Next Steps</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                    <li>Share the Claim ID with the patient</li>
                    <li>Patient will verify the claim using their secret</li>
                    <li>Upon verification, USDC will be automatically transferred to your address</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Create Another Claim
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full">Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="font-bold text-green-600">1.</span>
                <span>Patient provides their commitment (generated during policy registration)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-green-600">2.</span>
                <span>You create a claim with treatment amount and invoice reference</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-green-600">3.</span>
                <span>Patient receives claim ID and verifies ownership using their secret</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-green-600">4.</span>
                <span>Upon verification, payment automatically settles to your address</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
