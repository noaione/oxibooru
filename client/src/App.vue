<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import NavBar from './components/NavBar.vue';
import ToastNotification from './components/ToastNotification.vue';
import PageLoader from './components/PageLoader.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

import { useTokenStore } from './stores/api.ts';
import { useCategoriesStore } from './stores/categories.ts';
import { useSettingsStore, useDarkTheme } from './stores/settings.ts';

import { intoOklch, formatOklch, mixinCssColorForDarkTheme } from './utils/colorama.ts';

const api = useTokenStore();
const darkMode = useDarkTheme();
const settings = useSettingsStore();
const categories = useCategoriesStore();

onMounted(() => {
  darkMode.init();
  settings.init();

  api.init().then(() => {
    categories.init().then((results) => {
      // attach color for CSS, format is --tag-cat-<cat_name>

      const tagSheets = results.tags.map((tag) => {
        if (!tag.color) return '';
        const okl = formatOklch(intoOklch(tag.color));
        return `--tag-cat-${tag.name}: ${okl};`;
      });
      const darkTagSheets = results.tags.map((tag) => {
        if (!tag.color) return '';
        const okl = mixinCssColorForDarkTheme(tag.color);
        return `--tag-cat-${tag.name}: ${okl};`;
      });

      const poolSheets = results.pools.map((pool) => {
        if (!pool.color) return '';
        const okl = formatOklch(intoOklch(pool.color));
        return `--pool-cat-${pool.name}: ${okl};`;
      });

      const darkPoolSheets = results.pools.map((pool) => {
        if (!pool.color) return '';
        const okl = mixinCssColorForDarkTheme(pool.color);
        return `--pool-cat-${pool.name}: ${okl};`;
      });

      /**
       * :root {
       *   <data>
       * }
       *
       * :root:has(.darktheme), :root:has(.dark) {
       *   <data>
       * }
       */
      const styleSheet = document.createElement('style');
      styleSheet.type = 'text/css';
      styleSheet.id = 'colorama-tag-pools-theme';

      const fullText = [
        ':root {', ...tagSheets, ...poolSheets, '}',
        ':root:has(.darktheme), :root:has(.dark) {', ...darkTagSheets, ...darkPoolSheets, '}',
      ];

      styleSheet.appendChild(document.createTextNode(fullText.join('\n')));
      console.log(styleSheet, fullText.join('\n'));
      document.head.appendChild(styleSheet);
    });
  });
});
</script>

<template>
  <PageLoader />
  <NavBar />
  <main class="px-6 py-6 md:px-8 md:py-8">
    <RouterView />
  </main>
  <ToastNotification />
  <ConfirmDialog />
</template>
