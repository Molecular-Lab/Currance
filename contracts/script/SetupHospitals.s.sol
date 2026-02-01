// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CuranceClaims.sol";

/**
 * @title SetupHospitals
 * @notice Register hospitals after deployment
 * @dev Run: forge script script/SetupHospitals.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 *
 * Environment variables:
 * - PRIVATE_KEY: Owner private key
 * - CLAIMS_ADDRESS: CuranceClaims contract address
 * - HOSPITAL_ADDRESSES: Comma-separated hospital addresses (e.g., "0x123,0x456,0x789")
 */
contract SetupHospitals is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address claimsAddress = vm.envAddress("CLAIMS_ADDRESS");
        string memory hospitalsStr = vm.envString("HOSPITAL_ADDRESSES");

        CuranceClaims claims = CuranceClaims(claimsAddress);

        console.log("Owner:", vm.addr(ownerPrivateKey));
        console.log("Claims contract:", claimsAddress);

        // Parse comma-separated addresses
        address[] memory hospitals = parseAddresses(hospitalsStr);

        console.log("\nRegistering", hospitals.length, "hospitals...");

        vm.startBroadcast(ownerPrivateKey);

        for (uint256 i = 0; i < hospitals.length; i++) {
            if (hospitals[i] != address(0) && !claims.isHospital(hospitals[i])) {
                claims.registerHospital(hospitals[i]);
                console.log("Registered:", hospitals[i]);
            } else if (claims.isHospital(hospitals[i])) {
                console.log("Already registered:", hospitals[i]);
            }
        }

        vm.stopBroadcast();

        console.log("\nHospital setup complete!");
    }

    function parseAddresses(string memory str) internal pure returns (address[] memory) {
        // Simple parsing - count commas + 1
        bytes memory b = bytes(str);
        uint256 count = 1;
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == ",") count++;
        }

        address[] memory result = new address[](count);

        // For simplicity in this script, we'll expect exact format
        // In production, use a more robust parser
        uint256 start = 0;
        uint256 idx = 0;
        for (uint256 i = 0; i <= b.length; i++) {
            if (i == b.length || b[i] == ",") {
                bytes memory addrBytes = new bytes(i - start);
                for (uint256 j = start; j < i; j++) {
                    addrBytes[j - start] = b[j];
                }
                result[idx] = parseAddress(string(addrBytes));
                idx++;
                start = i + 1;
            }
        }

        return result;
    }

    function parseAddress(string memory str) internal pure returns (address) {
        bytes memory b = bytes(str);
        uint256 result = 0;
        uint256 start = 0;

        // Skip 0x prefix if present
        if (b.length >= 2 && b[0] == "0" && (b[1] == "x" || b[1] == "X")) {
            start = 2;
        }

        for (uint256 i = start; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            uint8 digit;
            if (c >= 48 && c <= 57) {
                digit = c - 48; // 0-9
            } else if (c >= 65 && c <= 70) {
                digit = c - 55; // A-F
            } else if (c >= 97 && c <= 102) {
                digit = c - 87; // a-f
            } else {
                continue; // Skip invalid chars
            }
            result = result * 16 + digit;
        }

        return address(uint160(result));
    }
}
