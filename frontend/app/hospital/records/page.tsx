"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Heart, Activity, Scale, Droplets, Loader2, CheckCircle, FileText, PenTool, Hash } from "lucide-react";
import { shortenAddress } from "@/lib/api";
import { getRecordsByUser, formatDate, getStatusColor } from "@/lib/api";
import type { HealthRecord } from "@/types";

// Default user ID for Primus observation
const DEFAULT_USER_ID = "user_001";

export default function HospitalRecordsPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecords() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      try {
        // This is the API call that Primus will observe
        // GET /api/records/user/{user_id}
        const response = await fetch(`${API_URL}/api/records/user/${DEFAULT_USER_ID}`);

        if (response.ok) {
          const data = await response.json();
          setApiResponse(JSON.stringify(data, null, 2));
          setRecords(data);
        } else {
          // Fall back to mock data for demo
          const data = await getRecordsByUser(DEFAULT_USER_ID);
          setRecords(data);
          setApiResponse(JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.error("Failed to fetch records from API, using mock data:", error);
        // Fall back to mock data for demo
        const data = await getRecordsByUser(DEFAULT_USER_ID);
        setRecords(data);
        setApiResponse(JSON.stringify(data, null, 2));
      } finally {
        setLoading(false);
      }
    }

    fetchRecords();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <h1 className="text-xl font-bold">Health Records</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Patient: {DEFAULT_USER_ID}
              </p>
            </div>
          </div>
        </div>

        {/* Primus observation notice */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Primus zkTLS:</strong> This page makes an API call that Primus observes to verify your health records without exposing sensitive data.
          </p>
        </div>

        {/* Records list */}
        {records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No health records found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <Card key={record.record_id} className="overflow-hidden">
                {/* Card header with record info */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-mono">
                        {record.record_id}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(record.created_at)}
                      </CardDescription>
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

                  {/* Vitals grid */}
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

                  {/* Primus zkTLS Attestation Data */}
                  <div className="p-3 bg-green-50 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-green-800 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Attestation Data (Primus observes this)
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground w-24 shrink-0">Health Info:</span>
                        <span className="text-green-800">{record.health_info}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PenTool className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Signature:</span>
                        <span className="font-mono text-[10px] text-green-700">{shortenAddress(record.doctor_signature)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Doc Hash:</span>
                        <span className="font-mono text-[10px] text-green-700">{shortenAddress(record.document_hash)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hospital info */}
                  <div className="pt-3 border-t text-xs text-muted-foreground">
                    <p>{record.hospital_name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* API Response debug (shows what Primus observes) */}
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

        {/* Next step hint */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <p className="text-sm text-green-800">
            <strong>Next:</strong> Register with Curance to get health insurance coverage.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/curance/register">
              <Button className="w-full">
                Register with Curance
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
