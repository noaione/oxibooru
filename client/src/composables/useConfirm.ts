import { useConfirmStore } from '@/stores/confirm';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function useConfirm() {
  const store = useConfirmStore();
  return {
    confirm: (options: ConfirmOptions = {}) => store.open(options),
  };
}
