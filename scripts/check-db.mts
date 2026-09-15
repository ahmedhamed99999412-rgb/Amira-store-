import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const settings = await db.storeSettings.findUnique({ where: { id: 'singleton' } })
  console.log('=== StoreSettings ===')
  console.log(JSON.stringify(settings, null, 2))
  const users = await db.user.findMany({
    select: { id: true, username: true, phone: true, role: true, isActive: true },
  })
  console.log('=== Users ===')
  console.log(JSON.stringify(users, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
