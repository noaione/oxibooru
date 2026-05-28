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
            class="card p-3 flex flex-col gap-3"
          >
            <div class="flex flex-wrap items-center gap-3">
              <!-- Default badge -->
              <span
                v-if="cat.isDefault"
                class="text-xs px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 font-medium"
              >
                default
              </span>

              <!-- Name -->
              <div class="flex-1 min-w-32">
                <label class="block text-xs text-gray-500 mb-1">Name</label>
                <input
                  v-model="cat.editName"
                  type="text"
                  :disabled="!canEditName || cat.isDefault"
                  class="w-full px-2 py-1 text-sm overlay-color border border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <!-- Order -->
              <div class="w-20">
                <label class="block text-xs text-gray-500 mb-1">Order</label>
                <input
                  v-model.number="cat.editOrder"
                  type="number"
                  min="0"
                  :disabled="!canEditOrder"
                  class="w-full px-2 py-1 text-sm overlay-color border border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <!-- Usage count -->
              <div class="text-xs text-gray-500 whitespace-nowrap mt-4">
                {{ (cat.usages ?? 0).toLocaleString() }} tags
              </div>
            </div>

            <!-- Color picker row -->
            <div v-if="canEditColor">
              <label class="block text-xs text-gray-500 mb-1">Color</label>
              <div class="flex flex-wrap items-center gap-3">
                <!-- Light mode preview swatch -->
                <div class="flex flex-col items-center gap-0.5">
                  <div
                    class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                    :style="{ backgroundColor: validColor(cat.editColor) || '#888' }"
                    title="Light mode"
                  />
                  <span class="text-[10px] text-gray-400">Light</span>
                </div>

                <!-- Dark mode preview swatch (derived) -->
                <div class="flex flex-col items-center gap-0.5">
                  <div
                    class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                    :style="{ backgroundColor: darkColor(cat.editColor) || '#888' }"
                    title="Dark mode (derived)"
                  />
                  <span class="text-[10px] text-gray-400">Dark</span>
                </div>

                <!-- Native color picker (hex only) -->
                <div class="flex flex-col items-center gap-0.5">
                  <input
                    type="color"
                    :value="toHex(cat.editColor)"
                    class="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    title="Pick a color"
                    @input="(e) => cat.editColor = (e.target as HTMLInputElement).value"
                  />
                  <span class="text-[10px] text-gray-400">Picker</span>
                </div>

                <!-- Text input for raw CSS color -->
                <input
                  v-model="cat.editColor"
                  type="text"
                  placeholder="#rrggbb or any CSS color"
                  class="flex-1 min-w-36 px-2 py-1 text-sm font-mono overlay-color border border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <!-- Row actions -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                v-if="canEdit"
                type="button"
                :disabled="cat.saving"
                class="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                @click="saveCategory(cat)"
              >
                {{ cat.saving ? 'Saving…' : 'Save' }}
              </button>

              <button
                v-if="canSetDefault && !cat.isDefault"
                type="button"
                :disabled="cat.saving"
                class="px-3 py-1 text-xs overlay-color border border-gray-200 dark:border-gray-700 hover:border-cyan-500 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                @click="setDefault(cat)"
              >
                Set as default
              </button>

              <button
                v-if="canDelete && !cat.isDefault"
                type="button"
                :disabled="cat.saving || (cat.usages ?? 0) > 0"
                class="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :title="(cat.usages ?? 0) > 0 ? 'Cannot delete: category is in use' : ''"
                @click="deleteCategory(cat)"
              >
                Delete
              </button>

              <p v-if="cat.error" class="text-xs text-red-500">{{ cat.error }}</p>
            </div>
          </div>
        </div>

        <!-- Create new category -->
        <div v-if="canCreate" class="card p-4 flex flex-col gap-3">
          <p class="text-sm font-medium">Create new category</p>

          <div class="flex flex-wrap gap-3">
            <div class="flex-1 min-w-32">
              <label class="block text-xs text-gray-500 mb-1">Name</label>
              <input
                v-model="newName"
                type="text"
                placeholder="Category name"
                class="w-full px-2 py-1 text-sm overlay-color border border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors"
              />
            </div>
            <div class="w-20">
              <label class="block text-xs text-gray-500 mb-1">Order</label>
              <input
                v-model.number="newOrder"
                type="number"
                min="0"
                class="w-full px-2 py-1 text-sm overlay-color border border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <!-- Color for new category -->
          <div>
            <label class="block text-xs text-gray-500 mb-1">Color</label>
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex flex-col items-center gap-0.5">
                <div
                  class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                  :style="{ backgroundColor: validColor(newColor) || '#888' }"
                  title="Light mode"
                />
                <span class="text-[10px] text-gray-400">Light</span>
              </div>
              <div class="flex flex-col items-center gap-0.5">
                <div
                  class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                  :style="{ backgroundColor: darkColor(newColor) || '#888' }"
                  title="Dark mode (derived)"
                />
                <span class="text-[10px] text-gray-400">Dark</span>
              </div>
              <div class="flex flex-col items-center gap-0.5">
                <input
                  type="color"
                  :value="toHex(newColor)"
                  class="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  @input="(e) => newColor = (e.target as HTMLInputElement).value"
                />
                <span class="text-[10px] text-gray-400">Picker</span>
              </div>
              <input
                v-model="newColor"
                type="text"
                placeholder="#rrggbb or any CSS color"
                class="flex-1 min-w-36 px-2 py-1 text-sm font-mono overlay-color border border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>

          <button
            type="button"
            :disabled="!newName.trim() || creating"
            class="px-4 py-2 w-fit text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            @click="createCategory"
          >
            {{ creating ? 'Creating…' : 'Create category' }}
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useHeadSafe } from '@unhead/vue';
import { formatHex, oklch } from 'culori';
import { useTokenStore } from '@/stores/api';
import { useCategoriesStore } from '@/stores/categories';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { mixinCssColorForDarkTheme } from '@/utils/colorama';
import type { TagCategoryInfo } from '@/types/oxibooru.gen';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

useHeadSafe({ title: 'Tag Categories' });

const api = useTokenStore();
const categories = useCategoriesStore();
const confirm = useConfirm();
const toast = useToast();

interface LocalCategory extends TagCategoryInfo {
  editName: string;
  editColor: string;
  editOrder: number;
  isDefault: boolean;
  saving: boolean;
  error: string;
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
  };
}

function toHex(color: string): string {
  try {
    const parsed = oklch(color);
    if (!parsed) return '#888888';
    return formatHex(parsed) ?? '#888888';
  } catch {
    return '#888888';
  }
}

function validColor(color: string): string | null {
  if (!color?.trim()) return null;
  try {
    const parsed = oklch(color);
    if (!parsed) return null;
    return formatHex(parsed) ?? null;
  } catch {
    return null;
  }
}

function darkColor(color: string): string | null {
  if (!color?.trim()) return null;
  try {
    const parsed = oklch(color);
    if (!parsed) return null;
    const dark = mixinCssColorForDarkTheme(color);
    const hex = formatHex(oklch(dark) ?? oklch('#888888')!);
    return hex ?? null;
  } catch {
    return null;
  }
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
