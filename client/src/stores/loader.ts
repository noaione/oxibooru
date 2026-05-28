import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useLoaderStore = defineStore('loader', () => {
  const activeCount = ref(0);
  const loading = computed(() => activeCount.value > 0);

  function start() {
    activeCount.value++;
  }

  function done() {
    if (activeCount.value > 0) activeCount.value--;
  }

  return { loading, start, done };
});
