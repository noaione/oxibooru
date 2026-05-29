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
import { ref, computed } from 'vue';
import type { Note } from '@/types/oxibooru.gen';
import { renderMarkdown } from '@/utils/markdown';
import { useToast } from '@/composables/useToast';
import { useNotesBounds } from '@/composables/useNotesBounds';

const toast = useToast();

const props = defineProps<{
  notes: Note[];
  imgEl: HTMLImageElement | HTMLVideoElement | null;
}>();

const overlayRef = ref<HTMLDivElement | null>(null);

const imgElRef = computed(() => props.imgEl);
const { svgStyle, svgReady } = useNotesBounds(imgElRef, overlayRef);

const hoveredNote = ref<Note | null>(null);
const cursorX = ref(0);
const cursorY = ref(0);

function toPoints(polygon: number[][]): string {
  return polygon.map(([x, y]) => `${x},${y}`).join(' ');
}

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
