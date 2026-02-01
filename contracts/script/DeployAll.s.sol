// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/CuranceRegistry.sol";
import "../src/CuranceClaims.sol";

/**
 * @title DeployAll
 * @notice Deploy all Curance contracts to Base Sepolia
 * @dev Run: forge script script/DeployAll.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 *
 * Environment variables needed:
 * - PRIVATE_KEY: Deployer private key
 * - ORACLE_ADDRESS: Oracle wallet address (for claims verification)
 * - HOSPITAL_ADDRESS: Initial hospital to register (optional)
 */
contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");

        // Optional: hospital address to register
        address hospitalAddress = vm.envOr("HOSPITAL_ADDRESS", address(0));

        console.log("Deployer:", deployer);
        console.log("Oracle:", oracleAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("1. MockUSDC deployed at:", address(usdc));

        // 2. Deploy CuranceRegistry
        CuranceRegistry registry = new CuranceRegistry(address(usdc));
        console.log("2. CuranceRegistry deployed at:", address(registry));

        // 3. Deploy CuranceClaims
        CuranceClaims claims = new CuranceClaims(
            address(registry),
            address(usdc),
            oracleAddress
        );
        console.log("3. CuranceClaims deployed at:", address(claims));

        // 4. Link Registry to Claims contract
        registry.setClaimsContract(address(claims));
        console.log("4. Registry linked to Claims contract");

        // 5. Fund the registry with USDC for claims (500k USDC)
        uint256 fundAmount = 500_000 * 1e6; // 500,000 USDC
        usdc.approve(address(registry), fundAmount);
        registry.fundContract(fundAmount);
        console.log("5. Registry funded with 500,000 USDC");

        // 6. Register initial hospital if provided
        if (hospitalAddress != address(0)) {
            claims.registerHospital(hospitalAddress);
            console.log("6. Hospital registered:", hospitalAddress);
        }

        vm.stopBroadcast();

        // Output deployment addresses for .env
        console.log("\n========== DEPLOYMENT COMPLETE ==========");
        console.log("Add these to your .env file:\n");
        console.log("USDC_ADDRESS=", address(usdc));
        console.log("REGISTRY_ADDRESS=", address(registry));
        console.log("CLAIMS_ADDRESS=", address(claims));
        console.log("\nRegistry USDC balance:", usdc.balanceOf(address(registry)));
    }
}
