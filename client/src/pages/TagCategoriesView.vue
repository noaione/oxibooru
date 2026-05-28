<template>
  <div class="flex flex-col gap-4 w-full max-w-3xl mx-auto">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Tag Categories</h1>
      <RouterLink to="/tags" class="text-sm text-cyan-500 hover:underline ml-auto">
        Back to tags
      </RouterLink>
    </div>

    <!-- Privilege guard -->
    <div v-if="!canList" class="card p-4 text-red-500 text-sm">
      You don't have permission to view tag categories.
    </div>

    <template v-else>
      <div v-if="loading" class="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>

      <div v-else-if="loadError" class="card p-4 text-red-500 text-sm">{{ loadError }}</div>

      <template v-else>
        <!-- Category rows -->
        <div class="flex flex-col gap-2">
          <div
            v-for="cat in localCategories"
            :key="cat.name"
            class="card p-3 flex flex-col border gap-3"
            :class="{
              'border-accent-400': cat.default,
              'border-[#F5F5F5] dark:border-[#333333]': !cat.default,
            }"
          >
            <div class="flex flex-wrap items-center gap-3">
              <!-- Name -->
              <div class="flex-1 min-w-32">
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <FlatInput
                  v-model="cat.editName"
                  type="text"
                  :disabled="!canEditName"
                  class="w-full bg-gray-50! dark:bg-gray-800!"
                />
              </div>

              <!-- Order -->
              <div class="w-20">
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Order</label>
                <FlatInput
                  :value="String(cat.editOrder)"
                  type="number"
                  min="0"
                  :disabled="!canEditOrder"
                  class="w-full bg-gray-50! dark:bg-gray-800!"
                  @update:model-value="(v) => (cat.editOrder = Number(v))"
                />
              </div>

              <!-- Usage count -->
              <RouterLink
                :to="`/posts?query=${encodeURIComponent(cat.slug)}`"
                class="text-cyan-500 hover:underline text-xs whitespace-nowrap mt-4"
              >
                {{ (cat.usages ?? 0).toLocaleString() }} tags
              </RouterLink>
            </div>

            <!-- Color picker row -->
            <div v-if="canEditColor">
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
              <div class="flex flex-wrap items-center gap-3 w-full">
                <ColorSwatches v-model="cat.editColor" />
              </div>
            </div>

            <!-- Row actions -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <FlatButton
                v-if="canEdit"
                type="button"
                :disabled="cat.saving"
                class="px-2 py-1 text-xs"
                @click="saveCategory(cat)"
              >
                {{ cat.saving ? 'Saving…' : 'Save' }}
              </FlatButton>

              <FlatButton
                v-if="canSetDefault && !cat.isDefault"
                type="button"
                :disabled="cat.saving"
                class="px-2 py-1 text-xs"
                @click="setDefault(cat)"
              >
                Set as default
              </FlatButton>

              <FlatButton
                v-if="canDelete && !cat.isDefault"
                type="button"
                kind="danger"
                :disabled="cat.saving || (cat.usages ?? 0) > 0"
                class="px-2 py-1 text-xs"
                :title="(cat.usages ?? 0) > 0 ? 'Cannot delete: category is in use' : ''"
                @click="deleteCategory(cat)"
              >
                Delete
              </FlatButton>

              <p v-if="cat.error" class="text-xs text-red-500">{{ cat.error }}</p>
            </div>
          </div>
        </div>

        <!-- Create new category -->
        <div v-if="canCreate" class="card p-4 flex flex-col gap-3">
          <p class="text-sm font-medium">Create new category</p>

          <div class="flex flex-wrap gap-3">
            <div class="flex-1 min-w-32">
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <FlatInput
                v-model="newName"
                type="text"
                :disabled="!canEditName"
                placeholder="Category name"
                class="w-full bg-gray-50! dark:bg-gray-800!"
              />
            </div>
            <div class="w-20">
              <label class="block text-xs text-gray-500 mb-1">Order</label>
              <FlatInput
                :value="String(newOrder)"
                type="number"
                min="0"
                :disabled="!canEditOrder"
                class="w-full bg-gray-50! dark:bg-gray-800!"
                @update:model-value="(v) => (newOrder = Number(v))"
              />
            </div>
          </div>

          <!-- Color for new category -->
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
            <div class="flex flex-wrap items-center gap-3 w-full">
              <ColorSwatches v-model="newColor" />
            </div>
          </div>

          <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>

          <FlatButton
            type="button"
            :disabled="!newName.trim() || creating"
            class="w-fit"
            @click="createCategory"
          >
            {{ creating ? 'Creating…' : 'Create category' }}
          </FlatButton>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useCategoriesStore } from '@/stores/categories';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { TagCategoryInfo } from '@/types/oxibooru.gen';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import FlatButton from '@/components/FlatButton.vue';
import ColorSwatches from '@/components/ColorSwatches.vue';
import FlatInput from '@/components/FlatInput.vue';

const api = useTokenStore();
const categories = useCategoriesStore();
const confirm = useConfirm();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Tag Categories',
}));

interface LocalCategory extends TagCategoryInfo {
  editName: string;
  editColor: string;
  editOrder: number;
  isDefault: boolean;
  saving: boolean;
  error: string;
  slug: string;
}

const localCategories = ref<LocalCategory[]>([]);
const loading = ref(false);
const loadError = ref('');

const newName = ref('');
const newColor = ref('#aaaaaa');
const newOrder = ref(0);
const creating = ref(false);
const createError = ref('');

const canList = computed(() => api.hasPrivilege('tag_category_list'));
const canEdit = computed(() => api.hasPrivilege('tag_category_edit'));
const canEditName = computed(() => api.hasPrivilege('tag_category_edit_name'));
const canEditColor = computed(() => api.hasPrivilege('tag_category_edit_color'));
const canEditOrder = computed(() => api.hasPrivilege('tag_category_edit_order'));
const canCreate = computed(() => api.hasPrivilege('tag_category_create'));
const canDelete = computed(() => api.hasPrivilege('tag_category_delete'));
const canSetDefault = computed(() => api.hasPrivilege('tag_category_set_default'));

function toLocalCategory(cat: TagCategoryInfo, isDefault: boolean): LocalCategory {
  return {
    ...cat,
    editName: cat.name ?? '',
    editColor: cat.color ?? '#aaaaaa',
    editOrder: cat.order ?? 0,
    isDefault,
    saving: false,
    error: '',
    slug: `category:${cat.name ?? ''}`,
  };
}

async function loadCategories() {
  loading.value = true;
  loadError.value = '';

  const result = await api.listTagCategories();
  loading.value = false;

  if (!result.success) {
    loadError.value = result.description;
    return;
  }

  const sorted = [...result.data].sort((a, b) => {
    if (a.default) return -1;
    if (b.default) return 1;
    return (a.order ?? 0) - (b.order ?? 0) || (a.name ?? '').localeCompare(b.name ?? '');
  });

  localCategories.value = sorted.map((cat) => toLocalCategory(cat, !!cat.default));
  newOrder.value = Math.max(0, ...sorted.map((c) => c.order ?? 0)) + 1;
}

async function saveCategory(cat: LocalCategory) {
  if (!cat.version) return;
  cat.saving = true;
  cat.error = '';

  const result = await api.updateTagCategory(cat.name ?? '', {
    version: cat.version,
    name: canEditName.value ? cat.editName : undefined,
    color: canEditColor.value ? cat.editColor : undefined,
    order: canEditOrder.value ? cat.editOrder : undefined,
  });

  cat.saving = false;

  if (!result.success) {
    cat.error = result.description;
    return;
  }

  Object.assign(cat, toLocalCategory(result.data, cat.isDefault));
  toast.showSuccess('Category saved.');
  await categories.refreshColors();
}

async function setDefault(cat: LocalCategory) {
  if (!cat.version) return;
  cat.saving = true;
  cat.error = '';

  const result = await api.setDefaultTagCategory(cat.name ?? '', cat.version);
  cat.saving = false;

  if (!result.success) {
    cat.error = result.description;
    return;
  }

  for (const c of localCategories.value) c.isDefault = false;
  Object.assign(cat, toLocalCategory(result.data, true));
  toast.showSuccess('Default category updated.');
  await categories.refreshColors();
}

async function deleteCategory(cat: LocalCategory) {
  if (!cat.version) return;

  const ok = await confirm.confirm({
    title: 'Delete category?',
    message: `Delete category "${cat.name}"? This cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  cat.saving = true;
  cat.error = '';

  const result = await api.deleteTagCategory(cat.name ?? '', cat.version);
  cat.saving = false;

  if (!result.success) {
    cat.error = result.description;
    return;
  }

  localCategories.value = localCategories.value.filter((c) => c.name !== cat.name);
  toast.showSuccess('Category deleted.');
  await categories.refreshColors();
}

async function createCategory() {
  if (!newName.value.trim()) return;
  creating.value = true;
  createError.value = '';

  const result = await api.createTagCategory({
    name: newName.value.trim(),
    color: newColor.value,
    order: newOrder.value,
  });

  creating.value = false;

  if (!result.success) {
    createError.value = result.description;
    return;
  }

  localCategories.value.push(toLocalCategory(result.data, false));
  newName.value = '';
  newColor.value = '#aaaaaa';
  newOrder.value = Math.max(...localCategories.value.map((c) => c.editOrder)) + 1;
  toast.showSuccess('Category created.');
  await categories.refreshColors();
}

onMounted(loadCategories);
</script>
