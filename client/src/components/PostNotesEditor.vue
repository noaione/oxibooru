<template>
  <!-- SVG overlay: teleported into the media wrapper so it sits over the image -->
  <Teleport v-if="overlayContainer" :to="overlayContainer">
    <div ref="overlayRef" class="absolute inset-0 z-10">
      <svg
        v-if="svgReady"
        ref="svgEl"
        :style="[svgStyle, { cursor: mode === 'drawing' ? 'crosshair' : 'default' }]"
        class="absolute"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        @click.self="onSvgClick"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="cursorNorm = null"
      >
        <!-- Existing notes -->
        <g v-for="(note, idx) in localNotes" :key="idx">
          <polygon
            :points="toPoints(note.polygon)"
            :fill="notePolygonFill(idx)"
            :stroke="notePolygonStroke(idx)"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
            :style="{
              cursor: mode === 'drawing' ? 'crosshair' : 'pointer',
              transition: 'fill 0.12s',
            }"
            @click.stop="onNoteClick(idx, $event)"
          />

          <!-- Centroid ✕ button (idle mode only) -->
          <text
            v-if="mode === 'idle'"
            :x="centroid(note.polygon)[0]"
            :y="centroid(note.polygon)[1]"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="0.04"
            fill="oklch(0.95 0 0 / 0.9)"
            stroke="oklch(0.2 0 0 / 0.5)"
            stroke-width="0.003"
            vector-effect="non-scaling-stroke"
            style="cursor: pointer; user-select: none; pointer-events: all"
            @click.stop="deleteNote(idx)"
          >
            ✕
          </text>

          <!-- Vertex handles (active editing note only) -->
          <template v-if="mode === 'editing' && editingIdx === idx">
            <circle
              v-for="(pt, ptIdx) in note.polygon"
              :key="ptIdx"
              :cx="pt[0]"
              :cy="pt[1]"
              r="0.012"
              fill="oklch(0.65 0.20 218)"
              stroke="white"
              stroke-width="0.004"
              vector-effect="non-scaling-stroke"
              style="cursor: grab"
              @pointerdown.stop="startDrag(idx, ptIdx, $event)"
            />
          </template>
        </g>

        <!-- Drawing mode: in-progress polygon preview -->
        <template v-if="mode === 'drawing' && draftPoints.length > 0">
          <polyline
            v-if="draftPoints.length > 1"
            :points="toPoints(draftPoints)"
            fill="none"
            stroke="oklch(0.72 0.18 218 / 0.9)"
            stroke-width="1.5"
            stroke-dasharray="4 3"
            vector-effect="non-scaling-stroke"
          />
          <!-- Ghost line to cursor -->
          <line
            v-if="cursorNorm && draftPoints.length >= 1"
            :x1="draftPoints[draftPoints.length - 1][0]"
            :y1="draftPoints[draftPoints.length - 1][1]"
            :x2="cursorNorm[0]"
            :y2="cursorNorm[1]"
            stroke="oklch(0.72 0.18 218 / 0.5)"
            stroke-width="1"
            stroke-dasharray="3 3"
            vector-effect="non-scaling-stroke"
          />
          <!-- Vertex dots; first dot is larger and acts as close target -->
          <circle
            v-for="(pt, i) in draftPoints"
            :key="i"
            :cx="pt[0]"
            :cy="pt[1]"
            :r="i === 0 ? 0.016 : 0.009"
            :fill="i === 0 ? 'oklch(0.72 0.18 218)' : 'oklch(0.72 0.18 218 / 0.8)'"
            stroke="white"
            stroke-width="0.004"
            vector-effect="non-scaling-stroke"
            :style="{
              cursor: i === 0 && draftPoints.length >= 3 ? 'pointer' : 'crosshair',
            }"
            @click.stop="i === 0 && draftPoints.length >= 3 ? closePolygon() : addPoint($event)"
          />
        </template>
      </svg>
    </div>
  </Teleport>

  <!-- Text editor panel: renders at the component's DOM position (below media wrapper) -->
  <div v-if="mode === 'editing'" class="flex flex-col gap-2 mt-2 p-3 card text-sm">
    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      Note text
    </p>

    <!-- Write / Preview tabs -->
    <div class="flex gap-2 text-xs border-b border-gray-200 dark:border-gray-600">
      <button
        type="button"
        class="px-2 py-1 cursor-pointer transition-colors"
        :class="
          !editPreview
            ? 'border-b-2 border-accent-500 text-accent-500 -mb-px'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        "
        @click="editPreview = false"
      >
        Write
      </button>
      <button
        type="button"
        class="px-2 py-1 cursor-pointer transition-colors"
        :class="
          editPreview
            ? 'border-b-2 border-accent-500 text-accent-500 -mb-px'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        "
        @click="editPreview = true"
      >
        Preview
      </button>
    </div>

    <FlatTextarea
      v-if="!editPreview"
      v-model="editingText"
      rows="3"
      placeholder="Note text (Markdown supported)"
      class="w-full bg-gray-50! dark:bg-gray-800!"
    />
    <div
      v-else
      class="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 min-h-12 px-2 py-1.5 wrap-break-word"
      v-html="editPreviewHtml"
    />

    <div class="flex items-center gap-2">
      <FlatButton type="button" @click="commitEdit">Save note</FlatButton>
      <FlatButton type="button" kind="neutral" @click="cancelEdit">Cancel</FlatButton>
      <button
        type="button"
        class="text-xs text-red-500 hover:text-red-600 cursor-pointer ml-auto"
        @click="deleteEditing"
      >
        Delete note
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Note } from '@/types/oxibooru.gen';
import { renderMarkdown } from '@/utils/markdown';
import { useNotesBounds } from '@/composables/useNotesBounds';
import FlatButton from '@/components/FlatButton.vue';
import FlatTextarea from '@/components/FlatTextarea.vue';

const props = defineProps<{
  notes: Note[];
  imgEl: HTMLImageElement | HTMLVideoElement | null;
  /** The positioned element (media wrapper) to teleport the SVG overlay into. */
  overlayContainer: HTMLElement | null;
}>();

const emit = defineEmits<{
  (e: 'update', notes: Note[]): void;
}>();

// ── SVG overlay bounds ──────────────────────────────────────────
const overlayRef = ref<HTMLDivElement | null>(null);
const svgEl = ref<SVGSVGElement | null>(null);
const imgElRef = computed(() => props.imgEl);
const { svgStyle, svgReady } = useNotesBounds(imgElRef, overlayRef);

// ── Working copy ────────────────────────────────────────────────
const localNotes = ref<Note[]>(structuredClone(props.notes));

watch(
  () => props.notes,
  (n) => {
    if (mode.value === 'idle') {
      localNotes.value = structuredClone(n);
    }
  },
);

// ── Interaction state ───────────────────────────────────────────
type Mode = 'idle' | 'drawing' | 'editing';
const mode = ref<Mode>('idle');
const draftPoints = ref<[number, number][]>([]);
const cursorNorm = ref<[number, number] | null>(null);

const editingIdx = ref<number | null>(null);
const editingText = ref('');
const editPreview = ref(false);

const dragging = ref<{ noteIdx: number; ptIdx: number } | null>(null);

const editPreviewHtml = computed(() =>
  editingText.value ? renderMarkdown(editingText.value) : '',
);

// ── Polygon styling helpers ─────────────────────────────────────
function notePolygonFill(idx: number): string {
  if (mode.value === 'editing') {
    return editingIdx.value === idx
      ? 'oklch(0.72 0.18 218 / 0.35)'
      : 'oklch(0.85 0.18 85 / 0.08)';
  }
  return 'oklch(0.85 0.18 85 / 0.25)';
}

function notePolygonStroke(idx: number): string {
  if (mode.value === 'editing') {
    return editingIdx.value === idx
      ? 'oklch(0.65 0.20 218 / 0.9)'
      : 'oklch(0.78 0.20 85 / 0.3)';
  }
  return 'oklch(0.78 0.20 85 / 0.9)';
}

// ── Coordinate helpers ──────────────────────────────────────────
function toPoints(polygon: number[][]): string {
  return polygon.map(([x, y]) => `${x},${y}`).join(' ');
}

function centroid(polygon: number[][]): [number, number] {
  const n = polygon.length;
  if (n === 0) return [0.5, 0.5];
  return [
    polygon.reduce((s, p) => s + p[0], 0) / n,
    polygon.reduce((s, p) => s + p[1], 0) / n,
  ];
}

function svgPoint(e: MouseEvent | PointerEvent): [number, number] {
  const rect = svgEl.value!.getBoundingClientRect();
  return [
    Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
    Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
  ];
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// ── Drawing ─────────────────────────────────────────────────────
function startDrawing() {
  resetEdit();
  mode.value = 'drawing';
  draftPoints.value = [];
  cursorNorm.value = null;
}

function onSvgClick(e: MouseEvent) {
  if (mode.value !== 'drawing') return;
  if (!svgEl.value) return;
  addPoint(e);
}

function addPoint(e: MouseEvent) {
  if (!svgEl.value) return;
  const pt = svgPoint(e);
  if (draftPoints.value.length >= 3 && dist(pt, draftPoints.value[0]) < 0.03) {
    closePolygon();
    return;
  }
  draftPoints.value = [...draftPoints.value, pt];
}

function closePolygon() {
  if (draftPoints.value.length < 3) return;
  const newNote: Note = { polygon: draftPoints.value.slice(), text: '' };
  localNotes.value = [...localNotes.value, newNote];
  draftPoints.value = [];
  cursorNorm.value = null;
  openEdit(localNotes.value.length - 1);
  emit('update', structuredClone(localNotes.value));
}

// ── Note click ──────────────────────────────────────────────────
function onNoteClick(idx: number, e: MouseEvent) {
  if (mode.value === 'drawing') {
    addPoint(e);
    return;
  }
  openEdit(idx);
}

// ── Editing ─────────────────────────────────────────────────────
function openEdit(idx: number) {
  editingIdx.value = idx;
  editingText.value = localNotes.value[idx].text;
  editPreview.value = false;
  mode.value = 'editing';
}

function commitEdit() {
  if (editingIdx.value === null) return;
  const updated = localNotes.value.map((n, i) =>
    i === editingIdx.value ? { ...n, text: editingText.value } : n,
  );
  localNotes.value = updated;
  emit('update', structuredClone(localNotes.value));
  resetEdit();
}

function cancelEdit() {
  // Remove the note if it was just drawn and still has no text
  if (editingIdx.value !== null && !localNotes.value[editingIdx.value].text) {
    localNotes.value = localNotes.value.filter((_, i) => i !== editingIdx.value);
    emit('update', structuredClone(localNotes.value));
  }
  resetEdit();
}

function deleteEditing() {
  if (editingIdx.value === null) return;
  localNotes.value = localNotes.value.filter((_, i) => i !== editingIdx.value);
  emit('update', structuredClone(localNotes.value));
  resetEdit();
}

function deleteNote(idx: number) {
  localNotes.value = localNotes.value.filter((_, i) => i !== idx);
  emit('update', structuredClone(localNotes.value));
}

function resetEdit() {
  editingIdx.value = null;
  editingText.value = '';
  editPreview.value = false;
  mode.value = 'idle';
}

// ── Vertex dragging ──────────────────────────────────────────────
function startDrag(noteIdx: number, ptIdx: number, e: PointerEvent) {
  dragging.value = { noteIdx, ptIdx };
  (e.target as SVGElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!svgEl.value) return;
  const pt = svgPoint(e);

  if (mode.value === 'drawing') {
    cursorNorm.value = pt;
  }

  if (dragging.value) {
    const { noteIdx, ptIdx } = dragging.value;
    const note = localNotes.value[noteIdx];
    if (!note) return;
    localNotes.value = localNotes.value.map((n, i) =>
      i === noteIdx
        ? { ...n, polygon: n.polygon.map((p, j) => (j === ptIdx ? [pt[0], pt[1]] : p)) }
        : n,
    );
  }
}

function onPointerUp() {
  if (dragging.value) {
    emit('update', structuredClone(localNotes.value));
    dragging.value = null;
  }
}

// Expose so PostView can trigger "Add note" from the sidebar button
defineExpose({ startDrawing });
</script>
