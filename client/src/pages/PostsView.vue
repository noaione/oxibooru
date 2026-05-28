<template>
  <div v-if="app.ready" class="flex flex-col gap-4 min-w-full max-w-full">
    <!-- Search + safety header -->
    <div class="flex flex-col md:flex-row w-full max-w-full gap-2">
      <AutoCompleteTag
        target="posts"
        :model-value="searchQuery ? [searchQuery] : []"
        class="items-center w-full max-w-full md:max-w-[30%]"
        input-class="w-full"
      />

      <!-- Safety toggles -->
      <div class="safety-rows ml-0 mt-0 md:ml-2">
        <button
          class="border-2 border-green-600 dark:border-green-300 h-auto w-8 aspect-square cursor-pointer"
          :class="{
            'bg-green-600 dark:bg-green-300': settings.listPosts.safe,
            'bg-transparent': !settings.listPosts.safe,
          }"
          title="Safe"
          @click="toggleSafety('safe')"
        />
        <button
          class="border-2 border-yellow-400 dark:border-yellow-200 h-auto w-8 aspect-square cursor-pointer"
          :class="{
            'bg-yellow-400 dark:bg-yellow-200': settings.listPosts.sketchy,
            'bg-transparent': !settings.listPosts.sketchy,
          }"
          title="Sketchy"
          @click="toggleSafety('sketchy')"
        />
        <button
          class="border-red-400 dark:border-orange-300 border-2 h-auto w-8 aspect-square cursor-pointer"
          :class="{
            'bg-red-400 dark:bg-orange-300': settings.listPosts.unsafe,
            'bg-transparent': !settings.listPosts.unsafe,
          }"
          title="Unsafe"
          @click="toggleSafety('unsafe')"
        />

        <RouterLink
          to="/help/search?t=posts"
          class="self-center ml-2 text-sm text-gray-500 hover:brightness-110 w-max"
        >
          Syntax help
        </RouterLink>
      </div>

      <!-- Mass edit controls -->
      <div class="flex flex-row gap-3 ml-0 mt-0 md:ml-4 w-full items-center flex-wrap">
        <!-- Mass tag mode -->
        <template v-if="massActiveState === 'tag'">
          <span class="text-sm text-gray-500">
            {{ lockedMassTag ? `Tagging: ${lockedMassTag}` : 'Enter tag to apply:' }}
          </span>
          <AutoCompleteTag
            v-if="!lockedMassTag"
            target="posts"
            override-submit
            class="items-center w-full max-w-full md:max-w-[40%]"
            input-class="w-full"
            @submit="startMassTagging"
          >
            Start tagging
          </AutoCompleteTag>
          <button class="text-sm text-gray-500 hover:brightness-110 cursor-pointer" @click="stopMassTagging">
            Stop tagging
          </button>
        </template>

        <!-- Mass safety mode -->
        <template v-else-if="massActiveState === 'safety'">
          <span class="text-sm text-gray-500">Click a safety badge on any post to change it.</span>
          <button class="text-sm text-gray-500 hover:brightness-110 cursor-pointer" @click="massActiveState = 'none'">
            Stop editing safety
          </button>
        </template>

        <!-- Mass delete mode -->
        <template v-else-if="massActiveState === 'delete'">
          <BlueButton
            :disabled="deletionCandidates.size === 0"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            @click="doDeletion"
          >
            Delete {{ deletionCandidates.size || '' }} selected
          </BlueButton>
          <button class="text-sm text-gray-500 hover:brightness-110 cursor-pointer" @click="cancelMassDelete">
            Stop deleting
          </button>
        </template>

        <!-- Default: action launchers (only show if user has permissions) -->
        <template v-else>
          <button
            v-if="canBulkEditTags"
            class="text-sm text-gray-500 hover:brightness-110 cursor-pointer"
            @click="massActiveState = 'tag'"
          >
            Mass tag
          </button>
          <button
            v-if="canBulkEditSafety"
            class="text-sm text-gray-500 hover:brightness-110 cursor-pointer"
            @click="massActiveState = 'safety'"
          >
            Mass edit safety
          </button>
          <button
            v-if="canBulkDelete"
            class="text-sm text-gray-500 hover:brightness-110 cursor-pointer"
            @click="massActiveState = 'delete'"
          >
            Mass delete
          </button>
        </template>
      </div>
    </div>

    <!-- Error -->
    <p v-if="loadError" class="text-sm text-red-500">{{ loadError }}</p>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- No results -->
    <p v-else-if="!loading && posts.length === 0 && !loadError" class="text-sm text-gray-500">
      No posts found.
    </p>

    <!-- Post grid -->
    <div v-else class="flex flex-wrap gap-1" :class="{ 'select-none': massActiveState !== 'none' }">
      <div
        v-for="post in posts"
        :key="post.id"
        class="relative group cursor-pointer"
        :class="massActiveState === 'delete' && deletionCandidates.has(post.id!) ? 'ring-2 ring-red-500' : ''"
        @click="onPostClick(post)"
      >
        <!-- Thumbnail link (only navigates when not in mass mode) -->
        <RouterLink
          v-if="massActiveState === 'none' && canViewPosts"
          :to="postUrl(post.id!)"
          class="block"
          @click.stop
        >
          <img
            :src="post.thumbnailUrl"
            :alt="`Post #${post.id}`"
            class="w-32 h-32 object-cover block"
            loading="lazy"
          />
          <PostBadges :post="post" />
        </RouterLink>

        <!-- Non-navigable thumbnail in mass modes -->
        <template v-else>
          <img
            :src="post.thumbnailUrl"
            :alt="`Post #${post.id}`"
            class="w-32 h-32 object-cover block"
            loading="lazy"
          />
          <PostBadges :post="post" />
        </template>

        <!-- Safety flipper overlay (mass safety mode) -->
        <div
          v-if="massActiveState === 'safety' && canBulkEditSafety"
          class="absolute inset-0 flex items-end justify-center pb-1 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop
        >
          <div class="flex gap-1">
            <button
              v-for="s in safetyOptions"
              :key="s.value"
              class="w-4 h-4 rounded-full border-2 border-white cursor-pointer"
              :class="[s.bgClass, post.safety === s.value ? 'ring-2 ring-white scale-125' : 'opacity-75 hover:opacity-100']"
              :title="s.label"
              @click="setSafety(post, s.value)"
            />
          </div>
        </div>

        <!-- Delete selection indicator -->
        <div
          v-if="massActiveState === 'delete'"
          class="absolute top-1 right-1 w-5 h-5 border-2 border-white flex items-center justify-center"
          :class="deletionCandidates.has(post.id!) ? 'bg-red-500' : 'bg-black/50'"
        >
          <CheckIcon v-if="deletionCandidates.has(post.id!)" :size="12" class="text-white" />
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalCount > pageSize" class="flex justify-center">
      <Pagination
        :current-page="currentPage"
        :total-count="totalCount"
        :page-size="pageSize"
        @page-change="goToPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { Check as CheckIcon } from '@lucide/vue';
import { useTokenStore } from '@/stores/api';
import { useSettingsStore } from '@/stores/settings';
import type { PagedResponsePostInfo } from '@/types/oxibooru.gen';
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import BlueButton from '@/components/BlueButton.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Pagination from '@/components/Pagination.vue';
import PostBadges from '@/components/PostBadges.vue';

type PostItem = PagedResponsePostInfo['results'][0];

const route = useRoute();
const router = useRouter();
const app = useTokenStore();
const { settings } = useSettingsStore();
const serverName = computed(() => app.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Posts',
}));

const pageSize = computed(() => settings.postsPerPage ?? 42);

const posts = ref<PostItem[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const loadError = ref('');
const massActiveState = ref<'tag' | 'safety' | 'delete' | 'none'>('none');
const lockedMassTag = ref('');
const deletionCandidates = ref<Set<number>>(new Set());

const safetyOptions = [
  { value: 'safe' as const, label: 'Safe', bgClass: 'bg-green-500' },
  { value: 'sketchy' as const, label: 'Sketchy', bgClass: 'bg-yellow-400' },
  { value: 'unsafe' as const, label: 'Unsafe', bgClass: 'bg-red-500' },
];

const canViewPosts = computed(() => app.hasPrivilege('post_view'));
const canBulkEditTags = computed(() => app.hasPrivilege('post_bulk_edit_tag'));
const canBulkEditSafety = computed(() => app.hasPrivilege('post_bulk_edit_safety'));
const canBulkDelete = computed(() => app.hasPrivilege('post_bulk_delete'));

const searchQuery = computed(() => (route.query.query as string) ?? '');

const currentPage = computed(() => {
  const offset = Number(route.query.offset ?? 0);
  return Math.floor(offset / pageSize.value) + 1;
});

const safetyFilter = computed(() => {
  const { safe, sketchy, unsafe } = settings.listPosts;
  const enabled: string[] = [];
  if (safe) enabled.push('safe');
  if (sketchy) enabled.push('sketchy');
  if (unsafe) enabled.push('unsafe');
  if (enabled.length === 3 || enabled.length === 0) return '';
  return `rating:${enabled.join(',')}`;
});

const fullQuery = computed(() => {
  const parts: string[] = [];
  if (searchQuery.value) parts.push(searchQuery.value);
  if (safetyFilter.value) parts.push(safetyFilter.value);
  return parts.join(' ');
});

function postUrl(id: number) {
  const q: Record<string, string> = {};
  if (route.query.query) q.query = route.query.query as string;
  if (route.query.offset) q.offset = route.query.offset as string;
  return { path: `/post/${id}`, query: q };
}

async function fetchPosts(offset: number) {
  loading.value = true;
  loadError.value = '';
  const result = await app.listPosts(fullQuery.value, offset, pageSize.value);
  loading.value = false;
  if (!result.success) {
    loadError.value = result.description;
    return;
  }
  posts.value = result.data.results;
  totalCount.value = result.data.total ?? 0;
}

function goToPage(page: number) {
  const offset = (page - 1) * pageSize.value;
  router.push({
    path: '/posts',
    query: { ...route.query, offset: offset > 0 ? String(offset) : undefined },
  });
}

const toggleSafety = (mode: 'safe' | 'sketchy' | 'unsafe') => {
  settings.listPosts[mode] = !settings.listPosts[mode];
};

async function onPostClick(post: PostItem) {
  if (massActiveState.value === 'delete') {
    const id = post.id!;
    const next = new Set(deletionCandidates.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    deletionCandidates.value = next;
  } else if (massActiveState.value === 'tag' && lockedMassTag.value && post.id && post.version) {
    const currentTags = (post.tags ?? []).map((t) => t.names[0] ?? '').filter(Boolean);
    const tagIdx = currentTags.indexOf(lockedMassTag.value);
    const newTags = tagIdx >= 0
      ? currentTags.filter((_, i) => i !== tagIdx)
      : [...currentTags, lockedMassTag.value];
    const result = await app.updatePost(post.id, { version: post.version, tags: newTags });
    if (result.success) {
      post.tags = result.data.tags;
      post.version = result.data.version;
    }
  }
}

function cancelMassDelete() {
  massActiveState.value = 'none';
  deletionCandidates.value = new Set();
}

function startMassTagging(tag: string) {
  if (!tag.trim()) return;
  lockedMassTag.value = tag.trim();
}

function stopMassTagging() {
  massActiveState.value = 'none';
  lockedMassTag.value = '';
}

async function setSafety(post: PostItem, safety: 'safe' | 'sketchy' | 'unsafe') {
  if (!post.id || !post.version) return;
  const result = await app.updatePost(post.id, { version: post.version, safety });
  if (result.success) {
    post.safety = result.data.safety;
  }
}

async function doDeletion() {
  const ids = [...deletionCandidates.value];
  for (const id of ids) {
    const post = posts.value.find((p) => p.id === id);
    if (!post?.version) continue;
    await app.deletePost(id, post.version);
  }
  cancelMassDelete();
  fetchPosts((currentPage.value - 1) * pageSize.value);
}

onMounted(() => {
  fetchPosts((currentPage.value - 1) * pageSize.value);
});

watch(
  () => [route.query.query, route.query.offset],
  ([, o]) => {
    fetchPosts(Number(o ?? 0));
  },
);

watch(
  () => settings.listPosts,
  () => {
    fetchPosts((currentPage.value - 1) * pageSize.value);
  },
  { deep: true },
);
</script>

<style lang="css">
.safety-rows {
  display: grid;
  grid-template-columns: repeat(4, auto);
  grid-template-rows: 1fr;
  gap: 0.5rem;
  align-items: center;
}
</style>
