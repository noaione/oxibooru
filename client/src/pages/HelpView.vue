<template>
  <div class="flex flex-col md:flex-row gap-6 w-full max-w-5xl mx-auto">
    <!-- Sidebar: top-level items only -->
    <nav class="md:w-48 shrink-0">
      <ul class="flex flex-row md:flex-col gap-0.5 flex-wrap">
        <li v-for="s in sections.filter((s) => !s.sub)" :key="s.id">
          <RouterLink
            :to="s.path"
            class="block py-1.5 text-sm transition-colors px-3"
            :class="
              activeSection === s.id || (s.id === 'search' && inSearchSection)
                ? 'bg-cyan-500 text-white font-medium'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            "
          >
            {{ s.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Content -->
    <div class="flex-1 min-w-0 flex flex-col gap-4">
      <!-- Search subsection tabs shown inside the content area -->
      <div v-if="inSearchSection" class="flex flex-wrap gap-1">
        <RouterLink
          v-for="s in sections.filter((s) => s.sub)"
          :key="s.id"
          :to="s.path"
          class="px-3 py-1 text-xs transition-colors"
          :class="
            activeSection === s.id
              ? 'bg-cyan-500 text-white font-medium'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          "
        >
          {{ s.label }}
        </RouterLink>
      </div>
      <div class="prose prose-sm dark:prose-invert max-w-none" v-html="renderedContent" />
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
  { id: 'about', label: 'About', sub: false, path: '/help' },
  { id: 'search', label: 'Search syntax', sub: false, path: '/help/search' },
  { id: 'search-general', label: 'General', sub: true, path: '/help/search' },
  { id: 'search-posts', label: 'Posts', sub: true, path: '/help/search/posts' },
  { id: 'search-tags', label: 'Tags', sub: true, path: '/help/search/tags' },
  { id: 'search-pools', label: 'Pools', sub: true, path: '/help/search/pools' },
  { id: 'search-users', label: 'Users', sub: true, path: '/help/search/users' },
  { id: 'keyboard', label: 'Keyboard', sub: false, path: '/help/keyboard' },
  { id: 'comments', label: 'Comments', sub: false, path: '/help/comments' },
  { id: 'tos', label: 'Terms of service', sub: false, path: '/help/tos' },
  { id: 'api', label: 'API', sub: false, path: '/help/api' },
];

const canSelfRegister = computed(() => api.canAccess('user_create_self', 'anonymous'));
const activeSection = computed(() => {
  const section = (route.params.section as string) || '';
  const subsection = (route.params.subsection as string) || '';
  if (!section) return 'about';
  if (section === 'search' && !subsection) return 'search-general';
  if (subsection) return `${section}-${subsection}`;
  return section;
});
const inSearchSection = computed(() => activeSection.value.startsWith('search'));

const adminEmail = computed(() => api.config?.config.contactEmail);

useHeadSafe(() => ({
  title: `${serverName.value} - Help: ${sections.find((s) => s.id === activeSection.value)?.label ?? 'Help'}`,
}));

const SEARCH_GENERAL = computed(
  () => `# Search syntax

Search queries are built of tokens separated by spaces. Each token can be of the following form:

| Syntax | Token type | Description |
|---|---|---|
| \`<value>\` | anonymous token | used for basic filters |
| \`<key>:<value>\` | named token | used for advanced filters |
| \`sort:<style>\` | sort style token | used to sort results |
| \`special:<value>\` | special token | filters usually tied to the logged-in user |

Most anonymous and named tokens support ranged and composite values:

| Form | Meaning |
|---|---|
| \`a,b,c\` | satisfies either \`a\`, \`b\`, or \`c\` |
| \`1..\` | equal to or greater than 1 |
| \`..4\` | equal to at most 4 |
| \`1..4\` | equal to 1, 2, 3, or 4 |

Date/time values can be: \`today\`, \`yesterday\`, \`<year>\`, \`<year>-<month>\`, \`<year>-<month>-<day>\`

Some fields, such as user names, accept wildcards (\`*\`).

All tokens can be negated by prepending \`-\`.

Sort style tokens can be appended with \`,asc\` or \`,desc\` to control the sort direction.

Escape special characters like \`:\` and \`-\` with a backslash: \`\\\`.

String literals are supported using double quotes (\`"\`). Inside a string literal, only the \`"\` character can be escaped with \`\\\`.

## Example

\`\`\`
sea -fav-count:8.. type:swf uploader:Pirate
\`\`\`

Shows flash files tagged as \`sea\`, liked by at most 7 people, uploaded by user Pirate.

Searching for \`re:zero\` will show an error about an unknown named token. Searching for \`re\\:zero\` will show posts tagged with \`re:zero\`.
`,
);

const CONTENT = {
  about: computed(
    () => `# About

This is **${serverName.value}**, an image board powered by [Oxibooru](https://github.com/liamw1/oxibooru).

You can browse, upload, tag, and comment on posts. Use the search bar on the posts page to find images by tag.

## Getting started

- Browse posts at [/posts](/posts)${canSelfRegister.value ? '\n- Sign up at [/register](/register) for an account' : ''}
- Use tags to organize and find content

## Registration

Registration is currently ${canSelfRegister.value ? '**Open**' : '**Closed**'} on this server.

The e-mail you enter during account creation is only used to retrieve your Gravatar and for password reminders.
Only you can see it (well, except the database staff… we won't spam your mailbox anyway).

Oh, and you can delete your account at any time. Posts you uploaded will stay, unless some angry admin removes them.
`,
  ),

  search: SEARCH_GENERAL,
  'search-general': SEARCH_GENERAL,

  'search-posts': computed(
    () => `# Searching posts

**Anonymous tokens:** Same as \`tag\` token.

## Named tokens

| Token | Meaning |
|---|---|
| \`id\` | having given post number |
| \`tag\` | having given tag (accepts wildcards) |
| \`tag-category\` | having tags from given category (accepts wildcards) |
| \`score\` | having given score |
| \`uploader\`, \`upload\`, \`submit\` | uploaded by given user (accepts wildcards) |
| \`comment\` | commented by given user (accepts wildcards) |
| \`fav\` | favorited by given user (accepts wildcards) |
| \`pool\` | belonging to pool with given name (accepts wildcards) or ID |
| \`pool-category\` | belonging to pools in given category (accepts wildcards) |
| \`tag-count\` | having given number of tags |
| \`comment-count\` | having given number of comments |
| \`fav-count\` | favorited by given number of users |
| \`note-count\` | having given number of annotations |
| \`note-text\` | having given note text (accepts wildcards) |
| \`relation-count\` | having given number of relations |
| \`feature-count\` | featured given number of times |
| \`type\` | post type: \`image\`, \`animation\`, \`flash\`, or \`video\` |
| \`content-checksum\` | having given BLAKE3 checksum |
| \`flag\` | having given flag: \`loop\` or \`sound\` |
| \`source\` | having given source |
| \`file-size\` | having given file size (in bytes) |
| \`image-width\`, \`width\` | having given image width |
| \`image-height\`, \`height\` | having given image height |
| \`image-area\`, \`area\` | number of pixels (width × height) |
| \`image-aspect-ratio\`, \`image-ar\`, \`ar\` | aspect ratio (width / height) |
| \`date\`, \`time\`, \`creation-date\`, \`creation-time\` | posted at given date |
| \`edit-date\`, \`last-edit-date\`, \`edit-time\` | edited at given date |
| \`comment-date\`, \`comment-time\` | commented at given date |
| \`fav-date\`, \`fav-time\` | last favorited at given date |
| \`feature-date\`, \`feature-time\` | featured at given date |
| \`safety\`, \`rating\` | safety rating: \`safe\`, \`sketchy\`, or \`unsafe\` |

## Sort tokens

| Token | Meaning |
|---|---|
| \`random\` | random order |
| \`id\` | highest post number first |
| \`score\` | highest scored first |
| \`uploader\`, \`upload\`, \`submit\` | uploader name A–Z |
| \`pool-count\`, \`pool\` | in most pools first |
| \`tag-count\`, \`tag\` | most tags first |
| \`comment-count\`, \`comment\` | most commented first |
| \`fav-count\`, \`fav\` | most favorited first |
| \`note-count\` | most annotations first |
| \`relation-count\` | most relations first |
| \`feature-count\` | most featured first |
| \`type\` | grouped by content type |
| \`flag\` | grouped by flags |
| \`source\` | sorted by source |
| \`file-size\` | largest files first |
| \`image-width\`, \`width\` | widest first |
| \`image-height\`, \`height\` | tallest first |
| \`image-area\`, \`area\` | largest first |
| \`image-aspect-ratio\`, \`ar\` | highest aspect ratio first |
| \`date\`, \`creation-date\`, \`time\` | newest first |
| \`edit-date\`, \`last-edit-date\` | recently edited first |
| \`comment-date\` | recently commented first |
| \`fav-date\` | recently favorited first |
| \`feature-date\` | recently featured first |
| \`safety\`, \`rating\` | most unsafe first |

## Special tokens

| Token | Meaning |
|---|---|
| \`liked\` | posts liked by the current user |
| \`disliked\` | posts disliked by the current user |
| \`fav\` | posts in the current user's favorites |
| \`tumbleweed\` | posts without ratings, comments, or favorites |
`,
  ),

  'search-tags': computed(
    () => `# Searching tags

**Anonymous tokens:** Same as \`name\` token.

## Named tokens

| Token | Meaning |
|---|---|
| \`name\` | having given name (accepts wildcards) |
| \`category\` | having given category (accepts wildcards) |
| \`description\` | having given description (accepts wildcards) |
| \`creation-date\`, \`creation-time\` | created at given date |
| \`edit-date\`, \`last-edit-date\`, \`edit-time\` | edited at given date |
| \`usages\`, \`usage-count\`, \`post-count\` | used in given number of posts |
| \`suggestion-count\` | with given number of suggestions |
| \`implication-count\` | with given number of implications |
| \`implies\` | having an implication with given name (accepts wildcards) |
| \`suggests\` | having a suggestion with given name (accepts wildcards) |

## Sort tokens

| Token | Meaning |
|---|---|
| \`random\` | random order |
| \`name\` | A to Z |
| \`category\` | category A to Z |
| \`description\` | description A to Z |
| \`creation-date\`, \`creation-time\` | recently created first |
| \`edit-date\`, \`last-edit-date\` | recently edited first |
| \`usages\`, \`usage-count\`, \`post-count\` | used in most posts first |
| \`implication-count\`, \`implies\` | most implications first |
| \`suggestion-count\`, \`suggests\` | most suggestions first |

## Special tokens

None.
`,
  ),

  'search-pools': computed(
    () => `# Searching pools

**Anonymous tokens:** Same as \`name\` token.

## Named tokens

| Token | Meaning |
|---|---|
| \`name\` | having given name (accepts wildcards) |
| \`category\` | having given category (accepts wildcards) |
| \`creation-date\`, \`creation-time\` | created at given date |
| \`edit-date\`, \`last-edit-date\`, \`edit-time\` | edited at given date |
| \`post-count\` | used in given number of posts |

## Sort tokens

| Token | Meaning |
|---|---|
| \`random\` | random order |
| \`name\` | A to Z |
| \`category\` | category A to Z |
| \`creation-date\`, \`creation-time\` | recently created first |
| \`edit-date\`, \`last-edit-date\` | recently edited first |
| \`post-count\` | used in most posts first |

## Special tokens

None.
`,
  ),

  'search-users': computed(
    () => `# Searching users

**Anonymous tokens:** Same as \`name\` token.

## Named tokens

| Token | Meaning |
|---|---|
| \`name\` | having given name (accepts wildcards) |
| \`creation-date\`, \`creation-time\` | registered at given date |
| \`last-login-date\`, \`last-login-time\`, \`login-date\` | most recent login matches given date |

## Sort tokens

| Token | Meaning |
|---|---|
| \`random\` | random order |
| \`name\` | A to Z |
| \`creation-date\`, \`creation-time\` | newest first |
| \`last-login-date\`, \`login-date\` | recently active first |

## Special tokens

None.
`,
  ),

  keyboard: computed(
    () => `# Keyboard shortcuts

| Hotkey | Description |
|---|---|
| \`Q\` | Focus search field (if available) |
| \`A\` / \`D\`, \`←\` / \`→\` | Go to newer / older page or post |
| \`F\` | Cycle post fit mode |
| \`E\` | Edit post |
| \`P\` | Focus first post in post list |
| \`T\` | (In edit mode) Focus tag input |
| \`Ctrl+S\` / \`Cmd+S\` | (In edit mode) Save post |
| \`Delete\` | (In edit mode) Delete post |
`,
  ),

  comments: computed(
    () => `# Comments

Comments support standard Markdown syntax, plus these extensions:

| Syntax | Result |
|---|---|
| \`@426\` | links to post #426 |
| \`#Dragon_Ball\` | links to tag "Dragon_Ball" |
| \`+Pirate\` | links to user "Pirate" |
| \`%123\` | links to pool #123 |
| \`~~strikethrough~~\` | ~~strikethrough~~ text |
| \`[spoiler]text[/spoiler]\` | hides text as a spoiler |
| \`[icon]https://youtube.com[/icon]\` | add a link with an icon |
| \`\`[sjis](´･ω･\`)[/sjis]\`\` | adds SJIS art |

You can also specify the size of embedded images like this:
- \`![alt](href "title"){WIDTHx}\`
- \`![alt](href "title"){xHEIGHT}\`
- \`![alt](href "title"){WIDTHxHEIGHT}\`

## Markdown basics

\`\`\`
**bold**   _italic_   \`code\`   ~~strikethrough~~

[link text](https://example.com)
![image alt](https://example.com/image.png)

# Heading 1
## Heading 2

- bullet list
- item two

1. numbered list
2. item two

> blockquote
\`\`\`
`,
  ),

  tos: computed(
    () => `# Terms of service

By accessing ${serverName.value} ("Site") you agree to the following Terms of Service. If you do not agree, please do not use the Site.

- The Site is provided AS IS, without any warranty, express or implied. You will not hold the Site or its staff liable for damages caused by the use of the Site.
- The Site reserves the right to delete or modify your account, or any content you have posted.
- The Site reserves the right to change these Terms of Service without prior notice.
- If you are a minor, you will not use the Site.
- You are using the Site only for personal use.
- You will not spam, troll, or harass other users.
- You accept that the Site is not liable for content you may encounter.

## Prohibited content

- Child pornography: any photograph or photorealistic drawing or movie that depicts children in a sexual manner. This includes nudity, explicit sex, implied sex, or sexually persuasive positions.
- Bestiality: any depiction of humans engaged sexually with non-human animals.
- Extreme gore, mutilation, or similar shock content.
- Personal images: avatars, signatures, or images uploaded for personal storage.

## Privacy policy

The Site will not disclose the IP address or email address of any user except to the staff.

Posts, comments, favorites, ratings and other actions linked to your account will be stored in the Site’s database.
The “Upload anonymously” option allows you to post content without linking it to your account – meaning your nickname
will not be stored in the database nor shown in the “Uploader” field.

Cookies are used to store your session data in order to keep you logged in and personalize your web experience.
${adminEmail.value ? `\nContact the server administrator for data deletion requests at ${adminEmail.value}.` : ''}
`,
  ),

  api: computed(
    () => `# API

This server exposes a REST API compatible with [szurubooru](https://github.com/rr-/szurubooru).

Full API documentation is available at:

- [/api](/api) — API root (JSON)

The API supports token-based authentication. Pass \`Authorization: Token base64(user:token)\` in requests.

Refer to the [szurubooru API documentation](https://github.com/rr-/szurubooru/blob/master/doc/API.md) for full endpoint reference.
`,
  ),
};

const renderedContent = computed(() => {
  const key = activeSection.value as keyof typeof CONTENT;
  const entry = CONTENT[key] ?? CONTENT['about'];
  return renderMarkdown(entry.value);
});
</script>
