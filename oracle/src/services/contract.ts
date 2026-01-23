import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  Address,
  PublicClient,
  WalletClient,
} from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { config } from '../config.js'
import { ClaimStatus, type Policy, type Claim } from '../types.js'

// Contract ABIs
export const registryAbi = parseAbi([
  'function registerPolicy(bytes32 commitment, bytes32 healthDataHash, uint256 premium) external',
  'function getPolicy(bytes32 commitment) view returns (uint256 premium, uint256 coverageAmount, uint256 usedCoverage, uint256 startTime, uint256 expiryTime, bool isActive)',
  'function isPolicyValid(bytes32 commitment) view returns (bool)',
  'function getRemainingCoverage(bytes32 commitment) view returns (uint256)',
])

export const claimsAbi = parseAbi([
  'function createClaim(bytes32 policyCommitment, uint256 amount, bytes32 invoiceHash) external returns (bytes32)',
  'function getClaim(bytes32 claimId) view returns (bytes32 policyCommitment, address hospital, uint256 amount, bytes32 invoiceHash, uint8 status, uint256 createdAt, uint256 updatedAt)',
  'function getClaimStatus(bytes32 claimId) view returns (uint8)',
  'function enableClaim(bytes32 claimId) external',
  'function rejectClaim(bytes32 claimId, string calldata reason) external',
])

// Clients
const account = privateKeyToAccount(config.privateKey)

export const publicClient: PublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
})

export const walletClient: WalletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(config.rpcUrl),
})

// Contract Service Functions

export async function isPolicyValid(commitment: `0x${string}`): Promise<boolean> {
  try {
    const isValid = await publicClient.readContract({
      address: config.registryAddress,
      abi: registryAbi,
      functionName: 'isPolicyValid',
      args: [commitment],
    })
    return isValid as boolean
  } catch (error) {
    console.error('Error checking policy validity:', error)
    return false
  }
}

export async function getPolicy(commitment: `0x${string}`): Promise<Policy | null> {
  try {
    const policyData = await publicClient.readContract({
      address: config.registryAddress,
      abi: registryAbi,
      functionName: 'getPolicy',
      args: [commitment],
    }) as [bigint, bigint, bigint, bigint, bigint, boolean]

    return {
      premium: policyData[0],
      coverageAmount: policyData[1],
      usedCoverage: policyData[2],
      startTime: policyData[3],
      expiryTime: policyData[4],
      isActive: policyData[5],
    }
  } catch (error) {
    console.error('Error getting policy:', error)
    return null
  }
}

export async function getClaim(claimId: `0x${string}`): Promise<Claim | null> {
  try {
    const claimData = await publicClient.readContract({
      address: config.claimsAddress,
      abi: claimsAbi,
      functionName: 'getClaim',
      args: [claimId],
    }) as [`0x${string}`, Address, bigint, `0x${string}`, number, bigint, bigint]

    return {
      policyCommitment: claimData[0],
      hospital: claimData[1],
      amount: claimData[2],
      invoiceHash: claimData[3],
      status: claimData[4] as ClaimStatus,
      createdAt: claimData[5],
      updatedAt: claimData[6],
    }
  } catch (error) {
    console.error('Error getting claim:', error)
    return null
  }
}

export async function getClaimStatus(claimId: `0x${string}`): Promise<ClaimStatus> {
  try {
    const status = await publicClient.readContract({
      address: config.claimsAddress,
      abi: claimsAbi,
      functionName: 'getClaimStatus',
      args: [claimId],
    }) as number

    return status as ClaimStatus
  } catch (error) {
    console.error('Error getting claim status:', error)
    return ClaimStatus.NONE
  }
}

export async function enableClaim(claimId: `0x${string}`): Promise<`0x${string}`> {
  try {
    console.log(`Enabling claim ${claimId}...`)

    const hash = await walletClient.writeContract({
      address: config.claimsAddress,
      abi: claimsAbi,
      functionName: 'enableClaim',
      args: [claimId],
    })

    console.log(`Claim enabled. Transaction hash: ${hash}`)

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash })

    return hash
  } catch (error) {
    console.error('Error enabling claim:', error)
    throw new Error('Failed to enable claim on-chain')
  }
}

export async function rejectClaim(
  claimId: `0x${string}`,
  reason: string
): Promise<`0x${string}`> {
  try {
    console.log(`Rejecting claim ${claimId} with reason: ${reason}`)

    const hash = await walletClient.writeContract({
      address: config.claimsAddress,
      abi: claimsAbi,
      functionName: 'rejectClaim',
      args: [claimId, reason],
    })

    console.log(`Claim rejected. Transaction hash: ${hash}`)

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash })

    return hash
  } catch (error) {
    console.error('Error rejecting claim:', error)
    throw new Error('Failed to reject claim on-chain')
  }
}
