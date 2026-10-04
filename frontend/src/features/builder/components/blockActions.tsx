import { ArrowDown, ArrowUp, Copy, IndentDecrease, IndentIncrease, ListPlus, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Block } from '@/types';
import type { MenuEntry } from '@/components/ui/Menu';
import { BLOCKS } from '@/blocks/registry';
import { canContain, childrenOf, findBlock } from '@/lib/blockTree';
import { modKey } from '@/lib/utils';
import { useBuilderStore } from '../store';

/** Deletes a block with an "undo" toast — deletion is always reversible. */
export function removeWithUndo(id: string) {
  const store = useBuilderStore.getState();
  const block = findBlock(store.blocks, id);
  if (!block) return;
  store.removeBlock(id);
  toast(`Блок «${BLOCKS[block.type].label}» удалён`, {
    action: { label: 'Отменить', onClick: () => useBuilderStore.getState().undo() },
  });
}

/** Actions available for a block — shared by the hover toolbar and the context menu. */
export function blockMenuEntries(block: Block): MenuEntry[] {
  const store = useBuilderStore.getState();
  const siblings = childrenOf(store.blocks, block.parentId);
  const index = siblings.findIndex((b) => b.id === block.id);
  const previous = siblings[index - 1];
  const canIndent = Boolean(previous && canContain(previous.type, block.type));
  const nestedChild = block.type === 'CHECKBOX' ? 'CHECKBOX' : block.type === 'STEP_GROUP' ? 'STEP' : null;

  return [
    ...(BLOCKS[block.type].configurable
      ? [{ label: 'Редактировать', icon: <Settings2 />, onSelect: () => store.toggleEditing(block.id) }]
      : []),
    { label: 'Дублировать', icon: <Copy />, shortcut: `${modKey}D`, onSelect: () => store.duplicateBlock(block.id) },
    ...(nestedChild
      ? [
          {
            label: block.type === 'CHECKBOX' ? 'Добавить вложенный пункт' : 'Добавить шаг',
            icon: <ListPlus />,
            onSelect: () => store.addBlock(nestedChild, block.id),
          },
        ]
      : []),
    'separator',
    { label: 'Переместить вверх', icon: <ArrowUp />, shortcut: 'Alt↑', disabled: index <= 0, onSelect: () => store.shiftBlock(block.id, -1) },
    { label: 'Переместить вниз', icon: <ArrowDown />, shortcut: 'Alt↓', disabled: index >= siblings.length - 1, onSelect: () => store.shiftBlock(block.id, 1) },
    { label: 'Вложить в предыдущий', icon: <IndentIncrease />, disabled: !canIndent, onSelect: () => store.indentBlock(block.id) },
    { label: 'Вынести на уровень выше', icon: <IndentDecrease />, disabled: !block.parentId || !canContain(findBlock(store.blocks, findBlock(store.blocks, block.parentId)?.parentId)?.type ?? null, block.type), onSelect: () => store.outdentBlock(block.id) },
    'separator',
    { label: 'Удалить', icon: <Trash2 />, shortcut: 'Del', danger: true, onSelect: () => removeWithUndo(block.id) },
  ];
}
