import type { Block } from '@/types';
import { CommentEditor, HeadingEditor, TextEditor } from './TextEditors';
import { ChoiceEditor, InputEditor, PriorityEditor, SeverityEditor, TextareaEditor } from './FieldEditors';
import { EnvironmentEditor, SectionHeaderEditor, StepEditor, TableEditor } from './StructureEditors';
import { CheckboxEditor } from './CheckboxEditor';
import { AttachmentEditor, ImageEditor } from './MediaEditors';
import { RunInfoEditor } from './RunInfoEditor';

/** Renders the inline editor for a block. Container children are rendered by the canvas. */
export function BlockEditor({ block }: { block: Block }) {
  switch (block.type) {
    case 'HEADING':
      return <HeadingEditor block={block} />;
    case 'TEXT':
      return <TextEditor block={block} />;
    case 'COMMENT':
      return <CommentEditor block={block} />;
    case 'INPUT':
      return <InputEditor block={block} />;
    case 'TEXTAREA':
      return <TextareaEditor block={block} />;
    case 'SELECT':
    case 'RADIO':
    case 'STATUS':
      return <ChoiceEditor block={block} />;
    case 'SEVERITY':
      return <SeverityEditor block={block} />;
    case 'PRIORITY':
      return <PriorityEditor block={block} />;
    case 'CHECKBOX':
      return <CheckboxEditor block={block} />;
    case 'STEP':
      return <StepEditor block={block} />;
    case 'STEP_GROUP':
      return null; // title is edited in the card header, steps are children
    case 'SECTION':
      return <SectionHeaderEditor block={block} />;
    case 'TABLE':
      return <TableEditor block={block} />;
    case 'ENVIRONMENT':
      return <EnvironmentEditor block={block} />;
    case 'IMAGE':
      return <ImageEditor block={block} />;
    case 'ATTACHMENT':
      return <AttachmentEditor block={block} />;
    case 'RUN_INFO':
      return <RunInfoEditor block={block} />;
  }
}
