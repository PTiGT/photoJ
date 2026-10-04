import { useRef, useState } from 'react';
import { Check, MessageSquarePlus, Tags } from 'lucide-react';
import type { BlockContentMap, CheckStatus, RunResult, TestRun } from '@/types';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { IconButton } from '@/components/ui/Button';
import { Menu, useMenu } from '@/components/ui/Menu';
import { Popover } from '@/components/ui/Popover';
import { useIsHovered } from '@/features/builder/hoverStore';
import { useBuilderStore } from '@/features/builder/store';
import { CHECK_STATUSES, CHECK_STATUS_META } from '@/lib/qaValues';
import { IMPLICIT_RUN, TEST_TYPES, resultFor, resultPatch, runLabel } from '@/lib/runs';
import { cn } from '@/lib/utils';
import { useBlockRenderContext } from './context';
import { useUpdate, type EditorProps } from './shared';

/** "Windows 11 · Google Chrome" → "Google Chrome" (pills need short names). */
const shortLabel = (run: TestRun, index: number) => {
  const label = runLabel(run, index);
  const last = label.split('·').pop()!.trim();
  return last.length > 16 ? `${last.slice(0, 15)}…` : last;
};

function RunStatusPill({ run, index, result, onChange }: { run: TestRun; index: number; result: RunResult; onChange: (result: RunResult) => void }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const meta = CHECK_STATUS_META[result.status];
  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="run-status"
        title={`${runLabel(run, index)}: ${result.status === 'none' ? 'не проверено' : meta.label}${result.comment ? ` — ${result.comment}` : ''}`}
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 transition',
          result.status === 'none' ? 'text-subtle ring-line hover:text-fg hover:ring-line-strong' : cn(meta.tone, 'ring-transparent'),
        )}
      >
        <span className={cn('size-1.5 rounded-full', meta.dot)} />
        {shortLabel(run, index)}
        {result.comment && <span className="text-[10px] opacity-70">💬</span>}
      </button>
      <Popover anchor={open ? anchor.current : null} onClose={() => setOpen(false)} label={`Результат: ${runLabel(run, index)}`} className="w-72">
        <div className="mb-2 text-xs font-semibold text-muted">{runLabel(run, index)}</div>
        <div className="grid grid-cols-2 gap-1">
          {CHECK_STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              data-testid={`run-status-${status.value}`}
              onClick={() => onChange({ ...result, status: status.value })}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition',
                result.status === status.value ? cn(status.tone, 'ring-2 ring-accent/40') : 'text-fg-soft hover:bg-surface-3',
              )}
            >
              <span className={cn('size-2 rounded-full', status.dot)} />
              {status.label}
            </button>
          ))}
        </div>
        <AutoTextarea
          value={result.comment ?? ''}
          onChange={(e) => onChange({ ...result, comment: e.target.value })}
          placeholder="Комментарий для этого окружения"
          aria-label="Комментарий для окружения"
          minRows={2}
          className="field-input mt-2 py-1.5 text-[13px]"
        />
      </Popover>
    </>
  );
}

function Attributes({ content, onChange }: { content: BlockContentMap['CHECKBOX']; onChange: (patch: Partial<BlockContentMap['CHECKBOX']>, key: string) => void }) {
  const input = 'field-input h-7 px-2 text-xs';
  return (
    <div className="mt-1 ml-6 grid grid-cols-3 gap-1.5">
      <input value={content.requirement ?? ''} onChange={(e) => onChange({ requirement: e.target.value }, 'requirement')} placeholder="Требование: ILEF-202" aria-label="Требование" className={input} />
      <input value={content.testType ?? ''} onChange={(e) => onChange({ testType: e.target.value }, 'testType')} placeholder="Тип: Smoke, MAT" list="qa-check-types" aria-label="Тип теста" className={input} />
      <input value={content.bugId ?? ''} onChange={(e) => onChange({ bugId: e.target.value }, 'bugId')} placeholder="Bug ID" aria-label="Bug ID" className={input} />
      <datalist id="qa-check-types">
        {TEST_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
    </div>
  );
}

/**
 * A check: label + status. With a RUN_INFO block every run (environment)
 * gets its own status pill, like the status columns of a QA spreadsheet.
 */
export function CheckboxEditor({ block }: EditorProps<'CHECKBOX'>) {
  const update = useUpdate(block);
  const updateContent = useBuilderStore((s) => s.updateContent);
  const { runs } = useBlockRenderContext();
  const hovered = useIsHovered(block.id);
  const selected = useBuilderStore((s) => s.selectedId === block.id);
  const statusMenu = useMenu();
  const statusButton = useRef<HTMLButtonElement>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const { status = 'none', comment = '', requirement, testType, bugId } = block.content;
  const active = hovered || selected;

  const allRuns = runs ?? [IMPLICIT_RUN];
  const results = allRuns.map((run, index) => resultFor(block, run, index));
  const done = results.every((r) => r.status === 'passed');
  const hasAttributes = Boolean(requirement || testType || bugId);

  const setResult = (index: number, result: RunResult) =>
    updateContent<'CHECKBOX'>(block.id, resultPatch(block, allRuns[index], index, result), `result-${allRuns[index].id}`);

  // Toggling the box marks every run passed (or resets them all).
  const toggleDone = () => {
    const target: CheckStatus = done ? 'none' : 'passed';
    let patch: Partial<BlockContentMap['CHECKBOX']> = {};
    allRuns.forEach((run, index) => {
      const draft = { ...block, content: { ...block.content, ...patch } };
      patch = { ...patch, ...resultPatch(draft, run, index, { ...results[index], status: target }) };
    });
    update(patch);
  };

  const singleMeta = CHECK_STATUS_META[status];
  const runComments = runs ? results.map((r, i) => ({ run: allRuns[i], index: i, comment: r.comment })).filter((r) => r.comment) : [];

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label="Отметить выполненным"
          onClick={toggleDone}
          className={cn(
            'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition',
            done ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong hover:border-accent',
          )}
        >
          {done && <Check className="size-3" strokeWidth={3} />}
        </button>
        <input
          value={block.content.label ?? ''}
          onChange={(e) => update({ label: e.target.value }, 'label')}
          placeholder="Что проверяем?"
          aria-label="Текст проверки"
          className={cn('inline-input min-w-24 py-1 text-sm', status === 'skipped' && !runs && 'text-muted line-through')}
        />

        {runs ? null : (
          <button
            ref={statusButton}
            type="button"
            onClick={() => statusMenu.openBelow(statusButton.current!)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-opacity focus:opacity-100',
              singleMeta.tone,
              status === 'none' && !active && 'opacity-0',
            )}
            aria-label="Статус проверки"
          >
            <span className={cn('size-1.5 rounded-full', singleMeta.dot)} />
            {status === 'none' ? 'Статус' : singleMeta.label}
          </button>
        )}

        <IconButton
          size="xs"
          label="Требование, тип теста, Bug ID"
          active={attributesOpen}
          onClick={() => setAttributesOpen((v) => !v)}
          className={cn('focus:opacity-100', active || attributesOpen ? 'opacity-100' : 'opacity-0')}
        >
          <Tags />
        </IconButton>
        {!runs && !comment && !commentOpen && (
          <IconButton size="xs" label="Добавить комментарий" onClick={() => setCommentOpen(true)} className={cn('focus:opacity-100', active ? 'opacity-100' : 'opacity-0')}>
            <MessageSquarePlus />
          </IconButton>
        )}
      </div>

      {runs && (
        <div className="mt-0.5 mb-0.5 ml-7 flex flex-wrap gap-1">
          {allRuns.map((run, index) => (
            <RunStatusPill key={run.id} run={run} index={index} result={results[index]} onChange={(result) => setResult(index, result)} />
          ))}
        </div>
      )}
      {hasAttributes && !attributesOpen && (
        <button type="button" onClick={() => setAttributesOpen(true)} className="mt-0.5 ml-7 flex flex-wrap gap-1 text-left">
          {requirement && <span className="rounded bg-sky-100 px-1.5 py-px font-mono text-[10.5px] text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">{requirement}</span>}
          {testType && <span className="rounded bg-violet-100 px-1.5 py-px text-[10.5px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{testType}</span>}
          {bugId && <span className="rounded bg-rose-100 px-1.5 py-px font-mono text-[10.5px] text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">🐞 {bugId}</span>}
        </button>
      )}
      {attributesOpen && <Attributes content={block.content} onChange={(patch, key) => update(patch, key)} />}

      {!runs && (comment || commentOpen) && (
        <AutoTextarea
          value={comment}
          onChange={(e) => update({ comment: e.target.value }, 'comment')}
          onBlur={() => setCommentOpen(false)}
          autoFocus={commentOpen && !comment}
          placeholder="Комментарий к проверке"
          aria-label="Комментарий к проверке"
          className="inline-input mt-0.5 ml-6 w-[calc(100%-1.5rem)] py-1 text-[13px] text-muted italic"
        />
      )}
      {runComments.map(({ run, index, comment: text }) => (
        <p key={run.id} className="mt-0.5 ml-7 text-[12.5px] text-muted italic">
          <span className="font-medium not-italic">{shortLabel(run, index)}:</span> {text}
        </p>
      ))}

      <Menu
        position={statusMenu.position}
        onClose={statusMenu.close}
        items={CHECK_STATUSES.map((s) => ({
          label: s.label,
          icon: <span className={cn('size-2 rounded-full', s.dot)} />,
          onSelect: () => setResult(0, { status: s.value, comment }),
        }))}
      />
    </div>
  );
}
