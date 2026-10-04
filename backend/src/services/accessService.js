import { documentRepository } from '../repositories/documentRepository.js';
import { HttpError } from '../utils/httpError.js';

/** Loads a document and ensures the user owns it (404 for foreign docs to avoid leaking ids). */
export async function getOwnedDocument(user, documentId) {
  const document = await documentRepository.findById(documentId);
  if (!document || document.ownerId !== user.id) throw HttpError.notFound('Документ не найден');
  return document;
}
