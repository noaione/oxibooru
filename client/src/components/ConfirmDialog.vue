<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="confirmStore.visible"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="confirmStore.respond(false)"
      >
        <div class="absolute inset-0 bg-black/50" />
        <div
          class="relative overlay-color rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
          role="dialog"
          aria-modal="true"
        >
          <h2 class="text-lg font-semibold mb-2">
            {{ confirmStore.options.title ?? 'Are you sure?' }}
          </h2>
          <p class="text-sm opacity-80 mb-6">
            {{ confirmStore.options.message ?? 'This action cannot be undone.' }}
          </p>
          <div class="flex gap-3 justify-end">
            <button
              class="px-4 py-2 text-sm rounded overlay-color border border-gray-400 dark:border-gray-500 hover:opacity-80 transition-opacity cursor-pointer"
              @click="confirmStore.respond(false)"
            >
              {{ confirmStore.options.cancelLabel ?? 'Cancel' }}
            </button>
            <button
              class="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              @click="confirmStore.respond(true)"
            >
              {{ confirmStore.options.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useConfirmStore } from '@/stores/confirm';

const confirmStore = useConfirmStore();
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
