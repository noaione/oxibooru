<template>
  <div class="flex flex-col gap-4 w-full max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold" :style="primaryColor ? { color: primaryColor } : {}">
        {{ displayTag(primaryName) }}
      </h1>
      <span
        v-if="tag?.category && tag.category !== 'default'"
        class="px-2 py-0.5 text-xs rounded border"
        :style="primaryColor ? { color: primaryColor, borderColor: primaryColor } : {}"
      >
        {{ tag.category }}
      </span>
      <RouterLink to="/tags" class="text-sm text-cyan-500 hover:underline ml-auto">
        Back to tags
      </RouterLink>
    </div>

    <!-- Privilege guard -->
    <div v-if="!canView" class="card p-4 text-red-500 text-sm">
      You don't have permission to view tags.
    </div>

    <template v-else>
      <!-- Load error -->
      <div v-if="loadError" class="card p-4 text-red-500 text-sm">{{ loadError }}</div>

      <template v-else-if="tag">
        <!-- Section tabs -->
        <div class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          <RouterLink
            :to="`/tag/${encodeURIComponent(primaryName)}`"
            class="px-4 py-2 text-sm transition-colors"
            :class="section === 'summary' ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            Summary
          </RouterLink>
          <RouterLink
            v-if="canEdit"
            :to="`/tag/${encodeURIComponent(primaryName)}/edit`"
            class="px-4 py-2 text-sm transition-colors"
            :class="section === 'edit' ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            Edit
          </RouterLink>
          <RouterLink
            v-if="canDelete"
            :to="`/tag/${encodeURIComponent(primaryName)}/delete`"
            class="px-4 py-2 text-sm transition-colors"
            :class="section === 'delete' ? 'border-b-2 border-red-500 text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            Delete
          </RouterLink>
        </div>

        <!-- ── Summary ── -->
        <div v-if="section === 'summary'" class="flex flex-col gap-4">
          <!-- Aliases -->
          <div v-if="tag.names && tag.names.length > 1" class="card p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Aliases</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="name in tag.names.slice(1)"
                :key="name"
                class="px-2 py-0.5 text-sm border rounded"
                :style="primaryColor ? { color: primaryColor, borderColor: primaryColor } : { borderColor: 'currentColor' }"
              >
                {{ displayTag(name) }}
              </span>
            </div>
          </div>

          <!-- Stats -->
          <div class="card p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Posts</p>
              <RouterLink
                :to="`/posts?query=${encodeURIComponent(primaryName)}`"
                class="font-semibold text-cyan-500 hover:underline"
              >
                {{ (tag.usages ?? 0).toLocaleString() }}
              </RouterLink>
            </div>
            <div v-if="tag.creationTime">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
              <p class="font-medium">{{ formatDate(tag.creationTime) }}</p>
            </div>
            <div v-if="tag.lastEditTime">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Last edited</p>
              <p class="font-medium">{{ formatDate(tag.lastEditTime) }}</p>
            </div>
          </div>

          <!-- Description -->
          <div v-if="tag.description" class="card p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Description</p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="prose prose-sm dark:prose-invert max-w-none text-sm" v-html="renderedDescription" />
          </div>

          <!-- Implications -->
          <div v-if="tag.implications && tag.implications.length" class="card p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Implied tags
              <span class="font-normal normal-case">— auto-added when this tag is used</span>
            </p>
            <div class="flex flex-wrap gap-2">
              <RouterLink
                v-for="impl in tag.implications"
                :key="impl.names[0] ?? ''"
                :to="`/tag/${encodeURIComponent(impl.names[0] ?? '')}`"
                class="px-2 py-0.5 text-xs rounded border hover:opacity-80 transition-opacity"
                :style="microTagStyle(impl.category)"
              >
                {{ displayTag(impl.names[0] ?? '') }}
              </RouterLink>
            </div>
          </div>

          <!-- Suggestions -->
          <div v-if="tag.suggestions && tag.suggestions.length" class="card p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Suggested tags
              <span class="font-normal normal-case">— shown to user on usage</span>
            </p>
            <div class="flex flex-wrap gap-2">
              <RouterLink
                v-for="sug in tag.suggestions"
                :key="sug.names[0] ?? ''"
                :to="`/tag/${encodeURIComponent(sug.names[0] ?? '')}`"
                class="px-2 py-0.5 text-xs rounded border hover:opacity-80 transition-opacity"
                :style="microTagStyle(sug.category)"
              >
                {{ displayTag(sug.names[0] ?? '') }}
              </RouterLink>
            </div>
          </div>

          <!-- Siblings -->
          <div v-if="siblings.length" class="card p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Related tags</p>
            <div class="flex flex-wrap gap-2">
              <RouterLink
                v-for="sib in siblings.slice(0, 20)"
                :key="sib.tag.names?.[0]"
                :to="`/tag/${encodeURIComponent(sib.tag.names?.[0] ?? '')}`"
                class="flex items-center gap-1 px-2 py-0.5 text-xs rounded border hover:opacity-80 transition-opacity"
                :style="microTagStyle(sib.tag.category)"
              >
                {{ displayTag(sib.tag.names?.[0] ?? '') }}
                <span class="opacity-60">×{{ sib.occurrences }}</span>
              </RouterLink>
            </div>
          </div>

          <!-- Merge action -->
          <div v-if="canMerge" class="card p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Merge with another tag</p>
            <form class="flex gap-2" @submit.prevent="goToMerge">
              <FlatInput
                v-model="mergeTargetInput"
                type="text"
                placeholder="Other tag name…"
                class="flex-1 px-2 py-1 text-sm bg-gray-50! dark:bg-gray-800!"
              />
              <FlatButton
                kind="warn"
                type="submit"
                :disabled="!mergeTargetInput.trim()"
              >
                Merge
              </FlatButton>
            </form>
          </div>
        </div>

        <!-- ── Edit ── -->
        <div v-else-if="section === 'edit'" class="card p-4 flex flex-col gap-4">
          <div v-if="!canEdit" class="text-red-500 text-sm">
            You don't have permission to edit tags.
          </div>
          <template v-else>
            <!-- Names -->
            <div v-if="canEditNames">
              <label class="block text-sm font-medium mb-1">
                Names <span class="text-gray-400 font-normal">(one per line; first is primary)</span>
              </label>
              <FlatTextarea
                v-model="editNames"
                rows="4"
                class="w-full resize-y font-mono bg-gray-50! dark:bg-gray-800!"
              />
            </div>

            <!-- Category -->
            <div v-if="canEditCategory">
              <label class="block text-sm font-medium mb-1">Category</label>
              <FlatSelect
                v-model="editCategory"
                class="w-full bg-gray-50! dark:bg-gray-800!"
              >
                <option v-for="cat in tagCategories" :key="cat.name" :value="cat.name">
                  {{ cat.name }}{{ cat.default ? ' (default)' : '' }}
                </option>
              </FlatSelect>
            </div>

            <!-- Description -->
            <div v-if="canEditDescription">
              <label class="block text-sm font-medium mb-1">
                Description <span class="text-gray-400 font-normal">(Markdown)</span>
              </label>
              <FlatTextarea
                v-model="editDescription"
                rows="5"
                class="w-full resize-y font-mono bg-gray-50! dark:bg-gray-800!"
              />
            </div>

            <!-- Implications -->
            <div v-if="canEditImplications">
              <label class="block text-sm font-medium mb-1">
                Implied tags <span class="text-gray-400 font-normal">(auto-added on usage)</span>
              </label>
              <AutoCompleteTag
                mode="input"
                v-model="editImplications"
                class="bg-gray-50! dark:bg-gray-800!"
                input-class="bg-gray-50! dark:bg-gray-800!"
                dropdown-class="bg-gray-50! dark:bg-gray-800!"
                placeholder="Add implied tag…"
                :tag-categories="tagCategoryMap"
              />
            </div>

            <!-- Suggestions -->
            <div v-if="canEditSuggestions">
              <label class="block text-sm font-medium mb-1">
                Suggested tags <span class="text-gray-400 font-normal">(shown on usage)</span>
              </label>
              <AutoCompleteTag
                mode="input"
                v-model="editSuggestions"
                class="bg-gray-50! dark:bg-gray-800!"
                input-class="bg-gray-50! dark:bg-gray-800!"
                dropdown-class="bg-gray-50! dark:bg-gray-800!"
                placeholder="Add suggested tag…"
                :tag-categories="tagCategoryMap"
              />
            </div>

            <!-- Error -->
            <p v-if="saveError" class="text-red-500 text-sm">{{ saveError }}</p>

            <FlatButton
              type="button"
              class="w-fit"
              :disabled="saving"
              @click="saveTag"
            >
              {{ saving ? 'Saving…' : 'Save changes' }}
            </FlatButton>
          </template>
        </div>

        <!-- ── Delete ── -->
        <div v-else-if="section === 'delete'" class="card p-4 flex flex-col gap-4">
          <div v-if="!canDelete" class="text-red-500 text-sm">
            You don't have permission to delete tags.
          </div>
          <template v-else>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              You are about to delete tag
              <strong :style="primaryColor ? { color: primaryColor } : {}">{{ displayTag(primaryName) }}</strong>.
              <template v-if="tag.usages && tag.usages > 0">
                It is used in <strong class="text-accent-500 dark:text-accent-400">{{ tag.usages.toLocaleString() }}</strong>
                post{{ tag.usages !== 1 ? 's' : '' }}, which will lose this tag.
              </template>
              This cannot be undone.
            </p>

            <p v-if="deleteError" class="text-red-500 text-sm">{{ deleteError }}</p>

            <FlatButton
              type="button"
              kind="danger"
              :disabled="deleting"
              class="w-fit"
              @click="confirmDelete"
            >
              {{ deleting ? 'Deleting…' : 'Delete tag' }}
            </FlatButton>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onDeactivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import { useTagCacheStore } from '@/stores/cache';
import { useCategoriesStore } from '@/stores/categories';
import { useSettingsStore } from '@/stores/settings';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { TagInfo, TagSibling } from '@/types/oxibooru.gen';
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import FlatButton from '@/components/FlatButton.vue';
import FlatInput from '@/components/FlatInput.vue';
import FlatTextarea from '@/components/FlatTextarea.vue';
import FlatSelect from '@/components/FlatSelect.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const tagCache = useTagCacheStore();
const categoriesStore = useCategoriesStore();
const settings = useSettingsStore();
const confirm = useConfirm();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

const tag = ref<TagInfo | null>(null);
const siblings = ref<TagSibling[]>([]);
const loadError = ref('');

const saving = ref(false);
const saveError = ref('');
const deleting = ref(false);
const deleteError = ref('');
const mergeTargetInput = ref('');

const editNames = ref('');
const editCategory = ref('');
const editDescription = ref('');
const editImplications = ref<string[]>([]);
const editSuggestions = ref<string[]>([]);

const tagName = computed(() => route.params.name as string);

const section = computed(() => {
  if (route.name === 'tag-edit') return 'edit';
  if (route.name === 'tag-delete') return 'delete';
  return 'summary';
});

const primaryName = computed(() => tag.value?.names?.[0] ?? tagName.value);

const primaryColor = computed(() => {
  const cat = tag.value?.category;
  if (!cat || cat === 'default') return null;
  return `var(--tag-cat-${cat})`;
});

const tagCategories = computed(() => categoriesStore.tags);

const tagCategoryMap = computed(() => {
  const map: Record<string, string> = {};
  for (const implication of tag.value?.implications ?? []) {
    for (const name of implication.names) {
      map[name] = implication.category;
    }
  }
  for (const suggestion of tag.value?.suggestions ?? []) {
    for (const name of suggestion.names) {
      map[name] = suggestion.category;
    }
  }
  return map;
});

const canView = computed(() => api.hasPrivilege('tag_view'));
const canEdit = computed(() => api.hasPrivilege('tag_edit'));
const canEditNames = computed(() => api.hasPrivilege('tag_edit_name'));
const canEditCategory = computed(() => api.hasPrivilege('tag_edit_category'));
const canEditDescription = computed(() => api.hasPrivilege('tag_edit_description'));
const canEditImplications = computed(() => api.hasPrivilege('tag_edit_implication'));
const canEditSuggestions = computed(() => api.hasPrivilege('tag_edit_suggestion'));
const canDelete = computed(() => api.hasPrivilege('tag_delete'));
const canMerge = computed(() => api.hasPrivilege('tag_merge'));

const renderedDescription = computed(() => {
  if (!tag.value?.description) return '';
  const html = marked.parse(tag.value.description, { async: false }) as string;
  return DOMPurify.sanitize(html);
});

useHeadSafe(() => ({
  title: serverName.value + ' - ' + (primaryName.value ? `Tag: ${primaryName.value}` : 'Tag'),
}));

function displayTag(raw: string) {
  return settings.settings.tagUnderscoresAsSpaces ? raw.replace(/_/g, ' ') : raw;
}

function microTagStyle(category?: string): Record<string, string> {
  if (!category || category === 'default') {
    return { borderColor: 'currentColor' };
  }
  const v = `var(--tag-cat-${category})`;
  return { color: v, borderColor: v };
}

function syncEditFields() {
  if (!tag.value) return;
  editNames.value = (tag.value.names ?? []).join('\n');
  editCategory.value = tag.value.category ?? '';
  editDescription.value = tag.value.description ?? '';
  editImplications.value = (tag.value.implications ?? []).map((t) => t.names[0] ?? '').filter(Boolean);
  editSuggestions.value = (tag.value.suggestions ?? []).map((t) => t.names[0] ?? '').filter(Boolean);
}

async function loadTag() {
  if (!tagName.value) return; // nan/invalid

  const cachedTag = tagCache.getTag(tagName.value);
  if (cachedTag) {
    tag.value = cachedTag;
    siblings.value = tagCache.getSiblings(tagName.value) ?? [];
    loadError.value = '';
    syncEditFields();
    return;
  }

  loader.start();
  loadError.value = '';

  try {
    const [tagResult, siblingsResult] = await Promise.all([
      api.getTag(tagName.value),
      api.getTagSiblings(tagName.value),
    ]);

    if (!tagResult.success) {
      loadError.value = tagResult.description;
      return;
    }

    tag.value = tagResult.data;
    siblings.value = siblingsResult.success ? (siblingsResult.data.results ?? []) : [];
    tagCache.setTag(tagName.value, tagResult.data);
    tagCache.setSiblings(tagName.value, siblings.value);
    syncEditFields();
  } catch (e) {
    loadError.value = `Failed to load tag: ${e}`;
  } finally {
    loader.done();
  }
}

async function saveTag() {
  if (!tag.value?.version) return;
  saving.value = true;
  saveError.value = '';

  const names = editNames.value
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

  const result = await api.updateTag(tagName.value, {
    version: tag.value.version,
    names: canEditNames.value ? names : undefined,
    category: canEditCategory.value ? editCategory.value : undefined,
    description: canEditDescription.value ? editDescription.value : undefined,
    implications: canEditImplications.value ? editImplications.value : undefined,
    suggestions: canEditSuggestions.value ? editSuggestions.value : undefined,
  });

  saving.value = false;

  if (!result.success) {
    saveError.value = result.description;
    return;
  }

  tag.value = result.data;
  const newPrimary = result.data.names?.[0];
  if (newPrimary && newPrimary !== tagName.value) {
    tagCache.invalidateTag(tagName.value);
  }
  tagCache.setTag(newPrimary ?? tagName.value, result.data);
  syncEditFields();
  toast.showSuccess('Tag saved.');

  if (newPrimary && newPrimary !== tagName.value) {
    router.replace(`/tag/${encodeURIComponent(newPrimary)}/edit`);
  }
}

async function confirmDelete() {
  if (!tag.value?.version) return;

  const ok = await confirm.confirm({
    title: 'Delete tag?',
    message: `Delete "${primaryName.value}"? This will remove it from all posts. This cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  deleting.value = true;
  deleteError.value = '';

  const result = await api.deleteTag(tagName.value, tag.value.version);
  deleting.value = false;

  if (!result.success) {
    deleteError.value = result.description;
    return;
  }

  tagCache.invalidateTag(tagName.value);
  toast.showSuccess('Tag deleted.');
  router.push('/tags');
}

function goToMerge() {
  const target = mergeTargetInput.value.trim();
  if (!target) return;
  router.push(`/tag/${encodeURIComponent(primaryName.value)}/merge/${encodeURIComponent(target)}`);
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

watch(tagName, loadTag);
onMounted(loadTag);

onDeactivated(() => {
  tag.value = null;
  loadError.value = '';
});
</script>
