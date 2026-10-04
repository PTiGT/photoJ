import { describe, expect, it, vi } from 'vitest';
import { fail, ok } from '../../src/utils/response.js';

function mockRes() {
  const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
  return res;
}

describe('response helpers', () => {
  it('ok() wraps data with error: null', () => {
    const res = mockRes();
    ok(res, { a: 1 }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: { a: 1 }, error: null });
  });

  it('fail() wraps error with data: null', () => {
    const res = mockRes();
    fail(res, 'Нет доступа', 403);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ data: null, error: 'Нет доступа' });
  });
});
