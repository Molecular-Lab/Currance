// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICuranceRegistry {
    function isPolicyValid(bytes32 commitment) external view returns (bool);
    function getPolicy(bytes32 commitment) external view returns (
        uint256 premium,
        uint256 coverageAmount,
        uint256 usedCoverage,
        uint256 startTime,
        uint256 expiryTime,
        bool isActive
    );
    function getRemainingCoverage(bytes32 commitment) external view returns (uint256);
    function getHealthDataHash(bytes32 commitment) external view returns (bytes32);
    function recordCoverageUsage(bytes32 commitment, uint256 amount) external;
    function transferCoverage(address to, uint256 amount) external;
}

/**
 * @title CuranceClaims
 * @notice Handles insurance claims and auto-settlement to hospitals
 * @dev Oracle verifies proofs off-chain, then calls enableClaim to trigger payment
 */
contract CuranceClaims is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    ICuranceRegistry public immutable registry;
    IERC20 public immutable usdc;

    // Oracle address - only this address can enable/reject claims
    address public oracle;

    // Claim nonce for generating unique claim IDs
    uint256 public claimNonce;

    // Claim expiry duration (7 days)
    uint256 public constant CLAIM_EXPIRY = 7 days;

    // ============ Enums ============

    enum ClaimStatus {
        NONE,       // 0 - Claim doesn't exist
        PENDING,    // 1 - Waiting for oracle verification
        ENABLED,    // 2 - Verified, payment sent
        REJECTED,   // 3 - Rejected by oracle
        EXPIRED     // 4 - Expired without verification
    }

    // ============ Structs ============

    struct Claim {
        bytes32 policyCommitment;
        address hospital;
        uint256 amount;
        bytes32 invoiceHash;
        ClaimStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        string rejectionReason;
    }

    // ============ Mappings ============

    // claimId => Claim
    mapping(bytes32 => Claim) public claims;

    // hospital address => is registered
    mapping(address => bool) public isHospital;

    // Track all claim IDs
    bytes32[] public allClaimIds;

    // ============ Events ============

    event ClaimCreated(
        bytes32 indexed claimId,
        bytes32 indexed policyCommitment,
        address indexed hospital,
        uint256 amount,
        bytes32 invoiceHash
    );

    event ClaimEnabled(
        bytes32 indexed claimId,
        address indexed hospital,
        uint256 amount,
        bytes32 txHash
    );

    event ClaimRejected(
        bytes32 indexed claimId,
        string reason
    );

    event ClaimExpired(bytes32 indexed claimId);

    event HospitalRegistered(address indexed hospital);
    event HospitalRemoved(address indexed hospital);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    // ============ Errors ============

    error NotOracle();
    error NotHospital();
    error ClaimDoesNotExist();
    error ClaimNotPending();
    error ClaimAlreadyExists();
    error PolicyNotValid();
    error InsufficientCoverage();
    error AmountTooLow();
    error InvalidInvoiceHash();
    error ClaimExpiredError();
    error ZeroAddress();

    // ============ Modifiers ============

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    modifier onlyHospital() {
        if (!isHospital[msg.sender]) revert NotHospital();
        _;
    }

    // ============ Constructor ============

    constructor(
        address _registry,
        address _usdc,
        address _oracle
    ) Ownable(msg.sender) {
        if (_registry == address(0) || _usdc == address(0) || _oracle == address(0)) {
            revert ZeroAddress();
        }
        registry = ICuranceRegistry(_registry);
        usdc = IERC20(_usdc);
        oracle = _oracle;
    }

    // ============ Hospital Functions ============

    /**
     * @notice Create a new claim (hospital only)
     * @param policyCommitment The patient's policy commitment
     * @param amount Claim amount in USDC (6 decimals)
     * @param invoiceHash Hash of the invoice for verification
     * @return claimId The unique claim identifier
     */
    function createClaim(
        bytes32 policyCommitment,
        uint256 amount,
        bytes32 invoiceHash
    ) external onlyHospital nonReentrant returns (bytes32 claimId) {
        // Validate inputs
        if (amount == 0) revert AmountTooLow();
        if (invoiceHash == bytes32(0)) revert InvalidInvoiceHash();

        // Check policy is valid
        if (!registry.isPolicyValid(policyCommitment)) revert PolicyNotValid();

        // Check sufficient coverage
        uint256 remainingCoverage = registry.getRemainingCoverage(policyCommitment);
        if (amount > remainingCoverage) revert InsufficientCoverage();

        // Generate unique claim ID
        claimId = keccak256(abi.encodePacked(
            policyCommitment,
            msg.sender,
            amount,
            invoiceHash,
            claimNonce++,
            block.timestamp
        ));

        // Ensure claim ID is unique (should always be due to nonce)
        if (claims[claimId].createdAt != 0) revert ClaimAlreadyExists();

        // Store claim
        claims[claimId] = Claim({
            policyCommitment: policyCommitment,
            hospital: msg.sender,
            amount: amount,
            invoiceHash: invoiceHash,
            status: ClaimStatus.PENDING,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            rejectionReason: ""
        });

        allClaimIds.push(claimId);

        emit ClaimCreated(
            claimId,
            policyCommitment,
            msg.sender,
            amount,
            invoiceHash
        );

        return claimId;
    }

    // ============ Oracle Functions ============

    /**
     * @notice Enable a claim and transfer USDC to hospital (oracle only)
     * @dev This is called after off-chain verification of proofs
     * @param claimId The claim to enable
     */
    function enableClaim(bytes32 claimId) external onlyOracle nonReentrant {
        Claim storage claim = claims[claimId];

        // Validate claim
        if (claim.createdAt == 0) revert ClaimDoesNotExist();
        if (claim.status != ClaimStatus.PENDING) revert ClaimNotPending();

        // Check if expired
        if (block.timestamp > claim.createdAt + CLAIM_EXPIRY) {
            claim.status = ClaimStatus.EXPIRED;
            claim.updatedAt = block.timestamp;
            emit ClaimExpired(claimId);
            revert ClaimExpiredError();
        }

        // Verify policy is still valid
        if (!registry.isPolicyValid(claim.policyCommitment)) revert PolicyNotValid();

        // Record coverage usage in registry
        registry.recordCoverageUsage(claim.policyCommitment, claim.amount);

        // Update claim status BEFORE transfer (CEI pattern)
        claim.status = ClaimStatus.ENABLED;
        claim.updatedAt = block.timestamp;

        // Transfer USDC from registry to hospital
        registry.transferCoverage(claim.hospital, claim.amount);

        emit ClaimEnabled(
            claimId,
            claim.hospital,
            claim.amount,
            bytes32(uint256(uint160(claim.hospital))) // For tracking
        );
    }

    /**
     * @notice Reject a claim (oracle only)
     * @param claimId The claim to reject
     * @param reason Reason for rejection
     */
    function rejectClaim(
        bytes32 claimId,
        string calldata reason
    ) external onlyOracle {
        Claim storage claim = claims[claimId];

        if (claim.createdAt == 0) revert ClaimDoesNotExist();
        if (claim.status != ClaimStatus.PENDING) revert ClaimNotPending();

        claim.status = ClaimStatus.REJECTED;
        claim.rejectionReason = reason;
        claim.updatedAt = block.timestamp;

        emit ClaimRejected(claimId, reason);
    }

    // ============ View Functions ============

    /**
     * @notice Get claim details
     * @param claimId The claim ID
     */
    function getClaim(bytes32 claimId) external view returns (
        bytes32 policyCommitment,
        address hospital,
        uint256 amount,
        bytes32 invoiceHash,
        uint8 status,
        uint256 createdAt,
        uint256 updatedAt
    ) {
        Claim storage claim = claims[claimId];
        return (
            claim.policyCommitment,
            claim.hospital,
            claim.amount,
            claim.invoiceHash,
            uint8(claim.status),
            claim.createdAt,
            claim.updatedAt
        );
    }

    /**
     * @notice Get claim status
     * @param claimId The claim ID
     */
    function getClaimStatus(bytes32 claimId) external view returns (uint8) {
        return uint8(claims[claimId].status);
    }

    /**
     * @notice Get rejection reason for a claim
     * @param claimId The claim ID
     */
    function getRejectionReason(bytes32 claimId) external view returns (string memory) {
        return claims[claimId].rejectionReason;
    }

    /**
     * @notice Get total number of claims
     */
    function getTotalClaims() external view returns (uint256) {
        return allClaimIds.length;
    }

    /**
     * @notice Check if a claim is expired
     * @param claimId The claim ID
     */
    function isClaimExpired(bytes32 claimId) external view returns (bool) {
        Claim storage claim = claims[claimId];
        if (claim.createdAt == 0) return false;
        return block.timestamp > claim.createdAt + CLAIM_EXPIRY;
    }

    // ============ Admin Functions ============

    /**
     * @notice Register a hospital
     * @param hospital Hospital address
     */
    function registerHospital(address hospital) external onlyOwner {
        if (hospital == address(0)) revert ZeroAddress();
        isHospital[hospital] = true;
        emit HospitalRegistered(hospital);
    }

    /**
     * @notice Remove a hospital
     * @param hospital Hospital address
     */
    function removeHospital(address hospital) external onlyOwner {
        isHospital[hospital] = false;
        emit HospitalRemoved(hospital);
    }

    /**
     * @notice Update oracle address
     * @param newOracle New oracle address
     */
    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert ZeroAddress();
        address oldOracle = oracle;
        oracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }

    /**
     * @notice Batch register hospitals
     * @param hospitals Array of hospital addresses
     */
    function batchRegisterHospitals(address[] calldata hospitals) external onlyOwner {
        for (uint256 i = 0; i < hospitals.length; i++) {
            if (hospitals[i] != address(0)) {
                isHospital[hospitals[i]] = true;
                emit HospitalRegistered(hospitals[i]);
            }
        }
    }
}
