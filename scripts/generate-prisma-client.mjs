import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const databaseUrl = process.env.DATABASE_URL ?? '';
const isVercelBuild =
  process.env.VERCEL === '1' ||
  process.env.VERCEL === 'true' ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.VERCEL_URL) ||
  (!process.env.GITHUB_ACTIONS && !existsSync('.env'));
const isPostgres = isVercelBuild || /^(postgres|postgresql):\/\//i.test(databaseUrl);
const schema = isPostgres
  ? 'prisma/schema.postgresql.prisma'
  : 'prisma/schema.prisma';

const command = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(command, ['generate', `--schema=${schema}`], {
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(`Failed to run Prisma generate: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
