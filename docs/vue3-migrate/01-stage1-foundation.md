# Stage 1: Foundation & Infrastructure

## Goal

Complete the shared infrastructure that all subsequent stages depend on: global error/toast notifications, a loading state system, shared layout utilities, and the user settings page. This stage has no new routes except `/settings`.

## Routes in Scope

| Path | Component | Notes |
|---|---|---|
| `/settings` | `SettingsView.vue` | New route (was a sidebar panel in legacy) |

## Shared Components to Build

### `ToastNotification.vue`

Global toast/notification component. Legacy equivalent: `views.showSuccess()` / `views.showError()` in `util/views.js`.

- Accepts: message string, type (`success` | `error` | `info`), auto-dismiss timeout
- Positioned fixed bottom-right (or top-right)
- Rendered once in `App.vue`, triggered via a composable or Pinia store action
- Consider a thin `useToast()` composable backed by a Pinia store

### `LoadingSpinner.vue` / `PageLoader.vue`

Inline spinner for async states. Legacy equivalent: NProgress bar (`util/progress.js`).

- `LoadingSpinner.vue`: small inline spinner for buttons and content areas
- `PageLoader.vue`: full-page overlay with NProgress-style top bar (or use a progress library)
- Integrate with router's `beforeEach` / `afterEach` guards for page transitions

### `ConfirmDialog.vue`

Modal for destructive actions. Legacy equivalent: `window.confirm()` used in `util/misc.js`.

- Props: title, message, confirm label, cancel label
- Returns a Promise resolved on confirm / rejected on cancel
- Used for: delete user, delete post, delete tag, delete pool

### `Pagination.vue`

Standard page-number pagination. Legacy equivalent: `views/manual_page_view.js`.

- Props: `currentPage`, `totalCount`, `pageSize`
- Emits: `page-change` event
- Shows: prev/next, page numbers with ellipsis for large ranges
- Used across posts, tags, pools, users, comments, snapshots

### `InfiniteScroll.vue` (optional, Stage 4)

Intersection-observer-based endless scroll. Legacy equivalent: `views/endless_page_view.js`. Can be deferred to Stage 4 when the posts gallery is built.

### Error Boundary / `ErrorView.vue`

Route-level error display. Used as `errorComponent` in Vue Router lazy-loaded routes.

## Composables to Create

### `usePageTitle(title: string)`

Sets `document.title` on mount/update. Every page calls this.

### `useToast()`

Exposes `showSuccess(msg)` and `showError(msg)` backed by a Pinia `toastStore`. Used everywhere destructive or async actions complete.

### `usePagination(fetchFn, pageSize?)`

Wraps the fetch-with-offset pattern common to all list pages. Returns `{ items, page, totalCount, loading, goToPage }`.

## Settings Page (`/settings`)

**Legacy:** User preferences were accessible from a sidebar drawer in the top navigation (triggered by a gear icon). Stored in localStorage as `settings` key.

**New:** A dedicated `/settings` route with a form.

### Settings to expose

These map to `useSettingsStore()` state in `src/stores/settings.ts`:

| Setting | Type | Description |
|---|---|---|
| `listPosts.safe` | boolean | Show safe posts |
| `listPosts.sketchy` | boolean | Show sketchy posts |
| `listPosts.unsafe` | boolean | Show unsafe posts |
| `upscaleSmallPosts` | boolean | Upscale images smaller than viewport |
| `endlessScroll` | boolean | Infinite scroll vs. pagination |
| `keyboardShortcuts` | boolean | Enable keyboard shortcuts |
| `transparencyGrid` | boolean | Show checkerboard for transparent images |
| `fitMode` | `'fit-both' \| 'fit-original' \| 'fit-height'` | Image fit mode |
| `tagSuggestions` | boolean | Autocomplete tag suggestions |
| `autoplayVideos` | boolean | Autoplay videos |
| `postsPerPage` | number | Posts per page (default 42) |
| `tagUnderscoresAsSpaces` | boolean | Display `_` as spaces in tag names |
| `darkTheme` | boolean | Dark mode |
| `postFlow` | boolean | Flow layout vs. grid |

Settings are already persisted in `settings.ts` via localStorage. The settings page just reads/writes the store.

## `AutoCompleteTag.vue` Rework

The current `AutoCompleteTag.vue` only navigates to a search URL on submit. Rework it into a proper multi-tag input that all later stages (upload, post edit, tag edit, pool edit) consume. `SearchBox.vue` can be reviewed alongside this — it may be simplified once the reworked autocomplete covers its use case.

**Required behavior:**

- As the user types, call `GET /api/tags?query={prefix}&limit=15` (debounced ~200ms)
- Show a dropdown of matching tags below the input, each row: tag name + post count
- **Full keyboard navigation:** `↑`/`↓` moves through suggestions, `Enter` selects the highlighted one, `Escape` closes the dropdown
- When a suggestion is **selected from the dropdown**, add the tag as a chip to a multi-value list inside the input area
- When the user presses `Enter` **without** a highlighted suggestion, treat the typed text as a literal tag (add to list) or trigger the submit action if the component is in search mode (not list mode)
- Each added tag is shown as a removable chip; click `×` or press `Backspace` on empty field to remove the last chip
- Validate: prevent duplicate tags, trim whitespace
- Show tag category colors in autocomplete dropdown (requires tag categories to be loaded in store)
- Respect `tagUnderscoresAsSpaces` setting: display `_` as spaces but send underscores to the API

**Two modes via props:**

| Prop | Behavior |
|---|---|
| `mode="search"` | Single input that navigates to `/posts?q={tags}` on submit. Replaces current behavior. |
| `mode="input"` | Multi-value chip input that emits `update:modelValue` with the tag array. Used in forms. |

## NavBar Updates

The existing `NavBar.vue` shows navigation links. Additions needed:

- Settings icon/link to `/settings`
- Login/Register links when unauthenticated (Stage 2 will complete these)
- Username display + logout link when authenticated (Stage 2)
- Privilege-based visibility is already partially implemented

## API Endpoints Used in This Stage

None new — settings are stored client-side only.

## Acceptance Criteria

- [ ] `ToastNotification` renders and auto-dismisses from anywhere via `useToast()`
- [ ] `LoadingSpinner` and page-level loading state work for async route transitions
- [ ] `ConfirmDialog` resolves/rejects correctly
- [ ] `Pagination` emits correct page on click and shows correct range
- [ ] `/settings` page loads, all settings are toggleable, changes persist on reload
- [ ] NavBar shows correct links based on auth state and user rank
