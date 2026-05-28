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

const app = useTokenStore();
const darkMode = useDarkTheme();
const settings = useSettingsStore();
const categories = useCategoriesStore();

onMounted(() => {
  darkMode.init();
  settings.init();

  app.init().then(() => {
    categories.init().then((results) => {
      categories.applyColors(results.tags, results.pools);
    });
  });
});
</script>

<template>
  <PageLoader />
  <NavBar />
  <main class="px-6 py-6 md:px-8 md:py-8">
    <RouterView v-if="app.ready" v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </RouterView>
  </main>
  <ToastNotification />
  <ConfirmDialog />
</template>
