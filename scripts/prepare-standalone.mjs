import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');
const staticDir = path.join(root, '.next', 'static');
const publicDir = path.join(root, 'public');

await mkdir(path.join(standalone, '.next'), { recursive: true });
await cp(staticDir, path.join(standalone, '.next', 'static'), { recursive: true });

try {
  await cp(publicDir, path.join(standalone, 'public'), { recursive: true });
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
