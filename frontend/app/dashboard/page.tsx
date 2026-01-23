"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { loadPolicyData, formatUSDC, shortenAddress } from "@/lib/utils";
import { REGISTRY_ADDRESS, registryAbi, type PolicyData } from "@/lib/contracts";
import { LayoutDashboard, ArrowLeft, CheckCircle, AlertCircle, Shield, Calendar, DollarSign } from "lucide-react";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [policyData, setPolicyData] = useState<{
    secret: string;
    healthDataHash: string;
    commitment: string;
  } | null>(null);
  const [hasLoadedPolicy, setHasLoadedPolicy] = useState(false);

  // Load policy data from localStorage
  useEffect(() => {
    const stored = loadPolicyData();
    if (stored) {
      setPolicyData({
        secret: stored.secret,
        healthDataHash: stored.healthDataHash,
        commitment: stored.commitment,
      });
    }
    setHasLoadedPolicy(true);
  }, []);

  // Read policy from CuranceRegistry
  const { data: policy, isLoading: isPolicyLoading } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: "getPolicy",
    args: policyData ? [policyData.commitment as `0x${string}`] : undefined,
    query: {
      enabled: !!policyData,
    },
  }) as { data: PolicyData | undefined; isLoading: boolean };

  // Read remaining coverage
  const { data: remainingCoverage } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: "getRemainingCoverage",
    args: policyData ? [policyData.commitment as `0x${string}`] : undefined,
    query: {
      enabled: !!policyData,
    },
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to view your dashboard</CardDescription>
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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
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
                No policy data found in browser storage. Please register a policy to view your dashboard.
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="container mx-auto max-w-4xl py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Policy Dashboard</h1>
          </div>
          <p className="text-gray-600">
            View your insurance policy details and coverage information
          </p>
        </div>

        {/* Policy Status Card */}
        {policy && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Policy Status</CardTitle>
                    <CardDescription>Your current coverage and activity</CardDescription>
                  </div>
                  <Badge variant={policy.isActive ? "default" : "secondary"} className="text-base px-4 py-1">
                    {policy.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Coverage Summary */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Total Coverage</p>
                        <p className="text-2xl font-bold">{formatUSDC(policy.coverageAmount)} USDC</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-green-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Remaining Coverage</p>
                        <p className="text-2xl font-bold text-green-600">
                          {remainingCoverage ? formatUSDC(remainingCoverage as bigint) : formatUSDC(policy.coverageAmount - policy.usedCoverage)} USDC
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-orange-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Used Coverage</p>
                        <p className="text-2xl font-bold text-orange-600">{formatUSDC(policy.usedCoverage)} USDC</p>
                      </div>
                    </div>
                  </div>

                  {/* Policy Details */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-purple-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Policy Start</p>
                        <p className="font-mono">
                          {new Date(Number(policy.startTime) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-red-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Policy Expiry</p>
                        <p className="font-mono">
                          {new Date(Number(policy.expiryTime) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Premium Paid</p>
                        <p className="font-mono">{formatUSDC(policy.premium)} USDC</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coverage Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Coverage Used</span>
                    <span>
                      {((Number(policy.usedCoverage) / Number(policy.coverageAmount)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${(Number(policy.usedCoverage) / Number(policy.coverageAmount)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commitment Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Policy Commitment</CardTitle>
                <CardDescription>Your unique policy identifier (share with hospitals)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded">
                  <code className="text-xs break-all">{policyData?.commitment}</code>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Share this commitment with authorized hospitals to create claims.
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your claims and policy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/claim">
                  <Button className="w-full" variant="default">
                    Verify Claims
                  </Button>
                </Link>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Policy Active</AlertTitle>
                  <AlertDescription>
                    Your policy is active and ready to process claims. When a hospital creates a claim,
                    use the "Verify Claims" page to approve payment.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading State */}
        {isPolicyLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Loading policy data...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
