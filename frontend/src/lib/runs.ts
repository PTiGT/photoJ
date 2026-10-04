import type { Block, BlockOf, CheckStatus, RunResult, TestRun } from '@/types';
import { sortDepthFirst } from './blockTree';

/*
 * Test runs of checklists / test lists (mirrors backend/src/domain/runs.js).
 * The first run keeps using the checkbox's own `status`/`comment`, so documents
 * created before runs existed stay valid; other runs live in `results[runId]`.
 */

export const IMPLICIT_RUN: TestRun = { id: 'default', environment: '', date: '', build: '', testType: '' };

export function findRunInfo(blocks: Block[]): BlockOf<'RUN_INFO'> | undefined {
  return sortDepthFirst(blocks).find((b): b is BlockOf<'RUN_INFO'> => b.type === 'RUN_INFO');
}

/** Declared runs, or `null` when the document has no RUN_INFO block. */
export function declaredRuns(blocks: Block[]): TestRun[] | null {
  const runs = findRunInfo(blocks)?.content.runs ?? [];
  return runs.length ? runs : null;
}

export const documentRuns = (blocks: Block[]) => declaredRuns(blocks) ?? [IMPLICIT_RUN];

export function resultFor(check: BlockOf<'CHECKBOX'>, run: TestRun, index: number): RunResult {
  const stored = check.content.results?.[run.id];
  if (stored) return { status: stored.status ?? 'none', comment: stored.comment ?? '' };
  if (index === 0) return { status: check.content.status ?? (check.content.checked ? 'passed' : 'none'), comment: check.content.comment ?? '' };
  return { status: 'none', comment: '' };
}

/** Content patch that stores a run result (first run → own fields, others → results map). */
export function resultPatch(check: BlockOf<'CHECKBOX'>, run: TestRun, index: number, result: RunResult) {
  if (index === 0) {
    const results = { ...check.content.results };
    delete results[run.id];
    return { status: result.status, comment: result.comment ?? '', checked: result.status === 'passed', results };
  }
  return { results: { ...check.content.results, [run.id]: result } };
}

export type RunStats = Record<CheckStatus, number> & { total: number };

export function runStats(blocks: Block[], run: TestRun, index: number): RunStats {
  const checks = blocks.filter((b): b is BlockOf<'CHECKBOX'> => b.type === 'CHECKBOX');
  const stats: RunStats = { passed: 0, failed: 0, blocked: 0, skipped: 0, none: 0, total: checks.length };
  for (const check of checks) stats[resultFor(check, run, index).status] += 1;
  return stats;
}

export const runLabel = (run: TestRun, index: number) => run.environment?.trim() || `Прогон ${index + 1}`;

/**
 * Replaces the run list of a RUN_INFO block and re-maps every check's results,
 * so removing or reordering runs never moves a result to another environment
 * (the first run is stored in the checkbox's own fields).
 */
export function applyRuns(blocks: Block[], runInfoId: string, nextRuns: TestRun[]): Block[] {
  const runInfo = blocks.find((b): b is BlockOf<'RUN_INFO'> => b.id === runInfoId && b.type === 'RUN_INFO');
  if (!runInfo) return blocks;
  const previous = runInfo.content.runs?.length ? runInfo.content.runs : [IMPLICIT_RUN];

  return blocks.map((block) => {
    if (block.id === runInfoId) return { ...runInfo, content: { ...runInfo.content, runs: nextRuns } };
    if (block.type !== 'CHECKBOX') return block;

    const byRun = new Map(previous.map((run, index) => [run.id, resultFor(block, run, index)]));
    const [first, ...others] = nextRuns;
    const firstResult = (first && byRun.get(first.id)) || { status: 'none' as CheckStatus, comment: '' };
    const results: Record<string, RunResult> = {};
    for (const run of others) {
      const result = byRun.get(run.id);
      if (result && (result.status !== 'none' || result.comment)) results[run.id] = result;
    }
    return {
      ...block,
      content: {
        ...block.content,
        status: firstResult.status,
        comment: firstResult.comment ?? '',
        checked: firstResult.status === 'passed',
        results,
      },
    };
  });
}

export const RUN_PRESETS: Record<string, string[]> = {
  'Десктоп-браузеры': ['Google Chrome', 'Safari', 'Firefox', 'Opera', 'Edge'],
  'Мобильные': ['iOS · Safari', 'Android · Chrome'],
  'Стенды': ['dev', 'staging', 'production'],
};

export const TEST_TYPES = ['Smoke', 'MAT', 'AT', 'Sanity', 'Regression', 'Full'];
