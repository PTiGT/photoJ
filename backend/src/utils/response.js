/** Unified API envelope: `{ data, error }`. */
export function ok(res, data = null, status = 200) {
  return res.status(status).json({ data, error: null });
}

export function fail(res, error, status = 400) {
  return res.status(status).json({ data: null, error });
}
