// Health record with detailed vitals for insurance assessment
// This schema is what Primus zkTLS observes and attests to
export interface HealthRecord {
  record_id: string;
  hospital_name: string;
  patient_name: string;
  diagnosis: string;
  status: "healthy" | "minor" | "moderate" | "serious";
  vitals: {
    blood_pressure: string;
    heart_rate: number;
    bmi: number;
    cholesterol: number;
  };
  created_at: string;
  // Fields for Primus zkTLS attestation
  health_info: string; // Summary of health status
  doctor_signature: string; // Digital signature from doctor
  document_hash: string; // Hash of the medical document
}

// Invoice for medical expenses
export interface Invoice {
  invoice_id: string;
  amount: number;
  receiver_address: string;
  description: string;
  status: "pending" | "claimed" | "paid";
  created_at: string;
}

// Primus verification template
export interface Template {
  template_id: string;
  name: string;
  type: "registration" | "claim";
  created_at: string;
}

// Claim processing result
export interface ClaimResult {
  tx_hash: string;
  status: "success" | "pending" | "failed";
  amount: number;
}

// Insurance package tiers
export interface InsurancePackage {
  id: string;
  name: string;
  price: number; // Monthly price in USD
  coverage: number; // Maximum coverage in USD
  description: string;
  features: string[];
}

// User records mapping (for hospital portal)
export interface UserRecordsMap {
  [userId: string]: HealthRecord[];
}

// User invoices mapping (for hospital portal)
export interface UserInvoicesMap {
  [userId: string]: Invoice[];
}

// Primus attestation result
export interface PrimusAttestation {
  attestation_id: string;
  template_id: string;
  verified: boolean;
  data: Record<string, unknown>;
  timestamp: string;
}
