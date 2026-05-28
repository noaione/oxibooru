<template>
  <div class="flex flex-col gap-4 w-full">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold">Tags</h1>
      <RouterLink
        v-if="canEditCategories"
        to="/tag-categories"
        class="text-sm text-cyan-500 hover:underline ml-auto"
      >
        Manage categories
      </RouterLink>
    </div>

    <!-- Search + Sort -->
    <form class="flex flex-wrap gap-2" @submit.prevent="applySearch">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search tags…"
        class="flex-1 min-w-40 px-2 py-1 overlay-color border-2 border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors text-sm"
      />
      <select
        v-model="sortBy"
        class="px-2 py-1 overlay-color border-2 border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors text-sm cursor-pointer"
        @change="applySearch"
      >
        <option value="sort:name">Name</option>
        <option value="sort:usages">Post count</option>
        <option value="sort:creation-time">Creation date</option>
      </select>
      <button
        type="submit"
        class="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors cursor-pointer"
      >
        Search
      </button>
    </form>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-4 text-red-500 text-sm">{{ error }}</div>

    <!-- Results -->
    <template v-else>
      <div class="text-sm text-gray-500">
        {{ totalCount.toLocaleString() }} tag{{ totalCount !== 1 ? 's' : '' }}
      </div>

      <div v-if="tags.length === 0" class="card p-8 text-center text-gray-500 text-sm">
        No tags found.
      </div>

      <table v-else class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th class="pb-2 font-medium">Name</th>
            <th class="pb-2 font-medium">Category</th>
            <th class="pb-2 font-medium text-right">Posts</th>
            <th class="pb-2 font-medium text-right">Implications</th>
            <th v-if="canEditTags" class="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tag in tags"
            :key="tag.names?.[0]"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <td class="py-2 pr-4">
              <RouterLink
                :to="`/tag/${encodeURIComponent(tag.names?.[0] ?? '')}`"
                class="font-medium hover:underline"
                :style="tagColor(tag.category)"
              >
                {{ displayTag(tag.names?.[0] ?? '') }}
              </RouterLink>
              <span
                v-if="tag.names && tag.names.length > 1"
                class="ml-2 text-xs text-gray-400"
              >
                +{{ tag.names.length - 1 }} alias{{ tag.names.length - 1 !== 1 ? 'es' : '' }}
              </span>
            </td>
            <td class="py-2 pr-4">
              <span
                v-if="tag.category && tag.category !== 'default'"
                class="px-1.5 py-0.5 text-xs rounded border"
                :style="tagColor(tag.category)"
              >
                {{ tag.category }}
              </span>
              <span v-else class="text-xs text-gray-400">default</span>
            </td>
            <td class="py-2 pr-4 text-right tabular-nums">
              <RouterLink
                :to="`/posts?query=${encodeURIComponent(tag.names?.[0] ?? '')}`"
                class="hover:underline text-gray-600 dark:text-gray-400"
              >
                {{ (tag.usages ?? 0).toLocaleString() }}
              </RouterLink>
            </td>
            <td class="py-2 pr-4 text-right tabular-nums text-gray-500">
              {{ (tag.implications?.length ?? 0) }}
            </td>
            <td v-if="canEditTags" class="py-2 text-right">
              <RouterLink
                :to="`/tag/${encodeURIComponent(tag.names?.[0] ?? '')}/edit`"
                class="text-xs text-cyan-500 hover:underline"
              >
                Edit
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>

      <Pagination
        :current-page="currentPage"
        :total-count="totalCount"
        :page-size="PAGE_SIZE"
        @page-change="goToPage"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useSettingsStore } from '@/stores/settings';
import type { TagInfo } from '@/types/oxibooru.gen';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Pagination from '@/components/Pagination.vue';

useHeadSafe({ title: 'Tags' });

const PAGE_SIZE = 50;

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const settings = useSettingsStore();

const tags = ref<TagInfo[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const error = ref('');

const searchInput = ref((route.query.query as string) || '');
const sortBy = ref((route.query.sort as string) || 'sort:usages');

const currentPage = computed(() => {
  const p = Number(route.query.page);
  return p > 0 ? p : 1;
});

const canEditTags = computed(() => api.hasPrivilege('tag_edit'));
const canEditCategories = computed(() => api.hasPrivilege('tag_category_edit'));

function displayTag(raw: string) {
  return settings.settings.tagUnderscoresAsSpaces ? raw.replace(/_/g, ' ') : raw;
}

function tagColor(category?: string): Record<string, string> {
  if (!category || category === 'default') return {};
  return { color: `var(--tag-cat-${category})` };
}

async function fetchTags() {
  loading.value = true;
  error.value = '';

  const query = [
    searchInput.value.trim() ? `*${searchInput.value.trim()}*` : '',
    sortBy.value,
  ]
    .filter(Boolean)
    .join(' ');

  const offset = (currentPage.value - 1) * PAGE_SIZE;
  const result = await api.listTags(query, offset, PAGE_SIZE);

  loading.value = false;

  if (!result.success) {
    error.value = result.description;
    return;
  }

  tags.value = result.data.results ?? [];
  totalCount.value = result.data.total ?? 0;
}

function applySearch() {
  router.push({
    name: 'tags',
    query: {
      ...(searchInput.value.trim() ? { query: searchInput.value.trim() } : {}),
      sort: sortBy.value,
      page: 1,
    },
  });
}

function goToPage(page: number) {
  router.push({
    name: 'tags',
    query: { ...route.query, page },
  });
}

watch(
  () => route.query,
  (q) => {
    searchInput.value = (q.query as string) || '';
    sortBy.value = (q.sort as string) || 'sort:usages';
    fetchTags();
  },
);

onMounted(fetchTags);
</script>
