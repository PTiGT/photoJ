import { describe, expect, it } from 'vitest';
import type { Block, BlockOf } from '@/types';
import { applyRuns, declaredRuns, resultFor, resultPatch, runStats } from './runs';
import { buildChecklistTable, levelSpans } from './checklistTable';

const runInfo = (runs: { id: string; environment: string }[]): Block =>
  ({ id: 'info', type: 'RUN_INFO', parentId: null, order: 0, content: { project: 'P', runs }, settings: {} }) as Block;
const section = (id: string, title: string, parentId: string | null = null, order = 1): Block =>
  ({ id, type: 'SECTION', parentId, order, content: { title }, settings: {} }) as Block;
const check = (id: string, parentId: string | null, content: BlockOf<'CHECKBOX'>['content'], order = 0): BlockOf<'CHECKBOX'> => ({
  id,
  type: 'CHECKBOX',
  parentId,
  order,
  content,
  settings: {},
});

const chrome = { id: 'chrome', environment: 'Chrome' };
const safari = { id: 'safari', environment: 'Safari' };
const firefox = { id: 'firefox', environment: 'Firefox' };

describe('runs', () => {
  it('reads results: first run from own fields, others from the map', () => {
    const c = check('c', null, { status: 'passed', results: { safari: { status: 'failed', comment: 'x' } } });
    expect(resultFor(c, chrome, 0).status).toBe('passed');
    expect(resultFor(c, safari, 1)).toEqual({ status: 'failed', comment: 'x' });
    expect(resultFor(c, firefox, 2).status).toBe('none');
  });

  it('writes results to the right place', () => {
    const c = check('c', null, { status: 'none' });
    expect(resultPatch(c, chrome, 0, { status: 'failed' })).toMatchObject({ status: 'failed', checked: false });
    expect(resultPatch(c, safari, 1, { status: 'passed' })).toEqual({ results: { safari: { status: 'passed' } } });
  });

  it('keeps each environment result when the first run is removed', () => {
    const blocks: Block[] = [
      runInfo([chrome, safari, firefox]),
      check('c', null, { status: 'passed', comment: 'ok in chrome', results: { safari: { status: 'failed' }, firefox: { status: 'blocked' } } }, 1),
    ];
    const next = applyRuns(blocks, 'info', [safari, firefox]);
    const c = next.find((b) => b.id === 'c') as BlockOf<'CHECKBOX'>;
    expect(resultFor(c, safari, 0).status).toBe('failed');
    expect(resultFor(c, firefox, 1).status).toBe('blocked');
    expect(c.content.results).toEqual({ firefox: { status: 'blocked', comment: '' } });
    expect(declaredRuns(next)?.map((r) => r.id)).toEqual(['safari', 'firefox']);
  });

  it('counts statistics per run', () => {
    const blocks: Block[] = [
      runInfo([chrome, safari]),
      check('a', null, { status: 'passed', results: { safari: { status: 'failed' } } }, 1),
      check('b', null, { status: 'passed' }, 2),
    ];
    expect(runStats(blocks, chrome, 0)).toMatchObject({ passed: 2, total: 2 });
    expect(runStats(blocks, safari, 1)).toMatchObject({ failed: 1, none: 1 });
  });
});

describe('checklist table', () => {
  it('builds Module › Submodule rows with merged spans and per-run columns', () => {
    const blocks: Block[] = [
      runInfo([chrome, safari]),
      section('m', 'Registration'),
      section('s1', 'Phone', 'm', 0),
      section('s2', 'Email', 'm', 1),
      check('c1', 's1', { label: 'Existing phone', requirement: 'REG-1' }),
      check('c2', 's1', { label: 'Letters', status: 'failed' }, 1),
      check('c3', 's2', { label: 'Valid email', bugId: 'BUG-7' }),
    ];
    const table = buildChecklistTable(blocks, { title: 'Doc', formatDate: () => '01.01.2026' });
    expect(table.columns.map((c) => c.kind)).toEqual(['req', 'level', 'level', 'summary', 'status', 'status', 'bug']);
    expect(table.rows.map((r) => r.text)).toEqual(['Existing phone', 'Letters', 'Valid email']);
    expect(levelSpans(table.rows, 0)).toEqual([{ id: 'm', title: 'Registration', start: 0, length: 3 }]);
    expect(levelSpans(table.rows, 1).map((s) => [s.title, s.length])).toEqual([
      ['Phone', 2],
      ['Email', 1],
    ]);
    expect(table.stats[0]).toMatchObject({ failed: 1, none: 2, total: 3 });
    expect(table.meta.find((m) => m.label === 'Environment')?.values).toEqual(['Chrome', 'Safari']);
  });
});
