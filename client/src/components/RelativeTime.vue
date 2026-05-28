<template>
  <time :datetime="time" :title="absolute">{{ relative }}</time>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ time?: string | null }>();

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 60_000); });
onUnmounted(() => { if (timer) clearInterval(timer); });

const absolute = computed(() => {
  if (!props.time) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(props.time));
  } catch {
    return props.time ?? '';
  }
});

const relative = computed(() => {
  if (!props.time) return '';
  const rtfl = new Intl.RelativeTimeFormat('en', { style: 'long' });
  const diff = (now.value - new Date(props.time).getTime()) / 1000;
  if (diff < 45) return 'just now';
  if (diff < 90) return rtfl.format(-1, 'minute');
  if (diff < 3600) return rtfl.format(-Math.round(diff / 60), 'minute');
  if (diff < 5400) return rtfl.format(-1, 'hour');
  if (diff < 86400) return rtfl.format(-Math.round(diff / 3600), 'hour');
  if (diff < 129600) return rtfl.format(-1, 'day');
  if (diff < 2592000) return rtfl.format(-Math.round(diff / 86400), 'day');
  if (diff < 3888000) return rtfl.format(-1, 'month');
  if (diff < 31536000) return rtfl.format(-Math.round(diff / 2592000), 'month');
  if (diff < 47304000) return rtfl.format(-1, 'year');
  return rtfl.format(-Math.round(diff / 31536000), 'year');
});
</script>
