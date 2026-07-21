import { useEventListener } from '@vueuse/core';
import { onActivated, onDeactivated } from 'vue';
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

  // Components stay mounted forever under <keep-alive>, so onUnmounted never
  // fires when navigating away. Gate the listener on activation state instead,
  // otherwise a deactivated page's shortcuts keep firing on top of whatever is
  // currently shown.
  let active = true;
  onActivated(() => {
    active = true;
  });
  onDeactivated(() => {
    active = false;
  });

  useEventListener('keydown', (e: KeyboardEvent) => {
    if (!active) return;
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
