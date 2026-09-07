import fs from 'node:fs'
const envVarCheck = fs.readFileSync('.env.production', 'utf8')
const lines = envVarCheck.split('\n')
console.log('Total env vars:', lines.filter(l => l.trim()).length)
for (const line of lines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const [key, ...rest] = trimmed.split('=')
  const value = rest.join('=').trim().replace(/^["']|["']$/g, '')
  if (key === 'DATABASE_URL') {
    const prefix = value.substring(0, 12)
    console.log(`DATABASE_URL prefix: ${prefix} ... length=${value.length}`)
    if (prefix.startsWith('postgresql')) console.log('  -> PostgreSQL (production)')
    else if (prefix.startsWith('file:')) console.log('  -> SQLite (dev)')
  }
  if (key === 'JWT_SECRET') {
    console.log(`JWT_SECRET: (${value.length} chars) set`)
  }
  if (key === 'ADMIN_PASSWORD') {
    console.log(`ADMIN_PASSWORD: (${value.length} chars) set`)
  }
}
