import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useTokenStore } from './api';

import type { PoolCategoryInfo, TagCategoryInfo } from '@/types/oxibooru.gen';

export const useCategoriesStore = defineStore('categories', () => {
  const tags = ref<TagCategoryInfo[]>([]);
  const pools = ref<PoolCategoryInfo[]>([]);

  const api = useTokenStore();

  // on app start, load settings from localStorage if they exist
  async function init() {
    const promises = await Promise.all([
      api.listTagCategories(),
      api.listPoolCategories(),
    ]);

    tags.value = promises[0].success ? promises[0].data : [];
    pools.value = promises[1].success ? promises[1].data : [];

    return {
      tags: tags.value,
      pools: pools.value,
    }
  }

  return {
    tags,
    pools,
    init,
  };
});
