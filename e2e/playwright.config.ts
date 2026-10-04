import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

if (fs.existsSync('.env.e2e')) process.loadEnvFile('.env.e2e');

const API_PORT = 4100;
const WEB_PORT = 5174;
export const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/qa_builder_e2e?schema=public';

const backendEnv = {
  DATABASE_URL,
  API_PORT: String(API_PORT),
  JWT_SECRET: 'e2e-secret',
  CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
  UPLOAD_DIR: 'uploads-e2e',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ru-RU',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'node src/server.js',
      cwd: '../backend',
      env: backendEnv,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: '../frontend',
      env: { VITE_API_PROXY: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
