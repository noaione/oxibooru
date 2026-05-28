<template>
  <div ref="overlayRef" class="absolute inset-0 pointer-events-none">
    <svg
      v-if="svgReady"
      :style="svgStyle"
      class="absolute pointer-events-auto"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      <polygon
        v-for="(note, idx) in notes"
        :key="idx"
        :points="toPoints(note.polygon)"
        :fill="hoveredNote === note ? 'oklch(0.85 0.18 85 / 0.4)' : 'oklch(0.85 0.18 85 / 0.15)'"
        stroke="oklch(0.78 0.20 85 / 0.9)"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
        style="cursor: pointer; transition: fill 0.12s"
        @mouseenter="(e) => onEnter(e, note)"
        @mousemove="onMove"
        @mouseleave="hoveredNote = null"
        @dblclick.prevent="onDblClick(note)"
      />
    </svg>

    <Teleport to="body">
      <div
        v-if="hoveredNote"
        class="note-tooltip fixed z-50 max-w-64 bg-black/90 text-white text-sm rounded px-2.5 py-2 pointer-events-none shadow-lg"
        :style="tooltipStyle"
        v-html="renderedText"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { Note } from '@/types/oxibooru.gen';
import { renderMarkdown } from '@/utils/markdown';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const props = defineProps<{
  notes: Note[];
  imgEl: HTMLImageElement | HTMLVideoElement | null;
}>();

const overlayRef = ref<HTMLDivElement | null>(null);
const svgReady = ref(false);
const svgStyle = ref<Record<string, string>>({});

const hoveredNote = ref<Note | null>(null);
const cursorX = ref(0);
const cursorY = ref(0);

function toPoints(polygon: number[][]): string {
  return polygon.map(([x, y]) => `${x},${y}`).join(' ');
}

function computeBounds() {
  const imgEl = props.imgEl;
  const overlayEl = overlayRef.value;
  if (!imgEl || !overlayEl) return;

  const imgRect = imgEl.getBoundingClientRect();
  const overlayRect = overlayEl.getBoundingClientRect();

  // img position relative to the overlay container
  let rX = imgRect.left - overlayRect.left;
  let rY = imgRect.top - overlayRect.top;
  let rW = imgRect.width;
  let rH = imgRect.height;

  // Account for object-contain letterboxing using the natural dimensions
  const naturalW =
    imgEl instanceof HTMLImageElement ? imgEl.naturalWidth : (imgEl as HTMLVideoElement).videoWidth;
  const naturalH =
    imgEl instanceof HTMLImageElement ? imgEl.naturalHeight : (imgEl as HTMLVideoElement).videoHeight;

  if (naturalW && naturalH && rW > 0 && rH > 0) {
    const containerAspect = rW / rH;
    const naturalAspect = naturalW / naturalH;

    if (naturalAspect > containerAspect) {
      // Image wider than rendered box — letterbox top/bottom
      const scaledH = rW / naturalAspect;
      rY += (rH - scaledH) / 2;
      rH = scaledH;
    } else {
      // Image taller than rendered box — letterbox left/right
      const scaledW = rH * naturalAspect;
      rX += (rW - scaledW) / 2;
      rW = scaledW;
    }
  }

  svgStyle.value = {
    left: `${rX}px`,
    top: `${rY}px`,
    width: `${rW}px`,
    height: `${rH}px`,
  };
  svgReady.value = true;
}

let ro: ResizeObserver | null = null;

function attach(imgEl: HTMLImageElement | HTMLVideoElement) {
  ro?.disconnect();
  ro = new ResizeObserver(computeBounds);
  ro.observe(imgEl);
  // Also observe the overlay container so we recompute if it moves
  if (overlayRef.value) ro.observe(overlayRef.value);

  if (imgEl instanceof HTMLImageElement) {
    if (imgEl.complete && imgEl.naturalWidth) {
      computeBounds();
    } else {
      imgEl.addEventListener('load', computeBounds, { once: true });
    }
  } else {
    if ((imgEl as HTMLVideoElement).readyState >= 1) {
      computeBounds();
    } else {
      imgEl.addEventListener('loadedmetadata', computeBounds, { once: true });
    }
  }
}

watch(
  () => props.imgEl,
  (el) => {
    svgReady.value = false;
    ro?.disconnect();
    ro = null;
    if (el) attach(el);
  },
  { immediate: true },
);

// Re-attach overlay observer once the ref mounts
watch(overlayRef, (el) => {
  if (el && ro) ro.observe(el);
  computeBounds();
});

onUnmounted(() => ro?.disconnect());

function onEnter(e: MouseEvent, note: Note) {
  hoveredNote.value = note;
  cursorX.value = e.clientX;
  cursorY.value = e.clientY;
}

function onMove(e: MouseEvent) {
  cursorX.value = e.clientX;
  cursorY.value = e.clientY;
}

async function onDblClick(note: Note) {
  await navigator.clipboard.writeText(note.text);
  toast.showSuccess('Note text copied to clipboard');
}

const tooltipStyle = computed(() => ({
  left: `${cursorX.value + 16}px`,
  top: `${cursorY.value - 16}px`,
  transform: 'translateY(-50%)',
}));

const renderedText = computed(() =>
  hoveredNote.value ? renderMarkdown(hoveredNote.value.text) : '',
);
</script>

<style scoped>
.note-tooltip :deep(p) {
  margin: 0 0 0.25em;
}
.note-tooltip :deep(p:last-child) {
  margin-bottom: 0;
}
.note-tooltip :deep(a) {
  color: #67e8f9;
  text-decoration: underline;
}
.note-tooltip :deep(strong) {
  font-weight: 600;
}
.note-tooltip :deep(em) {
  font-style: italic;
}
</style>
