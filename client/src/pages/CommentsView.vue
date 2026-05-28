<template>
  <div class="flex flex-col gap-4 w-full max-w-3xl mx-auto">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Comments</h1>
    </div>

    <div v-if="!canList" class="card p-4 text-red-500 text-sm">
      You don't have permission to view comments.
    </div>

    <template v-else>
      <!-- Search -->
      <form class="flex gap-2" @submit.prevent="applySearch">
        <FlatInput
          v-model="searchInput"
          type="search"
          placeholder="Search comments…"
          class="flex-1 bg-gray-50! dark:bg-gray-800!"
        />
        <FlatButton type="submit">Search</FlatButton>
      </form>

      <div v-if="loadError" class="card p-4 text-red-500 text-sm">{{ loadError }}</div>

      <template v-else>
        <p v-if="!loading && comments.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          No comments found.
        </p>

        <div class="flex flex-col gap-4">
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="card p-4 flex flex-col gap-2"
          >
            <!-- Post link -->
            <RouterLink
              :to="`/post/${comment.postId}`"
              class="text-xs text-cyan-500 hover:underline"
            >
              Post #{{ comment.postId }}
            </RouterLink>

            <CommentItem
              :comment="comment"
              @update="(c) => updateComment(c)"
              @delete="(id) => removeComment(id)"
            />
          </div>
        </div>

        <!-- Pagination -->
        <Pagination
          v-if="total > pageSize"
          :total="total"
          :offset="offset"
          :limit="pageSize"
          @change="(o) => goToPage(o)"
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
import type { CommentInfo } from '@/types/oxibooru.gen';
import CommentItem from '@/components/CommentItem.vue';
import Pagination from '@/components/Pagination.vue';
import FlatButton from '@/components/FlatButton.vue';
import FlatInput from '@/components/FlatInput.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({ title: serverName.value + ' - Comments' }));

const pageSize = 20;
const canList = computed(() => api.hasPrivilege('comment_list'));

const comments = ref<CommentInfo[]>([]);
const total = ref(0);
const loadError = ref('');
const loading = ref(false);

const searchInput = ref((route.query.q as string) ?? '');
const query = computed(() => (route.query.q as string) ?? '');
const offset = computed(() => Number(route.query.offset ?? 0));

async function fetchComments() {
  loader.start();
  loading.value = true;
  loadError.value = '';

  const result = await api.listComments(query.value, offset.value, pageSize);

  loader.done();
  loading.value = false;

  if (!result.success) {
    loadError.value = result.description;
    return;
  }

  comments.value = result.data.results;
  total.value = result.data.total;
}

function applySearch() {
  router.push({ query: { q: searchInput.value || undefined, offset: undefined } });
}

function goToPage(newOffset: number) {
  router.push({ query: { ...route.query, offset: newOffset || undefined } });
}

function updateComment(updated: CommentInfo) {
  const idx = comments.value.findIndex((c) => c.id === updated.id);
  if (idx !== -1) comments.value[idx] = updated;
}

function removeComment(id: number) {
  comments.value = comments.value.filter((c) => c.id !== id);
  total.value = Math.max(0, total.value - 1);
}

watch(() => route.query, fetchComments, { immediate: false });

onMounted(() => {
  searchInput.value = query.value;
  fetchComments();
});
</script>
