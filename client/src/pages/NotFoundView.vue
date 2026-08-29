<template>
  <div class="flex flex-col items-center justify-center py-24 gap-4">
    <h1 class="text-6xl font-bold text-gray-400">404</h1>
    <p class="text-lg">Page not found.</p>
    <RouterLink to="/" class="text-cyan-500 hover:underline">Go home</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useHeadSafe } from '@unhead/vue';

useHeadSafe({ title: 'Not Found' });
</script>
