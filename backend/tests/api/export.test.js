import { describe, expect, it, beforeAll } from 'vitest';
import { api, registerUser } from '../helpers.js';

const binary = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('export API', () => {
  let user;
  let doc;

  beforeAll(async () => {
    user = await registerUser();
    doc = (await user.auth(api().post('/api/documents')).send({ type: 'BUG_REPORT', title: 'Экспорт бага' })).body.data;
  });

  it('exports PDF', async () => {
    const res = await user.auth(api().post(`/api/documents/${doc.id}/export/pdf`)).buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(encodeURIComponent('Экспорт бага.pdf'));
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('exports Markdown', async () => {
    const res = await user.auth(api().post(`/api/documents/${doc.id}/export/markdown`));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/markdown/);
    expect(res.text).toContain('# Экспорт бага');
    expect(res.text).toContain('| # | Действие | Ожидаемый результат |');
  });

  it('exports DOCX and JSON', async () => {
    const docx = await user.auth(api().post(`/api/documents/${doc.id}/export/docx`)).buffer(true).parse(binary);
    expect(docx.status).toBe(200);
    expect(docx.body.subarray(0, 2).toString()).toBe('PK');

    const json = await user.auth(api().post(`/api/documents/${doc.id}/export/json`)).buffer(true).parse(binary);
    const parsed = JSON.parse(json.body.toString('utf8'));
    expect(parsed).toMatchObject({ format: 'qa-builder/v1', title: 'Экспорт бага', type: 'BUG_REPORT' });
  });

  it('rejects unknown formats and foreign documents', async () => {
    expect((await user.auth(api().post(`/api/documents/${doc.id}/export/odt`))).status).toBe(400);
    const other = await registerUser();
    const res = await other.auth(api().post(`/api/documents/${doc.id}/export/pdf`));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Документ не найден');
  });
});

describe('excel export API', () => {
  const binaryParser = (res, cb) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  };

  it('exports one document and several documents to xlsx', async () => {
    const user = await registerUser();
    const create = (body) => user.auth(api().post('/api/documents')).send(body).then((r) => r.body.data);
    const checklist = await create({ type: 'CHECKLIST', title: 'Smoke чек-лист' });
    const testCase = await create({ type: 'TEST_CASE', title: 'Кейс 1' });

    const single = await user.auth(api().post(`/api/documents/${checklist.id}/export/xlsx`)).buffer(true).parse(binaryParser);
    expect(single.status).toBe(200);
    expect(single.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(single.body.subarray(0, 2).toString()).toBe('PK');

    const bulk = await user.auth(api().post('/api/documents/export/xlsx')).send({ ids: [checklist.id, testCase.id] }).buffer(true).parse(binaryParser);
    expect(bulk.status).toBe(200);
    expect(bulk.headers['content-disposition']).toContain(encodeURIComponent('QA Builder — экспорт (2).xlsx'));
  });

  it('validates bulk export requests', async () => {
    const user = await registerUser();
    const other = await registerUser();
    const foreign = (await other.auth(api().post('/api/documents')).send({ type: 'CHECKLIST' })).body.data;
    expect((await user.auth(api().post('/api/documents/export/xlsx')).send({ ids: [] })).status).toBe(400);
    expect((await user.auth(api().post('/api/documents/export/pdf')).send({ ids: [foreign.id] })).status).toBe(400);
    expect((await user.auth(api().post('/api/documents/export/xlsx')).send({ ids: [foreign.id] })).status).toBe(404);
  });
});
