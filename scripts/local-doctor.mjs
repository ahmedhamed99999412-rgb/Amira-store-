import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const major = Number(process.versions.node.split('.')[0]);
check('Node.js >= 22', major >= 22, `Detected Node.js ${process.version}`);

const envPath = path.join(root, '.env');
check('.env exists', fs.existsSync(envPath), fs.existsSync(envPath) ? '.env found' : 'Create it with: npm run setup:local');

const packagePath = path.join(root, 'package.json');
check('package.json exists', fs.existsSync(packagePath), packagePath);

const schemaPath = path.join(root, 'prisma', 'schema.prisma');
check('SQLite Prisma schema exists', fs.existsSync(schemaPath), schemaPath);

let dbPath = null;
const envExamplePath = path.join(root, '.env.example');
const envSource = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : (fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, 'utf8') : '');
const match = envSource.match(/^DATABASE_URL\s*=\s*['"]file:([^'"]+)['"]\s*$/m);
if (match) {
  dbPath = path.resolve(root, 'prisma', match[1]);
  check('SQLite database exists', fs.existsSync(dbPath), dbPath);
} else {
  check('SQLite DATABASE_URL configured', false, 'Expected DATABASE_URL=file:../database/custom.db for local SQLite.');
}

const prismaGenerated = fs.existsSync(path.join(root, 'node_modules', '.prisma', 'client'));
check('Prisma Client generated', prismaGenerated, prismaGenerated ? 'Generated client found.' : 'Run: npx prisma generate');

const failures = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
}

if (failures.length) {
  console.error(`\nLocal environment is NOT ready (${failures.length} check(s) failed).`);
  process.exit(1);
}

console.log('\nLocal environment baseline checks passed.');
