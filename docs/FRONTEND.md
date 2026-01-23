# Frontend Specification

## Overview

Next.js application with wagmi for wallet interactions.

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── register/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── claim/
│   │   └── page.tsx
│   └── hospital/
│       └── page.tsx
├── components/
│   ├── ConnectButton.tsx
│   ├── PolicyCard.tsx
│   └── ClaimStatus.tsx
├── lib/
│   ├── contracts.ts
│   ├── wagmi.ts
│   └── utils.ts
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.local.example
```

## package.json

```json
{
  "name": "curance-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "connectkit": "^1.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

## .env.local.example

```
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CLAIMS_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_ORACLE_URL=http://localhost:3001
NEXT_PUBLIC_WC_PROJECT_ID=...
```

## tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

---

## lib/contracts.ts

```typescript
export const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`;
export const CLAIMS_ADDRESS = process.env.NEXT_PUBLIC_CLAIMS_ADDRESS as `0x${string}`;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
export const ORACLE_URL = process.env.NEXT_PUBLIC_ORACLE_URL || 'http://localhost:3001';

export const REGISTRY_ABI = [
  {
    name: 'registerPolicy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'commitment', type: 'bytes32' },
      { name: 'healthDataHash', type: 'bytes32' },
      { name: 'premium', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getPolicy',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [
      { name: 'premium', type: 'uint256' },
      { name: 'coverage', type: 'uint256' },
      { name: 'usedCoverage', type: 'uint256' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'getRemainingCoverage',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isPolicyValid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const CLAIMS_ABI = [
  {
    name: 'createClaim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'policyCommitment', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'invoiceHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'claimId', type: 'bytes32' }],
  },
  {
    name: 'getClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'bytes32' }],
    outputs: [
      { name: 'policyCommitment', type: 'bytes32' },
      { name: 'hospital', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'invoiceHash', type: 'bytes32' },
      { name: 'status', type: 'uint8' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'settledAt', type: 'uint256' },
    ],
  },
  {
    name: 'getClaimStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
```

---

## lib/wagmi.ts

```typescript
import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';

export const config = createConfig(
  getDefaultConfig({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http(),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '',
    appName: 'Curance',
    appDescription: 'Privacy-preserving health insurance',
  })
);
```

---

## lib/utils.ts

```typescript
import { keccak256, toBytes, encodePacked } from 'viem';

export function generateCommitment(
  secret: `0x${string}`, 
  healthDataHash: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(['bytes32', 'bytes32'], [secret, healthDataHash])
  );
}

export function generateSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

export function hashHealthData(data: object): `0x${string}` {
  return keccak256(toBytes(JSON.stringify(data)));
}

export function hashInvoice(invoiceId: string): `0x${string}` {
  return keccak256(toBytes(invoiceId));
}

export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1_000_000).toFixed(2);
}

export function parseUSDC(amount: string): bigint {
  return BigInt(Math.floor(parseFloat(amount) * 1_000_000));
}

export const CLAIM_STATUS: Record<number, string> = {
  0: 'NONE',
  1: 'PENDING',
  2: 'VERIFIED',
  3: 'ENABLED',
  4: 'SETTLED',
  5: 'REJECTED',
};

export function saveToLocalStorage(key: string, value: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export function getFromLocalStorage(key: string): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}
```

---

## app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-900 text-white;
}
```

---

## app/layout.tsx

```tsx
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import { config } from '@/lib/wagmi';
import './globals.css';

const queryClient = new QueryClient();

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <ConnectKitProvider>
              <nav className="border-b border-gray-800 p-4">
                <div className="container mx-auto flex justify-between items-center">
                  <a href="/" className="text-xl font-bold">Curance</a>
                  <div className="flex gap-4">
                    <a href="/register" className="hover:text-blue-400">Register</a>
                    <a href="/dashboard" className="hover:text-blue-400">Dashboard</a>
                    <a href="/claim" className="hover:text-blue-400">Claim</a>
                    <a href="/hospital" className="hover:text-purple-400">Hospital</a>
                  </div>
                </div>
              </nav>
              <main className="min-h-screen">
                {children}
              </main>
            </ConnectKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
```

---

## app/page.tsx

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Curance Protocol</h1>
      <p className="text-gray-400 mb-8 max-w-xl">
        Privacy-preserving health insurance on Base. 
        Your identity stays private, your claims settle instantly.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <Link 
          href="/register" 
          className="bg-blue-600 hover:bg-blue-700 p-6 rounded-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Register Policy</h2>
          <p className="text-gray-200">Buy insurance with anonymous health proof</p>
        </Link>
        
        <Link 
          href="/dashboard" 
          className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Dashboard</h2>
          <p className="text-gray-200">View your policy and coverage</p>
        </Link>
        
        <Link 
          href="/claim" 
          className="bg-green-600 hover:bg-green-700 p-6 rounded-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Submit Claim</h2>
          <p className="text-gray-200">Verify and settle your claim</p>
        </Link>
        
        <Link 
          href="/hospital" 
          className="bg-purple-600 hover:bg-purple-700 p-6 rounded-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Hospital Portal</h2>
          <p className="text-gray-200">Create claims for patients</p>
        </Link>
      </div>
    </div>
  );
}
```

---

## app/register/page.tsx

```tsx
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { 
  REGISTRY_ADDRESS, 
  REGISTRY_ABI, 
  USDC_ADDRESS, 
  ERC20_ABI,
  ORACLE_URL 
} from '@/lib/contracts';
import { 
  generateSecret, 
  generateCommitment, 
  hashHealthData, 
  parseUSDC,
  saveToLocalStorage 
} from '@/lib/utils';

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(1);
  const [secret, setSecret] = useState<`0x${string}` | ''>('');
  const [commitment, setCommitment] = useState<`0x${string}` | ''>('');
  const [healthDataHash, setHealthDataHash] = useState<`0x${string}` | ''>('');
  const [premium, setPremium] = useState('100');
  const [verifying, setVerifying] = useState(false);
  
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: register, data: registerHash } = useWriteContract();
  
  const { isLoading: isApproving, isSuccess: approveSuccess } = 
    useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isRegistering, isSuccess: registerSuccess } = 
    useWaitForTransactionReceipt({ hash: registerHash });
  
  // Step 1: Generate proof and commitment
  const handleGenerateProof = async () => {
    setVerifying(true);
    
    try {
      // Generate secret and health data
      const newSecret = generateSecret();
      const healthData = {
        bloodPressure: '120/80',
        bmi: 22.5,
        cholesterol: 'normal',
        timestamp: Date.now(),
        hospital: 'Bangkok Hospital',
      };
      const newHealthDataHash = hashHealthData(healthData);
      const newCommitment = generateCommitment(newSecret, newHealthDataHash);
      
      // Verify with Oracle (mock proof)
      const response = await fetch(`${ORACLE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitment: newCommitment,
          healthDataHash: newHealthDataHash,
          premium: parseUSDC(premium).toString(),
          proof: {
            signature: 'mock_signature',
            timestamp: Date.now(),
            hospitalId: 'hospital_1',
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSecret(newSecret);
        setCommitment(newCommitment);
        setHealthDataHash(newHealthDataHash);
        
        // Save to localStorage
        saveToLocalStorage('curance_secret', newSecret);
        saveToLocalStorage('curance_commitment', newCommitment);
        
        setStep(2);
      } else {
        alert(`Verification failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setVerifying(false);
    }
  };
  
  // Step 2: Approve USDC
  const handleApprove = () => {
    approve({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [REGISTRY_ADDRESS, parseUSDC(premium)],
    });
  };
  
  // Step 3: Register policy
  const handleRegister = () => {
    if (!commitment || !healthDataHash) return;
    
    register({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'registerPolicy',
      args: [commitment, healthDataHash, parseUSDC(premium)],
    });
  };
  
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">Register Policy</h1>
        <p className="text-gray-400 mb-4">Connect your wallet to continue</p>
        <ConnectKitButton />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <h1 className="text-2xl font-bold mb-8">Register Policy</h1>
      
      {/* Step 1 */}
      <div className={`mb-6 p-4 rounded-lg ${step >= 1 ? 'bg-gray-800' : 'bg-gray-900 opacity-50'}`}>
        <h2 className="font-bold mb-2">Step 1: Generate Health Proof</h2>
        <p className="text-sm text-gray-400 mb-4">
          Creates zkTLS proof of your health data (mocked for POC)
        </p>
        {step === 1 ? (
          <div>
            <div className="mb-4">
              <label className="block text-sm mb-1">Premium (USDC)</label>
              <input
                type="number"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                className="bg-gray-700 px-3 py-2 rounded w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Coverage will be {Number(premium) * 10} USDC (10x premium)
              </p>
            </div>
            <button
              onClick={handleGenerateProof}
              disabled={verifying}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Generate Proof'}
            </button>
          </div>
        ) : (
          <div className="text-green-400">✓ Proof verified</div>
        )}
      </div>
      
      {/* Step 2 */}
      <div className={`mb-6 p-4 rounded-lg ${step >= 2 ? 'bg-gray-800' : 'bg-gray-900 opacity-50'}`}>
        <h2 className="font-bold mb-2">Step 2: Approve USDC</h2>
        {step === 2 && !approveSuccess && (
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full disabled:opacity-50"
          >
            {isApproving ? 'Approving...' : `Approve ${premium} USDC`}
          </button>
        )}
        {approveSuccess && <div className="text-green-400">✓ Approved</div>}
      </div>
      
      {/* Step 3 */}
      <div className={`mb-6 p-4 rounded-lg ${approveSuccess ? 'bg-gray-800' : 'bg-gray-900 opacity-50'}`}>
        <h2 className="font-bold mb-2">Step 3: Register Policy</h2>
        {approveSuccess && !registerSuccess && (
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded w-full disabled:opacity-50"
          >
            {isRegistering ? 'Registering...' : 'Register Policy'}
          </button>
        )}
        {registerSuccess && (
          <div className="text-green-400">
            ✓ Policy registered!
            <p className="text-sm text-gray-400 mt-2">
              Coverage: {Number(premium) * 10} USDC
            </p>
          </div>
        )}
      </div>
      
      {/* Secret Warning */}
      {secret && (
        <div className="bg-yellow-900/50 border border-yellow-600 p-4 rounded-lg">
          <h3 className="font-bold text-yellow-400 mb-2">⚠️ Save Your Secret!</h3>
          <p className="text-sm text-gray-300 mb-2">
            You need this to claim insurance. It's saved in localStorage but keep a backup.
          </p>
          <div className="bg-gray-900 p-2 rounded">
            <code className="text-xs break-all">{secret}</code>
          </div>
          <div className="mt-2 bg-gray-900 p-2 rounded">
            <p className="text-xs text-gray-400">Commitment:</p>
            <code className="text-xs break-all">{commitment}</code>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## app/hospital/page.tsx

```tsx
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { CLAIMS_ADDRESS, CLAIMS_ABI } from '@/lib/contracts';
import { parseUSDC, hashInvoice } from '@/lib/utils';

export default function HospitalPage() {
  const { isConnected } = useAccount();
  const [policyCommitment, setPolicyCommitment] = useState('');
  const [amount, setAmount] = useState('50');
  const [invoiceId, setInvoiceId] = useState(`INV-${Date.now()}`);
  const [claimId, setClaimId] = useState<string | null>(null);
  
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const handleCreateClaim = () => {
    const invoiceHash = hashInvoice(invoiceId);
    
    writeContract({
      address: CLAIMS_ADDRESS,
      abi: CLAIMS_ABI,
      functionName: 'createClaim',
      args: [
        policyCommitment as `0x${string}`, 
        parseUSDC(amount), 
        invoiceHash
      ],
    });
  };
  
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">Hospital Portal</h1>
        <p className="text-gray-400 mb-4">Connect as a registered hospital</p>
        <ConnectKitButton />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Hospital Portal</h1>
      <p className="text-gray-400 mb-8">Create pending claims for patients</p>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="mb-4">
          <label className="block text-sm mb-1">Patient Policy Commitment</label>
          <input
            type="text"
            value={policyCommitment}
            onChange={(e) => setPolicyCommitment(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded font-mono text-sm"
            placeholder="0x..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Patient provides this from their registration
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm mb-1">Claim Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm mb-1">Invoice ID</label>
          <input
            type="text"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded"
          />
        </div>
        
        <button
          onClick={handleCreateClaim}
          disabled={isLoading || !policyCommitment}
          className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded font-bold disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Claim (PENDING)'}
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-900/50 rounded text-red-400 text-sm">
            Error: {error.message}
          </div>
        )}
        
        {isSuccess && (
          <div className="mt-4 p-4 bg-green-900/50 rounded">
            <p className="text-green-400 font-bold">✓ Claim created!</p>
            <p className="text-sm text-gray-300 mt-2">
              Tell patient to submit verification with their secret.
            </p>
            <p className="text-xs text-gray-400 mt-2 font-mono break-all">
              Tx: {hash}
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-bold mb-2">How Claims Work</h3>
        <ol className="text-sm text-gray-400 space-y-2">
          <li>1. Patient provides their policy commitment</li>
          <li>2. You create a PENDING claim on-chain</li>
          <li>3. You give patient the invoice proof (mocked for POC)</li>
          <li>4. Patient submits verification with their secret</li>
          <li>5. Oracle verifies and settles → You receive USDC</li>
        </ol>
      </div>
    </div>
  );
}
```

---

## app/claim/page.tsx

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { ORACLE_URL } from '@/lib/contracts';
import { getFromLocalStorage, CLAIM_STATUS } from '@/lib/utils';

export default function ClaimPage() {
  const { isConnected } = useAccount();
  const [claimId, setClaimId] = useState('');
  const [commitment, setCommitment] = useState('');
  const [secret, setSecret] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Load from localStorage
  useEffect(() => {
    const savedCommitment = getFromLocalStorage('curance_commitment');
    const savedSecret = getFromLocalStorage('curance_secret');
    if (savedCommitment) setCommitment(savedCommitment);
    if (savedSecret) setSecret(savedSecret);
  }, []);
  
  const handleVerify = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`${ORACLE_URL}/api/claims/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          invoiceProof: {
            signature: 'mock_invoice_sig',
            invoiceHash: '0x' + '0'.repeat(64),
            hospitalId: 'hospital_1',
          },
          ownershipProof: {
            commitment,
            signature: secret,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          message: `Claim settled! Tx: ${data.data.txHash}`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Verification failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const checkStatus = async () => {
    if (!claimId) return;
    
    try {
      const response = await fetch(`${ORACLE_URL}/api/claims/${claimId}`);
      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          message: `Status: ${data.data.status}, Amount: ${data.data.amount}`,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">Submit Claim</h1>
        <ConnectKitButton />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Submit Claim Verification</h1>
      <p className="text-gray-400 mb-8">
        After hospital creates a claim, verify it with your secret
      </p>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="mb-4">
          <label className="block text-sm mb-1">Claim ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              className="flex-1 bg-gray-700 px-3 py-2 rounded font-mono text-sm"
              placeholder="0x..."
            />
            <button
              onClick={checkStatus}
              className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded text-sm"
            >
              Check
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Get this from the hospital
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm mb-1">Your Policy Commitment</label>
          <input
            type="text"
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded font-mono text-sm"
            placeholder="0x..."
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm mb-1">Your Secret</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded font-mono text-sm"
            placeholder="0x..."
          />
          <p className="text-xs text-gray-500 mt-1">
            The secret you saved during registration
          </p>
        </div>
        
        <button
          onClick={handleVerify}
          disabled={loading || !claimId || !commitment || !secret}
          className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Submit Verification'}
        </button>
        
        {result && (
          <div className={`mt-4 p-4 rounded ${
            result.success ? 'bg-green-900/50' : 'bg-red-900/50'
          }`}>
            <p className={`text-sm ${
              result.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {result.success ? '✓' : '✗'} {result.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## app/dashboard/page.tsx

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from '@/lib/contracts';
import { formatUSDC, getFromLocalStorage } from '@/lib/utils';

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const [commitment, setCommitment] = useState<`0x${string}` | ''>('');
  
  useEffect(() => {
    const saved = getFromLocalStorage('curance_commitment');
    if (saved) setCommitment(saved as `0x${string}`);
  }, []);
  
  const { data: policy, isLoading } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'getPolicy',
    args: commitment ? [commitment] : undefined,
    query: { enabled: !!commitment },
  });
  
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <ConnectKitButton />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <h1 className="text-2xl font-bold mb-8">Policy Dashboard</h1>
      
      <div className="mb-6">
        <label className="block text-sm mb-1">Policy Commitment</label>
        <input
          type="text"
          value={commitment}
          onChange={(e) => setCommitment(e.target.value as `0x${string}`)}
          className="w-full bg-gray-800 px-3 py-2 rounded font-mono text-sm"
          placeholder="0x..."
        />
      </div>
      
      {isLoading && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400">Loading...</p>
        </div>
      )}
      
      {policy && (
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <span className={policy[5] ? 'text-green-400' : 'text-red-400'}>
              {policy[5] ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Premium Paid</span>
            <span>{formatUSDC(policy[0])} USDC</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Total Coverage</span>
            <span>{formatUSDC(policy[1])} USDC</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Used Coverage</span>
            <span>{formatUSDC(policy[2])} USDC</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Remaining</span>
            <span className="text-green-400 font-bold">
              {formatUSDC(policy[1] - policy[2])} USDC
            </span>
          </div>
          
          <div className="pt-4 border-t border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Registered</span>
              <span>{new Date(Number(policy[3]) * 1000).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Expires</span>
              <span>{new Date(Number(policy[4]) * 1000).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
      
      {!policy && commitment && !isLoading && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400">No policy found for this commitment</p>
        </div>
      )}
    </div>
  );
}
```

---

## Build & Run

```bash
# Install
npm install

# Development
npm run dev

# Production
npm run build
npm start
```