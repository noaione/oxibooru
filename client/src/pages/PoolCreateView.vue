<template>
  <div class="flex flex-col gap-4 w-full max-w-2xl mx-auto">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-semibold">Create Pool</h1>
      <RouterLink to="/pools" class="text-sm text-cyan-500 hover:underline ml-auto">
        Back to pools
      </RouterLink>
    </div>

    <div v-if="!canCreate" class="card p-4 text-red-500 text-sm">
      You don't have permission to create pools.
    </div>

    <form v-else class="card p-5 flex flex-col gap-4" @submit.prevent="submitCreate">
      <!-- Name -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="pc-name">
          Name <span class="text-red-500">*</span>
          <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1"
            >(one per line for aliases)</span
          >
        </label>
        <FlatTextarea
          id="pc-name"
          v-model="newNames"
          rows="2"
          class="w-full text-sm bg-gray-50! dark:bg-gray-800!"
          placeholder="pool_name&#10;optional_alias"
          required
        />
      </div>

      <!-- Category -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="pc-category">Category</label>
        <FlatSelect
          id="pc-category"
          v-model="newCategory"
          class="w-full max-w-xs bg-gray-50! dark:bg-gray-800!"
        >
          <option v-for="cat in categories" :key="cat.name" :value="cat.name">
            {{ cat.name }}
          </option>
        </FlatSelect>
      </div>

      <!-- Description -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="pc-description">
          Description
          <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1"
            >(Markdown, optional)</span
          >
        </label>
        <FlatTextarea
          id="pc-description"
          v-model="newDescription"
          rows="4"
          class="w-full text-sm bg-gray-50! dark:bg-gray-800!"
          placeholder="Optional description…"
        />
      </div>

      <!-- Initial posts -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="pc-posts">
          Posts
          <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1"
            >(space-separated post IDs, optional)</span
          >
        </label>
        <FlatInput
          id="pc-posts"
          v-model="newPostsRaw"
          type="text"
          class="w-full bg-gray-50! dark:bg-gray-800!"
          placeholder="1 2 3 4"
        />
      </div>

      <p v-if="createError" class="text-sm text-red-500">{{ createError }}</p>

      <FlatButton type="submit" class="w-fit" :disabled="creating || !newNames.trim()">
        {{ creating ? 'Creating…' : 'Create pool' }}
      </FlatButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { useCategoriesStore } from '@/stores/categories';
import FlatButton from '@/components/FlatButton.vue';
import FlatInput from '@/components/FlatInput.vue';
import FlatSelect from '@/components/FlatSelect.vue';
import FlatTextarea from '@/components/FlatTextarea.vue';

const router = useRouter();
const api = useTokenStore();
const categoriesStore = useCategoriesStore();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({ title: serverName.value + ' - Create Pool' }));

const canCreate = computed(() => api.hasPrivilege('pool_create'));
const categories = computed(() => categoriesStore.pools);

const newNames = ref('');
const newCategory = ref('');
const newDescription = ref('');
const newPostsRaw = ref('');
const creating = ref(false);
const createError = ref('');

async function submitCreate() {
  const names = newNames.value
    .split(/[\n\r]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (!names.length) return;

  const postIds = newPostsRaw.value
    .split(/\s+/)
    .map((s) => parseInt(s))
    .filter((n) => !isNaN(n) && n > 0);

  creating.value = true;
  createError.value = '';

  const result = await api.createPool({
    names,
    category: newCategory.value || (categories.value[0]?.name ?? 'default'),
    description: newDescription.value.trim() || null,
    posts: postIds.length ? postIds : null,
  });

  creating.value = false;

  if (!result.success) {
    createError.value = result.description;
    return;
  }

  router.push(`/pool/${result.data.id}`);
}

onMounted(() => {
  if (categoriesStore.pools.length && !newCategory.value) {
    const def = categoriesStore.pools.find((c) => c.default) ?? categoriesStore.pools[0];
    newCategory.value = def?.name ?? '';
  }
});
</script>
