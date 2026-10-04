import { randomUUID } from 'node:crypto';

/**
 * Small DSL for describing block trees in a readable nested form.
 * `node('INPUT', { label: 'Title' })`
 * `node('SECTION', { title: 'Auth' }, [node('CHECKBOX', { label: 'Login' })])`
 */
export function node(type, content = {}, children = [], settings = {}) {
  return { type, content, children, settings };
}

/** Converts a nested blueprint into the flat block list persisted in the DB. */
export function flattenBlueprint(nodes, parentId = null) {
  const result = [];
  nodes.forEach((item, order) => {
    const id = randomUUID();
    result.push({ id, type: item.type, order, parentId, content: item.content, settings: item.settings ?? {} });
    if (item.children?.length) result.push(...flattenBlueprint(item.children, id));
  });
  return result;
}

// Shared fragments reused by several blueprints
export const severity = () => node('SEVERITY', { label: 'Severity', value: '' });
export const priority = () => node('PRIORITY', { label: 'Priority', value: '' });
export const environment = (items) =>
  node('ENVIRONMENT', { label: 'Environment', items: items.map(([key, value = '']) => ({ key, value })) });
export const steps = (title, count = 3) =>
  node(
    'STEP_GROUP',
    { title },
    Array.from({ length: count }, () => node('STEP', { action: '', expected: '' })),
  );
export const check = (label, children = []) =>
  node('CHECKBOX', { label, checked: false, status: 'none', comment: '' }, children);
export const section = (title, children = [], description = '') =>
  node('SECTION', { title, description }, children);
export const textarea = (label, placeholder = '') => node('TEXTAREA', { label, value: '', placeholder });

/** RUN_INFO block: runs become status columns in the checklist table / Excel export. */
export const runInfo = (runs = [{}], project = '') =>
  node('RUN_INFO', {
    project,
    tester: '',
    runs: runs.map((run, i) => ({ id: `run-${i + 1}`, environment: '', date: '', build: '', testType: '', ...run })),
  });

/** Check with extra columns used by regression sheets (test type, requirement). */
export const checkWith = (label, extra = {}) => node('CHECKBOX', { label, checked: false, status: 'none', comment: '', ...extra });
