"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import {
  initPrimusSDK,
  startInvoiceAttestation,
  verifyAttestation,
  getPrimusStatus,
} from "@/lib/primus";
import {
  formatCurrency,
  shortenAddress,
  processClaim,
  getInvoice,
} from "@/lib/api";
import type { Invoice, ClaimResult } from "@/types";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Copy,
  Shield,
  AlertCircle,
  FileText,
  ArrowRight,
  Wallet,
  Send,
} from "lucide-react";
import { ENV } from "@/lib/env";

type FlowState = "initial" | "attesting" | "processing" | "success" | "error";

function ClaimPageContent() {
  const searchParams = useSearchParams();
  const { claim, setClaim, resetClaim, registration } = useAppStore();

  const [flowState, setFlowState] = useState<FlowState>("initial");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState("");
  const [primusStatus, setPrimusStatus] = useState(getPrimusStatus());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [copied, setCopied] = useState(false);

  // Default wallet address for demo
  const userAddress = "0x976E6aA697f860Af7771c22c630CC843107e6DEe";

  // Get invoice_id from URL params if provided
  const invoiceIdFromUrl = searchParams.get("invoice_id");

  // Initialize Primus SDK on mount
  useEffect(() => {
    const init = async () => {
      const success = await initPrimusSDK();
      setSdkReady(success);
      setPrimusStatus(getPrimusStatus());
    };
    init();
  }, []);

  // Load invoice if invoice_id is in URL
  useEffect(() => {
    if (invoiceIdFromUrl) {
      const loadInvoice = async () => {
        const fetchedInvoice = await getInvoice(invoiceIdFromUrl);
        if (fetchedInvoice) {
          setInvoice(fetchedInvoice);
        }
      };
      loadInvoice();
    }
  }, [invoiceIdFromUrl]);

  // Reset claim state on mount
  useEffect(() => {
    resetClaim();
  }, [resetClaim]);

  /**
   * Handle the "Insurance Claiming" click
   *
   * Flow:
   * 1. Start Primus attestation for invoice verification
   * 2. Primus Extension opens and redirects to hospital invoices
   * 3. User verifies in Primus Extension
   * 4. startAttestation() resolves with attestation
   * 5. Verify attestation
   * 6. Process claim (mock token transfer)
   * 7. Show success modal with transfer details
   */
  const handleFileClaimClick = async () => {
    setError("");
    setFlowState("attesting");

    // Reset any previous claim
    resetClaim();
    setClaim({ template_id: ENV.CLAIM_TEMPLATE_ID });

    try {
      console.log("Starting Primus claim attestation flow...");
      console.log("Template ID:", ENV.CLAIM_TEMPLATE_ID);
      console.log("User Address:", userAddress);
      console.log("Invoice ID:", invoice?.invoice_id || "from verification");

      // This call will:
      // 1. Generate request params
      // 2. Sign the request
      // 3. Open Primus Extension popup
      // 4. Primus redirects user to hospital invoices URL
      // 5. User completes verification
      // 6. Returns attestation when done
      const result = await startInvoiceAttestation(
        userAddress,
        invoice?.invoice_id || ""
      );

      console.log("Attestation result:", result);

      if (result.success && result.attestation) {
        // Verify the attestation
        console.log("Verifying attestation...");
        const verifyResult = await verifyAttestation(result.attestation);
        console.log("Verification result:", verifyResult);

        if (verifyResult.valid) {
          // Update claim state
          setClaim({
            template_id: ENV.CLAIM_TEMPLATE_ID,
            invoice_id: invoice?.invoice_id || verifyResult.data?.invoice_id || "verified_invoice",
            verified: true,
          });

          // Now process the claim (mock token transfer)
          setFlowState("processing");
          console.log("Processing claim - transferring tokens...");

          // Mock delay for token transfer
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Use invoice from state or create mock result
          const claimAmount = invoice?.amount || verifyResult.data?.amount || 1500;
          const mockTxHash = `0x${Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("")}`;

          const result: ClaimResult = {
            tx_hash: mockTxHash,
            status: "success",
            amount: claimAmount,
          };

          setClaimResult(result);
          setFlowState("success");
          setShowSuccessModal(true);
        } else {
          throw new Error(verifyResult.error || "Verification failed");
        }
      } else {
        throw new Error(result.error || "Attestation failed");
      }
    } catch (err) {
      console.error("Claim error:", err);
      setFlowState("error");
      setError(err instanceof Error ? err.message : "Claim verification failed");
    }
  };

  // Copy tx hash to clipboard
  const handleCopyTxHash = async () => {
    if (!claimResult?.tx_hash) return;
    await navigator.clipboard.writeText(claimResult.tx_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close modal and stay on page
  const handleCloseModal = () => {
    setShowSuccessModal(false);
  };

  // Check if user is registered
  const isRegistered = registration.verified;

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
          <h1 className="text-2xl font-bold mb-1">Insurance Claiming</h1>
          <p className="text-sm text-muted-foreground">
            Verify your invoice with Primus zkTLS and receive payment
          </p>
        </div>

        {/* Primus Status Badge */}
        <div className="mb-4 flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              sdkReady
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <Shield className="h-3 w-3" />
            Primus: {sdkReady ? "Ready" : "Initializing..."}
          </div>
          {isRegistered && (
            <div className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3" />
              Registered
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="link"
                size="sm"
                className="text-red-600 p-0 h-auto"
                onClick={() => {
                  setError("");
                  setFlowState("initial");
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Not Registered Warning */}
        {!isRegistered && flowState === "initial" && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> You should register with Curance first to file claims.{" "}
              <Link href="/curance/register" className="underline">
                Register now
              </Link>
            </p>
          </div>
        )}

        {/* Invoice Preview (if from URL) */}
        {invoice && flowState === "initial" && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Selected Invoice</p>
                  <p className="text-xs text-blue-700 font-mono">{invoice.invoice_id}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Amount</span>
                  <span className="font-bold text-blue-900">{formatCurrency(invoice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Description</span>
                  <span className="text-blue-900 text-right max-w-[180px]">{invoice.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Hospital Wallet</span>
                  <span className="font-mono text-blue-900">{shortenAddress(invoice.receiver_address)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Initial State - Show Insurance Claiming Button */}
        {flowState === "initial" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privacy-Preserving Claim</CardTitle>
              <CardDescription>
                Your invoice data stays private. Curance uses Primus zkTLS to verify your invoice
                and automatically transfer funds to the hospital.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* How it works */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">Click Insurance Claiming</p>
                    <p className="text-xs text-muted-foreground">
                      This will open the Primus Extension
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium">Verify Invoice at Hospital Portal</p>
                    <p className="text-xs text-muted-foreground">
                      Primus will redirect you to verify your invoice
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">Automatic Token Transfer</p>
                    <p className="text-xs text-muted-foreground">
                      Once verified, funds are sent to the hospital wallet
                    </p>
                  </div>
                </div>
              </div>

              {/* Extension note */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> Make sure you have the{" "}
                  <a
                    href="https://chromewebstore.google.com/detail/primus-extension/opljaaghlgcbmjbnmnebfpgijocgegoa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Primus Extension
                  </a>{" "}
                  installed in your browser.
                </p>
              </div>

              <Button
                onClick={handleFileClaimClick}
                className="w-full h-12"
                disabled={!sdkReady}
              >
                <FileText className="mr-2 h-4 w-4" />
                Insurance Claiming
              </Button>

              {/* Link to hospital invoices */}
              {!invoice && (
                <Link href="/hospital/invoices" className="block">
                  <Button variant="outline" className="w-full">
                    View Hospital Invoices
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}

              {/* Debug info */}
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">
                  Debug Info
                </summary>
                <div className="mt-2 p-2 bg-muted rounded text-[10px] font-mono space-y-1">
                  <p>Template: {ENV.CLAIM_TEMPLATE_ID}</p>
                  <p>User: {userAddress}</p>
                  <p>Invoice: {invoice?.invoice_id || "none selected"}</p>
                  <p>SDK Ready: {sdkReady ? "Yes" : "No"}</p>
                  <p>Mode: {primusStatus.mode}</p>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Attesting State - Loading */}
        {flowState === "attesting" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Verifying Your Invoice</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please complete the verification in the Primus Extension popup...
                  </p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Template: {ENV.CLAIM_TEMPLATE_ID}</p>
                  <p>The extension will redirect you to the hospital portal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing State - Token Transfer */}
        {flowState === "processing" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Send className="h-8 w-8 text-green-600 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Processing Transfer</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verification complete! Transferring tokens to hospital...
                  </p>
                </div>
                {invoice && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold">{formatCurrency(invoice.amount)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">To</span>
                      <span className="font-mono text-xs">{shortenAddress(invoice.receiver_address)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State (shown after modal close) */}
        {flowState === "success" && !showSuccessModal && claimResult && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-green-800">Claim Processed!</h2>
                  <p className="text-sm text-green-700">
                    {formatCurrency(claimResult.amount)} transferred to hospital
                  </p>
                </div>

                {/* Transaction details */}
                <div className="p-3 bg-white rounded-lg text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-green-600 capitalize">{claimResult.status}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono flex-1 break-all bg-muted p-1 rounded">
                        {claimResult.tx_hash}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyTxHash}
                        className="shrink-0 h-6 w-6 p-0"
                      >
                        {copied ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Link href="/" className="block">
                    <Button className="w-full">Back to Home</Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetClaim();
                      setFlowState("initial");
                      setInvoice(null);
                      setClaimResult(null);
                    }}
                  >
                    File Another Claim
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-xl">Transfer Complete!</DialogTitle>
              <DialogDescription>
                Your claim has been verified and payment has been sent to the hospital.
              </DialogDescription>
            </DialogHeader>

            {claimResult && (
              <div className="space-y-3 py-4">
                {/* Transfer visualization */}
                <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Curance</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="h-0.5 flex-1 bg-green-300"></div>
                    <div className="px-2 py-1 bg-green-100 rounded-full text-xs font-bold text-green-700">
                      {formatCurrency(claimResult.amount)}
                    </div>
                    <div className="h-0.5 flex-1 bg-green-300"></div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-1">
                      <Wallet className="h-5 w-5 text-neutral-600" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Hospital</p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {claimResult.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold">{formatCurrency(claimResult.amount)}</span>
                  </div>
                  {invoice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receiver</span>
                      <span className="font-mono text-xs">{shortenAddress(invoice.receiver_address)}</span>
                    </div>
                  )}
                </div>

                {/* Transaction hash */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono flex-1 break-all">
                      {claimResult.tx_hash}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyTxHash}
                      className="shrink-0 h-6 w-6 p-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Link href="/" className="block">
                <Button className="w-full">
                  Back to Home
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleCloseModal}
              >
                Stay Here
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
