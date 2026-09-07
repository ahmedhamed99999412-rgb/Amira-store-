import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL ?? '';
const isPostgres = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || /^(postgres|postgresql):\/\//i.test(databaseUrl);
const schema = isPostgres
  ? 'prisma/schema.postgresql.prisma'
  : 'prisma/schema.prisma';

const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'generate', `--schema=${schema}`], {
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '0' },
});

if (result.error) {
  console.error(`Failed to run Prisma generate: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
