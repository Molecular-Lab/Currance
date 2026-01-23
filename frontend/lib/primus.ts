/**
 * Primus zkTLS Integration Service
 *
 * Handles attestation generation for:
 * - Health check verification (registration)
 * - Invoice verification (claims)
 */

import { keccak256, encodePacked } from 'viem';

// ============================================================================
// Configuration
// ============================================================================

const PRIMUS_CONFIG = {
  appId: process.env.NEXT_PUBLIC_PRIMUS_APP_ID || '',
  healthTemplateId: process.env.NEXT_PUBLIC_PRIMUS_HEALTH_TEMPLATE_ID || '',
  invoiceTemplateId: process.env.NEXT_PUBLIC_PRIMUS_INVOICE_TEMPLATE_ID || '',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'),
};

// ============================================================================
// Types
// ============================================================================

export interface AttNetworkRequest {
  url: string;
  header: string;
  method: string;
  body: string;
}

export interface AttNetworkResponseResolve {
  keyName: string;
  parseType: string;
  parsePath: string;
}

export interface Attestor {
  attestorAddr: string;
  url: string;
}

export interface PrimusAttestation {
  recipient: string;
  request: AttNetworkRequest;
  responseResolve: AttNetworkResponseResolve[];
  data: string;
  attConditions: string;
  timestamp: number;
  additionParams: string;
  attestors: Attestor[];
  signatures: string[];
}

export interface HealthData {
  healthScore: number;
  bmi: string;
  bloodPressure: string;
  checkupDate: string;
  hospitalId: string;
}

export interface InvoiceData {
  invoiceId: string;
  amount: number;
  currency: string;
  hospitalId: string;
  hospitalAddress: string;
  patientRef: string;
  treatmentType: string;
  invoiceDate: string;
}

export interface AttestationResult {
  success: boolean;
  attestation?: PrimusAttestation;
  data?: HealthData | InvoiceData;
  dataHash?: string;
  error?: string;
}

// ============================================================================
// Primus Service Class
// ============================================================================

class PrimusService {
  private primus: any = null;
  private initialized = false;

  /**
   * Check if Primus is configured
   */
  isConfigured(): boolean {
    return !!(
      PRIMUS_CONFIG.appId &&
      PRIMUS_CONFIG.healthTemplateId
    );
  }

  /**
   * Check if Primus Extension is installed
   */
  isExtensionInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).primus || !!(window as any).ethereum?.isPrimus;
  }

  /**
   * Initialize Primus SDK
   * Must be called before any attestation operations
   */
  async initialize(provider: any): Promise<boolean> {
    if (this.initialized && this.primus) {
      return true;
    }

    try {
      // Dynamic import to avoid SSR issues
      const { PrimusNetwork } = await import('@primuslabs/network-js-sdk');
      this.primus = new PrimusNetwork();

      // Log supported chains
      console.log('Primus supported chains:', this.primus.supportedChainIds);

      // Initialize with provider and chain
      await this.primus.init(provider, PRIMUS_CONFIG.chainId);

      this.initialized = true;
      console.log('Primus SDK initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Primus SDK:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Generate health check attestation
   * Used during policy registration
   */
  async generateHealthAttestation(
    userAddress: string
  ): Promise<AttestationResult> {
    if (!this.primus || !this.initialized) {
      return {
        success: false,
        error: 'Primus SDK not initialized. Call initialize() first.',
      };
    }

    try {
      console.log('Starting health check attestation...');

      // Step 1: Submit task to Primus network
      const submitTaskParams = {
        templateId: PRIMUS_CONFIG.healthTemplateId,
        address: userAddress,
      };

      console.log('Submitting task:', submitTaskParams);
      const taskResult = await this.primus.submitTask(submitTaskParams);
      console.log('Task submitted:', taskResult);

      // Step 2: Perform attestation (opens hospital portal)
      const attestParams = {
        ...submitTaskParams,
        ...taskResult,
      };

      console.log('Starting attestation...');
      const attestResult = await this.primus.attest(attestParams);
      console.log('Attestation result:', attestResult);

      // Step 3: Verify and poll for result
      const verifyParams = {
        taskId: attestResult[0].taskId,
        reportTxHash: attestResult[0].reportTxHash,
      };

      console.log('Verifying attestation...');
      const finalResult = await this.primus.verifyAndPollTaskResult(verifyParams);
      console.log('Final result:', finalResult);

      // Step 4: Extract health data from attestation
      const attestation = finalResult as PrimusAttestation;
      const healthData = JSON.parse(attestation.data) as HealthData;

      // Step 5: Generate health data hash
      const dataHash = this.generateHealthDataHash(healthData);

      return {
        success: true,
        attestation,
        data: healthData,
        dataHash,
      };
    } catch (error) {
      console.error('Health attestation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Attestation failed',
      };
    }
  }

  /**
   * Generate invoice attestation
   * Used during claims verification
   */
  async generateInvoiceAttestation(
    userAddress: string,
    invoiceId?: string
  ): Promise<AttestationResult> {
    if (!this.primus || !this.initialized) {
      return {
        success: false,
        error: 'Primus SDK not initialized. Call initialize() first.',
      };
    }

    try {
      console.log('Starting invoice attestation...');

      // Step 1: Submit task
      const submitTaskParams = {
        templateId: PRIMUS_CONFIG.invoiceTemplateId,
        address: userAddress,
        ...(invoiceId && { params: { invoiceId } }),
      };

      const taskResult = await this.primus.submitTask(submitTaskParams);

      // Step 2: Perform attestation
      const attestParams = {
        ...submitTaskParams,
        ...taskResult,
      };

      const attestResult = await this.primus.attest(attestParams);

      // Step 3: Verify and poll
      const verifyParams = {
        taskId: attestResult[0].taskId,
        reportTxHash: attestResult[0].reportTxHash,
      };

      const finalResult = await this.primus.verifyAndPollTaskResult(verifyParams);

      // Step 4: Extract invoice data
      const attestation = finalResult as PrimusAttestation;
      const invoiceData = JSON.parse(attestation.data) as InvoiceData;

      // Step 5: Generate invoice hash
      const dataHash = this.generateInvoiceHash(invoiceData);

      return {
        success: true,
        attestation,
        data: invoiceData,
        dataHash,
      };
    } catch (error) {
      console.error('Invoice attestation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Attestation failed',
      };
    }
  }

  /**
   * Generate hash of health data
   */
  generateHealthDataHash(healthData: HealthData): string {
    const encoded = encodePacked(
      ['uint256', 'string', 'string', 'string', 'string'],
      [
        BigInt(healthData.healthScore),
        healthData.bmi,
        healthData.bloodPressure,
        healthData.checkupDate,
        healthData.hospitalId,
      ]
    );
    return keccak256(encoded);
  }

  /**
   * Generate hash of invoice data
   */
  generateInvoiceHash(invoiceData: InvoiceData): string {
    const encoded = encodePacked(
      ['string', 'uint256', 'string', 'string', 'string'],
      [
        invoiceData.invoiceId,
        BigInt(invoiceData.amount),
        invoiceData.hospitalId,
        invoiceData.hospitalAddress,
        invoiceData.invoiceDate,
      ]
    );
    return keccak256(encoded);
  }

  /**
   * Serialize attestation for API transmission
   */
  serializeAttestation(attestation: PrimusAttestation): string {
    return JSON.stringify(attestation);
  }

  /**
   * Deserialize attestation from API
   */
  deserializeAttestation(json: string): PrimusAttestation {
    return JSON.parse(json) as PrimusAttestation;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const primusService = new PrimusService();

// ============================================================================
// Mock Implementation (for development without Primus Extension)
// ============================================================================

export function generateMockHealthAttestation(
  userAddress: string
): AttestationResult {
  const healthData: HealthData = {
    healthScore: Math.floor(Math.random() * 15) + 85,
    bmi: (Math.random() * 5 + 20).toFixed(1),
    bloodPressure: `${Math.floor(Math.random() * 20) + 110}/${Math.floor(Math.random() * 10) + 70}`,
    checkupDate: new Date().toISOString().split('T')[0],
    hospitalId: 'hospital_mock_001',
  };

  const dataHash = keccak256(
    encodePacked(
      ['uint256', 'string', 'string', 'string', 'string'],
      [
        BigInt(healthData.healthScore),
        healthData.bmi,
        healthData.bloodPressure,
        healthData.checkupDate,
        healthData.hospitalId,
      ]
    )
  );

  const mockAttestation: PrimusAttestation = {
    recipient: userAddress,
    request: {
      url: 'https://mock-hospital.example.com/api/health',
      header: '{}',
      method: 'GET',
      body: '',
    },
    responseResolve: [
      { keyName: 'healthScore', parseType: 'int', parsePath: '$.data.healthScore' },
      { keyName: 'bmi', parseType: 'string', parsePath: '$.data.bmi' },
    ],
    data: JSON.stringify(healthData),
    attConditions: '[]',
    timestamp: Date.now(),
    additionParams: '{"mock": true}',
    attestors: [
      {
        attestorAddr: '0x0000000000000000000000000000000000000001',
        url: 'https://mock-attestor.primuslabs.xyz',
      },
    ],
    signatures: ['0x' + '00'.repeat(65)],
  };

  return {
    success: true,
    attestation: mockAttestation,
    data: healthData,
    dataHash,
  };
}

export function generateMockInvoiceAttestation(
  userAddress: string,
  amount: number = 500
): AttestationResult {
  const invoiceData: InvoiceData = {
    invoiceId: `INV-${Date.now()}`,
    amount: amount * 1_000_000,
    currency: 'USDC',
    hospitalId: 'hospital_mock_001',
    hospitalAddress: '0x0000000000000000000000000000000000000002',
    patientRef: `PAT-${Math.random().toString(36).substring(7)}`,
    treatmentType: 'General Consultation',
    invoiceDate: new Date().toISOString().split('T')[0],
  };

  const dataHash = keccak256(
    encodePacked(
      ['string', 'uint256', 'string', 'string', 'string'],
      [
        invoiceData.invoiceId,
        BigInt(invoiceData.amount),
        invoiceData.hospitalId,
        invoiceData.hospitalAddress,
        invoiceData.invoiceDate,
      ]
    )
  );

  const mockAttestation: PrimusAttestation = {
    recipient: userAddress,
    request: {
      url: 'https://mock-hospital.example.com/api/invoice',
      header: '{}',
      method: 'GET',
      body: '',
    },
    responseResolve: [
      { keyName: 'invoiceId', parseType: 'string', parsePath: '$.data.id' },
      { keyName: 'amount', parseType: 'int', parsePath: '$.data.amount' },
    ],
    data: JSON.stringify(invoiceData),
    attConditions: '[]',
    timestamp: Date.now(),
    additionParams: '{"mock": true}',
    attestors: [
      {
        attestorAddr: '0x0000000000000000000000000000000000000001',
        url: 'https://mock-attestor.primuslabs.xyz',
      },
    ],
    signatures: ['0x' + '00'.repeat(65)],
  };

  return {
    success: true,
    attestation: mockAttestation,
    data: invoiceData,
    dataHash,
  };
}
