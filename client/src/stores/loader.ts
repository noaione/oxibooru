import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLoaderStore = defineStore('loader', () => {
  const loading = ref(false);

  function start() {
    loading.value = true;
  }

  function done() {
    loading.value = false;
  }

  return { loading, start, done };
});
