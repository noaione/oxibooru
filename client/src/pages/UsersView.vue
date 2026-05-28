<template>
  <div class="flex flex-col gap-6">
    <!-- Search header -->
    <form class="flex flex-row gap-2 items-center flex-wrap" @submit.prevent="search">
      <div class="flex flex-col gap-1 items-center w-full max-w-full md:max-w-[30%]">
        <FlatInput
          id="users-search"
          v-model="searchQuery"
          class="w-full"
        />
      </div>
      <div class="flex items-center mt-2 md:mt-0 gap-2">
        <FlatButton class="ml-0 md:ml-2" type="submit">
          Search
        </FlatButton>
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

    <!-- No results -->
    <p v-if="!loader.loading && users.length === 0 && !loadError" class="text-sm text-gray-500">
      No users found.
    </p>

    <!-- User grid -->
    <div v-else class="flex flex-wrap gap-4">
      <div
        v-for="u in users"
        :key="u.name"
        class="flex flex-col items-center gap-2 w-48 card p-3"
      >
        <RouterLink v-if="canViewUsers" :to="`/user/${u.name}`" class="flex flex-col items-center gap-2">
          <img
            v-if="u.avatarUrl"
            :src="resolveApiUrl(u.avatarUrl)"
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
            :src="resolveApiUrl(u.avatarUrl)"
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
        <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
          <div><strong>Registered</strong>: {{ formatDate(u.creationTime) }}</div>
          <div><strong>Last seen</strong>: {{ formatDate(u.lastLoginTime) }}</div>
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
import { useLoaderStore } from '@/stores/loader';
import type { PagedResponseUserInfo } from '@/types/oxibooru.gen';
import FlatButton from '@/components/FlatButton.vue';
import FlatInput from '@/components/FlatInput.vue';
import Pagination from '@/components/Pagination.vue';
import { resolveApiUrl } from '@/utils/url';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Users',
}));

const PAGE_SIZE = 30;

const canViewUsers = computed(() => api.hasPrivilege('user_view'));

type UserItem = PagedResponseUserInfo['results'][0];

const users = ref<UserItem[]>([]);
const totalCount = ref(0);
const loadError = ref('');
const searchQuery = ref((route.query.query as string) ?? '');

const currentPage = computed(() => {
  const offset = Number(route.query.offset ?? 0);
  return Math.floor(offset / PAGE_SIZE) + 1;
});

async function fetchUsers(query: string, offset: number) {
  loader.start();
  loadError.value = '';
  const result = await api.listUsers(query, offset, PAGE_SIZE);
  loader.done();
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
