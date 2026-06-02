<template>
  <div class="flex flex-col gap-4 w-full">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">Pools</h1>
      <div class="flex items-center gap-3">
        <RouterLink
          to="/help/search/pools"
          class="text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          Syntax help
        </RouterLink>
        <RouterLink
          v-if="canCreate"
          to="/pools/create"
          class="text-sm text-cyan-500 hover:underline"
        >
          Create pool
        </RouterLink>
        <RouterLink
          v-if="canEditCategories"
          to="/pool-categories"
          class="text-sm text-cyan-500 hover:underline"
        >
          Manage categories
        </RouterLink>
      </div>
    </div>

    <!-- Search + Sort -->
    <div class="flex flex-wrap gap-2">
      <FlatInput
        v-model="searchInput"
        type="search"
        placeholder="Search pools…"
        class="flex-1 min-w-40"
        @keydown.enter="applySearch"
      />
      <FlatSelect v-model="sortBy" @change="applySearch">
        <option value="sort:name">Name</option>
        <option value="sort:creation-time">Creation date</option>
        <option value="sort:post-count">Post count</option>
      </FlatSelect>
    </div>

    <!-- Error -->
    <div v-if="error" class="card p-4 text-red-500 dark:text-red-400 text-sm">{{ error }}</div>

    <template v-else>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ totalCount.toLocaleString() }} pool{{ totalCount !== 1 ? 's' : '' }}
      </div>

      <div
        v-if="!loader.loading && pools.length === 0"
        class="card p-8 text-center text-gray-500 dark:text-gray-400 text-sm"
      >
        No pools found.
      </div>

      <div v-else class="flex flex-col gap-2">
        <div v-for="pool in pools" :key="pool.id" class="card p-3 flex items-center gap-3">
          <!-- Thumbnail -->
          <RouterLink :to="`/pool/${pool.id}`" class="shrink-0">
            <img
              v-if="pool.posts?.[0]?.thumbnailUrl"
              :src="resolveApiUrl(pool.posts[0].thumbnailUrl)"
              :alt="`Pool #${pool.id}`"
              class="w-16 h-16 object-cover"
            />
            <div
              v-else
              class="w-16 h-16 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs"
            >
              Empty
            </div>
          </RouterLink>

          <!-- Info -->
          <div class="flex-1 min-w-0 w-fit">
            <RouterLink
              :to="`/pool/${pool.id}`"
              class="font-medium hover:underline block truncate w-fit"
              :style="poolColor(pool.category)"
            >
              {{ pool.names?.[0] ?? `Pool #${pool.id}` }}
            </RouterLink>
            <div class="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400 w-fit">
              <span
                v-if="pool.category"
                class="px-1.5 py-0.5 rounded border"
                :style="poolColor(pool.category)"
              >
                {{ pool.category }}
              </span>
              <span>
                {{ (pool.postCount ?? 0).toLocaleString() }} post{{
                  pool.postCount !== 1 ? 's' : ''
                }}
              </span>
            </div>
          </div>

          <!-- Edit link -->
          <div v-if="canEdit" class="shrink-0 mr-2">
            <RouterLink :to="`/pool/${pool.id}/edit`" class="text-xs text-cyan-500 hover:underline">
              Edit
            </RouterLink>
          </div>
        </div>
      </div>

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
import { useLoaderStore } from '@/stores/loader';
import type { PoolInfo } from '@/types/oxibooru.gen';
import FlatInput from '@/components/FlatInput.vue';
import FlatSelect from '@/components/FlatSelect.vue';
import Pagination from '@/components/Pagination.vue';
import { resolveApiUrl } from '@/utils/url';

const PAGE_SIZE = 50;

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({ title: serverName.value + ' - Pools' }));

const pools = ref<PoolInfo[]>([]);
const totalCount = ref(0);
const error = ref('');

const searchInput = ref((route.query.query as string) || '');
const sortBy = ref((route.query.sort as string) || 'sort:name');

const currentPage = computed(() => {
  const p = Number(route.query.page);
  return p > 0 ? p : 1;
});

const canCreate = computed(() => api.hasPrivilege('pool_create'));
const canEdit = computed(() => api.hasPrivilege('pool_edit'));
const canEditCategories = computed(() => api.hasPrivilege('pool_category_edit'));

function poolColor(category?: string): Record<string, string> {
  if (!category) return {};
  return { color: `var(--pool-cat-${category})`, borderColor: `var(--pool-cat-${category})` };
}

async function fetchPools() {
  loader.start();
  error.value = '';

  const parts: string[] = [];
  if (searchInput.value.trim()) parts.push(`*${searchInput.value.trim()}*`);
  parts.push(sortBy.value);

  const offset = (currentPage.value - 1) * PAGE_SIZE;
  const result = await api.listPools(parts.join(' '), offset, PAGE_SIZE);

  loader.done();

  if (!result.success) {
    error.value = result.description;
    return;
  }

  pools.value = result.data.results ?? [];
  totalCount.value = result.data.total ?? 0;
}

function applySearch() {
  router.push({
    name: 'pools',
    query: {
      ...(searchInput.value.trim() ? { query: searchInput.value.trim() } : {}),
      sort: sortBy.value,
      page: 1,
    },
  });
}

function goToPage(page: number) {
  router.push({ name: 'pools', query: { ...route.query, page } });
}

watch(
  () => route.query,
  (q) => {
    searchInput.value = (q.query as string) || '';
    sortBy.value = (q.sort as string) || 'sort:name';
    fetchPools();
  },
);

onMounted(fetchPools);
</script>
