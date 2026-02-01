// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/CuranceRegistry.sol";
import "../src/CuranceClaims.sol";

contract CuranceTransferTest is Test {
    MockUSDC public usdc;
    CuranceRegistry public registry;
    CuranceClaims public claims;

    address public owner = address(this);
    address public oracle = address(0x1);
    address public hospital = address(0x2);
    address public patient = address(0x3);

    bytes32 constant SECRET = keccak256("patient_secret");
    bytes32 constant HEALTH_DATA_HASH = keccak256("healthy_data");
    bytes32 constant INVOICE_HASH = keccak256("invoice_001");

    bytes32 public commitment;

    function setUp() public {
        // Deploy contracts
        usdc = new MockUSDC();
        registry = new CuranceRegistry(address(usdc));
        claims = new CuranceClaims(address(registry), address(usdc), oracle);

        // Link registry to claims
        registry.setClaimsContract(address(claims));

        // Register hospital
        claims.registerHospital(hospital);

        // Fund registry
        usdc.approve(address(registry), 1_000_000 * 1e6);
        registry.fundContract(1_000_000 * 1e6);

        // Calculate commitment
        commitment = keccak256(abi.encodePacked(SECRET, HEALTH_DATA_HASH));

        // Give patient USDC for premium
        usdc.mint(patient, 10_000 * 1e6);
    }

    function testFullTransferFlow() public {
        // ========== STEP 1: Patient registers policy ==========
        uint256 premium = 1000 * 1e6; // 1000 USDC

        vm.startPrank(patient);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, HEALTH_DATA_HASH, premium);
        vm.stopPrank();

        // Verify policy
        assertTrue(registry.isPolicyValid(commitment));
        assertEq(registry.getRemainingCoverage(commitment), premium * 10);

        // ========== STEP 2: Hospital creates claim ==========
        uint256 claimAmount = 500 * 1e6; // 500 USDC

        vm.prank(hospital);
        bytes32 claimId = claims.createClaim(commitment, claimAmount, INVOICE_HASH);

        // Verify claim
        assertEq(claims.getClaimStatus(claimId), 1); // PENDING

        // ========== STEP 3: Oracle enables claim ==========
        uint256 hospitalBalanceBefore = usdc.balanceOf(hospital);

        vm.prank(oracle);
        claims.enableClaim(claimId);

        // ========== STEP 4: Verify transfer ==========
        uint256 hospitalBalanceAfter = usdc.balanceOf(hospital);
        assertEq(hospitalBalanceAfter - hospitalBalanceBefore, claimAmount);
        assertEq(claims.getClaimStatus(claimId), 2); // ENABLED
        assertEq(registry.getRemainingCoverage(commitment), premium * 10 - claimAmount);
    }

    function testMultipleClaims() public {
        uint256 premium = 1000 * 1e6;
        uint256 claimAmount1 = 300 * 1e6;
        uint256 claimAmount2 = 400 * 1e6;

        // Register policy
        vm.startPrank(patient);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, HEALTH_DATA_HASH, premium);
        vm.stopPrank();

        // First claim
        vm.prank(hospital);
        bytes32 claimId1 = claims.createClaim(commitment, claimAmount1, INVOICE_HASH);

        vm.prank(oracle);
        claims.enableClaim(claimId1);

        assertEq(usdc.balanceOf(hospital), claimAmount1);
        assertEq(registry.getRemainingCoverage(commitment), premium * 10 - claimAmount1);

        // Second claim
        bytes32 invoiceHash2 = keccak256("invoice_002");

        vm.prank(hospital);
        bytes32 claimId2 = claims.createClaim(commitment, claimAmount2, invoiceHash2);

        vm.prank(oracle);
        claims.enableClaim(claimId2);

        assertEq(usdc.balanceOf(hospital), claimAmount1 + claimAmount2);
        assertEq(registry.getRemainingCoverage(commitment), premium * 10 - claimAmount1 - claimAmount2);
    }

    function testRejectClaim() public {
        uint256 premium = 1000 * 1e6;

        vm.startPrank(patient);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, HEALTH_DATA_HASH, premium);
        vm.stopPrank();

        vm.prank(hospital);
        bytes32 claimId = claims.createClaim(commitment, 500 * 1e6, INVOICE_HASH);

        // Oracle rejects
        vm.prank(oracle);
        claims.rejectClaim(claimId, "Invalid invoice");

        assertEq(claims.getClaimStatus(claimId), 3); // REJECTED
        assertEq(claims.getRejectionReason(claimId), "Invalid invoice");

        // Coverage not used
        assertEq(registry.getRemainingCoverage(commitment), premium * 10);
    }

    function testOnlyOracleCanEnableClaim() public {
        uint256 premium = 1000 * 1e6;

        vm.startPrank(patient);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, HEALTH_DATA_HASH, premium);
        vm.stopPrank();

        vm.prank(hospital);
        bytes32 claimId = claims.createClaim(commitment, 500 * 1e6, INVOICE_HASH);

        // Hospital tries to enable - should fail
        vm.prank(hospital);
        vm.expectRevert(CuranceClaims.NotOracle.selector);
        claims.enableClaim(claimId);

        // Patient tries to enable - should fail
        vm.prank(patient);
        vm.expectRevert(CuranceClaims.NotOracle.selector);
        claims.enableClaim(claimId);
    }

    function testOnlyHospitalCanCreateClaim() public {
        uint256 premium = 1000 * 1e6;

        vm.startPrank(patient);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, HEALTH_DATA_HASH, premium);
        vm.stopPrank();

        // Non-hospital tries to create claim
        vm.prank(patient);
        vm.expectRevert(CuranceClaims.NotHospital.selector);
        claims.createClaim(commitment, 500 * 1e6, INVOICE_HASH);
    }

    function testInsufficientCoverage() public {
        uint256 premium = 100 * 1e6; // Minimum premium
        uint256 coverage = premium * 10; // 1000 USDC coverage

        vm.startPrank(patient);
        usdc.approve(address(registry), premium);
        registry.registerPolicy(commitment, HEALTH_DATA_HASH, premium);
        vm.stopPrank();

        // Try to claim more than coverage
        vm.prank(hospital);
        vm.expectRevert(CuranceClaims.InsufficientCoverage.selector);
        claims.createClaim(commitment, coverage + 1, INVOICE_HASH);
    }
}
