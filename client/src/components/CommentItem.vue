<template>
  <div class="flex gap-3">
    <!-- Avatar -->
    <div class="shrink-0">
      <RouterLink v-if="comment.user?.name" :to="`/user/${comment.user.name}`">
        <img
          v-if="comment.user.avatarUrl"
          :src="resolveApiUrl(comment.user.avatarUrl)"
          :alt="comment.user.name"
          class="w-9 h-9 object-cover"
        />
        <div
          v-else
          class="w-9 h-9 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300"
        >
          {{ comment.user.name[0]?.toUpperCase() }}
        </div>
      </RouterLink>
      <div v-else class="w-9 h-9 bg-gray-200 dark:bg-gray-700" />
    </div>

    <!-- Body -->
    <div class="flex-1 min-w-0 flex flex-col gap-1">
      <!-- Header row -->
      <div class="flex items-center gap-2 flex-wrap">
        <RouterLink
          v-if="comment.user?.name"
          :to="`/user/${comment.user.name}`"
          class="text-sm font-medium text-cyan-500 hover:underline"
        >
          {{ comment.user.name }}
        </RouterLink>
        <span v-else class="text-sm font-medium text-gray-400">anonymous</span>
        <RelativeTime
          v-if="comment.creationTime"
          :time="comment.creationTime"
          class="text-xs text-gray-400"
        />
        <span
          v-if="comment.lastEditTime && comment.lastEditTime !== comment.creationTime"
          class="text-xs text-gray-400"
          >(edited)</span
        >
      </div>

      <!-- Edit mode -->
      <template v-if="isEditing">
        <!-- Write / Preview tabs -->
        <div class="flex gap-2 text-xs border-b border-gray-200 dark:border-gray-600">
          <button
            type="button"
            class="px-2 py-1 cursor-pointer transition-colors"
            :class="
              !editPreview
                ? 'border-b-2 border-accent-500 text-accent-500 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            @click="editPreview = false"
          >
            Write
          </button>
          <button
            type="button"
            class="px-2 py-1 cursor-pointer transition-colors"
            :class="
              editPreview
                ? 'border-b-2 border-accent-500 text-accent-500 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            @click="editPreview = true"
          >
            Preview
          </button>
        </div>

        <FlatTextarea
          v-if="!editPreview"
          v-model="editText"
          rows="4"
          class="w-full text-sm bg-gray-50! dark:bg-gray-800!"
        />
        <div
          v-else
          class="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 min-h-16 px-2 py-1.5 wrap-break-word"
          v-html="editPreviewHtml"
        />

        <div class="flex flex-col gap-2 mt-2">
          <div class="flex flex-row items-center gap-2">
            <FlatButton
              type="button"
              class="px-2 py-0.5 text-xs"
              :disabled="saving"
              @click="saveEdit"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </FlatButton>
            <FlatButton
              type="button"
              class="px-2! py-0.5 text-xs"
              kind="neutral"
              :disabled="saving"
              @click="cancelEdit"
            >
              Cancel
            </FlatButton>
            <RouterLink to="/help/comments" class="text-cyan-500 hover:underline text-sm">
              Help
            </RouterLink>
          </div>
          <span v-if="editError" class="text-xs text-red-500">{{ editError }}</span>
        </div>
      </template>

      <!-- View mode -->
      <template v-else>
        <div
          class="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 wrap-break-word"
          v-html="renderedText"
        />
      </template>

      <!-- Footer: score + actions -->
      <div class="flex items-center gap-3 mt-0.5">
        <!-- Score -->
        <div class="flex items-center gap-1 text-xs">
          <button
            class="cursor-pointer transition-colors"
            :class="localOwnScore === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-500'"
            :disabled="!canScore"
            @click="vote(1)"
          >
            ▲
          </button>
          <span
            class="tabular-nums font-medium"
            :class="
              localScore > 0 ? 'text-green-500' : localScore < 0 ? 'text-red-500' : 'text-gray-400'
            "
          >
            {{ localScore }}
          </span>
          <button
            class="cursor-pointer transition-colors"
            :class="localOwnScore === -1 ? 'text-red-500' : 'text-gray-400 hover:text-red-500'"
            :disabled="!canScore"
            @click="vote(-1)"
          >
            ▼
          </button>
        </div>

        <!-- Edit / delete -->
        <template v-if="!isEditing">
          <button
            v-if="canEdit"
            type="button"
            class="text-xs text-gray-400 hover:text-cyan-500 cursor-pointer"
            @click="startEdit"
          >
            Edit
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
            @click="doDelete"
          >
            Delete
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTokenStore } from '@/stores/api';
import { useConfirm } from '@/composables/useConfirm';
import type { CommentInfo } from '@/types/oxibooru.gen';
import { renderMarkdown } from '@/utils/markdown';
import { resolveApiUrl } from '@/utils/url';
import RelativeTime from '@/components/RelativeTime.vue';
import FlatButton from '@/components/FlatButton.vue';
import FlatTextarea from '@/components/FlatTextarea.vue';

const props = defineProps<{ comment: CommentInfo }>();
const emit = defineEmits<{
  (e: 'update', comment: CommentInfo): void;
  (e: 'delete', id: number): void;
}>();

const api = useTokenStore();
const confirm = useConfirm();

const localScore = ref(props.comment.score ?? 0);
const localOwnScore = ref(props.comment.ownScore ?? 0);

const isEditing = ref(false);
const editText = ref('');
const editPreview = ref(false);
const saving = ref(false);
const editError = ref('');

const editPreviewHtml = computed(() => (editText.value ? renderMarkdown(editText.value) : ''));
const canScore = computed(() => !!api.userToken && api.hasPrivilege('comment_score'));

const canEdit = computed(() => {
  if (!api.userToken) return false;
  if (api.hasPrivilege('comment_edit_any')) return true;
  if (api.hasPrivilege('comment_edit_own') && props.comment.user?.name === api.user?.name)
    return true;
  return false;
});

const canDelete = computed(() => {
  if (!api.userToken) return false;
  if (api.hasPrivilege('comment_delete_any')) return true;
  if (api.hasPrivilege('comment_delete_own') && props.comment.user?.name === api.user?.name)
    return true;
  return false;
});

const renderedText = computed(() => (props.comment.text ? renderMarkdown(props.comment.text) : ''));

function startEdit() {
  editText.value = props.comment.text ?? '';
  editError.value = '';
  editPreview.value = false;
  isEditing.value = true;
}

function cancelEdit() {
  editPreview.value = false;
  isEditing.value = false;
}

async function saveEdit() {
  if (!props.comment.id || !props.comment.version) return;
  saving.value = true;
  editError.value = '';

  const result = await api.updateComment(props.comment.id, {
    version: props.comment.version,
    text: editText.value,
  });

  saving.value = false;

  if (!result.success) {
    editError.value = result.description;
    return;
  }

  isEditing.value = false;
  emit('update', result.data);
}

async function doDelete() {
  if (!props.comment.id || !props.comment.version) return;

  const ok = await confirm.confirm({
    title: 'Delete comment?',
    message: 'Delete this comment? This cannot be undone.',
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  const result = await api.deleteComment(props.comment.id, props.comment.version);
  if (result.success) {
    emit('delete', props.comment.id);
  }
}

async function vote(score: 1 | -1) {
  if (!canScore.value || !props.comment.id) return;
  const newScore = localOwnScore.value === score ? 0 : score;
  const result = await api.rateComment(props.comment.id, newScore);
  if (result.success) {
    localScore.value = result.data.score ?? localScore.value;
    localOwnScore.value = result.data.ownScore ?? 0;
  }
}
</script>
