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
  defineProps<{ kind?: 'info' | 'warn' | 'danger' | 'success' | 'neutral'; class?: string }>(),
  {
    kind: 'info',
    class: '',
  },
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
    case 'neutral': {
      return 'btn-neutral';
    }
    case 'info':
    default: {
      return 'btn-info';
    }
  }
});
</script>

<style lang="postcss" scoped>
.btn-info {
  color: white;
  background-color: oklch(71.5% 0.143 215.221);

  &:focus {
    background-color: oklch(60.9% 0.126 221.723);
  }
}

.btn-warn {
  color: white;
  background-color: oklch(79.5% 0.184 86.047);

  &:focus {
    background-color: oklch(68.1% 0.162 75.834);
  }
}

.btn-danger {
  color: white;
  background-color: oklch(63.7% 0.237 25.331);

  &:focus {
    background-color: oklch(57.7% 0.245 27.325);
  }
}

.btn-success {
  color: white;
  background-color: oklch(72.3% 0.219 149.579);

  &:focus {
    background-color: oklch(62.7% 0.194 149.214);
  }
}

.btn-neutral {
  color: black;
  background-color: oklch(90% 0 0);

  &:focus {
    background-color: oklch(82% 0 0);
  }

  &:where(.darktheme, .darktheme *) {
    color: white;
    background-color: oklch(38% 0 0);

    &:focus {
      background-color: oklch(30% 0 0);
    }
  }
}
</style>
