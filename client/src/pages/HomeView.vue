<template>
  <!-- Center but not middle -->
  <div class="flex flex-col items-center justify-start">
    <h1 class="text-5xl">{{ app.config?.config.name || 'Oxibooru' }}</h1>

    <div class="flex flex-row items-center mt-8">
      <AutoCompleteTag target="posts" placeholder="enter some tags" />
      <span class="text-gray-500 mx-5">or</span>
      <RouterLink to="/posts" class="text-cyan-500"> browse all posts </RouterLink>
    </div>

    <!-- Featured post -->
    <div v-if="app.config?.featuredPost" class="flex flex-col items-center mt-8 gap-2">
      <img
        :src="resolveApiUrl(app.config.featuredPost.thumbnailUrl)"
        :alt="`Featured post #${app.config.featuredPost.id}`"
        class="max-w-[80dvw] w-full object-cover"
      />
      <p class="text-gray-500 dark:text-gray-400 text-center mt-4">
        <span>Featured post: </span>
        <RouterLink
          v-if="canViewFeatured"
          :to="`/post/${app.config.featuredPost.id}`"
          class="text-cyan-500 hover:underline"
        >@{{ app.config.featuredPost.id }}</RouterLink>
        <span v-else>@{{ app.config.featuredPost.id }}</span>
        <template v-if="app.config.featuringUser">
          <span>, posted by </span>
          <RouterLink
            v-if="canViewUser"
            :to="`/user/${app.config.featuringUser}`"
            class="text-cyan-500 hover:underline"
          >{{ app.config.featuringUser }}</RouterLink>
          <span v-else>{{ app.config.featuringUser }}</span>
        </template>
        <template v-if="app.config.featuringTime">
          <span> around {{ formatRelativeTime(app.config.featuringTime) }}</span>
        </template>
      </p>
    </div>

    <!-- Footer -->
    <footer class="text-sm text-gray-500" :class="{
      'mt-16': !app.config?.featuredPost,
      'mt-4': app.config?.featuredPost,
    }">
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
import { resolveApiUrl } from '@/utils/url';

const app = useTokenStore();
const serverName = computed(() => app.config?.config.name || 'Oxibooru');

const canViewFeatured = computed(() => app.hasPrivilege('post_view_featured'));
const canViewUser = computed(() => app.hasPrivilege('user_view'));

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

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  } catch {
    return '';
  }
}

useHeadSafe(() => ({
  title: serverName.value + ' - Home',
}));
</script>
