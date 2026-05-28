import { defineStore } from 'pinia';
import { ref } from 'vue';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const useConfirmStore = defineStore('confirm', () => {
  const visible = ref(false);
  const options = ref<ConfirmOptions>({});
  let resolveCallback: ((result: boolean) => void) | null = null;

  function open(opts: ConfirmOptions = {}): Promise<boolean> {
    options.value = opts;
    visible.value = true;
    return new Promise((resolve) => {
      resolveCallback = resolve;
    });
  }

  function respond(result: boolean) {
    visible.value = false;
    resolveCallback?.(result);
    resolveCallback = null;
  }

  return { visible, options, open, respond };
});
