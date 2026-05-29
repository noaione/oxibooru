<template>
  <div class="flex flex-col gap-4 w-full max-w-3xl mx-auto">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Merge Tags</h1>
      <RouterLink
        :to="`/tag/${encodeURIComponent(sourceName)}`"
        class="text-sm text-cyan-500 hover:underline ml-auto"
      >
        Back to tag
      </RouterLink>
    </div>

    <!-- Privilege guard -->
    <div v-if="!canMerge" class="card p-4 text-red-500 text-sm">
      You don't have permission to merge tags.
    </div>

    <template v-else>
      <div v-if="loadError" class="card p-4 text-red-500 text-sm">{{ loadError }}</div>

      <template v-else-if="tag1 && tag2">
        <!-- Side-by-side cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="(tag, idx) in [tag1, tag2]"
            :key="idx"
            class="card p-4 flex flex-col gap-3 cursor-pointer transition-colors"
            :class="
              baseTagName === tag.names?.[0]
                ? 'ring-2 ring-cyan-500'
                : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
            "
            @click="baseTagName = tag.names?.[0] ?? ''"
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold" :style="tagColor(tag.category)">
                {{ displayTag(tag.names?.[0] ?? '') }}
              </span>
              <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input v-model="baseTagName" type="radio" :value="tag.names?.[0]" />
                Keep this tag
              </label>
            </div>

            <div class="text-xs text-gray-500 flex flex-col gap-0.5">
              <span v-if="tag.category">
                Category:
                <span :style="tagColor(tag.category)">{{ tag.category }}</span>
              </span>
              <span
                >{{ (tag.usages ?? 0).toLocaleString() }} post{{
                  tag.usages !== 1 ? 's' : ''
                }}</span
              >
              <span v-if="tag.names && tag.names.length > 1">
                {{ tag.names.length - 1 }} alias{{ tag.names.length - 1 !== 1 ? 'es' : '' }}
              </span>
              <span v-if="tag.implications && tag.implications.length">
                {{ tag.implications.length }} implication{{
                  tag.implications.length !== 1 ? 's' : ''
                }}
              </span>
              <span v-if="tag.creationTime">Created {{ formatDate(tag.creationTime) }}</span>
            </div>
          </div>
        </div>

        <!-- Info + confirm -->
        <div class="card p-4 flex flex-col gap-3 text-sm">
          <p class="text-gray-600 dark:text-gray-400">
            All posts, aliases, implications and suggestions from the removed tag will be merged
            into the surviving tag. The removed tag will be permanently deleted.
          </p>

          <div v-if="baseTagName && removeTag" class="text-xs text-gray-500">
            <p>
              <strong :style="removeTagColor">{{ displayTag(removeTag.names?.[0] ?? '') }}</strong>
              will be deleted.
              <strong :style="baseTagColor">{{ displayTag(baseTagName) }}</strong>
              will survive with merged data.
            </p>
          </div>

          <p v-if="mergeError" class="text-red-500 text-xs">{{ mergeError }}</p>

          <FlatButton
            type="button"
            kind="danger"
            :disabled="!baseTagName || merging"
            class="w-fit"
            @click="confirmMerge"
          >
            {{ merging ? 'Merging…' : 'Merge tags' }}
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
import { useTagCacheStore } from '@/stores/cache';
import { useSettingsStore } from '@/stores/settings';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { TagInfo } from '@/types/oxibooru.gen';
import FlatButton from '@/components/FlatButton.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const tagCache = useTagCacheStore();
const settings = useSettingsStore();
const confirm = useConfirm();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Merge Tags',
}));

const tag1 = ref<TagInfo | null>(null);
const tag2 = ref<TagInfo | null>(null);
const loadError = ref('');
const merging = ref(false);
const mergeError = ref('');

const baseTagName = ref('');

const sourceName = computed(() => route.params.name as string);
const otherName = computed(() => route.params.other as string);

const canMerge = computed(() => api.hasPrivilege('tag_merge'));

const removeTag = computed(() => {
  if (!baseTagName.value) return null;
  return baseTagName.value === tag1.value?.names?.[0] ? tag2.value : tag1.value;
});

const baseTag = computed(() => {
  if (!baseTagName.value) return null;
  return baseTagName.value === tag1.value?.names?.[0] ? tag1.value : tag2.value;
});

const removeTagColor = computed(() => {
  const cat = removeTag.value?.category;
  if (!cat) return {};
  return { color: `var(--tag-cat-${cat})` };
});

const baseTagColor = computed(() => {
  const cat = baseTag.value?.category;
  if (!cat) return {};
  return { color: `var(--tag-cat-${cat})` };
});

function displayTag(raw: string) {
  return settings.settings.tagUnderscoresAsSpaces ? raw.replace(/_/g, ' ') : raw;
}

function tagColor(category?: string): Record<string, string> {
  if (!category || category === 'default') return {};
  return { color: `var(--tag-cat-${category})` };
}

async function loadTags() {
  if (!sourceName.value || !otherName.value) return; // nan/invalid

  loadError.value = '';

  const cachedTag1 = tagCache.getTag(sourceName.value);
  const cachedTag2 = tagCache.getTag(otherName.value);

  if (cachedTag1 && cachedTag2) {
    tag1.value = cachedTag1;
    tag2.value = cachedTag2;
    baseTagName.value = cachedTag1.names?.[0] ?? '';
    return;
  }

  loader.start();
  let r1: Awaited<ReturnType<typeof api.getTag>>;
  let r2: Awaited<ReturnType<typeof api.getTag>>;
  try {
    [r1, r2] = await Promise.all([api.getTag(sourceName.value), api.getTag(otherName.value)]);
  } catch (e) {
    loadError.value = `Failed to load tags: ${e}`;
    return;
  } finally {
    loader.done();
  }

  if (!r1.success) {
    loadError.value = `Tag "${sourceName.value}": ${r1.description}`;
    return;
  }
  if (!r2.success) {
    loadError.value = `Tag "${otherName.value}": ${r2.description}`;
    return;
  }

  tag1.value = r1.data;
  tag2.value = r2.data;
  tagCache.setTag(sourceName.value, r1.data);
  tagCache.setTag(otherName.value, r2.data);
  baseTagName.value = r1.data.names?.[0] ?? '';
}

async function confirmMerge() {
  if (!baseTagName.value || !baseTag.value || !removeTag.value) return;
  if (!baseTag.value.version || !removeTag.value.version) return;

  const ok = await confirm.confirm({
    title: 'Merge tags?',
    message: `"${displayTag(removeTag.value.names?.[0] ?? '')}" will be permanently deleted and merged into "${displayTag(baseTagName.value)}". This cannot be undone.`,
    confirmLabel: 'Merge',
  });
  if (!ok) return;

  merging.value = true;
  mergeError.value = '';

  const result = await api.mergeTag({
    mergeTo: baseTagName.value,
    mergeToVersion: baseTag.value.version,
    remove: removeTag.value.names?.[0] ?? '',
    removeVersion: removeTag.value.version,
  });

  merging.value = false;

  if (result.success) {
    tagCache.invalidateTag(removeTag.value.names?.[0] ?? '');
    tagCache.setTag(baseTagName.value, result.data);
    toast.showSuccess(
      `Tags merged. "${displayTag(removeTag.value.names?.[0] ?? '')}" was deleted.`,
    );
    router.push(`/tag/${encodeURIComponent(baseTagName.value)}`);
  } else {
    mergeError.value = result.description;
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

onMounted(loadTags);

onDeactivated(() => {
  tag1.value = null;
  tag2.value = null;
  loadError.value = '';
});
</script>
