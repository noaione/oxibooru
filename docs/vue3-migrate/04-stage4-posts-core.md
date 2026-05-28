# Stage 4: Posts Core (Gallery & Viewer)

## Goal

Complete the posts gallery with a real post grid, search/filter, and pagination. Implement the post detail page with the media viewer, sidebar info, scoring, favoriting, and post-to-post navigation. This is the core feature of the app.

## Routes in Scope

| Path | Component | Legacy Controller | Notes |
|---|---|---|---|
| `/posts` | `PostsView.vue` | `post_list_controller.js` | Complete the existing partial implementation |
| `/post/:id` | `PostView.vue` | `post_main_controller.js` + `post_detail_controller.js` | Post media viewer + sidebar |

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/posts` | GET | Search/list posts (paged) |
| `/api/post/{id}` | GET | Fetch single post |
| `/api/post/{id}/around` | GET | Fetch prev/next post IDs |
| `/api/featured-post` | GET | Get currently featured post |
| `/api/post/{id}/score` | PUT | Rate post (-1, 0, 1) |
| `/api/post/{id}/favorite` | POST | Add to favorites |
| `/api/post/{id}/favorite` | DELETE | Remove from favorites |
| `/api/post/{id}/feature` | POST | Feature this post (admin) |

## Data Types (from `oxibooru.gen.ts`)

```typescript
Post              // id, tags, pools, notes, comments, score, favoriteCount, type, contentUrl, thumbnailUrl, safety, ...
MicroPost         // id, thumbnailUrl (used in lists)
PostAroundResult  // prevPost?: MicroPost, nextPost?: MicroPost
```

## Posts Gallery (`/posts`)

### Current State

`PostsView.vue` has the page shell, safety filter toggles, and mass action buttons but does not actually fetch or display posts.

### Search Query Parameter

The search query is stored in the URL as `?q=tag1+tag2`. This allows sharing search URLs.

Query params:
- `q` – search query string (tags, special filters)
- `page` – page number (1-based)

On mount, read `route.query.q` and `route.query.page`. When user submits search, use `router.push({ query: { q, page: 1 } })`.

### Safety Filters

The `listPosts.safe/sketchy/unsafe` settings from `useSettingsStore()` control which safety levels are shown. Translate to API query: e.g. if only safe+sketchy, append `rating:safe,sketchy` to query.

### Post Grid

- `PostThumbnail.vue` component: shows `thumbnailUrl` image, overlays type icon (video, animation), click navigates to `/post/:id`
- Grid layout: CSS grid or flex wrap, responsive columns
- Optional: masonry/flow layout when `settings.postFlow` is true (defer to Stage 9 if complex)

### Pagination

Two modes controlled by `settings.endlessScroll`:
- **Standard pagination:** use `Pagination.vue` from Stage 1
- **Infinite scroll:** use `InfiniteScroll.vue` from Stage 1 (can defer this mode)

API call: `GET /api/posts?query={q}&offset={offset}&limit={pageSize}&fields=id,thumbnailUrl,type,safety`

Use `fields` parameter to fetch only what's needed for thumbnails.

### Mass Actions (Already in UI)

The mass action buttons (mass tag, mass safety, mass delete) are already stubbed in `PostsView.vue`. Wire them up:
- Select mode: clicking a thumbnail enters selection mode
- Selected post IDs tracked in component state
- Mass tag: open a tag input, PUT each selected post with new tags (batch)
- Mass safety: dropdown to pick safety, PUT each selected post
- Mass delete: confirmation dialog, DELETE each selected post

## Post Detail Viewer (`/post/:id`)

### Layout

Two-column layout:
- **Left / main:** Media viewer (image, video, animated gif, flash placeholder)
- **Right sidebar:** Post metadata, tags, pools, score, favorites, comments

The legacy layout had a sticky sidebar. Replicate with CSS grid or flexbox + `position: sticky`.

### Media Viewer (`PostMediaViewer.vue`)

Handles all content types:
- **`image`** – `<img>` tag with `contentUrl`, fit modes: `fit-both`, `fit-height`, `fit-original` (from settings)
- **`animation`** – same as image (GIF autoplay natively)
- **`video`** – `<video>` tag with controls, `autoplay` if `settings.autoplayVideos`
- **`flash`** – placeholder message (Flash is EOL)

Settings integration:
- Apply `fit-mode` class to image
- Show transparency grid (`transparencyGrid` setting) via CSS background on image container

Image zoom: clicking image toggles between `fit-both` and `fit-original`.

### Post Sidebar (`PostSidebar.vue`)

Sections:

1. **Score** – current score, vote up / vote down buttons. PUT `/api/post/{id}/score` with `{ "score": 1 | -1 | 0 }`. Show current user vote state.

2. **Favorites** – count and favorite toggle button. POST/DELETE `/api/post/{id}/favorite`.

3. **Info** – ID, uploader (link to `/user/:name`), upload date, file type, dimensions, file size, safety rating.

4. **Tags** – grouped by tag category (each category has a color from server config). Each tag links to `/posts?q=tag_name`. Category headers. Count of tags per category.

5. **Pools** – list of pools this post belongs to. Each pool name links to `/pool/:id`. Show pool position.

6. **Comments** – comment count link, and the comment list component (can be a placeholder in Stage 4, completed in Stage 8).

7. **Notes** – if post has notes, show count and toggle overlay.

8. **Admin actions** (privilege-gated): Feature post, edit post link, delete post (with confirmation), merge post link.

### Post Navigation

Use `GET /api/post/{id}/around` to get previous and next post IDs in current search context.

The search context (query `q`) should be preserved across post navigation — pass it as a query param: `/post/:id?q=tag1+tag2`.

Display prev/next arrows (or keyboard shortcuts `←` `→`) that navigate within the current search context.

### Notes Overlay (`PostNotesOverlay.vue`)

Post notes are polygon annotations on the image. From `oxibooru.gen.ts` the `Note` type has `polygon` (list of x,y points as fractions of image dimensions) and `text` (markdown).

- Render as SVG or absolutely-positioned divs over the image
- Toggle visibility with a button
- On hover show the note text (rendered from Markdown — use `marked` or equivalent)
- Editable notes deferred to Stage 5

## Tag Category Colors

Tags are grouped by category and each category has a color. The server returns tag categories via the info endpoint (or `/api/tag-categories`). Inject CSS variables or use inline style for category colors.

Legacy used `tags.js` which dynamically injected `<style>` rules. In Vue, use CSS variables or computed styles.

## Components to Build

| Component | Purpose |
|---|---|
| `PostThumbnail.vue` | Grid thumbnail with type overlay |
| `PostsGrid.vue` | Responsive grid container for thumbnails |
| `PostMediaViewer.vue` | Image/video/animation viewer with fit modes |
| `PostSidebar.vue` | Full post metadata sidebar |
| `PostScore.vue` | Score display + vote buttons |
| `PostTagList.vue` | Tag list grouped by category with colors |
| `PostPoolList.vue` | Pool list for a post |
| `PostNotesOverlay.vue` | SVG annotation overlay |
| `PostNavigation.vue` | Prev/next navigation arrows |

## Acceptance Criteria

- [ ] `/posts` loads real post thumbnails from API
- [ ] Search query param `?q=` controls what's fetched
- [ ] Safety filters from settings are applied to the API query
- [ ] Pagination or infinite scroll works
- [ ] Clicking thumbnail navigates to `/post/:id`
- [ ] Post detail shows image/video correctly with fit modes
- [ ] Tags displayed grouped by category with correct colors
- [ ] Score voting works (PUT score, UI reflects current vote)
- [ ] Favoriting works (POST/DELETE favorite, count updates)
- [ ] Prev/next navigation between posts works
- [ ] Notes overlay displays (read-only)
- [ ] Admin actions show/hide based on privilege
