// Mock API for UI demonstration
// All functions return mock data - no real API calls

import type {
  HealthRecord,
  Invoice,
  Template,
  ClaimResult,
  InsurancePackage,
} from "@/types";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// Mock Health Records by User
// ============================================

// Base records data with Primus zkTLS attestation fields
const johnDoeRecord: HealthRecord = {
  record_id: "rec_123456",
  hospital_name: "Bangkok General Hospital",
  patient_name: "John Doe",
  diagnosis: "Annual Checkup - Healthy",
  status: "healthy",
  vitals: {
    blood_pressure: "120/80",
    heart_rate: 72,
    bmi: 22.5,
    cholesterol: 180,
  },
  created_at: "2024-01-15T10:30:00Z",
  // Primus zkTLS attestation fields
  health_info: "Patient is in good health. All vitals within normal range. No chronic conditions.",
  doctor_signature: "0x7a8f3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
  document_hash: "0xabc123def456789abc123def456789abc123def456789abc123def456789abcd",
};

const janeSmithRecord: HealthRecord = {
  record_id: "rec_789012",
  hospital_name: "Chiang Mai Medical Center",
  patient_name: "Jane Smith",
  diagnosis: "Minor Treatment - Cold/Flu",
  status: "minor",
  vitals: {
    blood_pressure: "118/75",
    heart_rate: 68,
    bmi: 21.2,
    cholesterol: 165,
  },
  created_at: "2024-01-20T14:45:00Z",
  // Primus zkTLS attestation fields
  health_info: "Minor respiratory infection. Treatment prescribed. Expected full recovery.",
  doctor_signature: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
  document_hash: "0xdef789abc123456def789abc123456def789abc123456def789abc123456defg",
};

const mockRecordsByUser: Record<string, HealthRecord[]> = {
  // Original IDs
  user_001: [johnDoeRecord],
  user_002: [janeSmithRecord],
  // Alternative demo IDs
  patient_no1: [johnDoeRecord],
  patient_001: [johnDoeRecord],
  patient_1: [johnDoeRecord],
  demo: [johnDoeRecord],
  test: [johnDoeRecord],
};

// ============================================
// Mock Invoices by User
// ============================================

// Base invoice data
const johnDoeInvoices: Invoice[] = [
  {
    invoice_id: "inv_456789",
    amount: 1500.0,
    receiver_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f10Ab3",
    description: "Outpatient Treatment - General Consultation",
    status: "pending",
    created_at: "2024-01-25T09:15:00Z",
  },
  {
    invoice_id: "inv_012345",
    amount: 3200.0,
    receiver_address: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    description: "Emergency Room Visit - Minor Injury",
    status: "pending",
    created_at: "2024-01-28T16:20:00Z",
  },
];

const janeSmithInvoices: Invoice[] = [
  {
    invoice_id: "inv_567890",
    amount: 850.0,
    receiver_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f10Ab3",
    description: "Lab Tests - Blood Work",
    status: "pending",
    created_at: "2024-01-30T11:00:00Z",
  },
];

const mockInvoicesByUser: Record<string, Invoice[]> = {
  // Original IDs
  user_001: johnDoeInvoices,
  user_002: janeSmithInvoices,
  // Alternative demo IDs
  patient_no1: johnDoeInvoices,
  patient_001: johnDoeInvoices,
  patient_1: johnDoeInvoices,
  demo: johnDoeInvoices,
  test: johnDoeInvoices,
};

// ============================================
// Individual Record/Invoice Lookups (for existing pages)
// ============================================
const mockRecords: Record<string, HealthRecord> = {
  rec_123456: johnDoeRecord,
  rec_789012: janeSmithRecord,
};

const mockInvoices: Record<string, Invoice> = {
  inv_456789: johnDoeInvoices[0],
  inv_012345: johnDoeInvoices[1],
  inv_567890: janeSmithInvoices[0],
};

// ============================================
// Insurance Packages
// ============================================
export const insurancePackages: InsurancePackage[] = [
  {
    id: "basic",
    name: "Basic",
    price: 50,
    coverage: 10000,
    description: "Essential coverage for everyday health needs",
    features: [
      "General consultations",
      "Basic lab tests",
      "Emergency care (limited)",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 100,
    coverage: 50000,
    description: "Comprehensive coverage for individuals and families",
    features: [
      "All Basic features",
      "Specialist consultations",
      "Surgery coverage",
      "Hospitalization",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 200,
    coverage: 100000,
    description: "Maximum protection with premium benefits",
    features: [
      "All Standard features",
      "International coverage",
      "Dental & vision",
      "Mental health support",
      "Wellness programs",
    ],
  },
];

// ============================================
// API Functions
// ============================================

// Get health record by ID
export async function getRecord(recordId: string): Promise<HealthRecord | null> {
  await delay(800);
  return mockRecords[recordId] || null;
}

// Get invoice by ID
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  await delay(800);
  return mockInvoices[invoiceId] || null;
}

// Get all records for a user
export async function getRecordsByUser(userId: string): Promise<HealthRecord[]> {
  await delay(600);
  return mockRecordsByUser[userId] || [];
}

// Get all invoices for a user
export async function getInvoicesByUser(userId: string): Promise<Invoice[]> {
  await delay(600);
  return mockInvoicesByUser[userId] || [];
}

// Get all insurance packages
export async function getPackages(): Promise<InsurancePackage[]> {
  await delay(400);
  return insurancePackages;
}

// Select a package (mock registration)
export async function selectPackage(
  packageId: string,
  recordId: string
): Promise<{ success: boolean; policy_id: string }> {
  await delay(1200);
  return {
    success: true,
    policy_id: `pol_${Date.now()}`,
  };
}

// Create template (mock)
let templateCounter = 1;
export async function createTemplate(
  type: "registration" | "claim",
  sourceId: string
): Promise<Template> {
  await delay(1200);
  const template: Template = {
    template_id: `tpl_${Date.now()}_${templateCounter++}`,
    name:
      type === "registration"
        ? "Health Verification Template"
        : "Claim Verification Template",
    type,
    created_at: new Date().toISOString(),
  };
  return template;
}

// Verify with Primus (mock placeholder)
export async function verifyWithPrimus(templateId: string): Promise<boolean> {
  await delay(1500);
  // Always returns true for demo
  return true;
}

// Process claim (mock)
export async function processClaim(invoiceId: string): Promise<ClaimResult> {
  await delay(2000);
  return {
    tx_hash: `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`,
    status: "success",
    amount: mockInvoices[invoiceId]?.amount || 0,
  };
}

// ============================================
// Utility Functions
// ============================================

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Shorten address for display
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get status color class
export function getStatusColor(
  status: "healthy" | "minor" | "moderate" | "serious"
): string {
  const colors = {
    healthy: "text-green-600 bg-green-50",
    minor: "text-yellow-600 bg-yellow-50",
    moderate: "text-orange-600 bg-orange-50",
    serious: "text-red-600 bg-red-50",
  };
  return colors[status] || colors.minor;
}

// Get invoice status color
export function getInvoiceStatusColor(
  status: "pending" | "claimed" | "paid"
): string {
  const colors = {
    pending: "text-yellow-600 bg-yellow-50",
    claimed: "text-blue-600 bg-blue-50",
    paid: "text-green-600 bg-green-50",
  };
  return colors[status] || colors.pending;
}
