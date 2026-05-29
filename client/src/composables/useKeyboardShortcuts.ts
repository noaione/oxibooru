import { useEventListener } from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings';

type KeyHandler = (e: KeyboardEvent) => void;

function isInteractiveTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  );
}

export function useKeyboardShortcuts(shortcuts: Record<string, KeyHandler>) {
  const { settings } = useSettingsStore();

  useEventListener('keydown', (e: KeyboardEvent) => {
    if (!settings.keyboardShortcuts) return;
    if (isInteractiveTarget(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const handler = shortcuts[e.key];
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  });
}
