import { describe, expect, it } from 'vitest';
import { api, registerUser } from '../helpers.js';

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

describe('attachments API', () => {
  it('uploads an image and serves it', async () => {
    const user = await registerUser();
    const doc = (await user.auth(api().post('/api/documents')).send({ type: 'BUG_REPORT', blank: true })).body.data;
    const res = await user.auth(api().post(`/api/documents/${doc.id}/attachments`)).attach('file', PNG, { filename: 'скрин.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'скрин.png', size: PNG.length, mimeType: 'image/png' });
    const file = await api().get(res.body.data.url);
    expect(file.status).toBe(200);
  });

  it('rejects disallowed file types', async () => {
    const user = await registerUser();
    const doc = (await user.auth(api().post('/api/documents')).send({ type: 'BUG_REPORT', blank: true })).body.data;
    const res = await user.auth(api().post(`/api/documents/${doc.id}/attachments`)).attach('file', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Недопустимый тип файла');
  });
});
