import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL ?? '';
const isPostgres = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || /^(postgres|postgresql):\/\//i.test(databaseUrl);
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
