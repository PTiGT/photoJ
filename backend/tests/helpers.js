import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();
export const api = () => request(app);

/** Registers a fresh user and returns `{ token, user, auth }` where `auth` sets the header. */
export async function registerUser(overrides = {}) {
  const body = { email: `user-${randomUUID()}@test.dev`, name: 'Test User', password: 'password123', ...overrides };
  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  const { token, user } = res.body.data;
  return { token, user, password: body.password, auth: (req) => req.set('Authorization', `Bearer ${token}`) };
}

export async function loginAdmin() {
  const res = await api()
    .post('/api/auth/login')
    .send({ email: process.env.ADMIN_EMAIL ?? 'admin@qabuilder.local', password: process.env.ADMIN_PASSWORD ?? 'admin12345' });
  const { token } = res.body.data;
  return { token, auth: (req) => req.set('Authorization', `Bearer ${token}`) };
}

export const block = (type, content = {}, extra = {}) => ({ id: randomUUID(), type, order: 0, parentId: null, content, settings: {}, ...extra });
