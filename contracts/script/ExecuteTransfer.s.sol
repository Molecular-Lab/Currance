// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/CuranceRegistry.sol";
import "../src/CuranceClaims.sol";

/**
 * @title ExecuteTransfer
 * @notice Execute a single claim transfer from insurance to hospital
 * @dev Oracle calls this after verifying invoice off-chain
 *
 * Usage:
 * CLAIM_ID=0x... forge script script/ExecuteTransfer.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 *
 * Environment variables:
 * - PRIVATE_KEY: Oracle private key
 * - CLAIMS_ADDRESS: CuranceClaims contract
 * - CLAIM_ID: The claim ID to enable (bytes32 hex string)
 */
contract ExecuteTransfer is Script {
    function run() external {
        uint256 oraclePrivateKey = vm.envUint("PRIVATE_KEY");
        address claimsAddress = vm.envAddress("CLAIMS_ADDRESS");
        bytes32 claimId = vm.envBytes32("CLAIM_ID");

        CuranceClaims claims = CuranceClaims(claimsAddress);

        console.log("Oracle:", vm.addr(oraclePrivateKey));
        console.log("Claims contract:", claimsAddress);
        console.log("Claim ID:");
        console.logBytes32(claimId);

        // Get claim details before
        (
            bytes32 policyCommitment,
            address hospital,
            uint256 amount,
            bytes32 invoiceHash,
            uint8 status,
            uint256 createdAt,
            uint256 updatedAt
        ) = claims.getClaim(claimId);

        console.log("\n--- Claim Details ---");
        console.log("Hospital:", hospital);
        console.log("Amount:", amount / 1e6, "USDC");
        console.log("Current status:", status);

        require(status == 1, "Claim must be PENDING (status=1)");

        // Execute transfer
        console.log("\n--- Executing Transfer ---");
        vm.startBroadcast(oraclePrivateKey);

        claims.enableClaim(claimId);

        vm.stopBroadcast();

        // Verify
        uint8 newStatus = claims.getClaimStatus(claimId);
        console.log("\n--- Transfer Complete ---");
        console.log("New status (2=ENABLED):", newStatus);
        console.log("Amount transferred:", amount / 1e6, "USDC to", hospital);
    }
}
