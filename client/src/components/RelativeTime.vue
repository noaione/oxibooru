<template>
  <time :datetime="time" :title="absolute">{{ relative }}</time>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ time: string }>();

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 60_000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const absolute = computed(() => {
  if (!props.time) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(props.time));
  } catch {
    return props.time ?? '';
  }
});

const relative = computed(() => {
  if (!props.time) return 'never';
  const then = Date.parse(props.time);
  const difference = Math.abs(now.value - then) / 1000.0;
  const future = now.value < then;

  const descriptions: [number, string, number | null][] = [
    [60, 'a few seconds', null],
    [60 * 2, 'a minute', null],
    [60 * 60, '% minutes', 60],
    [60 * 60 * 2, 'an hour', null],
    [60 * 60 * 24, '% hours', 60 * 60],
    [60 * 60 * 24 * 2, 'a day', null],
    [60 * 60 * 24 * 30.42, '% days', 60 * 60 * 24],
    [60 * 60 * 24 * 30.42 * 2, 'a month', null],
    [60 * 60 * 24 * 30.42 * 12, '% months', 60 * 60 * 24 * 30.42],
    [60 * 60 * 24 * 30.42 * 12 * 2, 'a year', null],
    [8640000000000000 /* max*/, '% years', 60 * 60 * 24 * 30.42 * 12],
  ];

  let text: string | null = null;
  for (const [multiplier, template, divider] of descriptions) {
    if (difference < multiplier) {
      if (divider === null) {
        text = template;
        break;
      }
      text = template.replace(/%/, Math.round(difference / divider).toString());
      break;
    }
  }

  if (text === 'a day') {
    return future ? 'tomorrow' : 'yesterday';
  }
  return future ? `in ${text}` : `${text} ago`;
});
</script>
