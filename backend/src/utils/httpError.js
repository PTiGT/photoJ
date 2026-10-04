/** Error carrying an HTTP status; message is safe to show to the user. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }

  static badRequest(message = 'Некорректный запрос') {
    return new HttpError(400, message);
  }

  static unauthorized(message = 'Требуется авторизация') {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Недостаточно прав') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Не найдено') {
    return new HttpError(404, message);
  }

  static conflict(message = 'Конфликт данных') {
    return new HttpError(409, message);
  }
}
