"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
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
  startHealthRecordAttestation,
  verifyAttestation,
  getPrimusStatus,
  CURANCE_TEMPLATES,
} from "@/lib/primus";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  ExternalLink,
  Shield,
  AlertCircle,
  Building2,
} from "lucide-react";

type FlowState = "initial" | "attesting" | "success" | "error";

// Wrapper component to handle Suspense
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageLoading />}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const { registration, setRegistration, resetRegistration } = useAppStore();

  const [flowState, setFlowState] = useState<FlowState>("initial");
  const [error, setError] = useState("");
  const [primusStatus, setPrimusStatus] = useState(getPrimusStatus());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Default wallet address for demo
  const userAddress = "0x976E6aA697f860Af7771c22c630CC843107e6DEe";

  // Initialize Primus SDK on mount
  useEffect(() => {
    const init = async () => {
      const success = await initPrimusSDK();
      setSdkReady(success);
      setPrimusStatus(getPrimusStatus());
    };
    init();
  }, []);

  /**
   * Handle the "Register Policy" click
   *
   * Flow:
   * 1. Generate request params with pre-configured template
   * 2. Sign the request
   * 3. Start attestation - Primus Extension opens and redirects to hospital
   * 4. User verifies in Primus Extension
   * 5. startAttestation() resolves with attestation
   * 6. Verify attestation
   * 7. Show success modal
   */
  const handleRegisterClick = async () => {
    setError("");
    setFlowState("attesting");

    // Reset any previous registration
    resetRegistration();
    setRegistration({ template_id: CURANCE_TEMPLATES.TEMPLATE_ID });

    try {
      console.log("Starting Primus attestation flow...");
      console.log("Template ID:", CURANCE_TEMPLATES.TEMPLATE_ID);
      console.log("User Address:", userAddress);

      // This call will:
      // 1. Generate request params
      // 2. Sign the request
      // 3. Open Primus Extension popup
      // 4. Primus redirects user to hospital records URL
      // 5. User completes verification
      // 6. Returns attestation when done
      const result = await startHealthRecordAttestation(userAddress);

      console.log("Attestation result:", result);

      if (result.success && result.attestation) {
        // Verify the attestation
        console.log("Verifying attestation...");
        const verifyResult = await verifyAttestation(result.attestation);
        console.log("Verification result:", verifyResult);

        if (verifyResult.valid) {
          // Convert attestation to string for storage (it might be an object)
          const attestationStr = typeof result.attestation === "string"
            ? result.attestation
            : JSON.stringify(result.attestation);

          // Success! Update store and show modal
          setRegistration({
            template_id: CURANCE_TEMPLATES.TEMPLATE_ID,
            verified: true,
            attestation: attestationStr,
            record_id: verifyResult.data?.record_id || "verified_record",
          });

          setFlowState("success");
          setShowSuccessModal(true);
        } else {
          throw new Error(verifyResult.error || "Verification failed");
        }
      } else {
        throw new Error(result.error || "Attestation failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setFlowState("error");
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  // Navigate to package selection
  const handleContinueToPackages = () => {
    setShowSuccessModal(false);
    router.push("/packages");
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
          <h1 className="text-2xl font-bold mb-1">Register Policy</h1>
          <p className="text-sm text-muted-foreground">
            Verify your health records with Primus zkTLS
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

        {/* Initial State - Show Register Button */}
        {flowState === "initial" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privacy-Preserving Verification</CardTitle>
              <CardDescription>
                Your health data stays private. Curance uses Primus zkTLS to verify your records
                without accessing the actual data.
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
                    <p className="text-sm font-medium">Click Register Policy</p>
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
                    <p className="text-sm font-medium">Verify at Hospital Portal</p>
                    <p className="text-xs text-muted-foreground">
                      Primus will redirect you to verify your health records
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">Complete Verification</p>
                    <p className="text-xs text-muted-foreground">
                      Once verified, you&apos;ll see a success confirmation
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
                onClick={handleRegisterClick}
                className="w-full h-12"
                disabled={!sdkReady}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Register Policy
              </Button>

              {/* Debug info */}
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">
                  Debug Info
                </summary>
                <div className="mt-2 p-2 bg-muted rounded text-[10px] font-mono space-y-1">
                  <p>Template: {CURANCE_TEMPLATES.TEMPLATE_ID}</p>
                  <p>User: {userAddress}</p>
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
                  <h2 className="text-lg font-semibold">Verifying Your Records</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please complete the verification in the Primus Extension popup...
                  </p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Template: {CURANCE_TEMPLATES.TEMPLATE_ID}</p>
                  <p>The extension will redirect you to the hospital portal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Verified - Show Option to Continue */}
        {registration.verified && flowState === "initial" && (
          <Card className="mt-4 border-green-200 bg-green-50">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Already Verified</p>
                  <p className="text-xs text-green-700">
                    Your health records have been verified
                  </p>
                </div>
                <Button size="sm" onClick={() => router.push("/packages")}>
                  Continue
                </Button>
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
              <DialogTitle className="text-xl">Verification Successful!</DialogTitle>
              <DialogDescription>
                Your health records have been verified with Primus zkTLS.
                Your data remains private and secure.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                </div>
                {registration.record_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Record</span>
                    <span className="font-mono text-xs">{registration.record_id}</span>
                  </div>
                )}
                {registration.attestation && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Attestation</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {registration.attestation.slice(0, 20)}...
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleContinueToPackages} className="w-full">
                Select Insurance Plan
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSuccessModal(false)}
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
