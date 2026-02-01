// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";

/**
 * @title DeployMockUSDC
 * @notice Deploy MockUSDC token to Base Sepolia
 * @dev Run: forge script script/DeployMockUSDC.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployMockUSDC is Script {
    function run() external returns (MockUSDC) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();

        console.log("MockUSDC deployed at:", address(usdc));
        console.log("Deployer balance:", usdc.balanceOf(vm.addr(deployerPrivateKey)));

        vm.stopBroadcast();

        return usdc;
    }
}
