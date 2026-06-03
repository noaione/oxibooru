<template>
  <div class="relative w-full h-full">
    <div ref="containerRef" class="w-full h-full" />
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
    >
      <LoadingSpinner size="lg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { ref } from 'vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

declare global {
  interface Window {
    RufflePlayer?: {
      newest(): {
        createPlayer(): HTMLElement & { load(options: { url: string }): Promise<void> };
      };
      config: Record<string, unknown>;
    };
  }
}

const props = defineProps<{
  src: string;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const loading = ref(true);
let player: HTMLElement | null = null;

function loadRuffleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.RufflePlayer?.newest) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-ruffle]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.dataset.ruffle = '';
    script.src = `${import.meta.env.BASE_URL}ruffle/ruffle.js`;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initPlayer(src: string) {
  if (!containerRef.value) return;
  player?.remove();
  player = null;
  loading.value = true;

  // @ts-expect-error stupid
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer!.config = {
    ...window.RufflePlayer!.config,
    polyfills: true,
    autoplay: 'off',
    warnOnUnsupportedContent: false,
    showSwfDownload: true,
    splashScreen: false,
    allowFullscreen: true,
    menu: true,
  };
  await loadRuffleScript();
  const ruffle = window.RufflePlayer!.newest();
  const el = ruffle.createPlayer();
  Object.assign(el.style, { width: '100%', height: '100%' });
  containerRef.value.appendChild(el);
  player = el;
  await el.load({ url: src });
  loading.value = false;
}

onMounted(() => initPlayer(props.src));

watch(
  () => props.src,
  (src) => initPlayer(src),
);

onUnmounted(() => {
  player?.remove();
  player = null;
});
</script>
