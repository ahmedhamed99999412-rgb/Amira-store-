import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

let db: PrismaClient
try {
  db = globalForPrisma.prisma ?? new PrismaClient()
} catch (error) {
  throw new Error('Failed to initialize database connection', { cause: error as Error })
}

// Keep one client per warm server instance. This is safe in production and
// avoids unnecessary client creation across Vercel invocations.
globalForPrisma.prisma = db

export { db }
