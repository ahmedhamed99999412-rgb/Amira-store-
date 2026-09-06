import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const projectRoot = process.cwd();
const envExample = path.join(projectRoot, '.env.example');
const envFile = path.join(projectRoot, '.env');

if (!fs.existsSync(envFile)) {
  if (!fs.existsSync(envExample)) {
    throw new Error('Missing .env.example');
  }

  let contents = fs.readFileSync(envExample, 'utf8');
  contents = contents.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${crypto.randomBytes(32).toString('hex')}"`);
  fs.writeFileSync(envFile, contents, 'utf8');
  console.log('Created .env from .env.example with a generated local JWT secret.');
} else {
  console.log('.env already exists; leaving it unchanged.');
}
