import { execSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * Brings the test database schema up to date and seeds system templates.
 * Non-destructive on purpose: every test creates its own users with random
 * emails, so no data needs to be wiped between runs.
 */
export default async function setup() {
  const env = { ...process.env, NODE_ENV: 'test' };
  execSync('npx prisma migrate deploy', { env, stdio: 'pipe' });
  execSync('node prisma/seed.js', { env, stdio: 'pipe' });
  return () => fs.rmSync(process.env.UPLOAD_DIR ?? 'uploads-test', { recursive: true, force: true });
}
