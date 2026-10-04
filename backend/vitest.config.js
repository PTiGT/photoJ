import { defineConfig } from 'vitest/config';
import fs from 'node:fs';

// API tests run against a dedicated database (see .env.test / .env.test.example).
const envFile = fs.existsSync('.env.test') ? '.env.test' : '.env.test.example';
process.loadEnvFile(envFile);
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/globalSetup.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
