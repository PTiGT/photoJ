import { versionRepository } from '../repositories/versionRepository.js';
import { getOwnedDocument } from './accessService.js';
import { HttpError } from '../utils/httpError.js';

/** Autosave creates a version at most once per this interval; manual save always does. */
export const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000;

/** JSON with sorted keys — JSONB does not preserve key order, so plain stringify can't compare snapshots. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

const fingerprint = (title, blocks) =>
  canonical({ title, blocks: blocks.map(({ id, type, parentId, order, content, settings }) => ({ id, type, parentId: parentId ?? null, order, content, settings })) });

export const versionService = {
  /**
   * Creates a snapshot version if it differs from the latest one.
   * `force` = manual save; otherwise only when the latest version is old enough.
   */
  async snapshot(db, { documentId, authorId, title, blocks, force }) {
    const latest = await versionRepository.latest(documentId, db);
    if (latest && fingerprint(latest.title, latest.snapshot) === fingerprint(title, blocks)) return latest;
    if (latest && !force && Date.now() - latest.createdAt.getTime() < AUTO_VERSION_INTERVAL_MS) return latest;

    return versionRepository.create(
      { documentId, authorId, title, snapshot: blocks, number: (latest?.number ?? 0) + 1 },
      db,
    );
  },

  async list(user, documentId) {
    await getOwnedDocument(user, documentId);
    const versions = await versionRepository.list(documentId);
    return versions.map(({ author, ...version }) => ({ ...version, authorName: author?.name ?? null }));
  },

  async get(user, documentId, versionId) {
    await getOwnedDocument(user, documentId);
    const version = await versionRepository.findById(documentId, versionId);
    if (!version) throw HttpError.notFound('Версия не найдена');
    return { id: version.id, number: version.number, title: version.title, createdAt: version.createdAt, blocks: version.snapshot };
  },
};
