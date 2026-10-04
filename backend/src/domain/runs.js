/*
 * Test runs (environments) of checklists and test lists.
 * A RUN_INFO block declares the runs; every CHECKBOX stores one result per run.
 * The first run keeps using the checkbox's own `status`/`comment` so documents
 * created before runs existed stay valid; other runs live in `results[runId]`.
 */

export const IMPLICIT_RUN_ID = 'default';

/** The first RUN_INFO block in document order (blocks must be depth-first sorted). */
export function findRunInfo(blocks) {
  return blocks.find((block) => block.type === 'RUN_INFO') ?? null;
}

/** Runs declared by the document, or one implicit run when there is no RUN_INFO. */
export function documentRuns(blocks) {
  const runs = findRunInfo(blocks)?.content?.runs ?? [];
  return runs.length ? runs : [{ id: IMPLICIT_RUN_ID, environment: '', date: '', build: '', testType: '' }];
}

/** Result of a check for a run: `{ status, comment }`. */
export function resultFor(check, run, index) {
  const content = check.content ?? {};
  const stored = content.results?.[run.id];
  if (stored) return { status: stored.status ?? 'none', comment: stored.comment ?? '' };
  if (index === 0) return { status: content.status ?? (content.checked ? 'passed' : 'none'), comment: content.comment ?? '' };
  return { status: 'none', comment: '' };
}

/** Counts per status for a run over the given checks. */
export function runStats(checks, run, index) {
  const stats = { passed: 0, failed: 0, blocked: 0, skipped: 0, none: 0, total: checks.length };
  for (const check of checks) stats[resultFor(check, run, index).status] += 1;
  return stats;
}
