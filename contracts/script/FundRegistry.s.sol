// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/CuranceRegistry.sol";

/**
 * @title FundRegistry
 * @notice Mint and fund the registry with USDC for paying claims
 * @dev Run: forge script script/FundRegistry.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 *
 * Environment variables:
 * - PRIVATE_KEY: Funder private key
 * - USDC_ADDRESS: MockUSDC contract
 * - REGISTRY_ADDRESS: CuranceRegistry contract
 * - FUND_AMOUNT: Amount to fund in USDC (e.g., 100000 for 100k USDC)
 */
contract FundRegistry is Script {
    function run() external {
        uint256 funderPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        uint256 fundAmountUsdc = vm.envUint("FUND_AMOUNT");

        MockUSDC usdc = MockUSDC(usdcAddress);
        CuranceRegistry registry = CuranceRegistry(registryAddress);

        uint256 fundAmount = fundAmountUsdc * 1e6; // Convert to 6 decimals

        console.log("Funder:", vm.addr(funderPrivateKey));
        console.log("Registry:", registryAddress);
        console.log("Current registry balance:", usdc.balanceOf(registryAddress) / 1e6, "USDC");
        console.log("Amount to fund:", fundAmountUsdc, "USDC");

        vm.startBroadcast(funderPrivateKey);

        // Mint USDC to funder
        usdc.mint(vm.addr(funderPrivateKey), fundAmount);
        console.log("Minted", fundAmountUsdc, "USDC");

        // Approve and fund registry
        usdc.approve(registryAddress, fundAmount);
        registry.fundContract(fundAmount);
        console.log("Funded registry with", fundAmountUsdc, "USDC");

        vm.stopBroadcast();

        console.log("\nNew registry balance:", usdc.balanceOf(registryAddress) / 1e6, "USDC");
    }
}
