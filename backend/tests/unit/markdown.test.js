import { describe, expect, it } from 'vitest';
import { buildExportModel, groupStepRuns } from '../../src/services/export/model.js';
import { renderMarkdown } from '../../src/services/export/markdownRenderer.js';
import { contentDisposition } from '../../src/services/export/exportService.js';
import { normalizeBlocks } from '../../src/domain/blockTree.js';
import { block } from '../helpers.js';

function render(blocks) {
  const doc = { title: 'Doc | pipes', type: 'TEST_CASE', updatedAt: new Date('2026-09-30T10:00:00Z'), latestVersion: 3 };
  return renderMarkdown(buildExportModel(doc, normalizeBlocks(blocks), { baseUrl: 'http://host' }));
}

describe('markdown renderer', () => {
  it('renders title, type and version header', () => {
    const md = render([]);
    expect(md.startsWith('# Doc | pipes')).toBe(true);
    expect(md).toContain('**Тип:** Тест-кейс');
    expect(md).toContain('**Версия:** 3');
  });

  it('renders step groups as a numbered table and escapes pipes', () => {
    const group = block('STEP_GROUP', { title: 'Steps' });
    const md = render([
      group,
      block('STEP', { action: 'Open | login', expected: 'Form shown' }, { parentId: group.id, order: 0 }),
      block('STEP', { action: 'Submit', expected: '' }, { parentId: group.id, order: 1 }),
    ]);
    expect(md).toContain('| # | Действие | Ожидаемый результат |');
    expect(md).toContain('| 1 | Open \\| login | Form shown |');
    expect(md).toContain('| 2 | Submit | — |');
  });

  it('renders nested checklist items with statuses and comments', () => {
    const parent = block('CHECKBOX', { label: 'Parent', status: 'failed', comment: 'Broken' });
    const md = render([parent, block('CHECKBOX', { label: 'Child', checked: true }, { parentId: parent.id })]);
    expect(md).toContain('- [ ] Parent — ❌ Failed');
    expect(md).toContain('  > Broken');
    expect(md).toContain('  - [x] Child');
  });

  it('renders fields and absolute attachment links', () => {
    const md = render([
      block('SEVERITY', { label: 'Severity', value: 'Critical' }),
      block('ATTACHMENT', { label: 'Files', files: [{ id: 'a', name: 'log.txt', size: 2048, url: '/uploads/x.txt' }] }),
    ]);
    expect(md).toContain('**Severity:** Critical');
    expect(md).toContain('[log.txt](http://host/uploads/x.txt) · 2.0 КБ');
  });
});

describe('groupStepRuns', () => {
  it('groups consecutive steps only', () => {
    const units = groupStepRuns([{ type: 'STEP' }, { type: 'STEP' }, { type: 'TEXT' }, { type: 'STEP' }]);
    expect(units.map((u) => (u.type === 'STEP_RUN' ? u.steps.length : u.type))).toEqual([2, 'TEXT', 1]);
  });
});

describe('contentDisposition', () => {
  it('provides ASCII fallback and UTF-8 filename', () => {
    const header = contentDisposition('Баг: логин/пароль', 'pdf');
    expect(header).toContain('filename="___  _____ ______.pdf"');
    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('Баг  логин пароль.pdf')}`);
  });
});
