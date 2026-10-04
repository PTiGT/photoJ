import { Check } from 'lucide-react';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { PRIORITIES, PRIORITY_TONE, SEVERITIES, SEVERITY_TONE } from '@/lib/qaValues';
import { cn } from '@/lib/utils';
import { Pill, useUpdate, type EditorProps } from './shared';


export function InputEditor({ block }: EditorProps<'INPUT'>) {
  const update = useUpdate(block);
  return (
    <>
      <input
        value={block.content.value ?? ''}
        onChange={(e) => update({ value: e.target.value }, 'value')}
        placeholder={block.content.placeholder || 'Введите значение'}
        aria-label={block.content.label || 'Значение'}
        className="field-input h-10"
      />
    </>
  );
}

export function TextareaEditor({ block }: EditorProps<'TEXTAREA'>) {
  const update = useUpdate(block);
  return (
    <>
      <AutoTextarea
        value={block.content.value ?? ''}
        onChange={(e) => update({ value: e.target.value }, 'value')}
        placeholder={block.content.placeholder || 'Введите текст'}
        aria-label={block.content.label || 'Значение'}
        minRows={3}
        className="field-input leading-relaxed"
      />
    </>
  );
}

/** SELECT, RADIO and STATUS share the options model; they differ in presentation. */
export function ChoiceEditor({ block }: EditorProps<'SELECT' | 'RADIO' | 'STATUS'>) {
  const update = useUpdate(block);
  const options = block.content.options ?? [];
  const value = block.content.value ?? '';

  let control: React.ReactNode;
  if (block.type === 'SELECT') {
    control = (
      <select value={value} onChange={(e) => update({ value: e.target.value })} aria-label={block.content.label || 'Выбор'} className="field-input h-10 sm:max-w-xs">
        <option value="">— Не выбрано —</option>
        {options.map((option, i) => (
          <option key={`${option}-${i}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (block.type === 'RADIO') {
    control = (
      <div role="radiogroup" className="flex flex-wrap gap-x-5 gap-y-2 px-0.5">
        {options.map((option, i) => (
          <label key={`${option}-${i}`} className="flex cursor-pointer items-center gap-2 text-sm">
            <span className={cn('flex size-4 items-center justify-center rounded-full border transition', value === option ? 'border-accent' : 'border-line-strong')}>
              {value === option && <span className="size-2 rounded-full bg-accent" />}
            </span>
            <input type="radio" className="sr-only" checked={value === option} onChange={() => update({ value: option })} />
            {option}
          </label>
        ))}
      </div>
    );
  } else {
    control = (
      <div className="flex flex-wrap gap-1.5">
        {options.map((option, i) => (
          <Pill key={`${option}-${i}`} active={value === option} onClick={() => update({ value: value === option ? '' : option })}>
            {value === option && <Check className="-ml-0.5 mr-1 inline size-3.5" />}
            {option}
          </Pill>
        ))}
      </div>
    );
  }

  return (
    <>
      {options.length ? control : <p className="text-sm text-muted">Добавьте варианты в настройках блока</p>}
    </>
  );
}

export function SeverityEditor({ block }: EditorProps<'SEVERITY'>) {
  const update = useUpdate(block);
  return (
    <>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Severity">
        {SEVERITIES.map((value) => (
          <Pill key={value} testId={`severity-${value}`} active={block.content.value === value} tone={SEVERITY_TONE[value]} onClick={() => update({ value: block.content.value === value ? '' : value })}>
            {value}
          </Pill>
        ))}
      </div>
    </>
  );
}

export function PriorityEditor({ block }: EditorProps<'PRIORITY'>) {
  const update = useUpdate(block);
  return (
    <>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Priority">
        {PRIORITIES.map((value) => (
          <Pill key={value} active={block.content.value === value} tone={PRIORITY_TONE[value]} onClick={() => update({ value: block.content.value === value ? '' : value })}>
            {value}
          </Pill>
        ))}
      </div>
    </>
  );
}
