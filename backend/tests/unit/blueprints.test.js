import { describe, expect, it } from 'vitest';
import { BLUEPRINTS } from '../../src/domain/blueprints/index.js';
import { flattenBlueprint } from '../../src/domain/blueprints/builder.js';
import { normalizeBlocks } from '../../src/domain/blockTree.js';
import { DOCUMENT_TYPES } from '../../src/domain/documentTypes.js';

describe('blueprints', () => {
  it.each(BLUEPRINTS.map((bp) => [bp.docType, bp.name, bp]))('%s / %s is a valid block tree', (_type, _name, bp) => {
    expect(() => normalizeBlocks(flattenBlueprint(bp.blocks))).not.toThrow();
  });

  it('every document type has exactly one default template', () => {
    for (const type of DOCUMENT_TYPES) {
      expect(BLUEPRINTS.filter((bp) => bp.docType === type && bp.isDefault)).toHaveLength(1);
    }
  });

  it('bug report default contains the required sections', () => {
    const bug = BLUEPRINTS.find((bp) => bp.docType === 'BUG_REPORT' && bp.isDefault);
    const labels = flattenBlueprint(bug.blocks).map((b) => b.content.label ?? b.content.title);
    for (const expected of ['Title', 'Description', 'Environment', 'Preconditions', 'Steps to Reproduce', 'Actual Result', 'Expected Result', 'Severity', 'Priority', 'Attachments']) {
      expect(labels).toContain(expected);
    }
  });

  it('test case default has 3 steps inside a step group', () => {
    const tc = BLUEPRINTS.find((bp) => bp.docType === 'TEST_CASE' && bp.isDefault);
    const blocks = flattenBlueprint(tc.blocks);
    const group = blocks.find((b) => b.type === 'STEP_GROUP');
    expect(blocks.filter((b) => b.parentId === group.id && b.type === 'STEP')).toHaveLength(3);
  });
});
