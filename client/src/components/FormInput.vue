<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    v-bind="$attrs"
    class="px-2 py-1 overlay-color border-2 border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    @keydown.enter.prevent="emit('submit')"
  />
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  modelValue?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();
</script>
