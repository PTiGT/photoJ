import { describe, expect, it, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { api, block, registerUser } from '../helpers.js';

describe('documents API', () => {
  let owner;
  let stranger;

  beforeAll(async () => {
    owner = await registerUser();
    stranger = await registerUser();
  });

  const create = (body) => owner.auth(api().post('/api/documents')).send(body);

  it('creates a document from the default blueprint of its type', async () => {
    const res = await create({ type: 'BUG_REPORT', title: 'Login fails' });
    expect(res.status).toBe(201);
    const doc = res.body.data;
    expect(doc).toMatchObject({ title: 'Login fails', type: 'BUG_REPORT', latestVersion: 1, isFavorite: false });
    const types = doc.blocks.map((b) => b.type);
    expect(types).toEqual(expect.arrayContaining(['INPUT', 'STEP_GROUP', 'SEVERITY', 'PRIORITY', 'ATTACHMENT', 'COMMENT']));
  });

  it('creates an empty document from scratch with a default title', async () => {
    const res = await create({ type: 'CHECKLIST', blank: true });
    expect(res.body.data.blocks).toEqual([]);
    expect(res.body.data.title).toBe('Чек-лист без названия');
  });

  it('creates a document from a chosen template', async () => {
    const templates = await owner.auth(api().get('/api/templates?docType=TEST_CASE'));
    const apiTemplate = templates.body.data.find((t) => t.name === 'API Test Case');
    const res = await create({ type: 'TEST_CASE', templateId: apiTemplate.id });
    expect(res.body.data.blocks.some((b) => b.content.label === 'Endpoint')).toBe(true);

    const mismatch = await create({ type: 'BUG_REPORT', templateId: apiTemplate.id });
    expect(mismatch.status).toBe(400);
  });

  it('lists, searches and filters own documents only', async () => {
    await create({ type: 'TEST_PLAN', title: 'Release 2.0 plan' });
    await stranger.auth(api().post('/api/documents')).send({ type: 'TEST_PLAN', title: 'Release 2.0 foreign' });

    const search = await owner.auth(api().get('/api/documents?search=release'));
    expect(search.body.data.map((d) => d.title)).toEqual(['Release 2.0 plan']);

    const byType = await owner.auth(api().get('/api/documents?type=TEST_PLAN'));
    expect(byType.body.data.every((d) => d.type === 'TEST_PLAN')).toBe(true);

    const invalid = await owner.auth(api().get('/api/documents?type=NOPE'));
    expect(invalid.status).toBe(400);
  });

  it("hides other users' documents", async () => {
    const { body } = await create({ type: 'CHECKLIST' });
    const res = await stranger.auth(api().get(`/api/documents/${body.data.id}`));
    expect(res.status).toBe(404);
    const del = await stranger.auth(api().delete(`/api/documents/${body.data.id}`));
    expect(del.status).toBe(404);
  });

  it('saves title and the whole block tree', async () => {
    const { body } = await create({ type: 'TEST_LIST', blank: true });
    const section = block('SECTION', { title: 'Auth' });
    const check = block('CHECKBOX', { label: 'Valid login', status: 'passed' }, { parentId: section.id });
    const res = await owner.auth(api().put(`/api/documents/${body.data.id}`)).send({ title: 'Renamed', blocks: [check, section] });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Renamed');

    const doc = (await owner.auth(api().get(`/api/documents/${body.data.id}`))).body.data;
    expect(doc.blocks.map((b) => b.id)).toEqual([section.id, check.id]);
    expect(doc.blocks[1]).toMatchObject({ parentId: section.id, content: { label: 'Valid login', status: 'passed' } });
  });

  it('rejects invalid block structures', async () => {
    const { body } = await create({ type: 'TEST_CASE', blank: true });
    const group = block('STEP_GROUP');
    const res = await owner.auth(api().put(`/api/documents/${body.data.id}`)).send({ blocks: [group, block('TABLE', {}, { parentId: group.id })] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/не может находиться/);
  });

  it('toggles favorites and filters by them', async () => {
    const { body } = await create({ type: 'BUG_REPORT', title: 'Fav doc' });
    await owner.auth(api().post(`/api/documents/${body.data.id}/favorite`));
    const favs = await owner.auth(api().get('/api/documents?favorite=true'));
    expect(favs.body.data.map((d) => d.id)).toContain(body.data.id);
    expect(favs.body.data.every((d) => d.isFavorite)).toBe(true);

    await owner.auth(api().delete(`/api/documents/${body.data.id}/favorite`));
    const after = await owner.auth(api().get('/api/documents?favorite=true'));
    expect(after.body.data.map((d) => d.id)).not.toContain(body.data.id);
  });

  it('duplicates a document with new block ids', async () => {
    const { body } = await create({ type: 'TEST_CASE', title: 'Original' });
    const dup = await owner.auth(api().post(`/api/documents/${body.data.id}/duplicate`));
    expect(dup.status).toBe(201);
    expect(dup.body.data.title).toBe('Original (копия)');
    const copy = (await owner.auth(api().get(`/api/documents/${dup.body.data.id}`))).body.data;
    expect(copy.blocks).toHaveLength(body.data.blocks.length);
    expect(copy.blocks.some((b) => body.data.blocks.some((o) => o.id === b.id))).toBe(false);
  });

  it('deletes a document', async () => {
    const { body } = await create({ type: 'CHECKLIST' });
    expect((await owner.auth(api().delete(`/api/documents/${body.data.id}`))).status).toBe(200);
    expect((await owner.auth(api().get(`/api/documents/${body.data.id}`))).status).toBe(404);
    expect((await owner.auth(api().get(`/api/documents/${randomUUID()}`))).status).toBe(404);
  });
});
