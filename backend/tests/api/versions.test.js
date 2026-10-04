import { describe, expect, it } from 'vitest';
import { api, block, registerUser } from '../helpers.js';

describe('versions API', () => {
  it('creates version 1 on creation and a new version on manual save', async () => {
    const user = await registerUser();
    const doc = (await user.auth(api().post('/api/documents')).send({ type: 'TEST_CASE', blank: true, title: 'V' })).body.data;
    expect(doc.latestVersion).toBe(1);

    // Autosave within the interval does not create a version
    const auto = await user.auth(api().put(`/api/documents/${doc.id}`)).send({ blocks: [block('TEXT', { text: 'draft' })] });
    expect(auto.body.data.latestVersion).toBe(1);

    const manual = await user.auth(api().put(`/api/documents/${doc.id}`)).send({ title: 'V2', blocks: [block('TEXT', { text: 'final' })], createVersion: true });
    expect(manual.body.data.latestVersion).toBe(2);

    // Saving identical content again does not duplicate the version
    const same = (await user.auth(api().get(`/api/documents/${doc.id}`))).body.data;
    const again = await user.auth(api().put(`/api/documents/${doc.id}`)).send({ title: 'V2', blocks: same.blocks, createVersion: true });
    expect(again.body.data.latestVersion).toBe(2);

    const list = await user.auth(api().get(`/api/documents/${doc.id}/versions`));
    expect(list.body.data.map((v) => v.number)).toEqual([2, 1]);
    expect(list.body.data[0]).toMatchObject({ title: 'V2', authorName: 'Test User' });

    const v1 = await user.auth(api().get(`/api/documents/${doc.id}/versions/${list.body.data[1].id}`));
    expect(v1.body.data).toMatchObject({ number: 1, title: 'V', blocks: [] });
    const v2 = await user.auth(api().get(`/api/documents/${doc.id}/versions/${list.body.data[0].id}`));
    expect(v2.body.data.blocks[0].content.text).toBe('final');
  });

  it("doesn't expose versions of foreign documents", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const doc = (await owner.auth(api().post('/api/documents')).send({ type: 'CHECKLIST' })).body.data;
    expect((await other.auth(api().get(`/api/documents/${doc.id}/versions`))).status).toBe(404);
  });
});
