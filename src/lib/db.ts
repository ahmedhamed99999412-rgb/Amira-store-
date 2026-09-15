import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

// Keep one client per warm server instance. This is safe in production and
// avoids unnecessary client creation across Vercel invocations.
globalForPrisma.prisma = db
