"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Shield, FileText, Lock, Wallet, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo/Brand - CURANCE style */}
        <div className="text-center mb-8">
          {/* Shield logo with cross */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-primary/10 rounded-2xl"></div>
            <div className="absolute inset-2 bg-primary rounded-xl flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" />
                <path d="M12 8v8M8 12h8" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Brand name */}
          <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">
            curance
          </h1>
          <p className="text-lg font-medium text-foreground mb-1">
            Privacy Preserving Crypto Health Insurance
          </p>
          <p className="text-sm text-muted-foreground">
            using zkTLS
          </p>
        </div>

        {/* Key value props from pitch deck */}
        <div className="w-full max-w-[320px] mb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Pay in USDC</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">zkTLS Verified</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Stay Anonymous</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Nothing to Leak</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-[280px] space-y-3">
          <Link href="/curance/register" className="block">
            <Button
              size="lg"
              className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90"
            >
              Register Policy
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>

          <Link href="/claim" className="block">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 text-base font-medium border-primary text-primary hover:bg-primary hover:text-white"
            >
              Insurance Claiming
            </Button>
          </Link>
        </div>

        {/* Hospital Portal - Demo section */}
        <div className="mt-10 pt-6 border-t border-border/50 w-full max-w-[320px]">
          <p className="text-xs text-center text-muted-foreground uppercase tracking-wide mb-3">
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

          <p className="mt-2 text-xs text-center text-muted-foreground">
            View mock health records and invoices
          </p>
        </div>

        {/* How zkTLS Works - from pitch deck */}
        <div className="mt-8 w-full max-w-[320px]">
          <p className="text-xs text-center text-muted-foreground uppercase tracking-wide mb-4">
            How Primus zkTLS Works
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Visit Hospital Portal</p>
                <p className="text-xs text-muted-foreground">
                  Logged in as yourself
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Primus Creates Proof</p>
                <p className="text-xs text-muted-foreground">
                  Observes data, strips your identity
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Proof Sent to Curance</p>
                <p className="text-xs text-muted-foreground">
                  We verify claims without knowing who you are
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy boundary visualization */}
        <div className="mt-8 w-full max-w-[320px] p-4 bg-muted/30 rounded-xl">
          <div className="flex items-center justify-between text-xs">
            <div className="text-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-1">
                <Building2 className="h-5 w-5 text-red-600" />
              </div>
              <p className="font-medium">Hospital</p>
              <p className="text-muted-foreground">Knows you</p>
            </div>

            <div className="flex-1 flex items-center justify-center px-2">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-red-200 to-primary/30"></div>
              <div className="px-2 py-1 bg-primary/10 rounded text-[10px] font-medium text-primary whitespace-nowrap mx-1">
                zkTLS
              </div>
              <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/30 to-green-200"></div>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-1">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <p className="font-medium">Curance</p>
              <p className="text-muted-foreground">Only proof</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-medium text-primary">Primus zkTLS</span>
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          ETH Chiang Mai 2026
        </p>
      </footer>
    </div>
  );
}
