import { Modal } from '@/components/ui/Modal';
import { Kbd } from '@/components/ui/Feedback';
import { modKey } from '@/lib/utils';

const SHORTCUTS: [string[], string][] = [
  [[modKey, 'S'], 'Сохранить и создать версию'],
  [[modKey, 'Z'], 'Отменить'],
  [[modKey, 'Shift', 'Z'], 'Вернуть'],
  [[modKey, 'D'], 'Дублировать выбранный блок'],
  [['Delete'], 'Удалить выбранный блок'],
  [['Alt', '↑'], 'Переместить блок вверх'],
  [['Alt', '↓'], 'Переместить блок вниз'],
  [['Esc'], 'Снять выделение'],
  [['ПКМ'], 'Контекстное меню блока'],
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Горячие клавиши">
      <ul className="divide-y divide-line px-6 py-2">
        {SHORTCUTS.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="text-fg-soft">{label}</span>
            <span className="flex gap-1">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
