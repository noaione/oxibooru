<template>
  <!-- Center but not middle -->
  <div v-if="app.ready" class="flex flex-col items-center justify-start">
    <h1 class="text-5xl">{{ app.config?.config.name || 'Oxibooru' }}</h1>

    <div class="flex flex-row items-center mt-8">
      <AutoCompleteTag target="posts" placeholder="enter some tags" />
      <span class="text-gray-500 mx-5">or</span>
      <RouterLink to="/posts" class="text-cyan-500"> browse all posts </RouterLink>
    </div>

    <!-- Featured posts -->
    <!-- <div v-if="app.config?.featuredPost" class="flex flex-col my-8">
      <span>featured posts here</span>
    </div> -->

    <!-- Footer -->
    <footer class="mt-16 text-sm text-gray-500">
      <span>{{ app.config?.postCount ?? 0 }} posts</span>
      <span class="mx-1"> &middot; </span>
      <span>{{ formattedDiskUsage }}</span>
      <span class="mx-1"> &middot; </span>
      <span>build latest from XXX</span>
      <span class="mx-1"> &middot; </span>
      <RouterLink to="/history" class="text-cyan-500">history</RouterLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import { useTokenStore } from '@/stores/api';
import { useHeadSafe } from '@unhead/vue';
import { computed } from 'vue';

const app = useTokenStore();
const serverName = computed(() => app.config?.config.name || 'Oxibooru');

const formattedDiskUsage = computed(() => {
  if (!app.config?.diskUsage) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let size = app.config.diskUsage;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
});

// reactive change on app.config?.config.name since this doesn't trigger a re-render of the page title otherwise
useHeadSafe(() => ({
  title: serverName.value + ' - Home',
}));
</script>
