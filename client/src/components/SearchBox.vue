<template>
  <input
    @input="(c) => $emit('input', (c.target as HTMLInputElement).value)"
    @keydown="onEnterSubmit"
    type="text"
    :class="`px-1 overlay-color border-gray-200 dark:border-gray-700 outline-0 border-2 focus:border-cyan-500 transition-colors ${$props.class || ''}`"
    :placeholder="placeholder"
    :value="value"
    :disabled="disabled"
    autocomplete="off"
  />
</template>

<script setup lang="ts">
defineProps<{
  placeholder?: string;
  class?: string;
  value?: string;
  disabled?: boolean;
}>();

const emits = defineEmits<{
  input: [string];
  submit: [];
}>();

function onEnterSubmit(ev: KeyboardEvent) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    emits('submit');
  }
}
</script>
