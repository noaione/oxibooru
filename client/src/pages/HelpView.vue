<template>
  <div class="flex flex-col md:flex-row gap-6 w-full max-w-5xl mx-auto">
    <!-- Sidebar -->
    <nav class="md:w-44 shrink-0">
      <ul class="flex flex-row md:flex-col gap-1 flex-wrap">
        <li v-for="s in sections" :key="s.id">
          <RouterLink
            :to="s.id === 'about' ? '/help' : `/help/${s.id}`"
            class="block px-3 py-1.5 rounded text-sm transition-colors"
            :class="activeSection === s.id
              ? 'bg-cyan-500 text-white font-medium'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
          >
            {{ s.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div
        class="prose prose-sm dark:prose-invert max-w-none"
        v-html="renderedContent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore } from '@/stores/api';
import { renderMarkdown } from '@/utils/markdown';

const route = useRoute();
const api = useTokenStore();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

const sections = [
  { id: 'about', label: 'About' },
  { id: 'search', label: 'Search' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'api', label: 'API' },
];

const activeSection = computed(() => (route.params.section as string) || 'about');

useHeadSafe(() => ({
  title: `${serverName.value} - Help: ${sections.find((s) => s.id === activeSection.value)?.label ?? 'Help'}`,
}));

const CONTENT: Record<string, string> = {
  about: `# About

This is **${serverName.value}**, an image board powered by [Oxibooru](https://github.com/liamwhite/oxibooru).

You can browse, upload, tag, and comment on posts. Use the search bar on the posts page to find images by tag.

## Getting started

- Browse posts at [/posts](/posts)
- Sign up at [/register](/register) for an account
- Use tags to organize and find content
`,

  search: `# Search

The search system lets you filter posts by various attributes.

## Tag search

- \`tagname\` – posts with this tag
- \`-tagname\` – posts *without* this tag
- \`tagname1 tagname2\` – posts with both tags
- \`tagname*\` – wildcard: tags starting with "tagname"

## Field search

| Token | Meaning |
|---|---|
| \`id:1\` | Post with ID 1 |
| \`score:>10\` | Score over 10 |
| \`score:5..20\` | Score between 5 and 20 |
| \`uploader:name\` | Uploaded by user |
| \`pool:name\` | In a pool |
| \`type:image\` | Content type (image, video, animation, flash) |
| \`date:2024\` | Uploaded in 2024 |
| \`date:2024-01..2024-06\` | Date range |
| \`fav:name\` | Favorited by user |
| \`comment:text\` | Has a comment containing text |
| \`tag-count:>5\` | Has more than 5 tags |

## Sort tokens

Append \`sort:field\` or \`sort:field,desc\`:

\`sort:score,desc\` \`sort:date\` \`sort:comment-count\` \`sort:tag-count\` \`sort:random\`

## Special tokens

- \`fav:me\` – your favorites (requires login)
- \`uploader:me\` – your uploads (requires login)
`,

  keyboard: `# Keyboard shortcuts

## Post list

| Key | Action |
|---|---|
| \`←\` / \`→\` | Previous / next page |

## Post view

| Key | Action |
|---|---|
| \`←\` | Previous post |
| \`→\` | Next post |
| \`e\` | Edit post |
| \`f\` | Toggle favorite |
`,

  privacy: `# Privacy

Your account information (username, email) is stored on this server and is not shared with third parties.

Uploaded content is stored on this server. Be aware that other users can view all public posts.

Comments and votes are associated with your account.

Contact the server administrator for data deletion requests.
`,

  api: `# API

This server exposes a REST API compatible with [szurubooru](https://github.com/rr-/szurubooru).

Full API documentation is available at:

- [/api](/api) — API root (JSON)

The API supports token-based authentication. Pass \`Authorization: Token base64(user:token)\` in requests.

Refer to the [szurubooru API documentation](https://github.com/rr-/szurubooru/blob/master/doc/API.md) for full endpoint reference.
`,
};

const renderedContent = computed(() => {
  const raw = CONTENT[activeSection.value] ?? CONTENT['about'];
  return renderMarkdown(raw);
});
</script>
