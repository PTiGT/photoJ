import { execSync } from 'node:child_process';
import { DATABASE_URL } from './playwright.config';

/** Applies migrations and seeds templates in the e2e database (non-destructive). */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL };
  execSync('npx prisma migrate deploy', { cwd: '../backend', env, stdio: 'pipe' });
  execSync('node prisma/seed.js', { cwd: '../backend', env, stdio: 'pipe' });
}
