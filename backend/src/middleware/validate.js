import { HttpError } from '../utils/httpError.js';

/**
 * Validates `req[source]` against a zod schema and replaces it with the parsed value.
 * Express 5 exposes `req.query` as a getter, so parsed query goes to `req.validatedQuery`.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.join('.');
      throw HttpError.badRequest(field ? `${field}: ${issue.message}` : issue.message);
    }
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
}
