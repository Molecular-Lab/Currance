"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, FileText, Receipt } from "lucide-react";

export default function HospitalPage() {
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

          {/* Hospital branding */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Bangkok General Hospital</h1>
              <p className="text-xs text-muted-foreground">Patient Portal</p>
            </div>
          </div>
        </div>

        {/* Quick access cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Portal</CardTitle>
              <CardDescription>
                Access your health records and invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/hospital/records" className="block">
                <Button variant="outline" className="w-full h-14 justify-start gap-3">
                  <FileText className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Health Records</p>
                    <p className="text-xs text-muted-foreground">View your medical history</p>
                  </div>
                </Button>
              </Link>

              <Link href="/hospital/invoices" className="block">
                <Button variant="outline" className="w-full h-14 justify-start gap-3">
                  <Receipt className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Invoices</p>
                    <p className="text-xs text-muted-foreground">View and claim medical bills</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Demo info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Demo:</strong> This is a simulated hospital portal. Records are pre-loaded for demonstration of the Primus zkTLS verification flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
