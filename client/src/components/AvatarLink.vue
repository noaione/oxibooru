<template>
  <component
    :is="simple ? 'span' : 'RouterLink'"
    :to="`/user/${name}`"
    class="text-cyan-500 inline-block"
  >
    <img
      v-if="avatarUrl"
      :src="resolveApiUrl(avatarUrl)"
      :alt="name"
      class="size-4 object-contain inline-block mr-1"
    />
    <span class="inline-block hover:underline decoration-dashed">{{ name }}</span>
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
