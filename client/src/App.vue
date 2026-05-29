<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import NavBar from './components/NavBar.vue';
import ToastNotification from './components/ToastNotification.vue';
import PageLoader from './components/PageLoader.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

import { useTokenStore } from './stores/api.ts';
import { useCategoriesStore } from './stores/categories.ts';
import { useSettingsStore, useDarkTheme } from './stores/settings.ts';
import {
  usePostCacheStore,
  useTagCacheStore,
  usePoolCacheStore,
  useUserCacheStore,
} from './stores/cache.ts';

const app = useTokenStore();
const darkMode = useDarkTheme();
const settings = useSettingsStore();
const categories = useCategoriesStore();

const cachePost = usePostCacheStore();
const cacheTag = useTagCacheStore();
const cachePool = usePoolCacheStore();
const cacheUser = useUserCacheStore();

onMounted(() => {
  darkMode.init();
  settings.init();

  app.init().then(() => {
    categories.init().then((results) => {
      categories.applyColors(results.tags, results.pools);
    });
  });
});

// when unmounting, flush all caches
onUnmounted(() => {
  cachePost.flushPosts();
  cacheTag.flushTags();
  cachePool.flushPools();
  cacheUser.flushUsers();
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
