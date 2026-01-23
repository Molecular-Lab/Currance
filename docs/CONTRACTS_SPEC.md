# Smart Contracts Needed

## 1. MockUSDC.sol (You handle this)
- Standard ERC20 with 6 decimals
- Public mint function for testing

---

## 2. CurancePolicy.sol

### State Variables
```solidity
IERC20 public usdc;
address public owner;
uint256 public claimNonce;

mapping(bytes32 => Policy) public policies;      // commitment => Policy
mapping(bytes32 => Claim) public claims;         // claimId => Claim
mapping(address => bool) public isHospital;
```

### Structs
```solidity
struct Policy {
    bytes32 healthDataHash;
    uint256 premium;
    uint256 coverage;        // 10x premium
    uint256 used;
    uint256 expiry;          // block.timestamp + 365 days
    bool active;
}

enum ClaimStatus { Pending, Verified, Rejected, Expired }

struct Claim {
    bytes32 commitment;
    address hospital;
    uint256 amount;
    bytes32 invoiceHash;
    ClaimStatus status;
    uint256 createdAt;
}
```

### Functions Needed

```solidity
// Constructor
constructor(address _usdc)

// Policy Management
function registerPolicy(
    bytes32 commitment,
    bytes32 healthDataHash,
    uint256 premium
) external

function getPolicy(bytes32 commitment) external view returns (Policy memory)

// Claims Management
function createClaim(
    bytes32 commitment,
    uint256 amount,
    bytes32 invoiceHash
) external returns (bytes32 claimId)

function verifyClaim(
    bytes32 claimId,
    bytes32 secret,
    bytes32 healthDataHash
) external

function getClaim(bytes32 claimId) external view returns (Claim memory)

// Admin
function registerHospital(address hospital) external onlyOwner
function removeHospital(address hospital) external onlyOwner
function fundContract(uint256 amount) external
function withdrawFunds(uint256 amount) external onlyOwner
```

### Events
```solidity
event PolicyRegistered(bytes32 indexed commitment, uint256 coverage, uint256 expiry);
event ClaimCreated(bytes32 indexed claimId, bytes32 indexed commitment, address hospital, uint256 amount);
event ClaimVerified(bytes32 indexed claimId, uint256 amount);
event HospitalRegistered(address indexed hospital);
event HospitalRemoved(address indexed hospital);
```

### Key Logic

**registerPolicy:**
1. Check commitment doesn't exist
2. Transfer premium from user
3. Store policy with coverage = premium * 10, expiry = now + 1 year

**createClaim:**
1. Check msg.sender is hospital
2. Check policy exists and is active
3. Check amount <= (coverage - used)
4. Generate claimId = keccak256(abi.encodePacked(commitment, claimNonce++))
5. Store claim with Pending status

**verifyClaim:**
1. Load claim, check status is Pending
2. Reconstruct commitment: `keccak256(abi.encodePacked(secret, healthDataHash))`
3. Verify reconstructed == claim.commitment
4. Verify policy.healthDataHash == healthDataHash
5. Transfer USDC to hospital
6. Update claim status to Verified
7. Update policy.used += amount

---

## Frontend will call:

| Function | Page | Who |
|----------|------|-----|
| `registerPolicy` | /register | Patient |
| `getPolicy` | /register | Patient |
| `createClaim` | /hospital | Hospital |
| `getClaim` | /claim | Patient |
| `verifyClaim` | /claim | Patient |
| `isHospital` | /hospital | Hospital |

---

## After Deployment

Set these in frontend `.env.local`:
```
NEXT_PUBLIC_POLICY_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
```
