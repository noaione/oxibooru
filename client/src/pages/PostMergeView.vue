<template>
  <div class="flex flex-col gap-4 w-full max-w-4xl mx-auto">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Merge Posts</h1>
      <RouterLink to="/posts" class="text-sm text-cyan-500 hover:underline ml-auto">Back to posts</RouterLink>
    </div>

    <!-- Privilege guard -->
    <div v-if="!canMerge" class="card p-4 text-red-500 text-sm">
      You don't have permission to merge posts.
    </div>

    <template v-else>
      <!-- Load error -->
      <div v-if="loadError" class="card p-4 text-red-500 text-sm">{{ loadError }}</div>

      <template v-else-if="post1 && post2">
        <!-- Side-by-side -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Post 1 -->
          <div
            class="card p-3 flex flex-col gap-2 cursor-pointer transition-colors"
            :class="mergeToId === post1.id ? 'ring-2 ring-cyan-500' : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'"
            @click="mergeToId = post1.id!"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium text-sm">Post #{{ post1.id }}</span>
              <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input v-model="mergeToId" type="radio" :value="post1.id" />
                Keep this post
              </label>
            </div>
            <RouterLink :to="`/post/${post1.id}`" target="_blank" class="block">
              <img
                v-if="post1.type === 'image' || post1.type === 'animation'"
                :src="resolveApiUrl(post1.thumbnailUrl)"
                :alt="`Post #${post1.id}`"
                class="w-full max-h-48 object-contain bg-gray-100 dark:bg-gray-800"
              />
              <video
                v-else-if="post1.type === 'video'"
                :src="resolveApiUrl(post1.contentUrl)"
                class="w-full max-h-48 object-contain bg-gray-100 dark:bg-gray-800"
                muted
              />
            </RouterLink>
            <div class="text-xs text-gray-500 flex flex-col gap-0.5">
              <span>{{ mimeLabel(post1.mimeType) }} · {{ formatFileSize(post1.fileSize) }}</span>
              <span v-if="post1.canvasWidth && post1.canvasHeight">{{ post1.canvasWidth }}×{{ post1.canvasHeight }}</span>
              <span v-if="post1.user?.name">By {{ post1.user.name }}</span>
              <span v-if="post1.creationTime">{{ formatDate(post1.creationTime) }}</span>
              <span>{{ post1.tagCount ?? 0 }} tags · {{ post1.commentCount ?? 0 }} comments</span>
            </div>
            <!-- Use content radio -->
            <label class="flex items-center gap-1.5 text-xs cursor-pointer mt-1">
              <input v-model="useContentFromId" type="radio" :value="post1.id" />
              Use this file
            </label>
          </div>

          <!-- Post 2 -->
          <div
            class="card p-3 flex flex-col gap-2 cursor-pointer transition-colors"
            :class="mergeToId === post2.id ? 'ring-2 ring-cyan-500' : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'"
            @click="mergeToId = post2.id!"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium text-sm">Post #{{ post2.id }}</span>
              <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input v-model="mergeToId" type="radio" :value="post2.id" />
                Keep this post
              </label>
            </div>
            <RouterLink :to="`/post/${post2.id}`" target="_blank" class="block">
              <img
                v-if="post2.type === 'image' || post2.type === 'animation'"
                :src="resolveApiUrl(post2.thumbnailUrl)"
                :alt="`Post #${post2.id}`"
                class="w-full max-h-48 object-contain bg-gray-100 dark:bg-gray-800"
              />
              <video
                v-else-if="post2.type === 'video'"
                :src="resolveApiUrl(post2.contentUrl)"
                class="w-full max-h-48 object-contain bg-gray-100 dark:bg-gray-800"
                muted
              />
            </RouterLink>
            <div class="text-xs text-gray-500 flex flex-col gap-0.5">
              <span>{{ mimeLabel(post2.mimeType) }} · {{ formatFileSize(post2.fileSize) }}</span>
              <span v-if="post2.canvasWidth && post2.canvasHeight">{{ post2.canvasWidth }}×{{ post2.canvasHeight }}</span>
              <span v-if="post2.user?.name">By {{ post2.user.name }}</span>
              <span v-if="post2.creationTime">{{ formatDate(post2.creationTime) }}</span>
              <span>{{ post2.tagCount ?? 0 }} tags · {{ post2.commentCount ?? 0 }} comments</span>
            </div>
            <!-- Use content radio -->
            <label class="flex items-center gap-1.5 text-xs cursor-pointer mt-1">
              <input v-model="useContentFromId" type="radio" :value="post2.id" />
              Use this file
            </label>
          </div>
        </div>

        <!-- Info + Confirm -->
        <div class="card p-4 flex flex-col gap-3 text-sm">
          <p class="text-gray-600 dark:text-gray-400">
            Tags, relations, scores, favorites and comments will be merged into the surviving post.
            All other properties must be handled manually.
          </p>

          <!-- Summary -->
          <div v-if="mergeToId" class="text-xs text-gray-500">
            <p>
              Post #{{ removePost?.id }} will be deleted.
              Post #{{ mergeToId }} will survive.
              <template v-if="replaceContent"> The file from Post #{{ removePost?.id }} will be used.</template>
            </p>
          </div>

          <!-- Error -->
          <p v-if="mergeError" class="text-red-500 text-xs">{{ mergeError }}</p>

          <FlatButton
            type="button"
            kind="danger"
            class="w-fit"
            :disabled="!mergeToId || merging"
            @click="confirmMerge"
          >
            {{ merging ? 'Merging…' : 'Merge posts' }}
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
import { usePostCacheStore } from '@/stores/cache';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { PostInfo } from '@/types/oxibooru.gen';
import { resolveApiUrl } from '@/utils/url';
import FlatButton from '@/components/FlatButton.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const postCache = usePostCacheStore();
const confirm = useConfirm();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Merge Post',
}));

const id1 = computed(() => Number(route.params.id1));
const id2 = computed(() => Number(route.params.id2));

const post1 = ref<PostInfo | null>(null);
const post2 = ref<PostInfo | null>(null);
const loadError = ref('');
const merging = ref(false);
const mergeError = ref('');

const mergeToId = ref<number | null>(null);
const useContentFromId = ref<number | null>(null);

const canMerge = computed(() => api.hasPrivilege('post_merge'));

const removePost = computed(() => {
  if (!mergeToId.value) return null;
  return mergeToId.value === post1.value?.id ? post2.value : post1.value;
});

const survivePost = computed(() => {
  if (!mergeToId.value) return null;
  return mergeToId.value === post1.value?.id ? post1.value : post2.value;
});

const replaceContent = computed(() => {
  if (!mergeToId.value || !useContentFromId.value) return false;
  return useContentFromId.value !== mergeToId.value;
});

async function loadPosts() {
  if (!id1.value || !id2.value) return; // nan/invalid

  loadError.value = '';

  const cachedPost1 = postCache.getPost(id1.value);
  const cachedPost2 = postCache.getPost(id2.value);

  if (cachedPost1 && cachedPost2) {
    post1.value = cachedPost1;
    post2.value = cachedPost2;
    mergeToId.value = cachedPost1.id ?? null;
    useContentFromId.value = cachedPost1.id ?? null;
    return;
  }

  loader.start();
  const [r1, r2] = await Promise.all([
    api.getPost(id1.value),
    api.getPost(id2.value),
  ]);
  loader.done();

  if (!r1.success) {
    loadError.value = `Post #${id1.value}: ${r1.description}`;
    return;
  }
  if (!r2.success) {
    loadError.value = `Post #${id2.value}: ${r2.description}`;
    return;
  }

  post1.value = r1.data;
  post2.value = r2.data;
  postCache.setPost(id1.value, r1.data);
  postCache.setPost(id2.value, r2.data);
  mergeToId.value = r1.data.id ?? null;
  useContentFromId.value = r1.data.id ?? null;
}

async function confirmMerge() {
  if (!mergeToId.value || !removePost.value || !survivePost.value) return;
  if (!survivePost.value.version || !removePost.value.version) return;

  const ok = await confirm.confirm({
    title: 'Merge posts?',
    message: `Post #${removePost.value.id} will be permanently deleted. Post #${mergeToId.value} will survive with merged metadata. This cannot be undone.`,
    confirmLabel: 'Merge',
  });
  if (!ok) return;

  merging.value = true;
  mergeError.value = '';

  const result = await api.mergePost({
    mergeTo: mergeToId.value,
    mergeToVersion: survivePost.value.version,
    remove: removePost.value.id!,
    removeVersion: removePost.value.version,
    replaceContent: replaceContent.value,
  });

  merging.value = false;

  if (result.success) {
    postCache.invalidatePost(removePost.value.id!);
    postCache.setPost(mergeToId.value!, result.data);
    toast.showSuccess(`Posts merged. Post #${removePost.value.id} was deleted.`);
    router.push(`/post/${mergeToId.value}`);
  } else {
    mergeError.value = result.description;
  }
}

// ── Helpers ───────────────────────────────────────────────────
const MIME_LABELS: Record<string, string> = {
  'image/gif': 'GIF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/bmp': 'BMP',
  'image/avif': 'AVIF',
  'image/heif': 'HEIF',
  'image/heic': 'HEIC',
  'video/webm': 'WEBM',
  'video/mp4': 'MPEG-4',
  'video/quicktime': 'MOV',
};

function mimeLabel(mime?: string): string {
  return mime ? (MIME_LABELS[mime] ?? mime) : '';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size.toFixed(1)} ${units[unit]}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

onMounted(loadPosts);

onDeactivated(() => {
  post1.value = null;
  post2.value = null;
  loadError.value = '';
});
</script>
