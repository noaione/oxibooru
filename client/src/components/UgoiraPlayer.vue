<template>
  <div
    ref="rootRef"
    class="relative w-full h-full select-none"
    @pointerenter="onPlayerPointerEnter"
    @pointerleave="onPlayerPointerLeave"
  >
    <!-- Custom element handles canvas + animation -->
    <ugoira-player
      ref="playerEl"
      :src="src"
      class="w-full h-full"
      :class="{ 'cursor-pointer': props.clickToPlay !== false }"
      v-on="props.clickToPlay !== false ? { click: togglePlay } : {}"
    />

    <!-- Loading overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80"
    >
      <LoadingSpinner size="lg" />
    </div>

    <!-- Error overlay -->
    <div
      v-if="hasError"
      class="absolute inset-0 flex items-center justify-center text-red-500 text-sm"
    >
      Failed to load ugoira
    </div>

    <!-- Play/Pause flash indicator (independent — does NOT share v-else chain with controls) -->
    <div
      v-if="showFlash"
      :key="flashKey"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="bg-black/60 rounded-full p-4 flash-indicator">
        <Play v-if="flashIsPlay" class="w-12 h-12 text-white" :stroke-width="2.5" />
        <Pause v-else class="w-12 h-12 text-white" :stroke-width="2.5" />
      </div>
    </div>

    <!-- Controls — shown by JS state, not CSS :hover, so they work on mobile too -->
    <div
      v-if="!loading && !hasError"
      class="absolute inset-x-0 bottom-0 transition-opacity duration-200"
      :class="controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
      @pointerdown="onControlsInteraction"
    >
      <div class="bg-linear-to-t from-black/80 via-black/50 to-transparent px-3 pb-2 pt-8">
        <!-- Seek bar -->
        <input
          type="range"
          class="w-full h-1 cursor-pointer accent-white"
          :value="currentTime"
          :max="totalDuration || 1"
          step="any"
          @input="onSeek"
        />

        <!-- Bottom row: play/pause · time · spacer · speed · fullscreen -->
        <div class="flex items-center gap-2 mt-1.5">
          <!-- Play / Pause -->
          <button
            class="text-white hover:text-gray-300 transition-colors"
            :aria-label="isPaused ? 'Play' : 'Pause'"
            @click="togglePlay"
          >
            <Play v-if="isPaused" class="w-5 h-5" />
            <Pause v-else class="w-5 h-5" />
          </button>

          <!-- Time -->
          <span class="text-white text-xs tabular-nums">
            {{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}
          </span>

          <div class="flex-1" />

          <!-- Playback speed -->
          <select
            v-model="playbackRate"
            class="bg-black/60 text-white text-xs rounded px-1 py-0.5 border border-white/20 cursor-pointer"
          >
            <option value="0.25">0.25×</option>
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>

          <!-- Fullscreen -->
          <button
            class="text-white hover:text-gray-300 transition-colors"
            :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
            @click="toggleFullscreen"
          >
            <Maximize v-if="!isFullscreen" class="w-5 h-5" />
            <Minimize v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Maximize, Minimize, Pause, Play } from '@lucide/vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { type UgoiraPlayerElement } from '@/utils/ugoira-player-element';
import '@/utils/ugoira-player-element';

const props = defineProps<{ src: string; clickToPlay?: boolean }>();

const rootRef = ref<HTMLDivElement | null>(null);
const playerEl = ref<UgoiraPlayerElement | null>(null);
const loading = ref(true);
const hasError = ref(false);
const isPaused = ref(true);
const isFullscreen = ref(false);
const showFlash = ref(false);
const flashKey = ref(0);
const flashIsPlay = ref(true);
let flashTimer: ReturnType<typeof setTimeout> | null = null;
const currentTime = ref(0);
const totalDuration = ref(0);
const playbackRate = ref('1');

// ── Controls visibility (JS-driven so it works on mobile too) ──
const controlsVisible = ref(false);
let controlsTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleHideControls(delay = 1500) {
  if (controlsTimer) clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    controlsVisible.value = false;
    controlsTimer = null;
  }, delay);
}

function onPlayerPointerEnter() {
  controlsVisible.value = true;
  if (controlsTimer) {
    clearTimeout(controlsTimer);
    controlsTimer = null;
  }
}

function onPlayerPointerLeave() {
  scheduleHideControls(500);
}

// Called on any pointerdown inside the controls bar — keeps them visible.
function onControlsInteraction() {
  controlsVisible.value = true;
  scheduleHideControls(2500);
}

// ── Media element event handlers ───────────────────────────────
function onReady() {
  loading.value = false;
  totalDuration.value = playerEl.value?.duration ?? 0;
}

function onTimeUpdate() {
  currentTime.value = playerEl.value?.currentTime ?? 0;
}

// ── Flash indicator ────────────────────────────────────────────
function triggerFlash(isPlay: boolean) {
  flashIsPlay.value = isPlay;
  flashKey.value++;
  showFlash.value = true;
  if (flashTimer !== null) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    showFlash.value = false;
    flashTimer = null;
  }, 700);
}

// ── Playback ───────────────────────────────────────────────────
function togglePlay() {
  if (!playerEl.value) return;
  if (playerEl.value.paused) {
    playerEl.value.play();
    triggerFlash(true);
  } else {
    playerEl.value.pause();
    triggerFlash(false);
  }
  // After a tap/click keep controls visible briefly (important on mobile).
  onControlsInteraction();
}

function onSeek(e: Event) {
  if (!playerEl.value) return;
  playerEl.value.currentTime = Number((e.target as HTMLInputElement).value);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    rootRef.value?.requestFullscreen();
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

// ── Page Visibility ────────────────────────────────────────────
let pausedByVisibility = false;

function onVisibilityChange() {
  if (document.hidden) {
    if (!isPaused.value) {
      playerEl.value?.pause();
      pausedByVisibility = true;
    }
  } else if (pausedByVisibility) {
    playerEl.value?.play();
    pausedByVisibility = false;
  }
}

// ── Helpers ────────────────────────────────────────────────────
function formatTime(s: number): string {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${m}:${sec}`;
}

// ── Watchers ───────────────────────────────────────────────────
watch(
  () => props.src,
  () => {
    loading.value = true;
    hasError.value = false;
    isPaused.value = true;
    currentTime.value = 0;
    totalDuration.value = 0;
    playbackRate.value = '1';
    pausedByVisibility = false;
  },
);

watch(playbackRate, (v) => {
  if (playerEl.value) playerEl.value.playbackRate = Number(v);
});

// ── Lifecycle ──────────────────────────────────────────────────
onMounted(() => {
  const el = playerEl.value;
  if (!el) return;
  el.addEventListener('canplaythrough', onReady);
  el.addEventListener('timeupdate', onTimeUpdate);
  el.addEventListener('play', () => {
    isPaused.value = false;
  });
  el.addEventListener('pause', () => {
    isPaused.value = true;
  });
  el.addEventListener('error', () => {
    hasError.value = true;
    loading.value = false;
  });
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (flashTimer !== null) clearTimeout(flashTimer);
  if (controlsTimer !== null) clearTimeout(controlsTimer);
});

defineExpose({
  play: () => playerEl.value?.play(),
  pause: () => playerEl.value?.pause(),
  get paused() {
    return playerEl.value?.paused ?? true;
  },
  get canvas(): HTMLCanvasElement | null {
    return playerEl.value?.canvas ?? null;
  },
});
</script>

<style scoped>
.flash-indicator {
  animation: flash-in-out 700ms ease-out forwards;
}

@keyframes flash-in-out {
  0%   { opacity: 0; transform: scale(0.5); }
  15%  { opacity: 1; transform: scale(1.1); }
  25%  { opacity: 1; transform: scale(1); }
  75%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1); }
}
</style>
