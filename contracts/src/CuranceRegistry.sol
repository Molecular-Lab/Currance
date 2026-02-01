// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CuranceRegistry
 * @notice Privacy-preserving health insurance policy registry
 * @dev Uses commitment scheme: commitment = keccak256(secret || healthDataHash)
 */
contract CuranceRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 public immutable usdc;

    // Coverage multiplier (10x premium = coverage)
    uint256 public constant COVERAGE_MULTIPLIER = 10;

    // Policy duration (365 days)
    uint256 public constant POLICY_DURATION = 365 days;

    // Minimum premium (100 USDC with 6 decimals)
    uint256 public constant MIN_PREMIUM = 100 * 1e6;

    // Maximum premium (100,000 USDC)
    uint256 public constant MAX_PREMIUM = 100_000 * 1e6;

    // ============ Structs ============

    struct Policy {
        bytes32 healthDataHash;
        uint256 premium;
        uint256 coverageAmount;     // premium * COVERAGE_MULTIPLIER
        uint256 usedCoverage;       // Total claims paid out
        uint256 startTime;
        uint256 expiryTime;
        bool isActive;
    }

    // ============ Mappings ============

    // commitment => Policy
    mapping(bytes32 => Policy) public policies;

    // Track all commitments for enumeration (optional)
    bytes32[] public allCommitments;

    // ============ Events ============

    event PolicyRegistered(
        bytes32 indexed commitment,
        bytes32 healthDataHash,
        uint256 premium,
        uint256 coverageAmount,
        uint256 expiryTime
    );

    event PolicyDeactivated(bytes32 indexed commitment);

    event CoverageUsed(
        bytes32 indexed commitment,
        uint256 amount,
        uint256 totalUsed
    );

    // ============ Errors ============

    error PolicyAlreadyExists();
    error PolicyDoesNotExist();
    error PolicyNotActive();
    error PolicyExpired();
    error PremiumTooLow();
    error PremiumTooHigh();
    error InsufficientCoverage();
    error InvalidCommitment();
    error OnlyClaimsContract();

    // ============ Access Control ============

    address public claimsContract;

    modifier onlyClaimsContract() {
        if (msg.sender != claimsContract) revert OnlyClaimsContract();
        _;
    }

    // ============ Constructor ============

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the claims contract address (can only be set once or by owner)
     * @param _claimsContract Address of the CuranceClaims contract
     */
    function setClaimsContract(address _claimsContract) external onlyOwner {
        claimsContract = _claimsContract;
    }

    // ============ Policy Functions ============

    /**
     * @notice Register a new insurance policy
     * @param commitment keccak256(secret || healthDataHash) - user's privacy commitment
     * @param healthDataHash keccak256(healthMetrics) - hash of health data
     * @param premium Amount of USDC to pay as premium
     */
    function registerPolicy(
        bytes32 commitment,
        bytes32 healthDataHash,
        uint256 premium
    ) external nonReentrant {
        if (commitment == bytes32(0)) revert InvalidCommitment();
        if (policies[commitment].startTime != 0) revert PolicyAlreadyExists();
        if (premium < MIN_PREMIUM) revert PremiumTooLow();
        if (premium > MAX_PREMIUM) revert PremiumTooHigh();

        uint256 coverageAmount = premium * COVERAGE_MULTIPLIER;
        uint256 expiryTime = block.timestamp + POLICY_DURATION;

        // Transfer premium from user to contract
        usdc.safeTransferFrom(msg.sender, address(this), premium);

        // Store policy
        policies[commitment] = Policy({
            healthDataHash: healthDataHash,
            premium: premium,
            coverageAmount: coverageAmount,
            usedCoverage: 0,
            startTime: block.timestamp,
            expiryTime: expiryTime,
            isActive: true
        });

        allCommitments.push(commitment);

        emit PolicyRegistered(
            commitment,
            healthDataHash,
            premium,
            coverageAmount,
            expiryTime
        );
    }

    /**
     * @notice Check if a policy is valid (exists, active, not expired)
     * @param commitment The policy commitment
     * @return bool True if policy is valid
     */
    function isPolicyValid(bytes32 commitment) external view returns (bool) {
        Policy storage policy = policies[commitment];
        return policy.isActive &&
               policy.startTime != 0 &&
               block.timestamp < policy.expiryTime;
    }

    /**
     * @notice Get policy details
     * @param commitment The policy commitment
     * @return premium The premium paid
     * @return coverageAmount Total coverage amount
     * @return usedCoverage Coverage already used
     * @return startTime Policy start timestamp
     * @return expiryTime Policy expiry timestamp
     * @return isActive Whether policy is active
     */
    function getPolicy(bytes32 commitment) external view returns (
        uint256 premium,
        uint256 coverageAmount,
        uint256 usedCoverage,
        uint256 startTime,
        uint256 expiryTime,
        bool isActive
    ) {
        Policy storage policy = policies[commitment];
        return (
            policy.premium,
            policy.coverageAmount,
            policy.usedCoverage,
            policy.startTime,
            policy.expiryTime,
            policy.isActive
        );
    }

    /**
     * @notice Get remaining coverage for a policy
     * @param commitment The policy commitment
     * @return Remaining coverage amount
     */
    function getRemainingCoverage(bytes32 commitment) external view returns (uint256) {
        Policy storage policy = policies[commitment];
        if (!policy.isActive || block.timestamp >= policy.expiryTime) {
            return 0;
        }
        return policy.coverageAmount - policy.usedCoverage;
    }

    /**
     * @notice Get the health data hash for a policy (used for verification)
     * @param commitment The policy commitment
     * @return The health data hash
     */
    function getHealthDataHash(bytes32 commitment) external view returns (bytes32) {
        return policies[commitment].healthDataHash;
    }

    // ============ Claims Contract Interface ============

    /**
     * @notice Record coverage usage (called by CuranceClaims contract)
     * @param commitment The policy commitment
     * @param amount Amount of coverage used
     */
    function recordCoverageUsage(
        bytes32 commitment,
        uint256 amount
    ) external onlyClaimsContract {
        Policy storage policy = policies[commitment];

        if (!policy.isActive) revert PolicyNotActive();
        if (block.timestamp >= policy.expiryTime) revert PolicyExpired();
        if (policy.usedCoverage + amount > policy.coverageAmount) {
            revert InsufficientCoverage();
        }

        policy.usedCoverage += amount;

        emit CoverageUsed(commitment, amount, policy.usedCoverage);
    }

    /**
     * @notice Transfer USDC from registry to recipient (called by CuranceClaims)
     * @param to Recipient address (hospital)
     * @param amount Amount to transfer
     */
    function transferCoverage(
        address to,
        uint256 amount
    ) external onlyClaimsContract {
        usdc.safeTransfer(to, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get total number of policies
     */
    function getTotalPolicies() external view returns (uint256) {
        return allCommitments.length;
    }

    /**
     * @notice Get contract's USDC balance (available for claims)
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // ============ Owner Functions ============

    /**
     * @notice Fund the contract with additional USDC (for paying claims)
     * @param amount Amount to fund
     */
    function fundContract(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraw excess funds (owner only, for emergency)
     * @param amount Amount to withdraw
     */
    function withdrawFunds(uint256 amount) external onlyOwner {
        usdc.safeTransfer(owner(), amount);
    }
}
