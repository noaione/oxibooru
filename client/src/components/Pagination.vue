<template>
  <div v-if="totalPages > 1" class="flex items-center gap-1 select-none">
    <!-- Prev -->
    <button
      class="px-3 py-1 text-sm rounded overlay-color border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:not-disabled:opacity-80 cursor-pointer disabled:cursor-default transition-opacity"
      :disabled="currentPage <= 1"
      @click="emit('page-change', currentPage - 1)"
    >
      ‹
    </button>

    <!-- Page buttons -->
    <template v-for="item in pageItems" :key="item">
      <span v-if="item === '...'" class="px-2 text-sm opacity-50">…</span>
      <button
        v-else
        class="px-3 py-1 text-sm rounded border transition-colors cursor-pointer"
        :class="
          item === currentPage
            ? 'bg-cyan-600 text-white border-cyan-600'
            : 'overlay-color border-gray-300 dark:border-gray-600 hover:opacity-80'
        "
        @click="emit('page-change', item as number)"
      >
        {{ item }}
      </button>
    </template>

    <!-- Next -->
    <button
      class="px-3 py-1 text-sm rounded overlay-color border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:not-disabled:opacity-80 cursor-pointer disabled:cursor-default transition-opacity"
      :disabled="currentPage >= totalPages"
      @click="emit('page-change', currentPage + 1)"
    >
      ›
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'PaginationControl' });

const props = defineProps<{
  currentPage: number;
  totalCount: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  'page-change': [page: number];
}>();

const totalPages = computed(() => Math.ceil(props.totalCount / props.pageSize));

const pageItems = computed((): (number | '...')[] => {
  const total = totalPages.value;
  const current = props.currentPage;

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | '...')[] = [1];

  if (current > 3) items.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);

  if (current < total - 2) items.push('...');

  items.push(total);
  return items;
});
</script>
