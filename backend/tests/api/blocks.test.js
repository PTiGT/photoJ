import { describe, expect, it, beforeEach } from 'vitest';
import { api, block, registerUser } from '../helpers.js';

describe('blocks API', () => {
  let user;
  let docId;

  beforeEach(async () => {
    user = await registerUser();
    const res = await user.auth(api().post('/api/documents')).send({ type: 'TEST_CASE', blank: true });
    docId = res.body.data.id;
  });

  const blocks = async () => (await user.auth(api().get(`/api/documents/${docId}`))).body.data.blocks;

  it('adds blocks at the requested position', async () => {
    const first = await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'TEXT', content: { text: 'first' } });
    expect(first.status).toBe(201);
    await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'HEADING', order: 0, content: { text: 'Top', level: 1 } });
    expect((await blocks()).map((b) => b.type)).toEqual(['HEADING', 'TEXT']);
  });

  it('adds a step into a step group and rejects invalid nesting', async () => {
    const group = (await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'STEP_GROUP' })).body.data;
    const step = await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'STEP', parentId: group.id, content: { action: 'Click' } });
    expect(step.status).toBe(201);
    expect(step.body.data.parentId).toBe(group.id);

    const invalid = await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'TEXT', parentId: group.id });
    expect(invalid.status).toBe(400);
  });

  it('updates block content with a merge', async () => {
    const created = (await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'INPUT', content: { label: 'Title', value: '' } })).body.data;
    const res = await user.auth(api().put(`/api/documents/${docId}/blocks/${created.id}`)).send({ content: { value: 'Hello' }, settings: { required: true } });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ content: { label: 'Title', value: 'Hello' }, settings: { required: true } });
  });

  it('deletes a block with its children and compacts orders', async () => {
    const section = (await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'SECTION' })).body.data;
    await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'CHECKBOX', parentId: section.id });
    const text = (await user.auth(api().post(`/api/documents/${docId}/blocks`)).send({ type: 'TEXT' })).body.data;

    const res = await user.auth(api().delete(`/api/documents/${docId}/blocks/${section.id}`));
    expect(res.status).toBe(200);
    const remaining = await blocks();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ id: text.id, order: 0 });
  });

  it('reorders and re-parents blocks', async () => {
    const a = block('TEXT', { text: 'a' });
    const b = block('TEXT', { text: 'b' });
    const section = block('SECTION', { title: 's' });
    await user.auth(api().put(`/api/documents/${docId}`)).send({ blocks: [a, { ...b, order: 1 }, { ...section, order: 2 }] });

    const res = await user.auth(api().put(`/api/documents/${docId}/blocks/reorder`)).send({
      items: [
        { id: section.id, parentId: null, order: 0 },
        { id: b.id, parentId: section.id, order: 0 },
        { id: a.id, parentId: null, order: 1 },
      ],
    });
    expect(res.status).toBe(200);
    const after = await blocks();
    expect(after.map((x) => x.content.text ?? x.content.title)).toEqual(['s', 'b', 'a']);
    expect(after[1].parentId).toBe(section.id);
  });

  it('refuses reordering into a cycle', async () => {
    const outer = block('SECTION');
    const inner = block('SECTION', {}, { parentId: outer.id });
    await user.auth(api().put(`/api/documents/${docId}`)).send({ blocks: [outer, inner] });
    const res = await user.auth(api().put(`/api/documents/${docId}/blocks/reorder`)).send({ items: [{ id: outer.id, parentId: inner.id, order: 0 }] });
    expect(res.status).toBe(400);
  });
});
