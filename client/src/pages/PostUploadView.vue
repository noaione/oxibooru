<template>
  <div class="flex flex-col gap-4 w-full max-w-4xl mx-auto">
    <h1 class="text-xl font-semibold">Upload</h1>

    <!-- Privilege guard -->
    <div v-if="!canUpload" class="card p-4 text-red-500 dark:text-red-400 text-sm">
      You don't have permission to upload posts.
    </div>

    <template v-else>
      <!-- Drop zone -->
      <div
        class="card border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
        :class="
          isDragging
            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-cyan-400'
        "
        @click="fileInputRef?.click()"
        @dragenter.prevent="isDragging = true"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onFileDrop"
      >
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*,video/*,application/x-shockwave-flash,application/vnd.adobe.flash.movie"
          class="hidden"
          @change="onFileInput"
        />
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          Drag &amp; drop files here or <span class="text-cyan-500">click to select</span>
        </p>
        <p class="text-gray-400 dark:opacity-90 text-xs mt-1">
          Supported: JPG, PNG, GIF, WEBP, AVIF, HEIF, MP4, WEBM, MOV, SWF, JXL
        </p>
      </div>

      <!-- URL input -->
      <div class="flex gap-2">
        <FlatInput
          v-model="urlInput"
          type="url"
          class="flex-1 px-3 py-2 text-sm"
          placeholder="Or paste a URL…"
          @keydown.enter.prevent="addUrl"
        />
        <FlatButton type="button" :disabled="!urlInput.trim()" @click="addUrl"> Add </FlatButton>
      </div>

      <!-- Queue -->
      <div v-if="items.length" class="flex flex-col gap-3">
        <!-- Options bar -->
        <div class="flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input v-model="skipDuplicates" type="checkbox" />
            Skip duplicates
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input v-model="alwaysUploadSimilar" type="checkbox" />
            Force upload similar
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input v-model="pauseOnError" type="checkbox" checked />
            Pause on error
          </label>
        </div>

        <!-- Submit / Cancel -->
        <div class="flex gap-2">
          <FlatButton
            type="button"
            :disabled="
              isSubmitting || items.every((i) => i.state === 'done' || i.state === 'skipped')
            "
            @click="submitAll"
          >
            {{ isSubmitting ? 'Uploading…' : 'Upload all' }}
          </FlatButton>
          <FlatButton v-if="isSubmitting" type="button" kind="neutral" @click="cancelUpload">
            Cancel
          </FlatButton>
        </div>

        <!-- Item list -->
        <div class="flex flex-col gap-4">
          <div
            v-for="item in items"
            :key="item.key"
            class="card p-3 flex gap-3"
            :class="{
              'opacity-60': item.state === 'done' || item.state === 'skipped',
              'ring-2 ring-red-400': item.state === 'error',
              'ring-2 ring-yellow-400': item.state === 'needs-confirm',
            }"
          >
            <!-- Preview -->
            <div
              class="shrink-0 w-24 h-24 bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center"
            >
              <img
                v-if="item.previewUrl && item.type === 'file'"
                :src="item.previewUrl"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <video
                v-else-if="item.previewUrl && item.type === 'url'"
                :src="item.previewUrl"
                class="w-full h-full object-cover"
                muted
              />
              <span v-else class="text-xs text-gray-400">No preview</span>
            </div>

            <!-- Form -->
            <div class="flex-1 min-w-0 flex flex-col gap-2 text-sm">
              <!-- Name / state header -->
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ item.name }}</p>
                <div class="flex items-center gap-1.5 shrink-0">
                  <!-- State badge -->
                  <span
                    v-if="item.state !== 'idle'"
                    class="text-xs px-1.5 py-0.5"
                    :class="stateBadgeClass(item.state)"
                    >{{ stateLabel(item.state) }}</span
                  >
                  <!-- Remove (only when idle or error) -->
                  <button
                    v-if="item.state === 'idle' || item.state === 'error'"
                    type="button"
                    class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer leading-none"
                    title="Remove"
                    @click="removeItem(item.key)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Safety (only editable when idle) -->
              <div v-if="enableSafety" class="flex gap-3 text-xs">
                <label
                  v-for="s in safetyOptions"
                  :key="s.value"
                  class="flex items-center gap-1 cursor-pointer"
                  :class="
                    item.safety === s.value ? s.activeClass : 'text-gray-500 dark:text-gray-400'
                  "
                >
                  <input
                    v-model="item.safety"
                    type="radio"
                    :value="s.value"
                    :disabled="item.state !== 'idle'"
                    class="sr-only"
                  />
                  <span class="w-2 h-2 rounded-full" :class="s.dotClass" />
                  {{ s.label }}
                </label>
              </div>

              <!-- Tags -->
              <div :class="{ 'pointer-events-none opacity-50': item.state !== 'idle' }">
                <AutoCompleteTag
                  mode="input"
                  v-model="item.tags"
                  class="bg-gray-50! dark:bg-gray-800!"
                  input-class="bg-gray-50! dark:bg-gray-800!"
                  dropdown-class="bg-gray-50! dark:bg-gray-800!"
                  placeholder="Add tags…"
                />
              </div>

              <!-- Source -->
              <FlatInput
                v-model="item.source"
                type="text"
                class="w-full px-2 py-1 text-xs bg-gray-50! dark:bg-gray-800!"
                placeholder="Source URL (optional)"
                :disabled="item.state !== 'idle'"
              />

              <!-- Error message -->
              <p
                v-if="item.state === 'error' && item.error"
                class="text-xs text-red-500 dark:text-red-400"
              >
                {{ item.error }}
              </p>

              <!-- Needs-confirm: exact duplicate -->
              <div
                v-if="item.state === 'needs-confirm' && item.exactPost"
                class="flex flex-col gap-1.5 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700"
              >
                <p class="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                  Exact duplicate: Post #{{ item.exactPost.id }}
                </p>
                <RouterLink
                  :to="`/post/${item.exactPost.id}`"
                  target="_blank"
                  class="text-xs text-cyan-500 hover:underline"
                >
                  View post ↗
                </RouterLink>
                <div class="flex gap-2 mt-1">
                  <FlatButton
                    type="button"
                    class="px-2 py-0.5 text-xs"
                    kind="warn"
                    @click="resolveConfirm('confirm', item.key)"
                  >
                    Upload anyway
                  </FlatButton>
                  <FlatButton
                    type="button"
                    class="px-2 py-0.5 text-xs"
                    kind="neutral"
                    @click="resolveConfirm('skip', item.key)"
                  >
                    Skip
                  </FlatButton>
                </div>
              </div>

              <!-- Needs-confirm: similar posts -->
              <div
                v-else-if="item.state === 'needs-confirm' && item.similar.length"
                class="flex flex-col gap-1.5 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700"
              >
                <p class="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                  {{ item.similar.length }} similar
                  {{ item.similar.length === 1 ? 'post' : 'posts' }} found
                </p>
                <div class="flex gap-1 flex-wrap">
                  <RouterLink
                    v-for="sim in item.similar.slice(0, 5)"
                    :key="sim.post.id"
                    :to="`/post/${sim.post.id}`"
                    target="_blank"
                    :title="`Post #${sim.post.id} (${Math.round((1 - sim.distance) * 100)}% match)`"
                    class="block"
                  >
                    <img
                      :src="resolveApiUrl(sim.post.thumbnailUrl)"
                      :alt="`Post #${sim.post.id}`"
                      class="w-12 h-12 object-cover hover:ring-2 hover:ring-cyan-500"
                    />
                  </RouterLink>
                </div>
                <div class="flex gap-2 mt-1">
                  <FlatButton
                    type="button"
                    kind="warn"
                    class="px-2 py-0.5 text-xs"
                    @click="resolveConfirm('confirm', item.key)"
                  >
                    Upload anyway
                  </FlatButton>
                  <FlatButton
                    type="button"
                    kind="neutral"
                    class="px-2 py-0.5 text-xs"
                    @click="resolveConfirm('skip', item.key)"
                  >
                    Skip
                  </FlatButton>
                </div>
              </div>

              <!-- Done: link to created post -->
              <RouterLink
                v-if="item.state === 'done' && item.createdPostId"
                :to="`/post/${item.createdPostId}`"
                class="text-xs text-cyan-500 hover:underline"
              >
                View Post #{{ item.createdPostId }} ↗
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useToast } from '@/composables/useToast';
import type { PostInfo, PostSafety, SimilarPost } from '@/types/oxibooru.gen';
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import { resolveApiUrl } from '@/utils/url';
import FlatButton from '@/components/FlatButton.vue';
import FlatInput from '@/components/FlatInput.vue';

type ItemState =
  | 'idle'
  | 'uploading'
  | 'searching'
  | 'needs-confirm'
  | 'creating'
  | 'done'
  | 'skipped'
  | 'error';

interface UploadItem {
  key: string;
  type: 'file' | 'url';
  file?: File;
  url?: string;
  previewUrl: string;
  name: string;
  safety: PostSafety;
  tags: string[];
  source: string;
  state: ItemState;
  token?: string;
  error?: string;
  exactPost?: PostInfo;
  similar: SimilarPost[];
  confirmedSimilar: boolean;
  createdPostId?: number;
}

const router = useRouter();
const api = useTokenStore();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Upload',
}));

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const urlInput = ref('');
const items = ref<UploadItem[]>([]);
const isSubmitting = ref(false);
const skipDuplicates = ref(false);
const alwaysUploadSimilar = ref(false);
const pauseOnError = ref(true);
let cancelled = false;
let confirmResolver: ((action: 'confirm' | 'skip') => void) | null = null;
let pendingConfirmKey: string | null = null;

const canUpload = computed(() => api.hasPrivilege('post_create'));
const enableSafety = computed(() => api.config?.config.enableSafety ?? false);

const safetyOptions = [
  {
    value: 'safe' as const,
    label: 'Safe',
    dotClass: 'bg-green-500',
    activeClass: 'text-green-600 dark:text-green-400',
  },
  {
    value: 'sketchy' as const,
    label: 'Sketchy',
    dotClass: 'bg-yellow-400',
    activeClass: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    value: 'unsafe' as const,
    label: 'Unsafe',
    dotClass: 'bg-red-500',
    activeClass: 'text-red-600 dark:text-red-400',
  },
];

function makeKey(name: string, extra?: number): string {
  return `${name}-${extra ?? Date.now()}`;
}

function addFiles(files: FileList | File[]) {
  for (const file of Array.from(files)) {
    const key = makeKey(file.name, file.size);
    if (items.value.some((i) => i.key === key)) continue;
    const previewUrl = URL.createObjectURL(file);
    items.value.push({
      key,
      type: 'file',
      file,
      previewUrl,
      name: file.name,
      safety: 'safe',
      tags: [],
      source: '',
      state: 'idle',
      similar: [],
      confirmedSimilar: false,
    });
  }
}

function addUrl() {
  const url = urlInput.value.trim();
  if (!url) return;
  const key = makeKey(url);
  if (!items.value.some((i) => i.key === key)) {
    items.value.push({
      key,
      type: 'url',
      url,
      previewUrl: url,
      name: url,
      safety: 'safe',
      tags: [],
      source: url,
      state: 'idle',
      similar: [],
      confirmedSimilar: false,
    });
  }
  urlInput.value = '';
}

function onFileInput(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files) addFiles(files);
  (e.target as HTMLInputElement).value = '';
}

function onFileDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
}

function removeItem(key: string) {
  const idx = items.value.findIndex((i) => i.key === key);
  if (idx === -1) return;
  const item = items.value[idx]!;
  if (item.type === 'file' && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  items.value.splice(idx, 1);
}

function resolveConfirm(action: 'confirm' | 'skip', key: string) {
  if (pendingConfirmKey === key && confirmResolver) {
    confirmResolver(action);
    confirmResolver = null;
    pendingConfirmKey = null;
  }
}

function cancelUpload() {
  cancelled = true;
  if (confirmResolver) {
    confirmResolver('skip');
    confirmResolver = null;
    pendingConfirmKey = null;
  }
}

function stateBadgeClass(state: ItemState): string {
  switch (state) {
    case 'uploading':
    case 'searching':
    case 'creating':
      return 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300';
    case 'needs-confirm':
      return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
    case 'done':
      return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    case 'skipped':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
    case 'error':
      return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    default:
      return '';
  }
}

function stateLabel(state: ItemState): string {
  switch (state) {
    case 'uploading':
      return 'Uploading…';
    case 'searching':
      return 'Checking…';
    case 'needs-confirm':
      return 'Needs review';
    case 'creating':
      return 'Creating…';
    case 'done':
      return 'Done';
    case 'skipped':
      return 'Skipped';
    case 'error':
      return 'Error';
    default:
      return '';
  }
}

async function submitAll() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  cancelled = false;
  let anyFailures = false;

  for (const item of items.value) {
    if (cancelled) break;
    if (item.state === 'done' || item.state === 'skipped') continue;

    item.state = 'uploading';
    item.error = undefined;
    item.exactPost = undefined;
    item.similar = [];
    item.token = undefined;

    // Upload file to get token
    if (item.type === 'file' && item.file) {
      const r = await api.uploadContent(item.file);
      if (cancelled) break;
      if (!r.success) {
        item.state = 'error';
        item.error = r.description;
        anyFailures = true;
        if (pauseOnError.value) break;
        continue;
      }
      item.token = r.data.token;
    }

    // Reverse search
    item.state = 'searching';
    const searchParams = item.token ? { contentToken: item.token } : { contentUrl: item.url };
    const searchResult = await api.reverseSearch(searchParams);

    if (cancelled) break;

    if (searchResult.success) {
      const { exactPost, similarPosts } = searchResult.data;

      if (exactPost) {
        if (skipDuplicates.value) {
          item.state = 'skipped';
          continue;
        }
        item.exactPost = exactPost;
        item.state = 'needs-confirm';
        const action = await new Promise<'confirm' | 'skip'>((resolve) => {
          confirmResolver = resolve;
          pendingConfirmKey = item.key;
        });
        if (action === 'skip' || cancelled) {
          item.state = 'skipped';
          if (cancelled) break;
          continue;
        }
      } else if (similarPosts.length && !alwaysUploadSimilar.value && !item.confirmedSimilar) {
        item.similar = similarPosts;
        item.state = 'needs-confirm';
        const action = await new Promise<'confirm' | 'skip'>((resolve) => {
          confirmResolver = resolve;
          pendingConfirmKey = item.key;
        });
        if (action === 'skip' || cancelled) {
          item.state = 'skipped';
          if (cancelled) break;
          continue;
        }
        item.confirmedSimilar = true;
      }
    }

    if (cancelled) break;

    // Create post
    item.state = 'creating';
    const createResult = await api.createPost({
      contentToken: item.token,
      contentUrl: item.type === 'url' ? item.url : undefined,
      safety: item.safety,
      tags: item.tags.length ? item.tags : undefined,
      source: item.source || undefined,
    });

    if (cancelled) break;

    if (!createResult.success) {
      item.state = 'error';
      item.error = createResult.description;
      anyFailures = true;
      if (pauseOnError.value) break;
    } else {
      item.state = 'done';
      item.createdPostId = createResult.data.id;
    }
  }

  isSubmitting.value = false;

  if (
    !anyFailures &&
    !cancelled &&
    items.value.every((i) => i.state === 'done' || i.state === 'skipped')
  ) {
    toast.showSuccess('All posts uploaded!');
    router.push('/posts');
  }
}
</script>
