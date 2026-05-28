<template>
  <div v-if="app.ready" class="flex flex-col gap-4 w-full">
    <!-- Search + safety header -->
    <div class="flex flex-col md:flex-row w-full max-w-full gap-2">
      <AutoCompleteTag
        target="posts"
        :model-value="searchQuery ? [searchQuery] : []"
        class="items-center w-full max-w-full md:max-w-[30%]"
        input-class="w-full"
      />

      <!-- Safety toggles -->
      <div v-if="settingsReady" class="safety-rows ml-0 mt-0 md:ml-2">
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
      <div v-if="settingsReady" class="flex flex-row gap-3 ml-0 mt-0 md:ml-2 w-full items-center flex-wrap">
        <!-- Mass tag mode -->
        <template v-if="massActiveState === 'tag'">
          <AutoCompleteTag
            target="posts"
            override-submit
            class="items-center w-full max-w-full md:max-w-[60%]"
            input-class="w-full"
            @submit="startMassTagging"
          >
            <template #submit>
              Start tagging
            </template>
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
          <span class="text-sm text-gray-400">Shift+click to range-select</span>
          <FlatButton
            :disabled="deletionCandidates.size === 0"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            @click="doDeletion"
            kind="danger"
          >
            Delete {{ deletionCandidates.size || '' }} selected
          </FlatButton>
          <button class="text-sm text-gray-500 hover:brightness-110 cursor-pointer" @click="cancelMassDelete">
            Stop deleting
          </button>
        </template>

        <!-- Default: action launchers -->
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

    <!-- No results -->
    <p v-if="!loader.loading && posts.length === 0 && !loadError" class="text-sm text-gray-500">
      No posts found.
    </p>

    <!-- Post grid -->
    <div
      v-else
      class="w-full gap-1"
      :class="[
        settingsReady && settings.postFlow
          ? 'flex flex-wrap'
          : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
        { 'select-none': massActiveState !== 'none' },
      ]"
    >
      <div
        v-for="post in posts"
        :key="post.id"
        class="relative group cursor-pointer overflow-hidden"
        :class="{
          'ring-2 ring-red-500': massActiveState === 'delete' && deletionCandidates.has(post.id!),
          'hover:ring-2 hover:ring-cyan-500': !(massActiveState === 'delete' && deletionCandidates.has(post.id!)),
          'post-flow-item': settingsReady && settings.postFlow,
        }"
        @click="onPostClick(post)"
      >
        <!-- Thumbnail link (only navigates when not in mass mode) -->
        <RouterLink
          v-if="massActiveState === 'none' && canViewPosts"
          :to="postUrl(post.id!)"
          class="block"
          :title="computeTitle(post)"
          :class="{
            'size-full inline-block': settingsReady && settings.postFlow,
          }"
          @click.stop
        >
          <img
            :src="resolveApiUrl(post.thumbnailUrl)"
            :alt="`Post #${post.id}`"
            :class="['object-cover block group-hover:opacity-90 transition-opacity', thumbnailSizeClass]"
            loading="lazy"
          />
          <PostBadges :post="post" />
        </RouterLink>

        <!-- Non-navigable thumbnail in mass modes -->
        <template v-else>
          <img
            :src="resolveApiUrl(post.thumbnailUrl)"
            :alt="`Post #${post.id}`"
            :class="['object-cover block group-hover:opacity-90 transition-opacity', thumbnailSizeClass]"
            loading="lazy"
          />
          <PostBadges :post="post" />
        </template>

        <!-- Mass tag state indicator -->
        <div
          v-if="massActiveState === 'tag' && lockedMassTags.length > 0"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
          :class="postHasAllTags(post, lockedMassTags) ? 'bg-green-500/40' : 'bg-red-500/30'"
        >
          <span class="text-white font-bold text-2xl select-none drop-shadow">
            {{ postHasAllTags(post, lockedMassTags) ? '−' : '+' }}
          </span>
        </div>

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

      <!-- Flow mode: dummy spacers pad the last row so items don't stretch to fill it -->
      <template v-if="settingsReady && settings.postFlow">
        <div
          v-for="n in 10"
          :key="`dummy-${n}`"
          aria-hidden="true"
          style="flex: 1 1 12vw; min-width: 10em; height: 0"
        />
      </template>
    </div>


    <!-- Endless scroll sentinel — always rendered so the observer can track it -->
    <div v-if="settingsReady && settings.endlessScroll" ref="sentinelRef" class="h-4 w-full" aria-hidden="true" />

    <!-- Pagination (only in paginated mode) -->
    <div v-if="settingsReady && !settings.endlessScroll && totalCount > pageSize" class="flex justify-center">
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
import { ref, computed, watch, watchEffect, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useKeyModifier } from '@vueuse/core';
import { Check as CheckIcon } from '@lucide/vue';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import { useSettingsStore } from '@/stores/settings';
import type { PagedResponsePostInfo } from '@/types/oxibooru.gen';
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import FlatButton from '@/components/FlatButton.vue';
import Pagination from '@/components/Pagination.vue';
import PostBadges from '@/components/PostBadges.vue';
import { resolveApiUrl } from '@/utils/url';

type PostItem = PagedResponsePostInfo['results'][0];

const route = useRoute();
const router = useRouter();
const app = useTokenStore();
const loader = useLoaderStore();
const { settings, ready: settingsReady } = useSettingsStore();
const serverName = computed(() => app.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Posts',
}));

const pageSize = computed(() => settings.postsPerPage ?? 42);

const posts = ref<PostItem[]>([]);
const totalCount = ref(0);
const loadingMore = ref(false);
const loadError = ref('');
const massActiveState = ref<'tag' | 'safety' | 'delete' | 'none'>('none');
const lockedMassTags = ref<string[]>([]);
const deletionCandidates = ref<Set<number>>(new Set());
const lastClickedIdx = ref(-1);
const lastClickedAction = ref<'add' | 'remove'>('add');

const isShiftDown = useKeyModifier('Shift');

const safetyOptions = [
  { value: 'safe' as const, label: 'Safe', bgClass: 'bg-green-500' },
  { value: 'sketchy' as const, label: 'Sketchy', bgClass: 'bg-yellow-400' },
  { value: 'unsafe' as const, label: 'Unsafe', bgClass: 'bg-red-500' },
];

const canViewPosts = computed(() => app.hasPrivilege('post_view'));
const canBulkEditTags = computed(() => app.hasPrivilege('post_bulk_edit_tag'));
const canBulkEditSafety = computed(() => app.hasPrivilege('post_bulk_edit_safety'));
const canBulkDelete = computed(() => app.hasPrivilege('post_bulk_edit_delete'));

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

// Grid mode: fill each cell completely; flow mode: fill the container height
const thumbnailSizeClass = computed(() =>
  settings.postFlow ? 'w-full h-full' : 'w-full aspect-square'
);

function postHasAllTags(post: PostItem, tags: string[]): boolean {
  const postTagNames = (post.tags ?? []).map((t) => t.names[0] ?? '');
  return tags.every((t) => postTagNames.includes(t));
}

function postUrl(id: number) {
  const q: Record<string, string> = {};
  if (route.query.query) q.query = route.query.query as string;
  if (route.query.offset) q.offset = route.query.offset as string;
  return { path: `/post/${id}`, query: q };
}

async function fetchPosts(offset: number) {
  loader.start();
  loadError.value = '';
  lastClickedIdx.value = -1;
  const result = await app.listPosts(fullQuery.value, offset, pageSize.value);
  loader.done();
  if (!result.success) {
    loadError.value = result.description;
    return;
  }
  posts.value = result.data.results;
  totalCount.value = result.data.total ?? 0;
}

async function loadMorePosts() {
  if (loadingMore.value || loader.loading) return;
  if (totalCount.value > 0 && posts.value.length >= totalCount.value) return;
  loadingMore.value = true;
  const result = await app.listPosts(fullQuery.value, posts.value.length, pageSize.value);
  loadingMore.value = false;
  if (result.success) {
    posts.value = [...posts.value, ...result.data.results];
    totalCount.value = result.data.total ?? 0;
  }
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
  const idx = posts.value.findIndex((p) => p.id === post.id);

  if (massActiveState.value === 'delete') {
    if (isShiftDown.value && lastClickedIdx.value >= 0 && idx >= 0) {
      const start = Math.min(lastClickedIdx.value, idx);
      const end = Math.max(lastClickedIdx.value, idx);
      const next = new Set(deletionCandidates.value);
      for (let i = start; i <= end; i++) {
        const id = posts.value[i]?.id;
        if (id != null) {
          if (lastClickedAction.value === 'add') next.add(id);
          else next.delete(id);
        }
      }
      deletionCandidates.value = next;
    } else {
      const id = post.id!;
      const next = new Set(deletionCandidates.value);
      if (next.has(id)) {
        next.delete(id);
        lastClickedAction.value = 'remove';
      } else {
        next.add(id);
        lastClickedAction.value = 'add';
      }
      deletionCandidates.value = next;
    }
    lastClickedIdx.value = idx;
  } else if (massActiveState.value === 'tag' && lockedMassTags.value.length > 0 && post.id && post.version) {
    const currentTags = (post.tags ?? []).map((t) => t.names[0] ?? '').filter(Boolean);
    const allPresent = lockedMassTags.value.every((t) => currentTags.includes(t));
    const newTags = allPresent
      ? currentTags.filter((t) => !lockedMassTags.value.includes(t))
      : [...new Set([...currentTags, ...lockedMassTags.value])];
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
  lastClickedIdx.value = -1;
  lastClickedAction.value = 'add';
}

function startMassTagging(query: string) {
  const tags = query.trim().split(/\s+/).filter(Boolean);
  if (!tags.length) return;
  lockedMassTags.value = tags;
  router.replace({ query: { ...route.query, massTag: tags.join(' ') } });
}

function stopMassTagging() {
  massActiveState.value = 'none';
  lockedMassTags.value = [];
  router.replace({ query: { ...route.query, massTag: undefined } });
}

async function setSafety(post: PostItem, safety: 'safe' | 'sketchy' | 'unsafe') {
  if (!post.id || !post.version) return;
  const result = await app.updatePost(post.id, { version: post.version, safety });
  if (result.success) {
    post.safety = result.data.safety;
    post.version = result.data.version;
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

function computeTitle(post: PostItem) {
  // @ID (Type)
  //
  // Tags: #list #of #tags
  const flatTags = (post.tags?.flatMap((t) => t.names) ?? []).map((t) => `#${t}`);
  return `@${post.id} (${post.type})\n\nTags: ${flatTags.join(', ')}`;
}

// Endless scroll: native IntersectionObserver via watchEffect for reliable reactivity
const sentinelRef = ref<HTMLElement | null>(null);

watchEffect((onCleanup) => {
  const el = sentinelRef.value;
  if (!el) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      if (!settings.endlessScroll || loader.loading || loadingMore.value) return;
      loadMorePosts();
    },
    { threshold: 0 }
  );
  observer.observe(el);
  onCleanup(() => observer.disconnect());
});

onMounted(() => {
  fetchPosts((currentPage.value - 1) * pageSize.value);

  const urlMassTag = route.query.massTag as string | undefined;
  if (urlMassTag) {
    massActiveState.value = 'tag';
    lockedMassTags.value = urlMassTag.split(/\s+/).filter(Boolean);
  }
});

watch(
  () => [route.query.query, route.query.offset] as const,
  ([, o]) => {
    if (settings.endlessScroll) {
      posts.value = [];
      fetchPosts(0);
    } else {
      fetchPosts(Number(o ?? 0));
    }
  },
);

watch(
  () => route.query.massTag as string | undefined,
  (tag) => {
    if (tag) {
      massActiveState.value = 'tag';
      lockedMassTags.value = tag.split(/\s+/).filter(Boolean);
    }
  },
);

watch(
  () => settings.listPosts,
  () => {
    if (settings.endlessScroll) {
      posts.value = [];
      fetchPosts(0);
    } else {
      fetchPosts((currentPage.value - 1) * pageSize.value);
    }
  },
  { deep: true },
);

watch(
  () => settings.endlessScroll,
  () => {
    posts.value = [];
    fetchPosts(0);
  },
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

.post-flow-item {
  display: block;
  flex-grow: 1;
  min-height: 7.5em;
  height: 14vw;
}
</style>
