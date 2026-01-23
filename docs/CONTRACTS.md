# Smart Contracts Specification

## Overview

Three contracts handle policy registration and claims:

| Contract | Purpose |
|----------|---------|
| CuranceRegistry | Store policies, track coverage |
| CuranceClaims | Manage claim lifecycle |
| MockUSDC | Test token (POC only) |

## Directory Structure

```
contracts/
├── src/
│   ├── CuranceRegistry.sol
│   ├── CuranceClaims.sol
│   ├── MockUSDC.sol
│   └── interfaces/
│       └── ICuranceRegistry.sol
├── test/
│   ├── CuranceRegistry.t.sol
│   └── CuranceClaims.t.sol
├── script/
│   └── Deploy.s.sol
├── .env.example
└── foundry.toml
```

## foundry.toml

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC_URL}"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}" }
```

## .env.example

```
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=...
ORACLE_ADDRESS=0x...
```

---

## ICuranceRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICuranceRegistry {
    function isPolicyValid(bytes32 commitment) external view returns (bool);
    function getRemainingCoverage(bytes32 commitment) external view returns (uint256);
    function deductCoverage(bytes32 commitment, uint256 amount) external;
}
```

---

## CuranceRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CuranceRegistry is Ownable, ReentrancyGuard {
    
    IERC20 public immutable usdc;
    address public oracle;
    address public claimsContract;
    
    struct Policy {
        bytes32 commitment;
        bytes32 healthDataHash;
        uint256 premium;
        uint256 coverage;
        uint256 usedCoverage;
        uint256 registeredAt;
        uint256 expiresAt;
        bool active;
    }
    
    mapping(bytes32 => Policy) public policies;
    mapping(bytes32 => bool) public commitmentUsed;
    
    uint256 public constant COVERAGE_MULTIPLIER = 10;
    uint256 public constant POLICY_DURATION = 365 days;
    
    event PolicyRegistered(
        bytes32 indexed commitment,
        uint256 premium,
        uint256 coverage,
        uint256 expiresAt
    );
    
    event CoverageDeducted(
        bytes32 indexed commitment,
        uint256 amount,
        uint256 remaining
    );
    
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ClaimsContractUpdated(address indexed oldClaims, address indexed newClaims);
    
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }
    
    modifier onlyClaimsContract() {
        require(msg.sender == claimsContract, "Only claims contract");
        _;
    }
    
    constructor(address _usdc, address _oracle) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        oracle = _oracle;
    }
    
    function setClaimsContract(address _claimsContract) external onlyOwner {
        emit ClaimsContractUpdated(claimsContract, _claimsContract);
        claimsContract = _claimsContract;
    }
    
    function setOracle(address _oracle) external onlyOwner {
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }
    
    function registerPolicy(
        bytes32 commitment,
        bytes32 healthDataHash,
        uint256 premium
    ) external nonReentrant {
        require(commitment != bytes32(0), "Invalid commitment");
        require(!commitmentUsed[commitment], "Commitment already used");
        require(premium > 0, "Premium must be > 0");
        
        require(usdc.transferFrom(msg.sender, address(this), premium), "Transfer failed");
        
        uint256 coverage = premium * COVERAGE_MULTIPLIER;
        uint256 expiresAt = block.timestamp + POLICY_DURATION;
        
        policies[commitment] = Policy({
            commitment: commitment,
            healthDataHash: healthDataHash,
            premium: premium,
            coverage: coverage,
            usedCoverage: 0,
            registeredAt: block.timestamp,
            expiresAt: expiresAt,
            active: true
        });
        
        commitmentUsed[commitment] = true;
        
        emit PolicyRegistered(commitment, premium, coverage, expiresAt);
    }
    
    function deductCoverage(bytes32 commitment, uint256 amount) external onlyClaimsContract {
        Policy storage policy = policies[commitment];
        require(policy.active, "Policy not active");
        require(block.timestamp < policy.expiresAt, "Policy expired");
        
        uint256 remainingCoverage = policy.coverage - policy.usedCoverage;
        require(amount <= remainingCoverage, "Exceeds coverage");
        
        policy.usedCoverage += amount;
        
        emit CoverageDeducted(commitment, amount, remainingCoverage - amount);
    }
    
    function getPolicy(bytes32 commitment) external view returns (
        uint256 premium,
        uint256 coverage,
        uint256 usedCoverage,
        uint256 registeredAt,
        uint256 expiresAt,
        bool active
    ) {
        Policy memory policy = policies[commitment];
        return (
            policy.premium,
            policy.coverage,
            policy.usedCoverage,
            policy.registeredAt,
            policy.expiresAt,
            policy.active && block.timestamp < policy.expiresAt
        );
    }
    
    function isPolicyValid(bytes32 commitment) external view returns (bool) {
        Policy memory policy = policies[commitment];
        return policy.active && 
               block.timestamp < policy.expiresAt &&
               policy.usedCoverage < policy.coverage;
    }
    
    function getRemainingCoverage(bytes32 commitment) external view returns (uint256) {
        Policy memory policy = policies[commitment];
        if (!policy.active || block.timestamp >= policy.expiresAt) {
            return 0;
        }
        return policy.coverage - policy.usedCoverage;
    }
}
```

---

## CuranceClaims.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ICuranceRegistry.sol";

contract CuranceClaims is Ownable, ReentrancyGuard {
    
    IERC20 public immutable usdc;
    ICuranceRegistry public immutable registry;
    address public oracle;
    
    enum ClaimStatus { 
        NONE,
        PENDING,
        VERIFIED,
        ENABLED,
        SETTLED,
        REJECTED
    }
    
    struct Claim {
        bytes32 claimId;
        bytes32 policyCommitment;
        address hospital;
        uint256 amount;
        bytes32 invoiceHash;
        ClaimStatus status;
        uint256 createdAt;
        uint256 settledAt;
    }
    
    mapping(bytes32 => Claim) public claims;
    mapping(bytes32 => bool) public invoiceUsed;
    mapping(address => bool) public registeredHospitals;
    
    event HospitalRegistered(address indexed hospital);
    event HospitalRemoved(address indexed hospital);
    event ClaimCreated(
        bytes32 indexed claimId,
        bytes32 indexed policyCommitment,
        address indexed hospital,
        uint256 amount,
        bytes32 invoiceHash
    );
    event ClaimVerified(bytes32 indexed claimId);
    event ClaimEnabled(bytes32 indexed claimId);
    event ClaimSettled(bytes32 indexed claimId, address hospital, uint256 amount);
    event ClaimRejected(bytes32 indexed claimId, string reason);
    
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }
    
    modifier onlyHospital() {
        require(registeredHospitals[msg.sender], "Not registered hospital");
        _;
    }
    
    constructor(
        address _usdc,
        address _registry,
        address _oracle
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        registry = ICuranceRegistry(_registry);
        oracle = _oracle;
    }
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
    
    function registerHospital(address hospital) external onlyOwner {
        registeredHospitals[hospital] = true;
        emit HospitalRegistered(hospital);
    }
    
    function removeHospital(address hospital) external onlyOwner {
        registeredHospitals[hospital] = false;
        emit HospitalRemoved(hospital);
    }
    
    function createClaim(
        bytes32 policyCommitment,
        uint256 amount,
        bytes32 invoiceHash
    ) external onlyHospital returns (bytes32 claimId) {
        require(amount > 0, "Amount must be > 0");
        require(!invoiceUsed[invoiceHash], "Invoice already used");
        require(registry.isPolicyValid(policyCommitment), "Policy not valid");
        
        uint256 remainingCoverage = registry.getRemainingCoverage(policyCommitment);
        require(amount <= remainingCoverage, "Exceeds coverage");
        
        claimId = keccak256(abi.encodePacked(
            policyCommitment,
            msg.sender,
            invoiceHash,
            block.timestamp
        ));
        
        require(claims[claimId].status == ClaimStatus.NONE, "Claim exists");
        
        claims[claimId] = Claim({
            claimId: claimId,
            policyCommitment: policyCommitment,
            hospital: msg.sender,
            amount: amount,
            invoiceHash: invoiceHash,
            status: ClaimStatus.PENDING,
            createdAt: block.timestamp,
            settledAt: 0
        });
        
        invoiceUsed[invoiceHash] = true;
        
        emit ClaimCreated(claimId, policyCommitment, msg.sender, amount, invoiceHash);
        return claimId;
    }
    
    function verifyClaim(bytes32 claimId) external onlyOracle {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Invalid status");
        
        claim.status = ClaimStatus.VERIFIED;
        emit ClaimVerified(claimId);
    }
    
    function enableClaim(bytes32 claimId) external onlyOracle {
        Claim storage claim = claims[claimId];
        require(
            claim.status == ClaimStatus.PENDING || 
            claim.status == ClaimStatus.VERIFIED, 
            "Invalid status"
        );
        
        claim.status = ClaimStatus.ENABLED;
        emit ClaimEnabled(claimId);
        
        _settleClaim(claimId);
    }
    
    function _settleClaim(bytes32 claimId) internal nonReentrant {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.ENABLED, "Not enabled");
        
        registry.deductCoverage(claim.policyCommitment, claim.amount);
        
        require(usdc.transfer(claim.hospital, claim.amount), "Transfer failed");
        
        claim.status = ClaimStatus.SETTLED;
        claim.settledAt = block.timestamp;
        
        emit ClaimSettled(claimId, claim.hospital, claim.amount);
    }
    
    function rejectClaim(bytes32 claimId, string calldata reason) external onlyOracle {
        Claim storage claim = claims[claimId];
        require(
            claim.status == ClaimStatus.PENDING || 
            claim.status == ClaimStatus.VERIFIED, 
            "Invalid status"
        );
        
        claim.status = ClaimStatus.REJECTED;
        emit ClaimRejected(claimId, reason);
    }
    
    function getClaim(bytes32 claimId) external view returns (
        bytes32 policyCommitment,
        address hospital,
        uint256 amount,
        bytes32 invoiceHash,
        ClaimStatus status,
        uint256 createdAt,
        uint256 settledAt
    ) {
        Claim memory claim = claims[claimId];
        return (
            claim.policyCommitment,
            claim.hospital,
            claim.amount,
            claim.invoiceHash,
            claim.status,
            claim.createdAt,
            claim.settledAt
        );
    }
    
    function getClaimStatus(bytes32 claimId) external view returns (ClaimStatus) {
        return claims[claimId].status;
    }
}
```

---

## MockUSDC.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint8 private _decimals = 6;
    
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10**6);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

---

## Deploy.s.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/CuranceRegistry.sol";
import "../src/CuranceClaims.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:", address(usdc));
        
        CuranceRegistry registry = new CuranceRegistry(address(usdc), oracle);
        console.log("CuranceRegistry:", address(registry));
        
        CuranceClaims claims = new CuranceClaims(address(usdc), address(registry), oracle);
        console.log("CuranceClaims:", address(claims));
        
        registry.setClaimsContract(address(claims));
        
        usdc.transfer(address(claims), 100_000 * 10**6);
        
        vm.stopBroadcast();
    }
}
```

---

## CuranceRegistry.t.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/CuranceRegistry.sol";

contract CuranceRegistryTest is Test {
    MockUSDC usdc;
    CuranceRegistry registry;
    
    address oracle = makeAddr("oracle");
    address user = makeAddr("user");
    
    function setUp() public {
        usdc = new MockUSDC();
        registry = new CuranceRegistry(address(usdc), oracle);
        usdc.mint(user, 10_000 * 10**6);
    }
    
    function test_RegisterPolicy() public {
        bytes32 commitment = keccak256("secret_health");
        bytes32 healthDataHash = keccak256("health_data");
        uint256 premium = 100 * 10**6;
        
        vm.startPrank(user);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, healthDataHash, premium);
        vm.stopPrank();
        
        (uint256 p, uint256 c, uint256 u, , , bool active) = registry.getPolicy(commitment);
        
        assertEq(p, premium);
        assertEq(c, premium * 10);
        assertEq(u, 0);
        assertTrue(active);
    }
    
    function test_RevertDoubleCommitment() public {
        bytes32 commitment = keccak256("secret_health");
        bytes32 healthDataHash = keccak256("health_data");
        uint256 premium = 100 * 10**6;
        
        vm.startPrank(user);
        usdc.approve(address(registry), premium * 2);
        registry.registerPolicy(commitment, healthDataHash, premium);
        
        vm.expectRevert("Commitment already used");
        registry.registerPolicy(commitment, healthDataHash, premium);
        vm.stopPrank();
    }
    
    function test_PolicyExpiry() public {
        bytes32 commitment = keccak256("secret_health");
        bytes32 healthDataHash = keccak256("health_data");
        uint256 premium = 100 * 10**6;
        
        vm.startPrank(user);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, healthDataHash, premium);
        vm.stopPrank();
        
        assertTrue(registry.isPolicyValid(commitment));
        
        vm.warp(block.timestamp + 366 days);
        
        assertFalse(registry.isPolicyValid(commitment));
    }
}
```

---

## Build Commands

```bash
# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# Build
forge build

# Test
forge test -vvv

# Deploy to Base Sepolia
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify

# Verify manually if needed
forge verify-contract <ADDRESS> CuranceRegistry \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address)" <USDC> <ORACLE>)
```