import { create } from 'zustand';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  close: (value: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolve: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      get().resolve?.(false);
      set({ options, resolve });
    }),
  close: (value) => {
    get().resolve?.(value);
    set({ options: null, resolve: null });
  },
}));

/** Imperative confirmation: `if (await confirm({ title })) …` */
export const confirm = (options: ConfirmOptions) => useConfirmStore.getState().ask(options);

/** Mounted once at the app root. */
export function ConfirmHost() {
  const { options, close } = useConfirmStore();
  return (
    <Modal
      open={Boolean(options)}
      onClose={() => close(false)}
      size="sm"
      title={options?.title}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            Отмена
          </Button>
          <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
            {options?.confirmLabel ?? 'Подтвердить'}
          </Button>
        </>
      }
    >
      {options?.message && <p className="px-6 py-5 text-sm leading-relaxed text-fg-soft">{options.message}</p>}
    </Modal>
  );
}
