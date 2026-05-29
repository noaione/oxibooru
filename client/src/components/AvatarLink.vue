<template>
  <component
    :is="simple ? 'span' : 'RouterLink'"
    :to="`/user/${name}`"
    class="inline-block"
    :class="{
      'text-cyan-500': !simple,
    }"
  >
    <img
      v-if="avatarUrl"
      :src="resolveApiUrl(avatarUrl)"
      :alt="name"
      class="size-4 object-contain inline-block mr-1"
    />
    <span class="inline-block decoration-dashed" :class="{ 'hover:underline': !simple }">
      {{ name }}
    </span>
  </component>
</template>

<script setup lang="ts">
import { resolveApiUrl } from '@/utils/url';

defineProps<{
  simple?: boolean;
  name: string;
  avatarUrl?: string | null;
}>();
</script>
