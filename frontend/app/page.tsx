"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { shortenAddress } from "@/lib/utils";
import { Shield, Hospital, FileCheck, LayoutDashboard } from "lucide-react";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Curance</h1>
          </div>

          {isConnected ? (
            <Button onClick={() => disconnect()} variant="outline">
              {shortenAddress(address || "")}
            </Button>
          ) : (
            <Button onClick={() => connect({ connector: injected() })}>
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Privacy-Preserving Health Insurance
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Insurance underwrites based on your health data WITHOUT knowing your identity.
            Powered by zero-knowledge proofs and blockchain technology.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Link href="/dashboard">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <LayoutDashboard className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  View your policy details and coverage status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li>✓ Policy coverage details</li>
                  <li>✓ Remaining balance</li>
                  <li>✓ Expiry date tracking</li>
                  <li>✓ Quick claim access</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/register">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Register Policy</CardTitle>
                <CardDescription>
                  Buy insurance coverage by proving your health data privately
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li>✓ Verify health data via zkTLS</li>
                  <li>✓ Generate cryptographic commitment</li>
                  <li>✓ Pay premium for coverage</li>
                  <li>✓ Identity stays private</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hospital">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <Hospital className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Hospital Portal</CardTitle>
                <CardDescription>
                  Healthcare providers create claims for treatments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li>✓ Receive patient commitment</li>
                  <li>✓ Create claim with amount</li>
                  <li>✓ Automatic settlement</li>
                  <li>✓ No patient identity needed</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/claim">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <FileCheck className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Verify Claim</CardTitle>
                <CardDescription>
                  Patients verify claims and trigger automatic payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li>✓ Enter claim ID from hospital</li>
                  <li>✓ Prove ownership with secret</li>
                  <li>✓ Auto-settle to hospital</li>
                  <li>✓ Privacy maintained</li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-8">How It Works</h3>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Register Policy</h4>
                <p className="text-gray-600">
                  Prove your health data from a trusted source using Reclaim Protocol (zkTLS).
                  Create a cryptographic commitment that hides your identity.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Receive Treatment</h4>
                <p className="text-gray-600">
                  Share your commitment with the hospital. They create a claim against your policy
                  without learning who you are.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Verify & Settle</h4>
                <p className="text-gray-600">
                  Use your secret to prove claim ownership. Payment automatically transfers to the
                  hospital. Your identity remains private throughout.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {!isConnected && (
          <div className="mt-16 text-center">
            <Button
              size="lg"
              onClick={() => connect({ connector: injected() })}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Get Started - Connect Wallet
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8 bg-white">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Built with Reclaim Protocol & Base Sepolia</p>
          <p className="text-sm mt-2">POC for ETH Bangkok Hackathon</p>
        </div>
      </footer>
    </div>
  );
}
