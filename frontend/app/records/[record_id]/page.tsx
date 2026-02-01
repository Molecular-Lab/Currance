"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Heart, Activity, Scale, Droplets, CheckCircle } from "lucide-react";
import { getRecord, formatDate, getStatusColor } from "@/lib/api";
import type { HealthRecord } from "@/types";

/**
 * Health Record Detail Page
 *
 * This page is an observation point for Primus zkTLS.
 * When users visit this page, a network call is made to fetch record data.
 * Primus observes this call and can attest to the record_id in the response.
 */
export default function RecordPage() {
  const params = useParams();
  const record_id = params.record_id as string;
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecord() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      try {
        // This network call is what Primus observes
        // GET /api/records/{record_id}
        const response = await fetch(`${API_URL}/api/records/${record_id}`);

        if (response.ok) {
          const data = await response.json();
          setApiResponse(JSON.stringify(data, null, 2));
          setRecord(data);
        } else {
          // Fall back to mock data for demo
          const data = await getRecord(record_id);
          setRecord(data);
          setApiResponse(JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.error("Failed to fetch record from API, using mock data:", error);
        // Fall back to mock data for demo
        const data = await getRecord(record_id);
        setRecord(data);
        setApiResponse(JSON.stringify(data, null, 2));
      } finally {
        setLoading(false);
      }
    }

    fetchRecord();
  }, [record_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) {
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
              <p className="text-muted-foreground">Record not found: {record_id}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Try: rec_123456 or rec_789012
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
          <h1 className="text-2xl font-bold">Health Record</h1>
          <p className="text-sm text-muted-foreground font-mono">{record_id}</p>
        </div>

        {/* Record Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{record.hospital_name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {formatDate(record.created_at)}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                  record.status
                )}`}
              >
                {record.status === "healthy" && (
                  <CheckCircle className="inline-block mr-1 h-3 w-3" />
                )}
                {record.status}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Diagnosis */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
              <p className="text-sm font-medium">{record.diagnosis}</p>
            </div>

            {/* Vitals */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Vital Signs</p>
              <div className="vitals-grid">
                <div className="vital-item">
                  <Heart className="h-4 w-4 mx-auto mb-1 text-red-500" />
                  <p className="vital-label">Blood Pressure</p>
                  <p className="vital-value">{record.vitals.blood_pressure}</p>
                </div>
                <div className="vital-item">
                  <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
                  <p className="vital-label">Heart Rate</p>
                  <p className="vital-value">{record.vitals.heart_rate} bpm</p>
                </div>
                <div className="vital-item">
                  <Scale className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  <p className="vital-label">BMI</p>
                  <p className="vital-value">{record.vitals.bmi}</p>
                </div>
                <div className="vital-item">
                  <Droplets className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                  <p className="vital-label">Cholesterol</p>
                  <p className="vital-value">{record.vitals.cholesterol} mg/dL</p>
                </div>
              </div>
            </div>
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
            <Link href="/curance/register" className="underline font-medium">
              register your policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
