"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, ExternalLink, ShieldX, FileCheck } from "lucide-react";
import {
  getInvoice,
  formatDate,
  formatCurrency,
  shortenAddress,
  getInvoiceStatusColor,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Invoice } from "@/types";

/**
 * Invoice Detail Page
 *
 * This page is an observation point for Primus zkTLS.
 * When users visit this page, a network call is made to fetch invoice data.
 * Primus observes this call and can attest to the invoice_id and amount in the response.
 */
export default function InvoicePage() {
  const params = useParams();
  const invoice_id = params.invoice_id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  // Check registration status from store
  const registration = useAppStore((state) => state.registration);
  const isRegistered = registration.template_id !== null && registration.verified;

  useEffect(() => {
    // Only fetch invoice if user is registered
    if (!isRegistered) {
      setLoading(false);
      return;
    }

    async function fetchInvoice() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      try {
        // This network call is what Primus observes
        // GET /api/invoices/{invoice_id}
        const response = await fetch(`${API_URL}/api/invoices/${invoice_id}`);

        if (response.ok) {
          const data = await response.json();
          setApiResponse(JSON.stringify(data, null, 2));
          setInvoice(data);
        } else {
          // Fall back to mock data for demo
          const data = await getInvoice(invoice_id);
          setInvoice(data);
          setApiResponse(JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.error("Failed to fetch invoice from API, using mock data:", error);
        // Fall back to mock data for demo
        const data = await getInvoice(invoice_id);
        setInvoice(data);
        setApiResponse(JSON.stringify(data, null, 2));
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [invoice_id, isRegistered]);

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
          <Link href="/hospital">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>

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
                      <li>Create a Primus template for your records</li>
                      <li>Register with Curance using the template</li>
                    </ol>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link href="/hospital">
                      <Button variant="outline" className="w-full">
                        <FileCheck className="mr-2 h-4 w-4" />
                        Go to Hospital Portal
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

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mobile-container py-6">
          <Link href="/hospital">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Invoice not found: {invoice_id}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Try: inv_456789, inv_012345, or inv_567890
              </p>
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
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Medical Invoice</h1>
          <p className="text-sm text-muted-foreground font-mono">{invoice_id}</p>
        </div>

        {/* Invoice Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{invoice.description}</CardTitle>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getInvoiceStatusColor(
                  invoice.status
                )}`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(invoice.created_at)}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Amount */}
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
              <p className="text-3xl font-bold">{formatCurrency(invoice.amount)}</p>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Invoice ID</span>
                <span className="text-sm font-mono">{invoice.invoice_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Hospital Wallet</span>
                <span className="text-sm font-mono">
                  {shortenAddress(invoice.receiver_address)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm capitalize">{invoice.status}</span>
              </div>
            </div>

            {/* Action button for pending invoices */}
            {invoice.status === "pending" && (
              <div className="pt-3 border-t">
                <Link href={`/claim?invoice_id=${invoice.invoice_id}`}>
                  <Button className="w-full h-11">
                    File Claim for This Invoice
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Response (for Primus debugging) */}
        <div className="mt-6 pt-6 border-t">
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
              View API Response (Primus observes this)
            </summary>
            <pre className="mt-2 p-3 bg-neutral-100 rounded-lg overflow-auto text-[10px] font-mono">
              {apiResponse || "No API response captured"}
            </pre>
          </details>
        </div>

        {/* Next step */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Next:</strong> Create a Primus template for this URL, then{" "}
            <Link href="/claim" className="underline font-medium">
              file your claim
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
