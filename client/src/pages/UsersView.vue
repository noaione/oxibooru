<template>
  <div class="flex flex-col gap-6">
    <!-- Search header -->
    <form class="flex flex-row gap-2 items-end flex-wrap" @submit.prevent="search">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="users-search">Search query</label>
        <FormInput
          id="users-search"
          v-model="searchQuery"
          class="w-64"
          placeholder="e.g. name:admin"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          type="submit"
          class="px-4 py-1 bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors cursor-pointer"
        >
          Search
        </button>
        <RouterLink
          to="/help/search?t=users"
          class="text-sm text-gray-500 hover:brightness-110"
        >
          Syntax help
        </RouterLink>
      </div>
    </form>

    <!-- Error -->
    <p v-if="loadError" class="text-sm text-red-500">{{ loadError }}</p>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- No results -->
    <p v-else-if="!loading && users.length === 0 && !loadError" class="text-sm text-gray-500">
      No users found.
    </p>

    <!-- User grid -->
    <div v-else class="flex flex-wrap gap-4">
      <div
        v-for="u in users"
        :key="u.name"
        class="flex flex-col items-center gap-2 w-28"
      >
        <RouterLink v-if="canViewUsers" :to="`/user/${u.name}`" class="flex flex-col items-center gap-2">
          <img
            v-if="u.avatarUrl"
            :src="u.avatarUrl"
            :alt="u.name"
            class="w-20 h-20 object-cover"
          />
          <div
            v-else
            class="w-20 h-20 flex items-center justify-center overlay-color border border-gray-300 dark:border-gray-600 text-xl font-bold"
          >
            {{ u.name?.[0]?.toUpperCase() }}
          </div>
          <span class="text-sm text-center break-all">{{ u.name }}</span>
        </RouterLink>
        <template v-else>
          <img
            v-if="u.avatarUrl"
            :src="u.avatarUrl"
            :alt="u.name"
            class="w-20 h-20 object-cover"
          />
          <div
            v-else
            class="w-20 h-20 flex items-center justify-center overlay-color border border-gray-300 dark:border-gray-600 text-xl font-bold"
          >
            {{ u.name?.[0]?.toUpperCase() }}
          </div>
          <span class="text-sm text-center break-all">{{ u.name }}</span>
        </template>
        <div class="text-xs text-gray-500 text-center">
          <div>Registered: {{ formatDate(u.creationTime) }}</div>
          <div>Last seen: {{ formatDate(u.lastLoginTime) }}</div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalCount > PAGE_SIZE" class="flex justify-center">
      <Pagination
        :current-page="currentPage"
        :total-count="totalCount"
        :page-size="PAGE_SIZE"
        @page-change="goToPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import type { PagedResponseUserInfo } from '@/types/oxibooru.gen';
import FormInput from '@/components/FormInput.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Pagination from '@/components/Pagination.vue';

useHeadSafe({ title: 'Users' });

const route = useRoute();
const router = useRouter();
const api = useTokenStore();

const PAGE_SIZE = 30;

const canViewUsers = computed(() => api.hasPrivilege('user_view'));

type UserItem = PagedResponseUserInfo['results'][0];

const users = ref<UserItem[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const loadError = ref('');
const searchQuery = ref((route.query.query as string) ?? '');

const currentPage = computed(() => {
  const offset = Number(route.query.offset ?? 0);
  return Math.floor(offset / PAGE_SIZE) + 1;
});

async function fetchUsers(query: string, offset: number) {
  loading.value = true;
  loadError.value = '';
  const result = await api.listUsers(query, offset, PAGE_SIZE);
  loading.value = false;
  if (!result.success) {
    loadError.value = result.description;
    return;
  }
  users.value = result.data.results;
  totalCount.value = result.data.total ?? 0;
}

function search() {
  router.push({ path: '/users', query: { query: searchQuery.value || undefined } });
}

function goToPage(page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  router.push({
    path: '/users',
    query: { ...route.query, offset: offset > 0 ? String(offset) : undefined },
  });
}

onMounted(() => {
  fetchUsers(searchQuery.value, (currentPage.value - 1) * PAGE_SIZE);
});

watch(
  () => [route.query.query, route.query.offset],
  ([q, o]) => {
    searchQuery.value = (q as string) ?? '';
    fetchUsers(searchQuery.value, Number(o ?? 0));
  },
);

function formatDate(iso?: string | null) {
  if (!iso) return 'never';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>
