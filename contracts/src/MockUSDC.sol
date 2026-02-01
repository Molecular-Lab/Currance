// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing on Base Sepolia
 * @dev ERC20 token with 6 decimals (like real USDC)
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint 1 million USDC to deployer for initial distribution
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS);
    }

    /**
     * @notice Returns the number of decimals (6 for USDC)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Public mint function for testing
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in smallest unit, 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens to yourself (faucet style)
     * @param amount Amount to mint
     */
    function faucet(uint256 amount) external {
        require(amount <= 10_000 * 10 ** DECIMALS, "Max 10,000 USDC per faucet call");
        _mint(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from your own balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
