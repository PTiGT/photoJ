import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { api, registerUser } from '../helpers.js';

describe('auth API', () => {
  it('registers a user and returns a token', async () => {
    const id = randomUUID().slice(0, 8);
    const res = await api().post('/api/auth/register').send({ email: `NEW.User.${id}@Test.dev`, name: 'Анна', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email: `new.user.${id}@test.dev`, name: 'Анна', role: 'USER' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate emails with 409', async () => {
    const { user } = await registerUser();
    const res = await api().post('/api/auth/register').send({ email: user.email, name: 'Dup', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ data: null, error: expect.stringContaining('уже существует') });
  });

  it('validates registration payload', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'bad', name: 'A', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toMatch(/email/);
  });

  it('logs in with correct credentials only', async () => {
    const { user, password } = await registerUser();
    const good = await api().post('/api/auth/login').send({ email: user.email, password });
    expect(good.status).toBe(200);
    expect(good.body.data.user.id).toBe(user.id);

    const bad = await api().post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('Неверный email или пароль');
  });

  it('protects routes with a Bearer token', async () => {
    expect((await api().get('/api/documents')).status).toBe(401);
    expect((await api().get('/api/documents').set('Authorization', 'Bearer nonsense')).status).toBe(401);
    const { auth, user } = await registerUser();
    const me = await auth(api().get('/api/auth/me'));
    expect(me.body.data.user.id).toBe(user.id);
  });

  it('returns a JSON envelope for unknown routes', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ data: null, error: expect.any(String) });
  });
});
