import path from 'node:path';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Environment variable ${name} is required`);
  return value;
}

const isTest = process.env.NODE_ENV === 'test';

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret: required('JWT_SECRET', isTest ? 'test-secret' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  maxUploadBytes: 10 * 1024 * 1024,
  isTest,
};
