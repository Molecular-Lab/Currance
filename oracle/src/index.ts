import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { config } from './config.js'
import registerRouter from './routes/register.js'
import claimsRouter from './routes/claims.js'

const app = express()

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'curance-oracle',
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'curance-oracle',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    contracts: {
      registry: config.registryAddress,
      claims: config.claimsAddress,
    },
  })
})

// Mount routes
app.use('/api', registerRouter)
app.use('/api/claims', claimsRouter)

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  })
})

// Start server
const port = config.port

app.listen(port, () => {
  console.log('\n🚀 Curance Oracle Service Started')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📡 Server:     http://localhost:${port}`)
  console.log(`🏥 Registry:   ${config.registryAddress}`)
  console.log(`📋 Claims:     ${config.claimsAddress}`)
  console.log(`🔗 Network:    Base Sepolia`)
  console.log(`🔐 Oracle:     ${config.privateKey.substring(0, 10)}...`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📌 Endpoints:')
  console.log('   GET  /health')
  console.log('   POST /api/register')
  console.log('   POST /api/claims/verify')
  console.log('   GET  /api/claims/:claimId')
  console.log('   GET  /api/claims/:claimId/status')
  console.log('\n✨ Ready to verify proofs and enable claims!\n')
})
