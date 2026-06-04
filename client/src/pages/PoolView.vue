<template>
  <div v-if="loadError" class="flex items-start justify-center pt-8">
    <div class="w-full max-w-lg">
      <p class="text-red-500 dark:text-red-400">{{ loadError }}</p>
    </div>
  </div>

  <div v-else-if="pool" class="flex flex-col gap-6">
    <!-- Header + tab nav -->
    <div>
      <h1 class="text-2xl font-semibold mb-3">
        {{ pool.names?.[0] ?? `Pool #${pool.id}` }}
      </h1>
      <nav class="overflow-x-auto border-b border-gray-300 dark:border-gray-600">
        <div class="flex gap-1 min-w-max">
          <RouterLink
            :to="`/pool/${pool.id}`"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="
              section === 'summary'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            "
          >
            Summary
          </RouterLink>
          <RouterLink
            v-if="canEdit"
            :to="`/pool/${pool.id}/edit`"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="
              section === 'edit'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            "
          >
            Edit
          </RouterLink>
          <RouterLink
            v-if="canDelete"
            :to="`/pool/${pool.id}/delete`"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="
              section === 'delete'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            "
          >
            Delete
          </RouterLink>
        </div>
      </nav>
    </div>

    <!-- ── Summary ─────────────────────────────────────────────── -->
    <div v-if="section === 'summary'" class="flex flex-col gap-4">
      <!-- Meta -->
      <div class="card p-4 flex flex-col gap-2 text-sm">
        <div v-if="pool.names && pool.names.length > 1" class="flex flex-wrap gap-1">
          <span class="text-gray-500 dark:text-gray-400">Aliases:</span>
          <span
            v-for="alias in pool.names.slice(1)"
            :key="alias"
            class="text-gray-700 dark:text-gray-300"
            >{{ alias }}</span
          >
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-500 dark:text-gray-400">Category:</span>
          <span :style="poolColor(pool.category)">{{ pool.category ?? 'default' }}</span>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400">Posts:</span>
          {{ (pool.postCount ?? 0).toLocaleString() }}
        </div>
      </div>

      <!-- Description -->
      <div v-if="renderedDescription" class="card p-4 text-sm">
        <div
          class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
          v-html="renderedDescription"
        />
      </div>

      <!-- Merge -->
      <div v-if="canMerge" class="card p-4">
        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Merge with another pool
        </p>
        <form class="flex gap-2" @submit.prevent="goToMerge">
          <FlatInput
            v-model="mergeTargetId"
            type="number"
            placeholder="Other pool ID…"
            class="flex-1 px-2 py-1 text-sm bg-gray-50! dark:bg-gray-800!"
            min="1"
          />
          <FlatButton kind="warn" type="submit" :disabled="!mergeTargetId.trim()">
            Merge
          </FlatButton>
        </form>
      </div>

      <!-- Post grid -->
      <div v-if="pool.posts && pool.posts.length > 0" class="flex flex-col gap-2">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Posts ({{ pool.postCount ?? pool.posts.length }})
        </h2>
        <div
          class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1"
        >
          <RouterLink
            v-for="(post, idx) in pool.posts"
            :key="post.id"
            :to="`/post/${post.id}`"
            class="relative group block"
          >
            <img
              :src="resolveApiUrl(post.thumbnailUrl)"
              :alt="`Post #${post.id}`"
              class="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            <span
              class="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1 leading-5 select-none"
            >
              {{ idx + 1 }}
            </span>
          </RouterLink>
        </div>
      </div>
      <p v-else class="text-sm text-gray-500 dark:text-gray-400">No posts in this pool.</p>
    </div>

    <!-- ── Edit ────────────────────────────────────────────────── -->
    <div v-else-if="section === 'edit'" class="flex flex-col gap-4 w-full max-w-2xl">
      <p v-if="editError" class="text-sm text-red-500 dark:text-red-400">{{ editError }}</p>

      <!-- Names -->
      <div v-if="canEditName" class="flex flex-col gap-1">
        <label class="text-sm font-medium"
          >Names
          <span class="text-xs text-gray-500 dark:text-gray-400 font-normal"
            >(one per line; first is primary)</span
          ></label
        >
        <FlatTextarea
          v-model="editNames"
          rows="3"
          class="w-full text-sm"
          placeholder="pool_name&#10;alias_one"
        />
      </div>

      <!-- Category -->
      <div v-if="canEditCategory" class="flex flex-col gap-1">
        <label class="text-sm font-medium">Category</label>
        <FlatSelect v-model="editCategory" class="w-full max-w-xs">
          <option v-for="cat in categories" :key="cat.name" :value="cat.name">
            {{ cat.name }}
          </option>
        </FlatSelect>
      </div>

      <!-- Description -->
      <div v-if="canEditDescription" class="flex flex-col gap-1">
        <label class="text-sm font-medium"
          >Description
          <span class="text-xs text-gray-500 dark:text-gray-400 font-normal"
            >(Markdown)</span
          ></label
        >
        <FlatTextarea
          v-model="editDescription"
          rows="5"
          class="w-full text-sm"
          placeholder="Optional description…"
        />
      </div>

      <!-- Post order editor -->
      <div v-if="canEditPosts" class="flex flex-col gap-2">
        <label class="text-sm font-medium"
          >Posts
          <span class="text-xs text-gray-500 dark:text-gray-400 font-normal"
            >(drag order matters)</span
          ></label
        >

        <div v-if="editPosts.length > 0" ref="listRef" class="flex flex-col gap-1">
          <div
            v-for="(ep, idx) in editPosts"
            :key="ep.id"
            class="card flex items-center gap-2 p-2"
            :draggable="true"
            :class="{
              'opacity-25 outline-2 outline-dashed outline-gray-400 dark:outline-gray-500':
                dragIndex === idx,
              'border-t-4 border-cyan-500':
                insertBefore !== null &&
                insertBefore === idx &&
                dragIndex !== null &&
                dragIndex !== idx,
              'border-b-4 border-cyan-500':
                insertBefore !== null &&
                insertBefore === editPosts.length &&
                idx === editPosts.length - 1 &&
                dragIndex !== null,
            }"
          >
            <!-- Drag handle -->
            <span
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none select-none shrink-0 px-1 text-base leading-none"
              title="Drag to reorder"
              @pointerdown="startDrag(idx, $event)"
              @pointermove="onDragMove($event)"
              @pointerup="endDrag"
              @pointercancel="cancelDrag"
              >⠿</span
            >
            <span class="text-xs text-gray-400 tabular-nums text-right shrink-0">{{
              idx + 1
            }}</span>
            <img
              v-if="ep.thumbnailUrl"
              :src="resolveApiUrl(ep.thumbnailUrl)"
              class="w-10 h-10 object-cover shrink-0"
              loading="lazy"
            />
            <div
              v-else
              class="w-10 h-10 bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center text-xs text-gray-400"
            >
              #{{ ep.id }}
            </div>
            <span class="flex-1 text-sm tabular-nums">Post #{{ ep.id }}</span>
            <button
              type="button"
              class="text-red-400 hover:text-red-600 px-1 cursor-pointer shrink-0"
              title="Remove from pool"
              @click="removePost(idx)"
            >
              ✕
            </button>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">No posts yet.</p>

        <!-- Add post by ID -->
        <div class="flex items-center gap-2 mt-1">
          <FlatInput
            v-model="addPostId"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Post ID"
            class="w-32 bg-gray-50! dark:bg-gray-800!"
            @keydown.enter.prevent="addPost"
          />
          <FlatButton type="button" class="px-3 py-1 text-sm" @click="addPost">Add post</FlatButton>
          <span v-if="addPostError" class="text-xs text-red-500 dark:text-red-400">
            {{ addPostError }}
          </span>
        </div>
      </div>

      <!-- Save -->
      <FlatButton class="w-fit" :disabled="editSaving" @click="savePool">
        {{ editSaving ? 'Saving…' : 'Save' }}
      </FlatButton>
    </div>

    <!-- ── Delete ───────────────────────────────────────────────── -->
    <div v-else-if="section === 'delete'" class="w-full max-w-sm card p-5">
      <form class="flex flex-col gap-4" @submit.prevent="submitDelete">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Delete <strong>{{ pool.names?.[0] ?? `Pool #${pool.id}` }}</strong
          >? The {{ pool.postCount ?? 0 }} post{{ pool.postCount !== 1 ? 's' : '' }} will not be
          deleted.
        </p>

        <label class="flex items-start gap-2 text-sm cursor-pointer">
          <input
            v-model="deleteConfirm"
            type="checkbox"
            class="w-4 h-4 mt-0.5 accent-cyan-500 shrink-0"
            required
          />
          I confirm that I want to delete this pool.
        </label>

        <p v-if="deleteError" class="text-sm text-red-500 dark:text-red-400">{{ deleteError }}</p>

        <FlatButton
          type="submit"
          kind="danger"
          class="w-fit"
          :disabled="deleteLoading || !deleteConfirm"
        >
          {{ deleteLoading ? 'Deleting…' : 'Delete pool' }}
        </FlatButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, onDeactivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import { useCategoriesStore } from '@/stores/categories';
import { usePoolCacheStore } from '@/stores/cache';
import { useToast } from '@/composables/useToast';
import type { PoolInfo } from '@/types/oxibooru.gen';
import FlatButton from '@/components/FlatButton.vue';
import FlatInput from '@/components/FlatInput.vue';
import FlatSelect from '@/components/FlatSelect.vue';
import FlatTextarea from '@/components/FlatTextarea.vue';
import { renderMarkdown } from '@/utils/markdown';
import { resolveApiUrl } from '@/utils/url';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const categoriesStore = useCategoriesStore();
const poolCache = usePoolCacheStore();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

const poolId = computed(() => Number(route.params.id));
const section = computed(() => {
  const name = route.name as string;
  if (name === 'pool-edit') return 'edit';
  if (name === 'pool-delete') return 'delete';
  return 'summary';
});

const pool = ref<PoolInfo | null>(null);
const loadError = ref('');

// ── Privileges ────────────────────────────────────────────────
const canEdit = computed(() => api.hasPrivilege('pool_edit'));
const canEditName = computed(() => api.hasPrivilege('pool_edit_name'));
const canEditCategory = computed(() => api.hasPrivilege('pool_edit_category'));
const canEditDescription = computed(() => api.hasPrivilege('pool_edit_description'));
const canEditPosts = computed(() => api.hasPrivilege('pool_edit_post'));
const canMerge = computed(() => api.hasPrivilege('pool_merge'));
const canDelete = computed(() => api.hasPrivilege('pool_delete'));

// ── Pool categories (for dropdown) ────────────────────────────
const categories = computed(() => categoriesStore.pools);

// ── Edit state ─────────────────────────────────────────────────
interface EditPost {
  id: number;
  thumbnailUrl: string;
}

const mergeTargetId = ref('');

function goToMerge() {
  const id = mergeTargetId.value.trim();
  if (!id || isNaN(Number(id))) return;
  router.push(`/pool/${pool.value!.id}/merge/${Number(id)}`);
}

const editNames = ref('');
const editCategory = ref('');
const editDescription = ref('');
const editPosts = ref<EditPost[]>([]);
const editSaving = ref(false);
const editError = ref('');
const addPostId = ref('');
const addPostError = ref('');

function syncEditFields() {
  if (!pool.value) return;
  editNames.value = (pool.value.names ?? []).join('\n');
  editCategory.value = pool.value.category ?? categories.value[0]?.name ?? '';
  editDescription.value = pool.value.description ?? '';
  editPosts.value = (pool.value.posts ?? []).map((p) => ({
    id: p.id,
    thumbnailUrl: p.thumbnailUrl ?? '',
  }));
  editError.value = '';
  addPostId.value = '';
  addPostError.value = '';
}

watch(pool, (p) => {
  if (p) syncEditFields();
});

// ── Delete state ───────────────────────────────────────────────
const deleteConfirm = ref(false);
const deleteError = ref('');
const deleteLoading = ref(false);

// ── Helpers ───────────────────────────────────────────────────
function poolColor(category?: string): Record<string, string> {
  if (!category) return {};
  return { color: `var(--pool-cat-${category})` };
}

const renderedDescription = computed(() => {
  const d = pool.value?.description;
  return d?.trim() ? renderMarkdown(d) : null;
});

// ── Post editor actions ────────────────────────────────────────
function addPost() {
  const id = parseInt(addPostId.value.trim());
  if (isNaN(id) || id <= 0) {
    addPostError.value = 'Enter a valid post ID.';
    return;
  }
  if (editPosts.value.some((p) => p.id === id)) {
    addPostError.value = 'Post already in pool.';
    return;
  }
  editPosts.value.push({ id, thumbnailUrl: '' });
  addPostId.value = '';
  addPostError.value = '';
}

function removePost(idx: number) {
  editPosts.value.splice(idx, 1);
}

// ── Drag-to-reorder ────────────────────────────────────────────
const listRef = ref<HTMLElement | null>(null);
const dragIndex = ref<number | null>(null);
// insertBefore is a gap index: 0 = before first item, length = after last item
const insertBefore = ref<number | null>(null);

function startDrag(idx: number, e: PointerEvent) {
  e.preventDefault();
  dragIndex.value = idx;
  insertBefore.value = idx;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onDragMove(e: PointerEvent) {
  if (dragIndex.value === null || !listRef.value) return;
  e.preventDefault();
  const items = Array.from(listRef.value.children) as HTMLElement[];
  let ib = items.length;
  for (let i = 0; i < items.length; i++) {
    const rect = items[i]!.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      ib = i;
      break;
    }
  }
  insertBefore.value = ib;
}

function endDrag() {
  if (dragIndex.value !== null && insertBefore.value !== null) {
    const ib = insertBefore.value;
    const di = dragIndex.value;
    if (ib !== di && ib !== di + 1) {
      const arr = [...editPosts.value];
      const [item] = arr.splice(di, 1);
      if (!item) return;
      arr.splice(ib > di ? ib - 1 : ib, 0, item);
      editPosts.value = arr;
    }
  }
  dragIndex.value = null;
  insertBefore.value = null;
}

function cancelDrag() {
  dragIndex.value = null;
  insertBefore.value = null;
}

// ── Save / delete ──────────────────────────────────────────────
async function savePool() {
  if (!pool.value?.id || !pool.value.version) return;
  editSaving.value = true;
  editError.value = '';

  const names = editNames.value
    .split(/[\n\r]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  const result = await api.updatePool(pool.value.id, {
    version: pool.value.version,
    names: canEditName.value ? (names.length ? names : undefined) : undefined,
    category: canEditCategory.value ? editCategory.value || undefined : undefined,
    description: canEditDescription.value ? editDescription.value.trim() || null : undefined,
    posts: canEditPosts.value ? editPosts.value.map((p) => p.id) : undefined,
  });

  editSaving.value = false;

  if (!result.success) {
    editError.value = result.description;
    return;
  }

  pool.value = result.data;
  poolCache.setPool(pool.value.id!, result.data);
  toast.showSuccess('Pool saved.');
}

async function submitDelete() {
  if (!deleteConfirm.value || !pool.value?.id || !pool.value.version) return;
  deleteError.value = '';
  deleteLoading.value = true;

  const result = await api.deletePool(pool.value.id, pool.value.version);
  deleteLoading.value = false;

  if (!result.success) {
    deleteError.value = result.description;
    return;
  }

  poolCache.invalidatePool(pool.value.id!);
  toast.showSuccess('Pool deleted.');
  router.push('/pools');
}

// ── Data loading ───────────────────────────────────────────────
async function loadPool(id: number) {
  if (!id) return; // nan/invalid

  const cached = poolCache.getPool(id);
  if (cached) {
    pool.value = cached;
    loadError.value = '';
    return;
  }

  pool.value = null;
  loader.start();
  loadError.value = '';

  const result = await api.getPool(id);
  loader.done();

  if (!result.success) {
    loadError.value = result.description;
    return;
  }

  pool.value = result.data;
  poolCache.setPool(id, result.data);
}

useHeadSafe(() => ({
  title: pool.value ? `${serverName.value} - Pool #${pool.value.id}` : serverName.value + ' - Pool',
}));

onMounted(() => loadPool(poolId.value));

watch(poolId, (id) => loadPool(id));

onActivated(() => loadPool(poolId.value));

onDeactivated(() => {
  pool.value = null;
  loadError.value = '';
});
</script>
