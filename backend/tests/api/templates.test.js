import { describe, expect, it, beforeAll } from 'vitest';
import { api, block, loginAdmin, registerUser } from '../helpers.js';

describe('templates API', () => {
  let user;
  let admin;

  beforeAll(async () => {
    user = await registerUser();
    admin = await loginAdmin();
  });

  it('lists seeded system templates for every type', async () => {
    const res = await user.auth(api().get('/api/templates'));
    expect(res.status).toBe(200);
    const names = res.body.data.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['Web Bug', 'Mobile Bug', 'API Bug', 'Web Test Case', 'API Test Case', 'Mobile Test Case', 'Авторизация', 'Регистрация', 'UI', 'API']));
    expect(res.body.data.every((t) => t.isSystem ? t.canEdit === false : true)).toBe(true);
  });

  it('creates a custom template from blocks and edits it', async () => {
    const created = await user.auth(api().post('/api/templates')).send({ name: 'My bug', docType: 'BUG_REPORT', blocks: [block('INPUT', { label: 'Title' })] });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: 'My bug', isSystem: false, canEdit: true });

    const updated = await user.auth(api().put(`/api/templates/${created.body.data.id}`)).send({ name: 'My bug v2', blocks: [block('TEXT', { text: 'x' }), block('SEVERITY', {}, { order: 1 })] });
    expect(updated.body.data.name).toBe('My bug v2');
    expect(updated.body.data.blocks.map((b) => b.type)).toEqual(['TEXT', 'SEVERITY']);
  });

  it('creates a template from an existing document', async () => {
    const doc = (await user.auth(api().post('/api/documents')).send({ type: 'CHECKLIST' })).body.data;
    const res = await user.auth(api().post('/api/templates')).send({ name: 'From doc', docType: 'CHECKLIST', fromDocumentId: doc.id });
    expect(res.status).toBe(201);
    expect(res.body.data.blocks).toHaveLength(doc.blocks.length);
  });

  it("keeps custom templates private and system templates read-only for users", async () => {
    const other = await registerUser();
    const mine = (await user.auth(api().post('/api/templates')).send({ name: 'Private', docType: 'TEST_PLAN' })).body.data;
    expect((await other.auth(api().get(`/api/templates/${mine.id}`))).status).toBe(404);

    const system = (await user.auth(api().get('/api/templates?docType=BUG_REPORT'))).body.data.find((t) => t.name === 'Web Bug');
    expect((await user.auth(api().put(`/api/templates/${system.id}`)).send({ name: 'hack' })).status).toBe(403);
    expect((await user.auth(api().delete(`/api/templates/${system.id}`))).status).toBe(403);
    expect((await user.auth(api().post('/api/templates')).send({ name: 'Sys', docType: 'TEST_PLAN', isSystem: true })).status).toBe(403);
  });

  it('lets admins manage system templates but not delete base ones', async () => {
    const created = await admin.auth(api().post('/api/templates')).send({ name: 'Corporate bug', docType: 'BUG_REPORT', isSystem: true });
    expect(created.body.data).toMatchObject({ isSystem: true, ownerId: null });
    expect((await admin.auth(api().delete(`/api/templates/${created.body.data.id}`))).status).toBe(200);

    const base = (await admin.auth(api().get('/api/templates?docType=BUG_REPORT'))).body.data.find((t) => t.isDefault);
    expect((await admin.auth(api().delete(`/api/templates/${base.id}`))).status).toBe(400);
  });
});
