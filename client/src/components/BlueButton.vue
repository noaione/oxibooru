<template>
  <button @click="$emit('click')" class="px-4 py-1 cursor-pointer bg-cyan-500 text-white">
    <slot />
  </button>
</template>

<script setup lang="ts">
defineEmits<{
  click: [];
}>();
</script>
