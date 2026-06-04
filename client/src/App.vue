<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { RouterView, useRouter } from 'vue-router';
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
const router = useRouter();

const cachePost = usePostCacheStore();
const cacheTag = useTagCacheStore();
const cachePool = usePoolCacheStore();
const cacheUser = useUserCacheStore();

function onUnauthorized() {
  if (!app.userToken) return; // only redirect if was logged in
  app.logout().catch(() => {});
  if (router.currentRoute.value.name !== 'login') {
    router.push('/login');
  }
}

onMounted(() => {
  darkMode.init();
  settings.init();

  app.init().then(async () => {
    const results = await categories.init();
    categories.applyColors(results.tags, results.pools);
  });

  watch(
    () => app.userToken,
    (token, prev) => {
      if (token && !prev) categories.refreshColors();
    },
  );

  window.addEventListener('auth:unauthorized', onUnauthorized);
});

// when unmounting, flush all caches
onUnmounted(() => {
  window.removeEventListener('auth:unauthorized', onUnauthorized);
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
