# Curance Smart Contracts

Privacy-preserving health insurance contracts for Base Sepolia.

## Contracts

| Contract | Description |
|----------|-------------|
| `MockUSDC.sol` | Mock USDC token (6 decimals) with public mint |
| `CuranceRegistry.sol` | Policy registration and coverage management |
| `CuranceClaims.sol` | Claims processing with auto-transfer to hospitals |

## Architecture

```
Patient                    Hospital                   Oracle
   │                          │                         │
   │ registerPolicy()         │                         │
   │────────────────────────> Registry                  │
   │                          │                         │
   │                    createClaim()                   │
   │                    ─────────────────> Claims       │
   │                          │             │           │
   │                          │             │  verify   │
   │                          │             │  off-chain│
   │                          │             │<──────────│
   │                          │             │           │
   │                          │    enableClaim()        │
   │                          │<────────────────────────│
   │                          │             │           │
   │                   USDC Transfer        │           │
   │               ◄───────────────         │           │
```

## Setup

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

3. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your values
```

## Deployment

### Deploy All Contracts

```bash
source .env

forge script script/DeployAll.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### Deploy MockUSDC Only

```bash
forge script script/DeployMockUSDC.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

## Post-Deployment Setup

### Register Hospitals

```bash
export HOSPITAL_ADDRESSES="0xHospital1,0xHospital2"

forge script script/SetupHospitals.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

### Fund Registry

```bash
export FUND_AMOUNT=100000  # 100k USDC

forge script script/FundRegistry.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

## Transfer Execution

### Full Flow Test

Tests the complete flow: policy registration → claim creation → transfer:

```bash
forge script script/TransferToHospital.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

### Execute Single Transfer

For production use by the Oracle after off-chain verification:

```bash
export CLAIM_ID=0x...  # The claim ID to process

forge script script/ExecuteTransfer.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

## Contract Addresses (Update After Deployment)

| Contract | Address |
|----------|---------|
| MockUSDC | `0x...` |
| CuranceRegistry | `0x...` |
| CuranceClaims | `0x...` |

## Flow Details

### 1. Policy Registration (Patient)

```solidity
// Patient creates commitment
bytes32 secret = keccak256("random_secret");
bytes32 healthDataHash = keccak256(healthMetrics);
bytes32 commitment = keccak256(abi.encodePacked(secret, healthDataHash));

// Register with premium (e.g., 1000 USDC)
usdc.approve(registry, premium);
registry.registerPolicy(commitment, healthDataHash, premium);
// Coverage = premium * 10 = 10,000 USDC
```

### 2. Claim Creation (Hospital)

```solidity
// Hospital creates claim for patient's treatment
bytes32 invoiceHash = keccak256(invoiceData);
bytes32 claimId = claims.createClaim(
    patientCommitment,
    claimAmount,      // e.g., 500 USDC
    invoiceHash
);
```

### 3. Claim Verification (Oracle - Off-Chain)

The Oracle:
1. Receives invoice proof (zkTLS attestation)
2. Verifies patient ownership (secret + healthDataHash → commitment)
3. Validates invoice against on-chain hash
4. Calls `enableClaim()` if valid

### 4. Transfer Execution (Oracle - On-Chain)

```solidity
// Oracle enables claim → triggers USDC transfer
claims.enableClaim(claimId);
// USDC automatically sent from Registry to Hospital
```

## Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testTransferToHospital
```

## Gas Estimates

| Function | Gas |
|----------|-----|
| registerPolicy | ~150,000 |
| createClaim | ~120,000 |
| enableClaim | ~80,000 |

## Security Considerations

- Only registered hospitals can create claims
- Only the Oracle can enable/reject claims
- Re-entrancy protection on all state-changing functions
- Coverage limits enforced per policy
- Claims expire after 7 days

## License

MIT
