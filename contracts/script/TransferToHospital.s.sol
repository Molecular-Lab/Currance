// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/CuranceRegistry.sol";
import "../src/CuranceClaims.sol";

/**
 * @title TransferToHospital
 * @notice Script to simulate the full flow: register policy -> create claim -> enable claim (transfer)
 * @dev This is for testing the complete insurance to hospital transfer flow
 *
 * Environment variables:
 * - PRIVATE_KEY: Oracle/deployer private key
 * - USDC_ADDRESS: MockUSDC contract address
 * - REGISTRY_ADDRESS: CuranceRegistry address
 * - CLAIMS_ADDRESS: CuranceClaims address
 * - HOSPITAL_ADDRESS: Hospital wallet to receive payment
 * - PATIENT_PRIVATE_KEY: Patient's private key (for registration)
 */
contract TransferToHospital is Script {
    // Mock data - replace with your own values
    bytes32 constant MOCK_SECRET = keccak256("patient_secret_123");
    bytes32 constant MOCK_HEALTH_DATA_HASH = keccak256("healthy_bmi_22_bp_120_80");
    bytes32 constant MOCK_INVOICE_HASH = keccak256("invoice_INV001_treatment_consultation");

    function run() external {
        // Load environment
        uint256 oraclePrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.addr(oraclePrivateKey);

        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        address claimsAddress = vm.envAddress("CLAIMS_ADDRESS");
        address hospitalAddress = vm.envAddress("HOSPITAL_ADDRESS");

        // Optional: separate patient key, or use oracle for testing
        uint256 patientPrivateKey = vm.envOr("PATIENT_PRIVATE_KEY", oraclePrivateKey);
        address patientAddress = vm.addr(patientPrivateKey);

        MockUSDC usdc = MockUSDC(usdcAddress);
        CuranceRegistry registry = CuranceRegistry(registryAddress);
        CuranceClaims claims = CuranceClaims(claimsAddress);

        console.log("Oracle:", oracleAddress);
        console.log("Patient:", patientAddress);
        console.log("Hospital:", hospitalAddress);

        // Generate commitment
        bytes32 commitment = keccak256(abi.encodePacked(MOCK_SECRET, MOCK_HEALTH_DATA_HASH));
        console.log("Commitment:");
        console.logBytes32(commitment);

        // ========== STEP 1: Mint USDC to patient (for premium) ==========
        console.log("\n--- Step 1: Mint USDC to patient ---");
        vm.startBroadcast(oraclePrivateKey);

        uint256 premiumAmount = 1000 * 1e6; // 1000 USDC premium
        usdc.mint(patientAddress, premiumAmount);
        console.log("Minted", premiumAmount / 1e6, "USDC to patient");

        vm.stopBroadcast();

        // ========== STEP 2: Patient registers policy ==========
        console.log("\n--- Step 2: Register policy ---");
        vm.startBroadcast(patientPrivateKey);

        usdc.approve(registryAddress, premiumAmount);
        registry.registerPolicy(commitment, MOCK_HEALTH_DATA_HASH, premiumAmount);
        console.log("Policy registered with premium:", premiumAmount / 1e6, "USDC");
        console.log("Coverage amount:", premiumAmount * 10 / 1e6, "USDC");

        vm.stopBroadcast();

        // ========== STEP 3: Ensure hospital is registered ==========
        console.log("\n--- Step 3: Ensure hospital is registered ---");
        vm.startBroadcast(oraclePrivateKey);

        if (!claims.isHospital(hospitalAddress)) {
            claims.registerHospital(hospitalAddress);
            console.log("Hospital registered");
        } else {
            console.log("Hospital already registered");
        }

        vm.stopBroadcast();

        // ========== STEP 4: Hospital creates claim ==========
        console.log("\n--- Step 4: Hospital creates claim ---");

        // Check hospital balance before
        uint256 hospitalBalanceBefore = usdc.balanceOf(hospitalAddress);
        console.log("Hospital balance before:", hospitalBalanceBefore / 1e6, "USDC");

        uint256 claimAmount = 500 * 1e6; // 500 USDC claim

        // Need hospital private key to create claim - for testing, we'll use a workaround
        // In production, hospital would call this from their wallet
        vm.startBroadcast(oraclePrivateKey);

        // For testing: temporarily register oracle as hospital to create claim
        bool oracleWasHospital = claims.isHospital(oracleAddress);
        if (!oracleWasHospital) {
            claims.registerHospital(oracleAddress);
        }

        vm.stopBroadcast();

        vm.startBroadcast(oraclePrivateKey);

        bytes32 claimId = claims.createClaim(commitment, claimAmount, MOCK_INVOICE_HASH);
        console.log("Claim created with ID:");
        console.logBytes32(claimId);
        console.log("Claim amount:", claimAmount / 1e6, "USDC");

        vm.stopBroadcast();

        // ========== STEP 5: Oracle enables claim (triggers transfer) ==========
        console.log("\n--- Step 5: Oracle enables claim (TRANSFER HAPPENS HERE) ---");
        vm.startBroadcast(oraclePrivateKey);

        claims.enableClaim(claimId);
        console.log("Claim enabled! USDC transferred to hospital.");

        vm.stopBroadcast();

        // ========== STEP 6: Verify transfer ==========
        console.log("\n--- Step 6: Verify transfer ---");
        uint256 hospitalBalanceAfter = usdc.balanceOf(hospitalAddress);
        console.log("Hospital balance after:", hospitalBalanceAfter / 1e6, "USDC");
        console.log("Amount received:", (hospitalBalanceAfter - hospitalBalanceBefore) / 1e6, "USDC");

        // Check claim status
        uint8 status = claims.getClaimStatus(claimId);
        console.log("Claim status (2 = ENABLED):", status);

        // Check remaining coverage
        uint256 remainingCoverage = registry.getRemainingCoverage(commitment);
        console.log("Remaining coverage:", remainingCoverage / 1e6, "USDC");

        console.log("\n========== TRANSFER COMPLETE ==========");
    }
}
