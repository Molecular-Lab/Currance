"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Loader2, ExternalLink, ShieldX, FileCheck } from "lucide-react";
import {
  getInvoicesByUser,
  formatDate,
  formatCurrency,
  shortenAddress,
  getInvoiceStatusColor,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Invoice } from "@/types";

// Default user ID for demo
const DEFAULT_USER_ID = "user_001";

export default function HospitalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  // Check registration status from store
  const registration = useAppStore((state) => state.registration);
  const isRegistered = registration.template_id !== null && registration.verified;

  useEffect(() => {
    // Only fetch invoices if user is registered
    if (!isRegistered) {
      setLoading(false);
      return;
    }

    async function fetchInvoices() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      try {
        // This is the API call that Primus will observe
        const response = await fetch(`${API_URL}/api/invoices/user/${DEFAULT_USER_ID}`);

        if (response.ok) {
          const data = await response.json();
          setApiResponse(JSON.stringify(data, null, 2));
          setInvoices(data);
        } else {
          const data = await getInvoicesByUser(DEFAULT_USER_ID);
          setInvoices(data);
          setApiResponse(JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.error("Failed to fetch invoices from API, using mock data:", error);
        const data = await getInvoicesByUser(DEFAULT_USER_ID);
        setInvoices(data);
        setApiResponse(JSON.stringify(data, null, 2));
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [isRegistered]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show registration required message if not registered
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mobile-container py-6">
          {/* Header */}
          <div className="mb-6">
            <Link href="/hospital">
              <Button variant="ghost" size="sm" className="mb-4 -ml-2">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Portal
              </Button>
            </Link>

            {/* Hospital branding */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Medical Invoices</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  Patient: {DEFAULT_USER_ID}
                </p>
              </div>
            </div>
          </div>

          {/* Registration Required Card */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <ShieldX className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-amber-900">
                    Registration Required
                  </h2>
                  <p className="text-sm text-amber-700 mt-2">
                    You need to register your health records with Curance before viewing invoices.
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="text-left p-3 bg-white rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-800 font-medium mb-2">
                      Complete these steps first:
                    </p>
                    <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                      <li>View your health records</li>
                      <li>Register with Curance (Primus verifies)</li>
                      <li>Then view invoices and file claims</li>
                    </ol>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link href="/hospital/records">
                      <Button variant="outline" className="w-full">
                        <FileCheck className="mr-2 h-4 w-4" />
                        View Health Records
                      </Button>
                    </Link>
                    <Link href="/curance/register">
                      <Button className="w-full">
                        Register with Curance
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/hospital">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Portal
            </Button>
          </Link>

          {/* Hospital branding */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Medical Invoices</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Patient: {DEFAULT_USER_ID}
              </p>
            </div>
          </div>
        </div>

        {/* Invoices list */}
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No invoices found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.invoice_id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-mono">
                        {invoice.invoice_id}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(invoice.created_at)}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getInvoiceStatusColor(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Invoice details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Description</span>
                      <span className="text-sm">{invoice.description}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(invoice.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Hospital Wallet
                      </span>
                      <span className="text-sm font-mono">
                        {shortenAddress(invoice.receiver_address)}
                      </span>
                    </div>
                  </div>

                  {/* Action button - only for pending invoices */}
                  {invoice.status === "pending" && (
                    <div className="pt-3 border-t">
                      <Link href={`/claim?invoice_id=${invoice.invoice_id}`}>
                        <Button className="w-full h-11">
                          Select for Claim
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* API Response debug */}
        <div className="mt-6 pt-6 border-t">
          <details className="text-xs" open>
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground font-medium">
              View API Response (for Primus)
            </summary>
            <pre className="mt-2 p-3 bg-neutral-100 rounded-lg overflow-auto text-[10px] font-mono max-h-64">
              {apiResponse || "No API response captured"}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
