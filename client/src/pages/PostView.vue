<template>
  <!-- Error -->
  <div v-if="loadError" class="flex flex-col gap-2">
    <p class="text-red-500">{{ loadError }}</p>
    <RouterLink to="/posts" class="text-sm text-cyan-500 hover:underline">Back to posts</RouterLink>
  </div>

  <!-- Post view -->
  <div v-else-if="post" class="flex flex-col lg:flex-row gap-4 w-full">
    <!-- ── Sidebar ────────────────────────────────────────────────── -->
    <aside class="w-full lg:w-74 shrink-0 flex flex-col gap-4 order-2 lg:order-1">
      <!-- Navigation: prev / next / edit -->
      <nav class="card p-3 flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <RouterLink
            v-if="prevPost"
            :to="neighborUrl(prevPost.id!)"
            class="flex items-center gap-1 text-sm text-cyan-500 hover:underline"
            rel="prev"
          >
            <ChevronLeftIcon :size="14" /> Previous
          </RouterLink>
          <span v-else class="text-sm text-gray-400 flex items-center gap-1">
            <ChevronLeftIcon :size="14" /> Previous
          </span>

          <RouterLink
            v-if="nextPost"
            :to="neighborUrl(nextPost.id!)"
            class="flex items-center gap-1 text-sm text-cyan-500 hover:underline"
            rel="next"
          >
            Next <ChevronRightIcon :size="14" />
          </RouterLink>
          <span v-else class="text-sm text-gray-400 flex items-center gap-1">
            Next <ChevronRightIcon :size="14" />
          </span>
        </div>

        <div class="flex flex-col w-fit gap-1 text-sm">
          <RouterLink
            v-if="isEditMode"
            :to="`/post/${post.id}`"
            class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-cyan-500"
          >
            <EyeIcon :size="13" /> View post
          </RouterLink>
          <RouterLink
            v-else-if="canEditPost"
            :to="`/post/${post.id}/edit`"
            class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-cyan-500"
          >
            <PencilIcon :size="13" /> Edit post
          </RouterLink>
          <RouterLink
            :to="backToListUrl"
            class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-cyan-500"
          >
            <ListIcon :size="13" /> Back to list
          </RouterLink>
        </div>
      </nav>

      <!-- ── Edit mode sidebar ──────────────────────────────────── -->
      <template v-if="isEditMode">
        <div class="card p-3 flex flex-col gap-3 text-sm">
          <!-- Error banner -->
          <p v-if="editError" class="text-red-500 text-xs">{{ editError }}</p>

          <!-- Tags -->
          <section v-if="canEditPostTags" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Tags</label>
            <AutoCompleteTag
              mode="input"
              v-model="editTags"
              :tag-categories="editTagCategories"
              placeholder="Add tags…"
              class="bg-gray-50! dark:bg-gray-800! py-2!"
              dropdown-class="bg-gray-50! dark:bg-gray-800!"
              input-class="bg-gray-50! dark:bg-gray-800!"
            />
          </section>

          <!-- Safety -->
          <section v-if="enableSafety && canEditPostSafety" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Safety</label>
            <div class="flex gap-3">
              <label
                v-for="s in safetyOptions"
                :key="s.value"
                class="flex items-center gap-1 cursor-pointer"
                :class="editSafety === s.value ? s.activeClass : 'text-gray-500 dark:text-gray-400'"
              >
                <input v-model="editSafety" type="radio" :value="s.value" class="sr-only" />
                <span class="w-2 h-2 rounded-full" :class="s.dotClass" />
                {{ s.label }}
              </label>
            </div>
          </section>

          <!-- Source -->
          <section v-if="canEditPostSource" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Source</label>
            <FlatTextarea
              v-model="editSource"
              rows="3"
              class="w-full px-2 py-1 text-xs resize-none bg-gray-50! dark:bg-gray-800!"
              placeholder="Source URL(s), one per line"
            />
          </section>

          <!-- Relations -->
          <section v-if="canEditPostRelations" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Relations</label>
            <FlatInput
              v-model="editRelations"
              type="text"
              class="w-full px-2 py-1 text-xs bg-gray-50! dark:bg-gray-800!"
              placeholder="Space-separated post IDs"
            />
          </section>

          <!-- Flags (video only) -->
          <section v-if="post.type === 'video' && canEditPostFlags" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Flags</label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input v-model="editLoopFlag" type="checkbox" />
              Loop video
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input v-model="editSoundFlag" type="checkbox" />
              Has audio
            </label>
          </section>

          <!-- Description -->
          <section v-if="canEditPostDescription" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Description</label>
            <FlatTextarea
              v-model="editDescription"
              rows="4"
              class="w-full px-2 py-1 text-xs resize-y bg-gray-50! dark:bg-gray-800!"
              placeholder="Markdown supported"
            />
          </section>

          <!-- Content replacement -->
          <section v-if="canEditPostContent" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Replace content</label>
            <div
              class="border border-dashed bg-gray-50 dark:bg-gray-800 border-gray-400 dark:border-gray-600 p-2 text-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:border-cyan-500 hover:text-cyan-500 transition-colors"
              @click="contentInputRef?.click()"
              @dragover.prevent
              @drop.prevent="(e) => { editNewContent = (e as DragEvent).dataTransfer?.files[0] ?? null }"
            >
              <input
                ref="contentInputRef"
                type="file"
                class="hidden"
                @change="(e) => { editNewContent = (e.target as HTMLInputElement).files?.[0] ?? null; (e.target as HTMLInputElement).value = '' }"
              />
              {{ editNewContent?.name || 'Click or drop to replace file' }}
            </div>
            <button
              v-if="editNewContent"
              type="button"
              class="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 self-start cursor-pointer"
              @click="editNewContent = null"
            >
              Remove
            </button>
          </section>

          <!-- Thumbnail replacement -->
          <section v-if="canEditPostThumbnail" class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Replace thumbnail</label>
            <div
              class="border border-dashed bg-gray-50 dark:bg-gray-800 border-gray-400 dark:border-gray-600 p-2 text-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:border-cyan-500 hover:text-cyan-500 transition-colors"
              @click="thumbnailInputRef?.click()"
              @dragover.prevent
              @drop.prevent="(e) => { editNewThumbnail = (e as DragEvent).dataTransfer?.files[0] ?? null }"
            >
              <input
                ref="thumbnailInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="(e) => { editNewThumbnail = (e.target as HTMLInputElement).files?.[0] ?? null; (e.target as HTMLInputElement).value = '' }"
              />
              {{ editNewThumbnail?.name || 'Click or drop to replace thumbnail' }}
            </div>
            <button
              v-if="editNewThumbnail"
              type="button"
              class="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 self-start cursor-pointer"
              @click="editNewThumbnail = null"
            >
              Remove
            </button>
          </section>

          <!-- Save button -->
          <FlatButton
            class="w-full py-1.5 text-sm font-medium"
            :disabled="editSaving"
            @click="savePost"
          >
            {{ editSaving ? 'Saving…' : 'Save' }}
          </FlatButton>

          <!-- Management -->
          <section v-if="canDeletePost || canMergePost || canFeaturePost" class="flex flex-col gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
            <label class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">Management</label>

            <button
              v-if="canFeaturePost"
              type="button"
              class="text-xs text-left text-cyan-400 hover:text-cyan-500 cursor-pointer"
              @click="featurePost"
            >
              Feature this post on main page
            </button>

            <div v-if="canMergePost" class="flex flex-col gap-1">
              <span class="text-xs text-gray-500 dark:text-gray-400">Merge with post #</span>
              <div class="flex gap-1">
                <FlatInput
                  v-model="editMergeTargetId"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="flex-1 px-2 py-0.5 text-xs bg-gray-50! dark:bg-gray-800!"
                  placeholder="Post ID"
                  @keydown.enter.prevent="goToMerge"
                />
                <FlatButton
                  type="button"
                  kind="warn"
                  class="px-2! py-0! text-black! text-xs"
                >
                  Go
                </FlatButton>
              </div>
            </div>

            <button
              v-if="canDeletePost"
              type="button"
              class="text-xs text-left text-red-500 hover:text-red-600 cursor-pointer w-fit"
              @click="confirmDeletePost"
            >
              Delete this post
            </button>
          </section>
        </div>
      </template>

      <!-- ── View mode sidebar ──────────────────────────────────── -->
      <template v-else>
        <!-- Details card -->
        <div class="card p-3 flex flex-col gap-3 text-sm">
          <!-- Download -->
          <section class="flex flex-col gap-1">
            <a
              :href="resolveApiUrl(post.contentUrl)"
              download
              class="flex items-center gap-1.5 text-cyan-500 hover:underline font-medium"
            >
              <DownloadIcon :size="14" />
              {{ formatFileSize(post.fileSize) }}
              {{ mimeLabel(post.mimeType) }}
            </a>
            <span v-if="post.canvasWidth && post.canvasHeight" class="text-gray-500 dark:text-gray-400 text-xs">
              {{ post.canvasWidth }}×{{ post.canvasHeight }}
              <span v-if="post.flags?.includes('loop')" title="Loops"><RepeatIcon :size="11" class="inline" /></span>
              <span v-if="post.flags?.includes('sound')" title="Has audio"><Volume2Icon :size="11" class="inline" /></span>
            </span>
          </section>

          <!-- Upload info -->
          <section class="text-gray-500 dark:text-gray-400 text-xs">
            <span>
              Uploaded by
              <RouterLink
                v-if="post.user?.name && canViewUsers"
                :to="`/user/${post.user.name}`"
                class="text-cyan-500 hover:underline"
              >{{ post.user.name }}</RouterLink>
              <span v-else>{{ post.user?.name ?? 'anonymous' }}</span>
            </span>
            <span v-if="post.creationTime">, {{ formatDate(post.creationTime) }}</span>
          </section>

          <!-- Safety -->
          <section v-if="enableSafety" class="flex items-center gap-1.5">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="safetyColor(post.safety)"
            />
            <span class="capitalize">{{ post.safety }}</span>
          </section>

          <!-- Fit mode -->
          <section class="flex gap-2 flex-wrap text-xs">
            <button
              v-for="mode in fitModes"
              :key="mode.value"
              class="cursor-pointer hover:text-cyan-500 transition-colors"
              :class="settings.fitMode === mode.value ? 'text-cyan-500 font-medium' : 'text-gray-500 dark:text-gray-400'"
              @click="settings.fitMode = mode.value"
            >
              {{ mode.label }}
            </button>
          </section>

          <!-- Source -->
          <section v-if="post.source" class="flex flex-col gap-0.5">
            <span class="text-gray-500 dark:text-gray-400 text-xs">Source:</span>
            <div class="flex flex-wrap gap-1 text-xs">
              <template v-for="(src, i) in sourceParts" :key="i">
                <span v-if="i > 0" class="text-gray-400">·</span>
                <a
                  :href="src"
                  :title="src"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-cyan-500 hover:underline truncate max-w-40"
                >
                  {{ extractDomain(src) }}
                </a>
              </template>
            </div>
          </section>

          <!-- External search -->
          <section class="flex flex-wrap gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Search on:</span>
            <a
              :href="`http://iqdb.org/?url=${encodeURIComponent(fullContentUrl)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cyan-500 hover:underline"
            >IQDB</a>
            <span>·</span>
            <a
              v-if="post.checksumMD5"
              :href="`https://danbooru.donmai.us/posts?tags=md5:${post.checksumMD5}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cyan-500 hover:underline"
            >Danbooru</a>
            <span v-if="post.checksumMD5">·</span>
            <a
              :href="`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(fullContentUrl)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cyan-500 hover:underline"
            >Google</a>
          </section>

          <!-- Score + Favorite -->
          <section class="flex items-center gap-3">
            <!-- Score -->
            <div class="flex items-center gap-1.5">
              <button
                class="cursor-pointer transition-colors"
                :class="localOwnScore === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-500'"
                :disabled="!canScore"
                :title="canScore ? 'Upvote' : ''"
                @click="vote(1)"
              >
                <ThumbsUpIcon :size="15" />
              </button>
              <span class="font-medium text-sm tabular-nums">{{ localScore }}</span>
              <button
                class="cursor-pointer transition-colors"
                :class="localOwnScore === -1 ? 'text-red-500' : 'text-gray-400 hover:text-red-500'"
                :disabled="!canScore"
                :title="canScore ? 'Downvote' : ''"
                @click="vote(-1)"
              >
                <ThumbsDownIcon :size="15" />
              </button>
            </div>

            <!-- Favorite -->
            <button
              class="flex items-center gap-1 cursor-pointer transition-colors"
              :class="localOwnFavorite ? 'text-red-400' : 'text-gray-400 hover:text-red-400'"
              :disabled="!canFavorite"
              :title="canFavorite ? (localOwnFavorite ? 'Remove from favorites' : 'Add to favorites') : ''"
              @click="toggleFavorite"
            >
              <HeartIcon :size="15" :fill="localOwnFavorite ? 'currentColor' : 'none'" />
              <span class="text-sm tabular-nums">{{ localFavoriteCount }}</span>
            </button>
          </section>
        </div>

        <!-- Relations -->
        <div v-if="post.relations?.length" class="card p-3 flex flex-col gap-2">
          <h2 class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
            Relations ({{ post.relations.length }})
          </h2>
          <div class="flex flex-wrap gap-1">
            <RouterLink
              v-for="rel in post.relations"
              :key="rel.id"
              :to="neighborUrl(rel.id)"
              class="block"
            >
              <img
                :src="resolveApiUrl(rel.thumbnailUrl)"
                :alt="`Post #${rel.id}`"
                class="w-16 h-16 object-cover hover:ring-2 hover:ring-cyan-500"
                loading="lazy"
              />
            </RouterLink>
          </div>
        </div>

        <!-- Tags -->
        <div class="card p-3 flex flex-col gap-2">
          <h2 class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
            Tags ({{ post.tags?.length ?? 0 }})
          </h2>
          <ul v-if="post.tags?.length" class="flex flex-col gap-1">
            <li
              v-for="tag in post.tags"
              :key="tag.names[0]"
              class="flex items-center gap-1 text-sm"
            >
              <RouterLink
                v-if="canViewTags"
                :to="`/tag/${tag.names[0]}`"
                class="shrink-0 hover:brightness-110"
                :style="{ color: `var(--tag-cat-${tag.category})` }"
              >
                <TagIcon :size="12" />
              </RouterLink>
              <RouterLink
                v-if="canListPosts"
                :to="{ path: '/posts', query: { query: tag.names[0] } }"
                class="hover:brightness-110 truncate"
                :style="{ color: `var(--tag-cat-${tag.category})` }"
              >
                {{ displayTagName(tag.names[0]) }}
              </RouterLink>
              <span v-else class="truncate" :style="{ color: `var(--tag-cat-${tag.category})` }">
                {{ displayTagName(tag.names[0]) }}
              </span>
              <span class="text-gray-400 text-xs ml-auto tabular-nums">{{ tag.usages }}</span>
            </li>
          </ul>
          <p v-else class="text-xs text-gray-500 dark:text-gray-400">
            No tags yet.
            <RouterLink v-if="canEditPost" :to="`/post/${post.id}/edit`" class="text-cyan-500 hover:underline">
              Add some.
            </RouterLink>
          </p>
        </div>

        <!-- Pools -->
        <div v-if="post.pools?.length" class="card p-3 flex flex-col gap-2">
          <h2 class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
            Pools ({{ post.pools.length }})
          </h2>
          <ul class="flex flex-col gap-1 text-sm">
            <li v-for="pool in post.pools" :key="pool.id">
              <RouterLink
                :to="`/pool/${pool.id}`"
                class="text-cyan-500 hover:underline truncate block"
              >
                {{ pool.names?.[0] ?? `Pool #${pool.id}` }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </template>
    </aside>

    <!-- ── Main content ───────────────────────────────────────────── -->
    <main class="flex-1 min-w-0 flex flex-col gap-4 order-1 lg:order-2">
      <!-- Content viewer -->
      <div class="flex items-start w-full" :class="{
        'overflow-hidden': settings.fitMode !== 'fit-original',
      }">
        <!-- Image / Animation -->
        <div v-if="post.type === 'image' || post.type === 'animation'" class="relative self-start">
          <img
            ref="imgRef"
            :src="resolveApiUrl(post.contentUrl)"
            :alt="`Post #${post.id}`"
            class="block"
            :class="fitClass"
            draggable="false"
          />
          <PostNotesOverlay v-if="post.notes?.length" :notes="post.notes" :img-el="imgRef" />
        </div>

        <!-- Video -->
        <div v-else-if="post.type === 'video'" class="relative self-start">
          <video
            ref="videoRef"
            :class="fitClass"
            controls
            playsinline
            :loop="post.flags?.includes('loop')"
            :autoplay="settings.autoplayVideos"
          >
            <source :src="resolveApiUrl(post.contentUrl)" :type="post.mimeType" />
            Your browser does not support this video format.
          </video>
          <PostNotesOverlay v-if="post.notes?.length" :notes="post.notes" :img-el="videoRef" />
        </div>

        <!-- Flash (unsupported) -->
        <div
          v-else-if="post.type === 'flash'"
          class="flex items-center justify-center w-full h-64 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        >
          Flash content is not supported in modern browsers.
        </div>
      </div>

      <!-- Description (view mode only) -->
      <div v-if="renderedDescription && !isEditMode" class="text-sm">
        <details open>
          <summary class="cursor-pointer font-medium mb-2">Description</summary>
          <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300" v-html="renderedDescription" />
        </details>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Download as DownloadIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  List as ListIcon,
  Pencil as PencilIcon,
  Repeat as RepeatIcon,
  Tag as TagIcon,
  ThumbsDown as ThumbsDownIcon,
  ThumbsUp as ThumbsUpIcon,
  Volume2 as Volume2Icon,
} from '@lucide/vue';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import { useSettingsStore } from '@/stores/settings';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { PostInfo, PostNeighbors, PostSafety, PostFlag, PostUpdateBody } from '@/types/oxibooru.gen';
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import PostNotesOverlay from '@/components/PostNotesOverlay.vue';
import { renderMarkdown } from '@/utils/markdown';
import { resolveApiUrl } from '@/utils/url';
import FlatInput from '@/components/FlatInput.vue';
import FlatTextarea from '@/components/FlatTextarea.vue';
import FlatButton from '@/components/FlatButton.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const { settings } = useSettingsStore();
const confirm = useConfirm();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

const postId = computed(() => Number(route.params.id));
const contextQuery = computed(() => (route.query.query as string) ?? '');
const isEditMode = computed(() => route.name === 'post-edit');

const imgRef = ref<HTMLImageElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

const post = ref<PostInfo | null>(null);
const neighbors = ref<PostNeighbors>({});
const loadError = ref('');

// ── Local interactive state ────────────────────────────────────
const localScore = ref(0);
const localOwnScore = ref(0);
const localOwnFavorite = ref(false);
const localFavoriteCount = ref(0);

// ── Edit state ────────────────────────────────────────────────
const editTags = ref<string[]>([]);
const editSafety = ref<PostSafety>('safe');
const editSource = ref('');
const editRelations = ref('');
const editLoopFlag = ref(false);
const editSoundFlag = ref(false);
const editDescription = ref('');
const editNewContent = ref<File | null>(null);
const editNewThumbnail = ref<File | null>(null);
const editSaving = ref(false);
const editError = ref('');
const editMergeTargetId = ref('');
const contentInputRef = ref<HTMLInputElement | null>(null);
const thumbnailInputRef = ref<HTMLInputElement | null>(null);

const editTagCategories = computed(() => {
  const map: Record<string, string> = {};
  for (const tag of post.value?.tags ?? []) {
    const name = tag.names[0];
    if (name) map[name] = tag.category;
  }
  console.log(map);
  return map;
});

function syncEditFields() {
  if (!post.value) return;
  editTags.value = post.value.tags?.map(t => t.names[0] ?? '').filter(Boolean) ?? [];
  editSafety.value = post.value.safety ?? 'safe';
  editSource.value = post.value.source ?? '';
  editRelations.value = post.value.relations?.map(r => r.id).join(' ') ?? '';
  editLoopFlag.value = post.value.flags?.includes('loop') ?? false;
  editSoundFlag.value = post.value.flags?.includes('sound') ?? false;
  editDescription.value = post.value.description ?? '';
  editNewContent.value = null;
  editNewThumbnail.value = null;
  editError.value = '';
}

watch(post, (p) => { if (p) syncEditFields(); });

// ── Privileges ────────────────────────────────────────────────
const canViewUsers = computed(() => api.hasPrivilege('user_view'));
const canViewTags = computed(() => api.hasPrivilege('tag_view'));
const canListPosts = computed(() => api.hasPrivilege('post_list'));
const canEditPost = computed(() => api.hasPrivilege('post_edit'));
const canScore = computed(() => !!api.userToken && api.hasPrivilege('post_score'));
const canFavorite = computed(() => !!api.userToken && api.hasPrivilege('post_favorite'));
const canEditPostTags = computed(() => api.hasPrivilege('post_edit_tag'));
const canEditPostSafety = computed(() => api.hasPrivilege('post_edit_safety'));
const canEditPostSource = computed(() => api.hasPrivilege('post_edit_source'));
const canEditPostRelations = computed(() => api.hasPrivilege('post_edit_relation'));
const canEditPostFlags = computed(() => api.hasPrivilege('post_edit_flag'));
const canEditPostDescription = computed(() => api.hasPrivilege('post_edit_description'));
const canEditPostContent = computed(() => api.hasPrivilege('post_edit_content'));
const canEditPostThumbnail = computed(() => api.hasPrivilege('post_edit_thumbnail'));
const canDeletePost = computed(() => api.hasPrivilege('post_delete'));
const canMergePost = computed(() => api.hasPrivilege('post_merge'));
const canFeaturePost = computed(() => api.hasPrivilege('post_feature'));

const enableSafety = computed(() => api.config?.config.enableSafety ?? false);

// ── Safety options ────────────────────────────────────────────
const safetyOptions = [
  { value: 'safe' as const, label: 'Safe', dotClass: 'bg-green-500', activeClass: 'text-green-600 dark:text-green-400' },
  { value: 'sketchy' as const, label: 'Sketchy', dotClass: 'bg-yellow-400', activeClass: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'unsafe' as const, label: 'Unsafe', dotClass: 'bg-red-500', activeClass: 'text-red-600 dark:text-red-400' },
];

// ── Derived data ──────────────────────────────────────────────
const prevPost = computed(() => neighbors.value.prev ?? null);
const nextPost = computed(() => neighbors.value.next ?? null);

const backToListUrl = computed(() => {
  const q: Record<string, string> = {};
  if (route.query.query) q.query = route.query.query as string;
  if (route.query.offset) q.offset = route.query.offset as string;
  return { path: '/posts', query: q };
});

function neighborUrl(id: number) {
  const q: Record<string, string> = {};
  if (route.query.query) q.query = route.query.query as string;
  return { path: `/post/${id}`, query: q };
}

const fullContentUrl = computed(() => resolveApiUrl(post.value?.contentUrl) ?? '');

const sourceParts = computed(() => {
  if (!post.value?.source) return [];
  return post.value.source.split(/\s+/).filter(Boolean);
});

function displayTagName(name: string | undefined): string {
  if (!name) return '';
  return settings.tagUnderscoresAsSpaces ? name.replace(/_/g, ' ') : name;
}

const fitModes = [
  { value: 'fit-both' as const, label: 'Fit both' },
  { value: 'fit-width' as const, label: 'Fit width' },
  { value: 'fit-height' as const, label: 'Fit height' },
  { value: 'fit-original' as const, label: 'Original' },
];

const fitClass = computed(() => {
  switch (settings.fitMode) {
    case 'fit-original': return 'max-w-none max-h-none pr-4';
    case 'fit-height': return 'max-h-screen w-auto object-contain';
    case 'fit-width': return 'w-full h-auto object-contain';
    default: return 'max-w-full max-h-screen object-contain'; // fit-both
  }
});

const renderedDescription = computed(() => {
  const desc = post.value?.description;
  if (desc?.trim()) {
    return renderMarkdown(desc);
  }
  return null;
})

// ── Helpers ───────────────────────────────────────────────────
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

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

function safetyColor(safety?: string): string {
  if (safety === 'safe') return 'bg-green-500';
  if (safety === 'sketchy') return 'bg-yellow-400';
  if (safety === 'unsafe') return 'bg-red-500';
  return 'bg-gray-400';
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
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

// ── Interactions ──────────────────────────────────────────────
async function vote(score: 1 | -1) {
  if (!canScore.value || !post.value?.id) return;
  const newScore = localOwnScore.value === score ? 0 : score;
  const result = await api.ratePost(post.value.id, newScore);
  if (result.success) {
    localScore.value = result.data.score ?? localScore.value;
    localOwnScore.value = result.data.ownScore ?? 0;
  }
}

async function toggleFavorite() {
  if (!canFavorite.value || !post.value?.id) return;
  const result = localOwnFavorite.value
    ? await api.unfavoritePost(post.value.id)
    : await api.favoritePost(post.value.id);
  if (result.success) {
    localOwnFavorite.value = result.data.ownFavorite ?? !localOwnFavorite.value;
    localFavoriteCount.value = result.data.favoriteCount ?? localFavoriteCount.value;
  }
}

// ── Edit operations ───────────────────────────────────────────
async function savePost() {
  if (!post.value?.id || !post.value.version) return;
  editSaving.value = true;
  editError.value = '';

  const flags: PostFlag[] = [];
  if (editLoopFlag.value) flags.push('loop');
  if (editSoundFlag.value) flags.push('sound');

  const body: PostUpdateBody = {
    version: post.value.version,
    tags: editTags.value,
    safety: editSafety.value,
    source: editSource.value || null,
    relations: editRelations.value
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n)),
    flags,
    description: editDescription.value || null,
  };

  if (editNewContent.value) {
    const uploadResult = await api.uploadContent(editNewContent.value);
    if (!uploadResult.success) {
      editError.value = `Upload failed: ${uploadResult.description}`;
      editSaving.value = false;
      return;
    }
    body.contentToken = uploadResult.data.token;
  }

  if (editNewThumbnail.value) {
    const uploadResult = await api.uploadContent(editNewThumbnail.value);
    if (!uploadResult.success) {
      editError.value = `Thumbnail upload failed: ${uploadResult.description}`;
      editSaving.value = false;
      return;
    }
    body.thumbnailToken = uploadResult.data.token;
  }

  const result = await api.updatePost(post.value.id, body);
  editSaving.value = false;

  if (result.success) {
    post.value = result.data;
    syncEditFields();
    toast.showSuccess('Post saved.');
  } else {
    editError.value = result.description;
  }
}

async function confirmDeletePost() {
  if (!post.value?.id || !post.value.version) return;
  const ok = await confirm.confirm({
    title: 'Delete post?',
    message: `Permanently delete Post #${post.value.id}? This cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  const result = await api.deletePost(post.value.id, post.value.version);
  if (result.success) {
    toast.showSuccess(`Post #${post.value.id} deleted.`);
    router.push('/posts');
  } else {
    editError.value = result.description;
  }
}

async function featurePost() {
  if (!post.value?.id) return;
  const result = await api.featurePost(post.value.id);
  if (result.success) {
    toast.showSuccess('Post featured.');
  } else {
    editError.value = result.description;
  }
}

function goToMerge() {
  const otherId = parseInt(editMergeTargetId.value.trim());
  if (!otherId || isNaN(otherId) || !post.value?.id) return;
  router.push(`/post/merge/${post.value.id}/${otherId}`);
}

// ── Data loading ──────────────────────────────────────────────
async function loadPost(id: number) {
  loader.start();
  loadError.value = '';
  post.value = null;

  const [postResult, neighborsResult] = await Promise.all([
    api.getPost(id),
    api.getPostNeighbors(id, contextQuery.value || undefined),
  ]);

  loader.done();

  if (!postResult.success) {
    loadError.value = postResult.description;
    return;
  }

  post.value = postResult.data;
  localScore.value = postResult.data.score ?? 0;
  localOwnScore.value = postResult.data.ownScore ?? 0;
  localOwnFavorite.value = postResult.data.ownFavorite ?? false;
  localFavoriteCount.value = postResult.data.favoriteCount ?? 0;

  if (neighborsResult.success) {
    neighbors.value = neighborsResult.data;
  }
}

onMounted(async () => {
  await loadPost(postId.value);
});

watch(
  () => postId.value,
  async (id) => {
    await loadPost(id);
  },
);

useHeadSafe(() => ({
  title: post.value
    ? `${serverName.value} - Post #${post.value.id}`
    : serverName.value + ' - Post',
}));
</script>
