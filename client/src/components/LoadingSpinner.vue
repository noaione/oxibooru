<template>
  <span
    class="inline-block rounded-full border-2 border-current border-t-transparent animate-spin"
    :class="sizeClasses[size]"
    role="status"
    aria-label="Loading"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { size: 'md' },
);

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};
</script>
