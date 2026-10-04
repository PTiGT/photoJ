import { describe, expect, it } from 'vitest';
import { api, loginAdmin, registerUser } from '../helpers.js';

describe('admin API', () => {
  it('is forbidden for regular users', async () => {
    const user = await registerUser();
    expect((await user.auth(api().get('/api/admin/stats'))).status).toBe(403);
    expect((await user.auth(api().get('/api/admin/users'))).status).toBe(403);
  });

  it('returns statistics and manages users', async () => {
    const admin = await loginAdmin();
    const stats = await admin.auth(api().get('/api/admin/stats'));
    expect(stats.status).toBe(200);
    expect(stats.body.data).toMatchObject({ users: expect.any(Number), documents: expect.any(Number), systemTemplates: expect.any(Number) });
    expect(Object.keys(stats.body.data.documentsByType)).toHaveLength(5);

    const target = await registerUser();
    const promoted = await admin.auth(api().patch(`/api/admin/users/${target.user.id}`)).send({ role: 'ADMIN' });
    expect(promoted.body.data.role).toBe('ADMIN');
    expect((await target.auth(api().get('/api/admin/stats'))).status).toBe(200);

    expect((await admin.auth(api().delete(`/api/admin/users/${target.user.id}`))).status).toBe(200);
    expect((await target.auth(api().get('/api/auth/me'))).status).toBe(401);
  });

  it('prevents admins from demoting or deleting themselves', async () => {
    const admin = await loginAdmin();
    const me = (await admin.auth(api().get('/api/auth/me'))).body.data.user;
    expect((await admin.auth(api().patch(`/api/admin/users/${me.id}`)).send({ role: 'USER' })).status).toBe(400);
    expect((await admin.auth(api().delete(`/api/admin/users/${me.id}`))).status).toBe(400);
  });
});
