<template>
  <div class="flex flex-col gap-4 w-full max-w-3xl mx-auto">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Merge Pools</h1>
      <RouterLink :to="`/pool/${sourceId}`" class="text-sm text-cyan-500 hover:underline ml-auto">
        Back to pool
      </RouterLink>
    </div>

    <div v-if="!canMerge" class="card p-4 text-red-500 text-sm">
      You don't have permission to merge pools.
    </div>

    <template v-else>
      <div v-if="loadError" class="card p-4 text-red-500 text-sm">{{ loadError }}</div>

      <template v-else-if="pool1 && pool2">
        <!-- Side-by-side cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="(pool, idx) in [pool1, pool2]"
            :key="idx"
            class="card p-4 flex flex-col gap-3 cursor-pointer transition-colors"
            :class="
              basePoolId === pool.id
                ? 'ring-2 ring-cyan-500'
                : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
            "
            @click="basePoolId = pool.id!"
          >
            <!-- Thumbnail -->
            <img
              v-if="pool.posts?.[0]?.thumbnailUrl"
              :src="resolveApiUrl(pool.posts[0].thumbnailUrl)"
              class="w-full h-32 object-cover"
            />
            <div
              v-else
              class="w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-sm"
            >
              No posts
            </div>

            <div class="flex items-center justify-between">
              <span class="font-semibold" :style="poolColor(pool.category)">
                {{ pool.names?.[0] ?? `Pool #${pool.id}` }}
              </span>
              <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input v-model="basePoolId" type="radio" :value="pool.id" />
                Keep this
              </label>
            </div>

            <div class="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5">
              <span v-if="pool.category">
                Category: <span :style="poolColor(pool.category)">{{ pool.category }}</span>
              </span>
              <span
                >{{ (pool.postCount ?? 0).toLocaleString() }} post{{
                  pool.postCount !== 1 ? 's' : ''
                }}</span
              >
              <span v-if="pool.names && pool.names.length > 1">
                {{ pool.names.length - 1 }} alias{{ pool.names.length - 1 !== 1 ? 'es' : '' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Info + confirm -->
        <div class="card p-4 flex flex-col gap-3 text-sm">
          <p class="text-gray-600 dark:text-gray-400">
            Posts from the removed pool are appended to the surviving pool. The removed pool is
            permanently deleted.
          </p>

          <div v-if="basePoolId && removePool" class="text-xs text-gray-500 dark:text-gray-400">
            <p>
              <strong :style="poolColor(removePool.category)">{{
                removePool.names?.[0] ?? `Pool #${removePool.id}`
              }}</strong>
              will be deleted.
              <strong :style="poolColor(basePool?.category)">{{
                basePool?.names?.[0] ?? `Pool #${basePoolId}`
              }}</strong>
              will survive with merged posts.
            </p>
          </div>

          <p v-if="mergeError" class="text-red-500 text-xs">{{ mergeError }}</p>

          <FlatButton
            type="button"
            kind="danger"
            :disabled="!basePoolId || merging"
            class="w-fit"
            @click="confirmMerge"
          >
            {{ merging ? 'Merging…' : 'Merge pools' }}
          </FlatButton>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onDeactivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import { usePoolCacheStore } from '@/stores/cache';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { PoolInfo } from '@/types/oxibooru.gen';
import FlatButton from '@/components/FlatButton.vue';
import { resolveApiUrl } from '@/utils/url';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const poolCache = usePoolCacheStore();
const confirm = useConfirm();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({ title: serverName.value + ' - Merge Pools' }));

const sourceId = computed(() => Number(route.params.id));
const otherId = computed(() => Number(route.params.other));

const canMerge = computed(() => api.hasPrivilege('pool_merge'));

const pool1 = ref<PoolInfo | null>(null);
const pool2 = ref<PoolInfo | null>(null);
const loadError = ref('');
const merging = ref(false);
const mergeError = ref('');

const basePoolId = ref<number | null>(null);

const basePool = computed(() => {
  if (!basePoolId.value) return null;
  return basePoolId.value === pool1.value?.id ? pool1.value : pool2.value;
});

const removePool = computed(() => {
  if (!basePoolId.value) return null;
  return basePoolId.value === pool1.value?.id ? pool2.value : pool1.value;
});

function poolColor(category?: string): Record<string, string> {
  if (!category || category === 'default') return {};
  return { color: `var(--pool-cat-${category})` };
}

async function loadPools() {
  if (!sourceId.value || !otherId.value) return; // nan/invalid

  loadError.value = '';

  const cachedPool1 = poolCache.getPool(sourceId.value);
  const cachedPool2 = poolCache.getPool(otherId.value);

  if (cachedPool1 && cachedPool2) {
    pool1.value = cachedPool1;
    pool2.value = cachedPool2;
    basePoolId.value = cachedPool1.id ?? null;
    return;
  }

  loader.start();
  try {
    const [r1, r2] = await Promise.all([api.getPool(sourceId.value), api.getPool(otherId.value)]);

    if (!r1.success) {
      loadError.value = `Pool #${sourceId.value}: ${r1.description}`;
      return;
    }

    if (!r2.success) {
      loadError.value = `Pool #${otherId.value}: ${r2.description}`;
      return;
    }

    pool1.value = r1.data;
    pool2.value = r2.data;
    poolCache.setPool(sourceId.value, r1.data);
    poolCache.setPool(otherId.value, r2.data);
    basePoolId.value = r1.data.id ?? null;
  } finally {
    loader.done();
  }
}

async function confirmMerge() {
  if (!basePoolId.value || !basePool.value || !removePool.value) return;
  if (!basePool.value.version || !removePool.value.version) return;

  const ok = await confirm.confirm({
    title: 'Merge pools?',
    message: `"${removePool.value.names?.[0] ?? `Pool #${removePool.value.id}`}" will be permanently deleted and its posts merged into "${basePool.value.names?.[0] ?? `Pool #${basePool.value.id}`}". This cannot be undone.`,
    confirmLabel: 'Merge',
  });
  if (!ok) return;

  merging.value = true;
  mergeError.value = '';

  const result = await api.mergePool({
    mergeTo: basePool.value.id!,
    mergeToVersion: basePool.value.version,
    remove: removePool.value.id!,
    removeVersion: removePool.value.version,
  });

  merging.value = false;

  if (result.success) {
    poolCache.invalidatePool(removePool.value.id!);
    poolCache.setPool(basePool.value.id!, result.data);
    toast.showSuccess(`Pools merged. Pool #${removePool.value.id} was deleted.`);
    router.push(`/pool/${basePool.value.id}`);
  } else {
    mergeError.value = result.description;
  }
}

onMounted(loadPools);

onDeactivated(() => {
  pool1.value = null;
  pool2.value = null;
  loadError.value = '';
});
</script>
