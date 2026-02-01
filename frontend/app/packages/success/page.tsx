"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { insurancePackages } from "@/lib/api";

export default function PackageSuccessPage() {
  const { registration, resetRegistration } = useAppStore();

  const selectedPackage = insurancePackages.find(
    (p) => p.id === registration.package_id
  );

  // Reset registration on unmount (optional)
  useEffect(() => {
    return () => {
      // Optionally reset after viewing success
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6">
        <Card className="mt-12">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">Policy Activated!</CardTitle>
            <CardDescription>
              Your health insurance is now active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Policy summary */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plan</span>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {selectedPackage?.name || "Standard"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Record ID</span>
                <span className="text-sm font-mono">
                  {registration.record_id || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Template ID</span>
                <span className="text-sm font-mono text-xs truncate max-w-[150px]">
                  {registration.template_id || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-green-600">
                  Active
                </span>
              </div>
            </div>

            {/* Next steps */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                You can now file claims against your policy when you receive
                medical treatment.
              </p>
            </div>

            {/* Action buttons */}
            <Link href="/" className="block">
              <Button className="w-full h-12">Back to Home</Button>
            </Link>

            <Link href="/claim" className="block">
              <Button variant="outline" className="w-full">
                File a Claim
              </Button>
            </Link>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                resetRegistration();
              }}
            >
              Start New Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
