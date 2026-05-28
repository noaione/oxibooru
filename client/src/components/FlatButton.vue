<template>
  <button
    @click="$emit('click')"
    :class="`px-4 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${computedStyles} ${props.class}`"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(
  defineProps<{ kind?: 'info' | 'warn' | 'danger' | 'success', class?: string; }>(),
  {
    kind: 'info',
    class: '',
  }
);

defineEmits<{
  click: [];
}>();

const computedStyles = computed(() => {
  switch (props.kind) {
    case 'warn': {
      return 'btn-warn';
    }
    case 'danger': {
      return 'btn-danger';
    }
    case 'success': {
      return 'btn-success';
    }
    case 'info':
    default: {
      return 'btn-info';
    }
  }
});
</script>

<style lang="css" scoped>
@reference "../styles.css";

.btn-info {
  @apply bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500 text-white;
}

.btn-warn {
  @apply bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500 text-white;
}

.btn-danger {
  @apply bg-red-500 hover:bg-red-600 disabled:bg-red-500 text-white;
}

.btn-success {
  @apply bg-green-500 hover:bg-green-600 disabled:bg-green-500 text-white;
}
</style>
