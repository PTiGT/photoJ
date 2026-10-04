import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { Block, BlockSettings } from '@/types';
import { useBuilderStore } from '@/features/builder/store';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-soft">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line-strong')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </button>
      {label}
    </label>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[140px_1fr] sm:items-center">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const move = (index: number, delta: number) => {
    const next = [...options];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-1">
          <input
            value={option}
            onChange={(e) => onChange(options.map((o, i) => (i === index ? e.target.value : o)))}
            aria-label={`Вариант ${index + 1}`}
            className="field-input h-8"
          />
          <IconButton size="sm" label="Выше" disabled={index === 0} onClick={() => move(index, -1)}>
            <ArrowUp />
          </IconButton>
          <IconButton size="sm" label="Ниже" disabled={index === options.length - 1} onClick={() => move(index, 1)}>
            <ArrowDown />
          </IconButton>
          <IconButton size="sm" tone="danger" label="Удалить вариант" onClick={() => onChange(options.filter((_, i) => i !== index))}>
            <X />
          </IconButton>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, `Вариант ${options.length + 1}`])} className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
        <Plus className="size-3.5" /> Добавить вариант
      </button>
    </div>
  );
}

const ENV_PRESETS: Record<string, string[]> = {
  Web: ['OS', 'Browser', 'Build', 'Stand'],
  Mobile: ['Device', 'OS', 'App version', 'Network'],
  API: ['Base URL', 'API version', 'Client', 'Stand'],
};

/** Per-type configuration shown under a block when "Редактировать" is active. */
export function BlockSettingsPanel({ block }: { block: Block }) {
  const updateContent = useBuilderStore((s) => s.updateContent);
  const updateSettings = useBuilderStore((s) => s.updateSettings);
  const setSetting = (patch: Partial<BlockSettings>) => updateSettings(block.id, patch);
  const hideLabel = <Toggle checked={Boolean(block.settings.hideLabel)} onChange={(v) => setSetting({ hideLabel: v })} label="Скрыть подпись" />;

  let body: React.ReactNode = null;
  switch (block.type) {
    case 'INPUT':
    case 'TEXTAREA':
      body = (
        <>
          <SettingRow label="Подсказка в поле">
            <input value={block.content.placeholder ?? ''} onChange={(e) => updateContent(block.id, { placeholder: e.target.value }, 'placeholder')} className="field-input h-8" placeholder="Placeholder" />
          </SettingRow>
          <div className="flex flex-wrap gap-5">
            {hideLabel}
            <Toggle checked={Boolean(block.settings.required)} onChange={(v) => setSetting({ required: v })} label="Обязательное поле" />
          </div>
        </>
      );
      break;
    case 'SELECT':
    case 'RADIO':
    case 'STATUS':
      body = (
        <>
          <SettingRow label="Варианты">
            <OptionsEditor options={block.content.options ?? []} onChange={(options) => updateContent(block.id, { options })} />
          </SettingRow>
          {hideLabel}
        </>
      );
      break;
    case 'TABLE':
      body = hideLabel;
      break;
    case 'ENVIRONMENT':
      body = (
        <SettingRow label="Пресет параметров">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ENV_PRESETS).map(([name, keys]) => (
              <button
                key={name}
                type="button"
                onClick={() => updateContent(block.id, { items: keys.map((key) => ({ key, value: '' })) })}
                className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent"
              >
                {name}
              </button>
            ))}
          </div>
        </SettingRow>
      );
      break;
    default:
      body = <p className="text-[13px] text-muted">У этого блока нет дополнительных настроек.</p>;
  }

  return <div className="mt-3 space-y-3 rounded-xl border border-dashed border-line-strong/80 bg-surface-2 p-3.5">{body}</div>;
}
