<template>
  <ul
    class="absolute left-0 top-full mt-0.5 z-40 w-full min-w-48 overlay-color border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto"
    role="listbox"
  >
    <li
      v-for="(suggestion, i) in suggestions"
      :key="suggestion.name"
      role="option"
      :aria-selected="i === activeIndex"
      class="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer"
      :class="i === activeIndex ? 'bg-cyan-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'"
      @mousedown.prevent="emit('select', suggestion)"
    >
      <span
        :style="suggestion.category !== 'default' ? `color: var(--tag-cat-${suggestion.category})` : ''"
        :class="i === activeIndex ? 'text-white!' : ''"
      >
        {{ underscoreAsSpaces ? suggestion.name.replace(/_/g, ' ') : suggestion.name }}
      </span>
      <span class="text-xs opacity-60 ml-3">{{ suggestion.usages }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
interface Suggestion {
  name: string;
  category: string;
  usages: number;
}

defineProps<{
  suggestions: Suggestion[];
  activeIndex: number;
  underscoreAsSpaces?: boolean;
}>();

const emit = defineEmits<{
  select: [suggestion: Suggestion];
}>();
</script>
