import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../utils/config.js';
import { attachmentRepository } from '../repositories/attachmentRepository.js';
import { getOwnedDocument } from './accessService.js';
import { HttpError } from '../utils/httpError.js';

export const attachmentService = {
  async upload(user, documentId, file) {
    if (!file) throw HttpError.badRequest('Файл не передан');
    try {
      await getOwnedDocument(user, documentId);
    } catch (error) {
      await fs.rm(file.path, { force: true });
      throw error;
    }
    const attachment = await attachmentRepository.create({
      documentId,
      uploaderId: user.id,
      // multer decodes multipart filenames as latin1
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      mimeType: file.mimetype,
      size: file.size,
      storageKey: file.filename,
    });
    return toDto(attachment);
  },

  /** Absolute path of a stored file (used by exporters to embed images). */
  resolvePath(storageKey) {
    return path.join(config.uploadDir, path.basename(storageKey));
  },
};

export function toDto(attachment) {
  return {
    id: attachment.id,
    name: attachment.fileName,
    size: attachment.size,
    mimeType: attachment.mimeType,
    url: `/uploads/${attachment.storageKey}`,
  };
}
