import { useToastStore } from '@/stores/toast';

export function useToast() {
  const store = useToastStore();

  return {
    showSuccess: (message: string) => store.add(message, 'success'),
    showError: (message: string) => store.add(message, 'error'),
    showInfo: (message: string) => store.add(message, 'info'),
  };
}
