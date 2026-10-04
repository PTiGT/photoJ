import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ListPlus, Plus, X } from 'lucide-react';
import type { TestRun } from '@/types';
import { IconButton } from '@/components/ui/Button';
import { Menu, useMenu } from '@/components/ui/Menu';
import { useBuilderStore } from '@/features/builder/store';
import { RUN_PRESETS, TEST_TYPES, applyRuns, runLabel, runStats } from '@/lib/runs';
import { cn, todayShort, uid } from '@/lib/utils';
import { useUpdate, type EditorProps } from './shared';

const SEGMENTS = [
  ['passed', 'bg-green-500'],
  ['failed', 'bg-red-500'],
  ['blocked', 'bg-amber-400'],
  ['skipped', 'bg-slate-400'],
] as const;

function RunProgress({ run, index }: { run: TestRun; index: number }) {
  const stats = useBuilderStore(useShallow((s) => runStats(s.blocks, run, index)));
  const done = stats.total - stats.none;
  return (
    <div className="flex items-center gap-2" title={`passed ${stats.passed} · failed ${stats.failed} · blocked ${stats.blocked} · skipped ${stats.skipped}`}>
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:flex">
        {SEGMENTS.map(([status, color]) =>
          stats[status] ? <div key={status} className={color} style={{ width: `${(stats[status] / Math.max(stats.total, 1)) * 100}%` }} /> : null,
        )}
      </div>
      <span className="text-[11px] whitespace-nowrap text-muted tabular-nums">
        {done}/{stats.total}
      </span>
    </div>
  );
}

/** Project / tester + the list of runs (environments) that become status columns. */
export function RunInfoEditor({ block }: EditorProps<'RUN_INFO'>) {
  const update = useUpdate(block);
  const setBlocks = useBuilderStore((s) => s.setBlocks);
  const presetMenu = useMenu();
  const presetButton = useRef<HTMLButtonElement>(null);
  const runs = block.content.runs ?? [];

  const setRun = (runId: string, patch: Partial<TestRun>, field: string) =>
    update({ runs: runs.map((run) => (run.id === runId ? { ...run, ...patch } : run)) }, `run-${runId}-${field}`);
  const addRun = () =>
    update({ runs: [...runs, { id: uid(), environment: '', date: runs[runs.length - 1]?.date || todayShort(), build: runs[runs.length - 1]?.build ?? '', testType: '' }] });
  const removeRun = (runId: string) => setBlocks((blocks) => applyRuns(blocks, block.id, runs.filter((run) => run.id !== runId)));

  const applyPreset = (environments: string[]) => {
    const keep = runs.filter((run) => run.environment?.trim());
    const base = runs[0];
    const added = environments
      .filter((env) => !keep.some((run) => run.environment === env))
      .map((environment) => ({ id: uid(), environment, date: base?.date || todayShort(), build: base?.build ?? '', testType: base?.testType ?? '' }));
    const next = [...keep, ...added];
    // Reuse the blank first run so its results (if any) stay in the first column.
    if (!keep.length && base && next[0]) next[0] = { ...next[0], id: base.id };
    setBlocks((blocks) => applyRuns(blocks, block.id, next));
  };

  const input = 'field-input h-8 px-2 text-[13px]';

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Project</span>
          <input value={block.content.project ?? ''} onChange={(e) => update({ project: e.target.value }, 'project')} placeholder="Название проекта" className={input} />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Tester</span>
          <input value={block.content.tester ?? ''} onChange={(e) => update({ tester: e.target.value }, 'tester')} placeholder="Имя тестировщика" className={input} />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        {runs.map((run, index) => (
          <div key={run.id} data-testid="run-row" className="space-y-1.5 border-b border-line px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft font-mono text-xs font-medium text-accent">{index + 1}</span>
              <input
                value={run.environment ?? ''}
                onChange={(e) => setRun(run.id, { environment: e.target.value }, 'env')}
                placeholder="Окружение: Windows 11 · Chrome 140, iPhone 16 · iOS 18…"
                aria-label={`Окружение прогона ${index + 1}`}
                className={cn(input, 'min-w-0 flex-1')}
              />
              <RunProgress run={run} index={index} />
              <IconButton size="sm" tone="danger" label={`Удалить ${runLabel(run, index)}`} disabled={runs.length <= 1} onClick={() => removeRun(run.id)}>
                <X />
              </IconButton>
            </div>
            <div className="grid grid-cols-3 gap-2 pr-9 pl-8">
              <input value={run.date ?? ''} onChange={(e) => setRun(run.id, { date: e.target.value }, 'date')} placeholder="Дата: дд.мм.гггг" aria-label="Дата" className={input} />
              <input value={run.build ?? ''} onChange={(e) => setRun(run.id, { build: e.target.value }, 'build')} placeholder="Build: 1.0.0" aria-label="Build" className={input} />
              <input
                value={run.testType ?? ''}
                onChange={(e) => setRun(run.id, { testType: e.target.value }, 'type')}
                placeholder="Тип: Smoke, MAT…"
                list="qa-test-types"
                aria-label="Тип теста"
                className={input}
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1 bg-surface-2/60 px-1.5 py-1">
          <button type="button" onClick={addRun} data-testid="add-run" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted hover:bg-accent-soft hover:text-accent">
            <Plus className="size-3.5" /> Добавить окружение
          </button>
          <button
            ref={presetButton}
            type="button"
            onClick={() => presetMenu.openBelow(presetButton.current!, 'start')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted hover:bg-accent-soft hover:text-accent"
          >
            <ListPlus className="size-3.5" /> Пресеты
          </button>
          <span className="ml-auto pr-1.5 text-[11px] text-subtle">Каждое окружение — отдельная колонка статуса</span>
        </div>
      </div>
      <datalist id="qa-test-types">
        {TEST_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <Menu
        position={presetMenu.position}
        onClose={presetMenu.close}
        items={Object.entries(RUN_PRESETS).map(([name, environments]) => ({ label: `${name}: ${environments.join(', ')}`, onSelect: () => applyPreset(environments) }))}
      />
    </div>
  );
}
