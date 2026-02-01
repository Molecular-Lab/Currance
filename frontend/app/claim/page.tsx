"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepIndicator } from "@/components/step-indicator";
import { useAppStore } from "@/lib/store";
import {
  getInvoice,
  verifyWithPrimus,
  processClaim,
  formatCurrency,
  shortenAddress,
} from "@/lib/api";
import type { Invoice, ClaimResult } from "@/types";
import { ArrowLeft, Loader2, CheckCircle, Copy, ExternalLink } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

function ClaimPageContent() {
  const searchParams = useSearchParams();
  const { claim, setClaim, resetClaim } = useAppStore();

  const [step, setStep] = useState<Step>(1);
  const [templateId, setTemplateId] = useState("");
  const [invoiceId, setInvoiceId] = useState(searchParams.get("invoice_id") || "");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const stepLabels = ["Enter IDs", "Review Invoice", "Verify", "Complete"];

  // Reset on mount
  useEffect(() => {
    resetClaim();
  }, [resetClaim]);

  // Step 1: Fetch invoice
  const handleContinue = async () => {
    if (!templateId.trim()) {
      setError("Please enter a template ID from Primus");
      return;
    }
    if (!invoiceId.trim()) {
      setError("Please enter an invoice ID");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const fetchedInvoice = await getInvoice(invoiceId);
      if (fetchedInvoice) {
        setInvoice(fetchedInvoice);
        setClaim({ template_id: templateId, invoice_id: invoiceId });
        setStep(2);
      } else {
        setError("Invoice not found. Try: inv_456789");
      }
    } catch (err) {
      setError("Failed to fetch invoice");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Proceed to verification
  const handleProceedToVerify = () => {
    setStep(3);
  };

  // Step 3: Verify and process claim
  const handleVerifyAndProcess = async () => {
    if (!claim.template_id || !invoice) return;

    setError("");
    setIsLoading(true);

    try {
      // First verify
      const verified = await verifyWithPrimus(claim.template_id);
      if (!verified) {
        setError("Verification failed");
        setIsLoading(false);
        return;
      }

      setClaim({ verified: true });

      // Then process claim
      const result = await processClaim(invoice.invoice_id);
      setClaimResult(result);
      setStep(4);
    } catch (err) {
      setError("Claim processing failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy tx hash to clipboard
  const handleCopyTxHash = async () => {
    if (!claimResult?.tx_hash) return;
    await navigator.clipboard.writeText(claimResult.tx_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold mb-1">File Claim</h1>
          <StepIndicator current={step} total={4} labels={stepLabels} />
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step 1: Enter Template ID and Invoice ID */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enter Claim Details</CardTitle>
              <CardDescription>
                Enter your Primus template ID and invoice ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template ID input */}
              <div className="space-y-2">
                <Label htmlFor="templateId">Template ID</Label>
                <Input
                  id="templateId"
                  placeholder="tmpl_xxxxxxxxxxxxxx"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Get at{" "}
                  <a
                    href="https://dev.primuslabs.xyz/myDevelopment/myTemplates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    dev.primuslabs.xyz
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              {/* Invoice ID input */}
              <div className="space-y-2">
                <Label htmlFor="invoiceId">Invoice ID</Label>
                <Input
                  id="invoiceId"
                  placeholder="inv_456789"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Find at{" "}
                  <Link href="/hospital" className="underline">
                    Hospital Portal
                  </Link>
                </p>
              </div>

              <Button
                onClick={handleContinue}
                disabled={isLoading}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review Invoice */}
        {step === 2 && invoice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Invoice</CardTitle>
              <CardDescription>
                Confirm the invoice details before submitting claim
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invoice details */}
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoice ID</span>
                  <span className="text-sm font-mono">{invoice.invoice_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Description</span>
                  <span className="text-sm text-right max-w-[180px]">
                    {invoice.description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Receiver</span>
                  <span className="text-sm font-mono">
                    {shortenAddress(invoice.receiver_address)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleProceedToVerify}
                className="w-full h-12"
              >
                Proceed to Verification
              </Button>

              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Verify Invoice */}
        {step === 3 && invoice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verify Invoice</CardTitle>
              <CardDescription>
                Complete zkTLS verification to process your claim
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Claim info */}
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Template ID</span>
                  <span className="text-sm font-mono text-xs truncate max-w-[150px]">
                    {claim.template_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
              </div>

              {/* Primus verification placeholder */}
              <div className="p-6 border-2 border-dashed border-neutral-300 rounded-lg text-center">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-sm font-medium mb-1">Primus zkTLS Verification</p>
                <p className="text-xs text-muted-foreground">
                  Click below to verify your invoice using zkTLS
                </p>
              </div>

              <Button
                onClick={handleVerifyAndProcess}
                disabled={isLoading}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Claim...
                  </>
                ) : (
                  "Verify & Process Claim"
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="w-full"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === 4 && claimResult && invoice && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Transfer Complete!</CardTitle>
              <CardDescription>
                Your claim has been processed successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Result summary */}
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(claimResult.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-green-600 capitalize">
                    {claimResult.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Receiver</span>
                  <span className="text-sm font-mono">
                    {shortenAddress(invoice.receiver_address)}
                  </span>
                </div>
              </div>

              {/* Transaction hash */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  Transaction Hash
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 break-all">
                    {claimResult.tx_hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTxHash}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Link href="/" className="block">
                <Button className="w-full h-12">Back to Home</Button>
              </Link>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  resetClaim();
                  setStep(1);
                  setInvoiceId("");
                  setTemplateId("");
                  setInvoice(null);
                  setClaimResult(null);
                }}
              >
                File Another Claim
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ClaimPageContent />
    </Suspense>
  );
}
