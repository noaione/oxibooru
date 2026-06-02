<template>
  <div class="flex flex-col gap-4 w-full max-w-4xl">
    <div class="flex items-start gap-3">
      <h1 class="text-xl font-semibold">Comments</h1>
    </div>

    <div v-if="!canList" class="card p-4 text-red-500 dark:text-red-400 text-sm">
      You don't have permission to view comments.
    </div>

    <template v-else>
      <div v-if="loadError" class="card p-4 text-red-500 dark:text-red-400 text-sm">
        {{ loadError }}
      </div>

      <template v-else>
        <p
          v-if="!loading && comments.length === 0"
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          No comments found.
        </p>

        <div class="flex flex-col gap-3">
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="card overflow-hidden flex flex-col xs:flex-row items-stretch"
          >
            <!-- Post thumbnail -->
            <RouterLink
              :to="`/post/${comment.postId}`"
              class="shrink-0 h-1/2 w-full xs:h-auto xs:w-28 sm:w-38 md:w-48 transition-[width,height] bg-gray-100 dark:bg-gray-800"
            >
              <img
                v-if="postThumbnails.get(comment.postId!)"
                :src="resolveApiUrl(postThumbnails.get(comment.postId!))"
                alt=""
                class="w-full h-full object-contain xs:object-cover"
              />
              <div v-else class="w-full h-full min-h-16" />
            </RouterLink>

            <!-- Comment content -->
            <div class="flex-1 min-w-0 p-3 flex flex-col gap-2">
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
        </div>

        <!-- Pagination -->
        <Pagination
          v-if="total > pageSize"
          :current-page="currentPage"
          :total-count="total"
          :page-size="pageSize"
          @page-change="goToPage"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import type { CommentInfo } from '@/types/oxibooru.gen';
import CommentItem from '@/components/CommentItem.vue';
import Pagination from '@/components/Pagination.vue';
import { resolveApiUrl } from '@/utils/url';

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
const postThumbnails = ref(new Map<number, string>());

const offset = computed(() => Number(route.query.offset ?? 0));
const currentPage = computed(() => {
  return Math.floor(offset.value / pageSize) + 1;
});

async function fetchComments() {
  loader.start();
  loading.value = true;
  loadError.value = '';

  const result = await api.listComments(offset.value, pageSize);

  loader.done();
  loading.value = false;

  if (!result.success) {
    loadError.value = result.description;
    return;
  }

  comments.value = result.data.results;
  total.value = result.data.total;

  const ids = [...new Set(result.data.results.map((c) => c.postId).filter((id) => id != null))];
  postThumbnails.value = await api.fetchPostThumbnails(ids);
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

onMounted(() => {
  fetchComments();
});
</script>
