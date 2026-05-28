<template>
  <Teleport to="body">
    <Transition name="loader">
      <div
        v-if="loaderStore.loading"
        class="fixed top-0 left-0 right-0 z-50 h-0.5 bg-cyan-500 origin-left"
        :class="{ 'animate-progress': loaderStore.loading }"
      />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useLoaderStore } from '@/stores/loader';

const loaderStore = useLoaderStore();
</script>

<style scoped>
@keyframes progress {
  0% {
    transform: scaleX(0);
  }
  50% {
    transform: scaleX(0.7);
  }
  100% {
    transform: scaleX(0.9);
  }
}

.animate-progress {
  animation: progress 2s ease-out forwards;
}

.loader-enter-active,
.loader-leave-active {
  transition: opacity 0.2s ease;
}
.loader-enter-from,
.loader-leave-to {
  opacity: 0;
}
</style>
