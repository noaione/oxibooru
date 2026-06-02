<template>
  <div class="flex flex-col gap-4 w-full max-w-4xl mx-auto">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Snapshots</h1>
    </div>

    <div v-if="!canList" class="card p-4 text-red-500 text-sm">
      You don't have permission to view snapshots.
    </div>

    <template v-else>
      <div v-if="loadError" class="card p-4 text-red-500 text-sm">{{ loadError }}</div>

      <template v-else>
        <p
          v-if="!loading && snapshots.length === 0"
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          No snapshots found.
        </p>

        <div class="flex flex-col gap-2">
          <div
            v-for="snap in snapshots"
            :key="snap.id"
            class="p-3 flex items-start gap-3 text-sm"
            :class="operationCardClass(snap.operation)"
          >
            <!-- Resource + user + time -->
            <div class="flex-1 min-w-0 flex flex-col gap-0.5">
              <!-- Operation badge -->
              <span
                class="shrink-0 my-1 inline-block px-2 w-fit py-0.5 rounded text-xs font-semibold capitalize"
                :class="operationClass(snap.operation)"
              >
                {{ snap.operation ?? 'unknown' }}
              </span>
              <div class="flex items-center flex-wrap">
                <span class="text-gray-500 dark:text-gray-400 capitalize font-bold">
                  {{ formatType(snap.type) }}&nbsp;
                </span>
                <component
                  :is="resourceLink(snap) ? 'RouterLink' : 'span'"
                  :to="resourceLink(snap)"
                  class="font-medium"
                  :class="resourceLink(snap) ? 'text-cyan-500 hover:underline' : ''"
                >
                  {{ formatResourceId(snap) }}
                </component>
              </div>

              <div class="flex items-center text-xs text-gray-400 flex-wrap">
                <span v-if="snap.user?.name">
                  by
                  <AvatarLink :name="snap.user.name" :avatar-url="snap.user.avatarUrl" />
                </span>
                <span v-else>by anonymous</span>
                &nbsp;<RelativeTime v-if="snap.time" :time="snap.time" />
              </div>

              <SnapshotDetail :snap="snap" />
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <Pagination
          v-if="totalCount > pageSize"
          :current-page="currentPage"
          :total-count="totalCount"
          :page-size="pageSize"
          @page-change="goToPage"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import type { ResourceOperation, ResourceType, SnapshotInfo } from '@/types/oxibooru.gen';
import Pagination from '@/components/Pagination.vue';
import RelativeTime from '@/components/RelativeTime.vue';
import AvatarLink from '@/components/AvatarLink.vue';
import SnapshotDetail from '@/components/SnapshotDetail.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({ title: serverName.value + ' - History' }));

const pageSize = 30;
const canList = computed(() => api.hasPrivilege('snapshot_list'));

const snapshots = ref<SnapshotInfo[]>([]);
const totalCount = ref(0);
const loadError = ref('');
const loading = ref(false);

const offset = computed(() => Number(route.query.offset ?? 0));
const currentPage = computed(() => {
  return Math.floor(offset.value / pageSize) + 1;
});

async function fetchSnapshots() {
  loader.start();
  loading.value = true;
  loadError.value = '';

  let result: Awaited<ReturnType<typeof api.listSnapshots>>;
  try {
    result = await api.listSnapshots(offset.value, pageSize);
  } catch (e) {
    result = {
      success: false,
      description: `Failed to load snapshots: ${e}`,
    };
  } finally {
    loader.done();
  }

  loading.value = false;

  if (!result.success) {
    loadError.value = result.description;
    return;
  }

  totalCount.value = result.data.total;
  snapshots.value = result.data.results;
}

function goToPage(page: number) {
  const offset = (page - 1) * pageSize;
  router.push({ query: { ...route.query, offset: offset > 0 ? String(offset) : undefined } });
}

function operationCardClass(op?: ResourceOperation): string {
  switch (op) {
    case 'created':
      return 'bg-green-100 dark:bg-green-950/30 border border-green-300 dark:border-green-800';
    case 'modified':
      return 'bg-yellow-100 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-800';
    case 'deleted':
      return 'bg-red-100 dark:bg-red-950/30 border border-red-300 dark:border-red-800';
    case 'merged':
      return 'bg-purple-100 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800';
    default:
      return 'border border-gray-300 dark:border-gray-700';
  }
}

function operationClass(op?: ResourceOperation): string {
  switch (op) {
    case 'created':
      return 'bg-green-300 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case 'modified':
      return 'bg-yellow-300 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    case 'deleted':
      return 'bg-red-300 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    case 'merged':
      return 'bg-blue-300 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    default:
      return 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

function formatType(type?: ResourceType): string {
  return type?.replace(/_/g, ' ') ?? 'unknown';
}

function resourceLink(snap: SnapshotInfo): string | null {
  if (!snap.id) return null;
  switch (snap.type) {
    case 'post':
      return `/post/${snap.id}`;
    case 'tag':
      return `/tag/${encodeURIComponent(snap.id)}`;
    case 'pool':
      return `/pool/${snap.id}`;
    case 'user':
      return `/user/${encodeURIComponent(snap.id)}`;
    case 'tag_category':
      return `/tag-categories`;
    case 'pool_category':
      return `/pool-categories`;
    default:
      return null;
  }
}
function formatResourceId(snap: SnapshotInfo): string {
  if (!snap.id) return '';
  switch (snap.type) {
    case 'post':
      return `@${snap.id}`;
    case 'tag':
      return `#${snap.id}`;
    case 'pool':
      return `%${snap.id}`;
    case 'user':
      return `+${snap.id}`;
    case 'tag_category':
      return snap.id;
    case 'pool_category':
      return snap.id;
    default:
      return '';
  }
}

watch(() => route.query, fetchSnapshots, { immediate: false });

onMounted(() => {
  fetchSnapshots();
});
</script>
