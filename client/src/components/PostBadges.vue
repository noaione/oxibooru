<template>
  <div class="absolute inset-0 pointer-events-none">
    <!-- Type badge (top-left) -->
    <span
      v-if="post.type && post.type !== 'image'"
      class="absolute top-0.5 left-0.5 text-xs text-white bg-black/60 px-1 py-0.5 leading-none capitalize"
    >
      {{ post.type }}
    </span>

    <!-- Stats (bottom) -->
    <div
      v-if="post.score || post.favoriteCount || post.commentCount"
      class="absolute bottom-0 left-0 right-0 flex gap-1.5 px-1 py-0.5 text-xs text-white bg-black/50 leading-none"
    >
      <span v-if="post.score" class="flex items-center gap-0.5">
        <ThumbsUpIcon :size="10" />{{ post.score }}
      </span>
      <span v-if="post.favoriteCount" class="flex items-center gap-0.5">
        <HeartIcon :size="10" />{{ post.favoriteCount }}
      </span>
      <span v-if="post.commentCount" class="flex items-center gap-0.5">
        <MessageCircleIcon :size="10" />{{ post.commentCount }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ThumbsUp as ThumbsUpIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
} from '@lucide/vue';
import type { PagedResponsePostInfo } from '@/types/oxibooru.gen';

defineProps<{
  post: PagedResponsePostInfo['results'][0];
}>();
</script>
