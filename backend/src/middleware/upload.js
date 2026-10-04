import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { config } from '../utils/config.js';
import { HttpError } from '../utils/httpError.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED = /^(image\/(png|jpe?g|gif|webp)|application\/(pdf|json|zip|x-zip-compressed)|text\/(plain|csv)|video\/(mp4|webm|quicktime))$/;

export const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.\w]/g, '').slice(0, 10);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.test(file.mimetype)) cb(null, true);
    else cb(HttpError.badRequest('Недопустимый тип файла'));
  },
});
