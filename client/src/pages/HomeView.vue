<template>
  <!-- Center but not middle -->
  <div class="flex flex-col items-center justify-start">
    <h1 class="text-5xl">{{ app.config?.config.name || 'Oxibooru' }}</h1>

    <div v-if="canListPosts" class="flex flex-row items-center mt-8">
      <AutoCompleteTag target="posts" placeholder="enter some tags" />
      <span class="text-gray-500 mx-5">or</span>
      <RouterLink to="/posts" class="text-cyan-500 hover:brightness-120">
        browse all posts
      </RouterLink>
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
          >@{{ app.config.featuredPost.id }}</RouterLink
        >
        <span v-else>@{{ app.config.featuredPost.id }}</span>
        <template v-if="app.config.featuringTime">
          <span>, posted <RelativeTime :time="app.config.featuringTime" /></span>
        </template>
        <template v-if="app.config.featuredPost.user?.name">
          <span> by </span>
          <AvatarLink
            :simple="!canViewUser"
            :name="app.config.featuredPost.user?.name"
            :avatar-url="app.config.featuredPost.user.avatarUrl"
          />
        </template>
      </p>
    </div>

    <!-- Footer -->
    <footer
      class="text-sm text-gray-500 dark:text-gray-400"
      :class="{
        'mt-16': !app.config?.featuredPost,
        'mt-4': app.config?.featuredPost,
      }"
    >
      <span>{{ app.config?.postCount ?? 0 }} posts</span>
      <span class="mx-1"> &middot; </span>
      <span>{{ formattedDiskUsage }}</span>
      <span class="mx-1"> &middot; </span>
      <span>
        Build
        <a
          :href="buildGitLink"
          class="text-cyan-500 hover:underline"
          rel="noopener noreferrer"
          target="_blank"
        >
          {{ buildVersion }}
        </a>
        from <RelativeTime :time="buildTime" />
      </span>
      <span v-if="canListHistory" class="mx-1"> &middot; </span>
      <RouterLink v-if="canListHistory" to="/history" class="text-cyan-500 hover:underline">
        History
      </RouterLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import { useTokenStore } from '@/stores/api';
import { useHeadSafe } from '@unhead/vue';
import { computed } from 'vue';
import { resolveApiUrl } from '@/utils/url';
import RelativeTime from '@/components/RelativeTime.vue';
import AvatarLink from '@/components/AvatarLink.vue';

const app = useTokenStore();

const buildVersion = import.meta.env.VITE_BUILD_VERSION;
const buildTime = import.meta.env.VITE_BUILD_TIME;
const buildGitLink = import.meta.env.VITE_BUILD_GIT_LINK;
console.log(buildGitLink);
const serverName = computed(() => app.config?.config.name || 'Oxibooru');

const canListPosts = computed(() => app.hasPrivilege('post_list'));
const canViewFeatured = computed(() => app.hasPrivilege('post_view_featured'));
const canViewUser = computed(() => app.hasPrivilege('user_view'));
const canListHistory = computed(() => app.hasPrivilege('snapshot_list'));

const formattedDiskUsage = computed(() => {
  if (!app.config?.diskUsage) return '0 B';

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  let size = app.config.diskUsage;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
});

useHeadSafe(() => ({
  title: serverName.value + ' - Home',
}));
</script>
