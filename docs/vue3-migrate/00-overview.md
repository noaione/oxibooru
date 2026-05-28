# Vue 3 Migration Overview

This directory documents the full plan for migrating Oxibooru's frontend from the legacy vanilla JS SPA (`client_legacy/`) to the new Vue 3 + Vite + TypeScript + Pinia + Tailwind CSS 4 stack (`client/`).

## Tech Stack Comparison

| Concern | Legacy (`client_legacy/`) | New (`client/`) |
|---|---|---|
| Build | Custom Node.js + Browserify | Vite |
| Language | ES5 (Babel transpiled) | TypeScript (strict) |
| Framework | Vanilla JS (custom MVC) | Vue 3 (Composition API) |
| Templates | Underscore.js `.tpl` files | Vue SFCs (`.vue`) |
| Routing | Custom router (`router.js`) | Vue Router 4 |
| State | Singleton event objects | Pinia stores |
| CSS | Stylus → minified CSS | Tailwind CSS 4 |
| Icons | Font Awesome 4 | (TBD — migrate or replace) |
| HTTP | SuperAgent | Native `fetch` (via store) |
| Types | None | Auto-generated OpenAPI types |
| API Types | `src/types/oxibooru.gen.ts` | Same (shared) |

## Current Status

| Item | Status |
|---|---|
| Vite + TypeScript + Tailwind CSS 4 setup | Done |
| App shell (`App.vue`) | Done |
| `NavBar.vue` component | Done |
| Pinia store: `api.ts` (auth + fetch) | Done |
| Pinia store: `settings.ts` (preferences + dark theme) | Done |
| Auto-generated API types (`oxibooru.gen.ts`) | Done |
| Components: `SearchBox`, `BlueButton`, `AutoCompleteTag` | Done |
| `/` Home page | Done |
| `/posts` Posts listing (structure only, no real grid/pagination) | In Progress |
| Everything else | Not started |

## Document Index

| File | Stage | Scope |
|---|---|---|
| `01-stage1-foundation.md` | 1 | Infrastructure gaps, shared components, error handling, settings page |
| `02-stage2-auth.md` | 2 | Login, logout, register, password reset |
| `03-stage3-user-management.md` | 3 | User profile, edit, delete, tokens, user list |
| `04-stage4-posts-core.md` | 4 | Posts gallery (complete), post detail viewer, post navigation |
| `05-stage5-post-upload-edit.md` | 5 | Upload, post editing, post merge, reverse search |
| `06-stage6-tags.md` | 6 | Tag detail, edit, delete, merge, tag list, tag categories |
| `07-stage7-pools.md` | 7 | Pool detail, edit, delete, merge, pool list, create, pool categories |
| `08-stage8-comments-snapshots-help.md` | 8 | Comments, snapshots/history, help docs, 404 |
| `09-stage9-polish.md` | 9 | PWA manifest, keyboard shortcuts, performance, accessibility |

## Full Route Map

| Legacy Path | New Path | Stage | Notes |
|---|---|---|---|
| `/` | `/` | Done | Home: server info + featured post |
| `/login` | `/login` | 2 | Login form |
| `/logout` | `/logout` | 2 | Logout action (redirect) |
| `/password-reset` | `/password-reset` | 2 | Password recovery |
| `/user-registration` | `/register` | 2 | New user signup |
| `/user/:name` | `/user/:name` | 3 | User profile |
| `/user/:name/edit` | `/user/:name/edit` | 3 | Edit user account |
| `/user/:name/delete` | `/user/:name/delete` | 3 | Delete user account |
| `/user/:name/tokens` | `/user/:name/tokens` | 3 | Manage auth tokens |
| `/users` | `/users` | 3 | User directory |
| `/posts` | `/posts` | 4 | Post search/gallery (complete) |
| `/post/:id` | `/post/:id` | 4 | Post detail + media viewer |
| `/posts/upload` | `/upload` | 5 | Upload new post |
| `/post/:id/edit` | `/post/:id/edit` | 5 | Post metadata editor |
| `/posts/merge/:id1/:id2` | `/post/merge/:id1/:id2` | 5 | Merge two posts |
| `/tag/:name` | `/tag/:name` | 6 | Tag detail |
| `/tag/:name/edit` | `/tag/:name/edit` | 6 | Edit tag |
| `/tag/:name/delete` | `/tag/:name/delete` | 6 | Delete tag |
| `/tag/:name/merge/:other` | `/tag/:name/merge/:other` | 6 | Merge tags |
| `/tags` | `/tags` | 6 | Tag browser |
| `/tag-categories` | `/tag-categories` | 6 | Tag category management |
| `/pool/:id` | `/pool/:id` | 7 | Pool detail |
| `/pool/:id/edit` | `/pool/:id/edit` | 7 | Edit pool |
| `/pool/:id/delete` | `/pool/:id/delete` | 7 | Delete pool |
| `/pool/:id/merge/:other` | `/pool/:id/merge/:other` | 7 | Merge pools |
| `/pools` | `/pools` | 7 | Pool browser |
| `/pools/new` | `/pools/create` | 7 | Create new pool |
| `/pool-categories` | `/pool-categories` | 7 | Pool category management |
| `/comments` | `/comments` | 8 | Comments listing |
| `/snapshots` | `/snapshots` | 8 | Snapshot/history viewer |
| `/help` | `/help` | 8 | Help docs |
| `/help/:section` | `/help/:section` | 8 | Help section |
| (none) | `/settings` | 1 | User preferences (was a modal/sidebar in legacy) |
| (catch-all) | 404 component | 8 | Not found |

## Architecture Conventions

### API Calls

All API requests go through `useTokenStore().doFetch<T>(path, options)` defined in `src/stores/api.ts`. The path is relative (e.g. `/api/posts`). Auth headers are injected automatically.

### Pages

- Files in `src/pages/` named `<Feature>View.vue`
- Registered in `src/router/index.ts`
- Each page owns its own `onMounted` data fetch

### Components

- Reusable UI in `src/components/`
- Prefer composition API + `<script setup>` syntax
- Type all props explicitly

### Types

All server types come from `src/types/oxibooru.gen.ts`. Do not manually define types that already exist there.

### Styling

- Tailwind CSS 4 utility classes
- Dark mode via `.darktheme` class on `<body>` (applied by `useSettingsStore`)
- Custom dark mode variant: `dark:` prefix configured in Tailwind config
