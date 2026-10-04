import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { renderWorkbook } from '../../src/services/export/xlsx/workbook.js';
import { buildChecklistTable } from '../../src/services/export/checklistTable.js';
import { normalizeBlocks, sortDepthFirst } from '../../src/domain/blockTree.js';
import { flattenBlueprint, node, runInfo, section, steps } from '../../src/domain/blueprints/builder.js';
import { resultFor } from '../../src/domain/runs.js';

const ctx = { absoluteUrl: (u) => u, ownerName: 'Анна' };
const doc = (type, title, blueprint) => ({
  type,
  title,
  updatedAt: new Date('2026-09-30T10:00:00Z'),
  latestVersion: 1,
  blocks: sortDepthFirst(normalizeBlocks(flattenBlueprint(blueprint))),
});

async function read(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

const checklist = () =>
  doc('CHECKLIST', 'Регистрация', [
    runInfo([{ environment: 'Chrome', build: '1.0' }, { environment: 'Safari', build: '1.0' }], 'Aliexpress'),
    section('Registration', [
      section('Via email', [
        section('Email', [
          node('CHECKBOX', { label: 'Valid email', status: 'passed', results: { 'run-2': { status: 'failed', comment: 'Safari bug' } }, bugId: 'BUG-1' }),
          node('CHECKBOX', { label: 'Empty email', status: 'blocked' }),
        ]),
      ]),
      section('Policy', []),
    ]),
  ]);

describe('run results', () => {
  it('keeps the first run in own fields and others in results', () => {
    const check = { content: { status: 'passed', results: { b: { status: 'failed' } } } };
    expect(resultFor(check, { id: 'a' }, 0).status).toBe('passed');
    expect(resultFor(check, { id: 'b' }, 1).status).toBe('failed');
    expect(resultFor(check, { id: 'c' }, 2).status).toBe('none');
  });
});

describe('checklist table model', () => {
  it('builds hierarchy columns, per-run statuses and stats', () => {
    const table = buildChecklistTable(checklist(), { formatDate: () => '30.09.2026', ownerName: 'Анна' });
    expect(table.columns.map((c) => c.kind)).toEqual(['level', 'level', 'level', 'summary', 'status', 'status', 'comment', 'bug']);
    expect(table.rows.map((r) => r.text)).toEqual(['Valid email', 'Empty email', '']); // empty "Policy" section keeps a row
    expect(table.stats[0]).toMatchObject({ passed: 1, blocked: 1, total: 2 });
    expect(table.stats[1]).toMatchObject({ failed: 1, none: 1 });
    expect(table.meta.find((m) => m.label === 'Tester').values).toEqual(['Анна']);
    expect(table.meta.find((m) => m.label === 'Build').merged).toBe(true);
  });
});

describe('xlsx export', () => {
  it('renders a checklist sheet like the classic QA spreadsheet', async () => {
    const workbook = await read(await renderWorkbook([checklist()], ctx));
    const ws = workbook.getWorksheet('Регистрация');
    expect(ws).toBeTruthy();

    const header = ws.getRow(12).values.slice(1);
    expect(header).toEqual(['Module', 'Submodule', 'Element/function', 'Summary', 'Status', 'Status', 'Comment', 'BUG ID']);
    expect(ws.getCell('A1').value).toBe('Project');
    expect(ws.getCell('E1').value).toBe('Aliexpress');
    expect(ws.getCell('E5').value).toBe('Chrome');
    expect(ws.getCell('F5').value).toBe('Safari');

    // data rows: merged Module/Submodule cells, statuses per run
    expect(ws.getCell('A13').value).toBe('Registration');
    expect(ws.getCell('A15').master.address).toBe('A13');
    expect(ws.getCell('D13').value).toBe('Valid email');
    expect(ws.getCell('E13').value).toBe('passed');
    expect(ws.getCell('F13').value).toBe('failed');
    expect(ws.getCell('G13').value).toBe('Safari bug');
    expect(ws.getCell('H13').value).toBe('BUG-1');
    expect(ws.getCell('E14').value).toBe('blocked');
    expect(ws.getCell('E13').fill.fgColor.argb).toBe('FFB6D7A8');
    expect(ws.getCell('E13').dataValidation.formulae[0]).toContain('passed');

    // live statistics
    expect(ws.getCell('E6').value.formula).toContain('COUNTIF(E13:E15,"passed")');
    expect(ws.getCell('E6').value.result).toBeCloseTo(0.5);
  });

  it('puts all test cases in one table sheet', async () => {
    const testCase = (title, action) =>
      doc('TEST_CASE', title, [
        node('INPUT', { label: 'Title', value: title }),
        node('TEXTAREA', { label: 'Preconditions', value: 'User exists' }),
        node('TEXTAREA', { label: 'Test Data', value: 'test@gmail.com' }),
        { ...steps('Steps', 0), children: [node('STEP', { action, expected: 'OK' }), node('STEP', { action: 'Log out', expected: 'Logged out' })] },
      ]);
    const workbook = await read(await renderWorkbook([testCase('Login', 'Open /login'), testCase('Register', 'Open /register')], ctx));
    const ws = workbook.getWorksheet('Test Cases');
    expect(ws.getRow(1).values.slice(1, 7)).toEqual(['ID', 'Summary', 'Pre-conditions', 'Test data', 'Steps', 'Expected results']);
    expect(ws.getRow(2).values.slice(1, 7)).toEqual([1, 'Login', 'User exists', 'test@gmail.com', '1. Open /login\n2. Log out', '1. OK\n2. Logged out']);
    expect(ws.getCell('B3').value).toBe('Register');
  });

  it('combines document types into separate sheets', async () => {
    const plan = doc('TEST_PLAN', 'План', [node('TEXTAREA', { label: 'Цель', value: 'Проверить релиз' })]);
    const bug = doc('BUG_REPORT', 'Баг', [node('INPUT', { label: 'Title', value: 'Crash' }), node('SEVERITY', { value: 'Critical' })]);
    const workbook = await read(await renderWorkbook([checklist(), plan, bug], ctx));
    expect(workbook.worksheets.map((w) => w.name)).toEqual(['Регистрация', 'План', 'Баг']);
    expect(workbook.getWorksheet('Баг').getRow(2).values.slice(1, 5)).toEqual([1, 'Crash', undefined, 'Critical']);
  });
});
