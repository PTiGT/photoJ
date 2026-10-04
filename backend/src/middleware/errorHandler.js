import multer from 'multer';
import { fail } from '../utils/response.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  fail(res, `Маршрут ${req.method} ${req.path} не найден`, 404);
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return fail(res, err.message, err.status);
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Файл слишком большой (максимум 10 МБ)' : 'Ошибка загрузки файла';
    return fail(res, message, 400);
  }
  if (err?.type === 'entity.too.large') return fail(res, 'Слишком большой запрос', 413);
  if (err?.type === 'entity.parse.failed') return fail(res, 'Некорректный JSON', 400);
  if (err?.code === 'P2025') return fail(res, 'Не найдено', 404);

  console.error(err);
  return fail(res, 'Внутренняя ошибка сервера', 500);
}
