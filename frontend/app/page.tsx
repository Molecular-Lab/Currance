"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Shield, FileCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo/Brand */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">CURANCE</h1>
          <p className="text-muted-foreground">Privacy-Preserving Health Insurance</p>
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-[280px] space-y-4">
          <Link href="/curance/register" className="block">
            <Button
              variant="default"
              size="lg"
              className="w-full h-14 text-base font-medium"
            >
              Register Policy
            </Button>
          </Link>

          <Link href="/claim" className="block">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 text-base font-medium"
            >
              File Claim
            </Button>
          </Link>
        </div>

        {/* Demo section */}
        <div className="mt-12 pt-8 border-t w-full max-w-[320px]">
          <p className="text-xs text-center text-muted-foreground uppercase tracking-wide mb-4">
            Demo Mode
          </p>

          <Link href="/hospital" className="block">
            <Button
              variant="secondary"
              size="lg"
              className="w-full h-12 text-sm"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Hospital Portal
            </Button>
          </Link>

          <p className="mt-3 text-xs text-center text-muted-foreground">
            View mock health records and invoices
          </p>
        </div>

        {/* How it works */}
        <div className="mt-10 w-full max-w-[320px]">
          <p className="text-xs text-center text-muted-foreground uppercase tracking-wide mb-4">
            How zkTLS Works
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                1
              </div>
              <div>
                <p className="text-sm font-medium">View Data</p>
                <p className="text-xs text-muted-foreground">
                  Check your records at Hospital Portal
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Create Template</p>
                <p className="text-xs text-muted-foreground">
                  Set up verification at Primus
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Verify & Submit</p>
                <p className="text-xs text-muted-foreground">
                  Prove your data without exposing it
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Primus zkTLS
        </p>
      </footer>
    </div>
  );
}
