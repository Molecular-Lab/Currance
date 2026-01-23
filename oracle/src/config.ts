import dotenv from 'dotenv'
import { Address } from 'viem'

dotenv.config()

export interface Config {
  port: number
  nodeEnv: string
  privateKey: `0x${string}`
  rpcUrl: string
  registryAddress: Address
  claimsAddress: Address
  // Primus configuration
  primusAppId: string
  primusAppSecret: string
  trustedAttestors: string
}

function loadConfig(): Config {
  const requiredEnvVars = [
    'PRIVATE_KEY',
    'RPC_URL',
    'REGISTRY_ADDRESS',
    'CLAIMS_ADDRESS'
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.RPC_URL!,
    registryAddress: process.env.REGISTRY_ADDRESS as Address,
    claimsAddress: process.env.CLAIMS_ADDRESS as Address,
    // Primus configuration
    primusAppId: process.env.PRIMUS_APP_ID || '',
    primusAppSecret: process.env.PRIMUS_APP_SECRET || '',
    trustedAttestors: process.env.TRUSTED_ATTESTORS || '',
  }
}

export const config = loadConfig()
