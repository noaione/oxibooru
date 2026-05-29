import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useTokenStore } from './api';
import { intoOklch, formatOklch, mixinCssColorForDarkTheme } from '@/utils/colorama';

import type { PoolCategoryInfo, TagCategoryInfo } from '@/types/oxibooru.gen';

export const useCategoriesStore = defineStore('categories', () => {
  const tags = ref<TagCategoryInfo[]>([]);
  const pools = ref<PoolCategoryInfo[]>([]);

  const api = useTokenStore();

  async function init() {
    const promises = await Promise.all([api.listTagCategories(), api.listPoolCategories()]);

    tags.value = promises[0].success ? promises[0].data : [];
    pools.value = promises[1].success ? promises[1].data : [];

    return {
      tags: tags.value,
      pools: pools.value,
    };
  }

  function applyColors(tagList: TagCategoryInfo[], poolList: PoolCategoryInfo[]) {
    const tagSheets = tagList.map((tag) => {
      if (!tag.color) return '';
      const parsed = intoOklch(tag.color);
      if (!parsed) return '';
      return `--tag-cat-${tag.name}: ${formatOklch(parsed)};`;
    });
    const darkTagSheets = tagList.map((tag) => {
      if (!tag.color) return '';
      return `--tag-cat-${tag.name}: ${mixinCssColorForDarkTheme(tag.color)};`;
    });
    const poolSheets = poolList.map((pool) => {
      if (!pool.color) return '';
      const parsed = intoOklch(pool.color);
      if (!parsed) return '';
      return `--pool-cat-${pool.name}: ${formatOklch(parsed)};`;
    });
    const darkPoolSheets = poolList.map((pool) => {
      if (!pool.color) return '';
      return `--pool-cat-${pool.name}: ${mixinCssColorForDarkTheme(pool.color)};`;
    });

    const fullText = [
      ':root {',
      ...tagSheets,
      ...poolSheets,
      '}',
      ':root:has(.darktheme), :root:has(.dark) {',
      ...darkTagSheets,
      ...darkPoolSheets,
      '}',
    ].join('\n');

    let styleEl = document.getElementById('colorama-tag-pools-theme') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.type = 'text/css';
      styleEl.id = 'colorama-tag-pools-theme';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = fullText;
  }

  async function refreshColors() {
    const [tagResult, poolResult] = await Promise.all([
      api.listTagCategories(),
      api.listPoolCategories(),
    ]);

    tags.value = tagResult.success ? tagResult.data : tags.value;
    pools.value = poolResult.success ? poolResult.data : pools.value;

    applyColors(tags.value, pools.value);
  }

  return {
    tags,
    pools,
    init,
    applyColors,
    refreshColors,
  };
});
