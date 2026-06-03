<template>
  <div ref="overlayRef" class="absolute inset-0 pointer-events-none">
    <svg
      v-if="svgReady"
      :style="svgStyle"
      class="absolute pointer-events-auto"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      @click.self="pinnedNote = null"
    >
      <polygon
        v-for="(note, idx) in notes"
        :key="idx"
        :points="toPoints(note.polygon)"
        :fill="activeNote === note ? 'oklch(0.85 0.18 85 / 0.4)' : 'oklch(0.85 0.18 85 / 0.15)'"
        stroke="oklch(0.78 0.20 85 / 0.9)"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
        style="cursor: pointer; touch-action: manipulation; transition: fill 0.12s"
        @mouseenter="(e) => onEnter(e, note)"
        @mousemove="onMove"
        @mouseleave="hoverNote = null"
        @click="(e) => togglePin(note, e)"
        @dblclick.prevent="onDblClick(note)"
      />
    </svg>

    <Teleport to="body">
      <div
        v-if="activeNote"
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
  imgEl: HTMLElement | null;
}>();

const overlayRef = ref<HTMLDivElement | null>(null);
const imgElRef = computed(() => props.imgEl);
const { svgStyle, svgReady } = useNotesBounds(imgElRef, overlayRef);

// pinnedNote: set by click/tap, persists until dismissed.
// hoverNote: set by mouseenter, cleared on mouseleave (desktop hover only).
// activeNote: what the tooltip shows — pinned takes precedence over hover.
const pinnedNote = ref<Note | null>(null);
const hoverNote = ref<Note | null>(null);
const activeNote = computed(() => pinnedNote.value ?? hoverNote.value);

const cursorX = ref(0);
const cursorY = ref(0);

function toPoints(polygon: number[][]): string {
  return polygon.map(([x, y]) => `${x},${y}`).join(' ');
}

function onEnter(e: MouseEvent, note: Note) {
  hoverNote.value = note;
  // Only follow cursor while nothing is pinned.
  if (!pinnedNote.value) {
    cursorX.value = e.clientX;
    cursorY.value = e.clientY;
  }
}

function onMove(e: MouseEvent) {
  if (!pinnedNote.value) {
    cursorX.value = e.clientX;
    cursorY.value = e.clientY;
  }
}

function togglePin(note: Note, e: MouseEvent) {
  if (pinnedNote.value === note) {
    // Tap/click the active note again → dismiss.
    pinnedNote.value = null;
  } else {
    // Tap/click a new note → pin it and anchor the tooltip to the tap position.
    pinnedNote.value = note;
    cursorX.value = e.clientX;
    cursorY.value = e.clientY;
  }
}

async function onDblClick(note: Note) {
  await navigator.clipboard.writeText(note.text);
  toast.showSuccess('Note text copied to clipboard');
}

const tooltipStyle = computed(() => {
  const OFFSET = 14;
  const MAX_W = 256; // max-w-64
  const x = cursorX.value;
  const y = cursorY.value;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const flipH = x + OFFSET + MAX_W > vw;
  const flipV = y > vh * 0.6;

  return {
    left: flipH ? `${x - OFFSET}px` : `${x + OFFSET}px`,
    top: `${y}px`,
    transform: [flipH ? 'translateX(-100%)' : '', flipV ? 'translateY(-100%)' : 'translateY(-50%)']
      .filter(Boolean)
      .join(' '),
  };
});

const renderedText = computed(() =>
  activeNote.value ? renderMarkdown(activeNote.value.text) : '',
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
