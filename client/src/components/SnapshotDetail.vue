<template>
  <ul v-if="lines.length" class="mt-1.5 flex flex-col gap-0.5 text-xs">
    <li
      v-for="(line, i) in lines"
      :key="i"
      :class="{
        'text-green-600 dark:text-green-400': line.kind === 'added',
        'text-red-600 dark:text-red-400': line.kind === 'removed',
        'text-yellow-600 dark:text-yellow-400': line.kind === 'changed',
        'text-gray-500 dark:text-gray-400': line.kind === 'plain' || line.kind === 'link',
      }"
    >
      <RouterLink
        v-if="line.kind === 'link' && line.linkTo"
        :to="line.linkTo"
        class="text-cyan-500 hover:underline"
      >
        {{ line.text }}
      </RouterLink>
      <span v-else>{{ line.text }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ResourceType, SnapshotInfo } from '@/types/oxibooru.gen';

const props = defineProps<{ snap: SnapshotInfo }>();

// ─── Local data shapes ───────────────────────────────────────────────────────

type DiffNode =
  | { type: 'primitive change'; 'old-value': unknown; 'new-value': unknown }
  | { type: 'list change'; added?: unknown[]; removed?: unknown[] }
  | { type: 'added property'; value: unknown }
  | { type: 'deleted property'; value: unknown }
  | { type: 'object change'; value: Record<string, DiffNode> };

interface ModifiedData {
  type: 'object change';
  value: Record<string, DiffNode>;
}

// ─── Detail line model ───────────────────────────────────────────────────────

type DetailLineKind = 'added' | 'removed' | 'changed' | 'plain' | 'link';

interface DetailLine {
  kind: DetailLineKind;
  text: string;
  linkTo?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '(none)';
  if (Array.isArray(v)) return v.map(formatValue).join(', ') || '(empty)';
  return String(v);
}

function linesFromDiffNode(label: string, node: DiffNode): DetailLine[] {
  switch (node.type) {
    case 'list change': {
      const out: DetailLine[] = [];
      if (node.added?.length)
        out.push({ kind: 'added', text: `Added ${label}: ${formatValue(node.added)}` });
      if (node.removed?.length)
        out.push({ kind: 'removed', text: `Removed ${label}: ${formatValue(node.removed)}` });
      if (!out.length) out.push({ kind: 'plain', text: `Changed ${label}` });
      return out;
    }
    case 'primitive change':
      return [
        {
          kind: 'changed',
          text: `Changed ${label}: ${formatValue(node['old-value'])} → ${formatValue(node['new-value'])}`,
        },
      ];
    case 'added property':
      return [{ kind: 'added', text: `Added ${label}: ${formatValue(node.value)}` }];
    case 'deleted property':
      return [{ kind: 'removed', text: `Removed ${label}: ${formatValue(node.value)}` }];
    default:
      return [{ kind: 'plain', text: `Changed ${label}` }];
  }
}

function buildResourceLink(type: string, id: string): string | null {
  switch (type) {
    case 'post':
      return `/post/${id}`;
    case 'tag':
      return `/tag/${encodeURIComponent(id)}`;
    case 'pool':
      return `/pool/${id}`;
    case 'tag_category':
      return '/tag-categories';
    case 'pool_category':
      return '/pool-categories';
    default:
      return null;
  }
}

function formatMergeTarget(type: string, id: string): string {
  switch (type) {
    case 'post':
      return `post @${id}`;
    case 'tag':
      return `tag #${id}`;
    case 'pool':
      return `pool %${id}`;
    default:
      return `${type} ${id}`;
  }
}

const FIELD_ORDER: Partial<Record<ResourceType, string[]>> = {
  tag: ['names', 'category', 'description', 'implications', 'suggestions'],
  tag_category: ['name', 'color', 'default'],
  pool_category: ['name', 'color', 'default'],
  post: ['safety', 'source', 'tags', 'relations', 'flags', 'featured'],
  pool: ['names', 'category', 'description', 'posts'],
};

const MODIFIED_FIELD_ORDER: Partial<Record<ResourceType, string[]>> = {
  tag: ['names', 'category', 'description', 'implications', 'suggestions'],
  tag_category: ['name', 'color', 'default'],
  pool_category: ['name', 'color', 'default'],
  post: [
    'checksum',
    'featured',
    'source',
    'description',
    'safety',
    'tags',
    'relations',
    'notes',
    'flags',
  ],
  pool: ['names', 'category', 'description', 'posts'],
};

function linesForCreated(type: ResourceType | undefined, data: unknown): DetailLine[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const d = data as Record<string, unknown>;
  const fieldOrder = (type && FIELD_ORDER[type]) ?? Object.keys(d);
  const out: DetailLine[] = [];
  for (const key of fieldOrder) {
    const val = d[key];
    if (val === undefined || val === null || val === false) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    const label = key.slice(0, 1).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    const text = Array.isArray(val) ? val.map(formatValue).join(', ') : String(val);
    out.push({ kind: 'plain', text: `${label}: ${text}` });
  }
  return out;
}

function linesForModified(type: ResourceType | undefined, data: unknown): DetailLine[] {
  if (
    !data ||
    typeof data !== 'object' ||
    (data as Record<string, unknown>).type !== 'object change'
  )
    return [];
  const diff = (data as ModifiedData).value;
  if (!diff || typeof diff !== 'object') return [];

  const fieldOrder = (type && MODIFIED_FIELD_ORDER[type]) ?? Object.keys(diff);
  const out: DetailLine[] = [];

  for (const key of fieldOrder) {
    const node = diff[key] as DiffNode | undefined;
    if (!node) continue;

    if (type === 'post' && key === 'checksum') {
      out.push({ kind: 'changed', text: 'Changed content' });
      continue;
    }
    if (type === 'post' && key === 'notes') {
      out.push({ kind: 'changed', text: 'Changed notes' });
      continue;
    }
    if (type === 'post' && key === 'flags') {
      out.push({ kind: 'changed', text: 'Changed flags' });
      continue;
    }
    if (type === 'post' && key === 'featured') {
      out.push({ kind: 'plain', text: 'Featured on front page' });
      continue;
    }
    if ((type === 'tag_category' || type === 'pool_category') && key === 'default') {
      out.push({ kind: 'plain', text: 'Made into default category' });
      continue;
    }

    const label = key.slice(0, 1).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    out.push(...linesFromDiffNode(label, node));
  }

  return out;
}

function linesForMerged(data: unknown): DetailLine[] {
  if (!Array.isArray(data) || data.length < 2) return [];
  const [targetType, targetId] = data as [string, string | number];
  const id = String(targetId);
  const link = buildResourceLink(targetType, id);
  const label = formatMergeTarget(targetType, id);
  if (link) {
    return [{ kind: 'link', text: `Merged to ${label}`, linkTo: link }];
  }
  return [{ kind: 'plain', text: `Merged to ${label}` }];
}

// ─── Main computed ────────────────────────────────────────────────────────────

const lines = computed((): DetailLine[] => {
  const { operation, type, data } = props.snap;
  switch (operation) {
    case 'created':
    case 'deleted':
      return linesForCreated(type, data);
    case 'modified':
      return linesForModified(type, data);
    case 'merged':
      return linesForMerged(data);
    default:
      return [];
  }
});
</script>
