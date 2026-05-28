# Stage 8: Comments, Snapshots, Help & 404

## Goal

Implement the remaining content pages: global comments listing, snapshot/history viewer, help documentation, and the 404 not-found page. Also add inline comment display and creation on post detail pages (which were deferred from Stage 4).

## Routes in Scope

| Path | Component | Legacy Controller | Notes |
|---|---|---|---|
| `/comments` | `CommentsView.vue` | `comments_controller.js` | Global comments listing |
| `/snapshots` | `SnapshotsView.vue` | `snapshots_controller.js` | Audit trail/history |
| `/help` | `HelpView.vue` | `help_controller.js` | Help documentation |
| `/help/:section` | `HelpView.vue` | `help_controller.js` | Help section (same component, different anchor) |
| (catch-all) | `NotFoundView.vue` | `not_found_controller.js` | 404 page |

Also in this stage: wiring up the comment section in `PostView.vue` (deferred from Stage 4).

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/comments` | GET | Search/list comments (paged) |
| `/api/comment/{id}` | GET | Get single comment |
| `/api/comments` | POST | Create comment on post |
| `/api/comment/{id}` | PUT | Update comment text |
| `/api/comment/{id}` | DELETE | Delete comment |
| `/api/comment/{id}/score` | PUT | Rate comment (-1, 0, 1) |
| `/api/snapshots` | GET | List snapshots (paged) |

## Data Types (from `oxibooru.gen.ts`)

```typescript
Comment         // id, post (MicroPost), user (MicroUser), text, score, creationTime, lastEditTime
Snapshot        // resource (type + id), operation, user, data, time
```

---

## Comments Global Listing (`/comments`)

**Legacy:** `comments_controller.js` + `comments_page_view.js`

**Features:**
- Paginated list of recent comments across all posts
- Search by comment text or user (query param `q`)
- Each comment row: avatar, username, post thumbnail, comment text (Markdown), timestamp, score
- Click on post thumbnail/link → `/post/{id}`
- Click on username → `/user/{name}`

**API call:** `GET /api/comments?query={q}&offset={n}&limit={pageSize}`

---

## Inline Post Comments (completing Stage 4)

Add the full comment section to the post sidebar in `PostView.vue` (`PostSidebar.vue`).

### Comment Display (`CommentItem.vue`)

Each comment shows:
- User avatar + username (link to `/user/:name`)
- Comment text rendered as Markdown
- Timestamp (relative, e.g. "3 days ago")
- Score with vote buttons (PUT `/api/comment/{id}/score`)
- Edit and delete buttons (owner or admin only)

Editing is inline: click Edit, text becomes a `<textarea>`, submit calls PUT `/api/comment/{id}`.

### Comment Creation

At the bottom of the comment list, a textarea for new comments. Submit calls POST `/api/comments` with `{ postId, text }`. Requires login — show "Log in to comment" if unauthenticated.

### Markdown Rendering

Use `marked` (or `markdown-it`) to render comment text. Apply DOMPurify sanitization to prevent XSS before inserting HTML. This is critical — user-submitted markdown must be sanitized.

---

## Snapshots (`/snapshots`)

**Legacy:** `snapshots_controller.js` + `snapshots_page_view.js`

**Features:**
- Paginated audit trail of all content changes
- Search by resource type or user (query param `q`)
- Each row: timestamp, operation (created/modified/deleted/merged), resource type + link, acting user, diff summary

**API call:** `GET /api/snapshots?offset={n}&limit={pageSize}&query={q}`

Snapshot `data` field is a JSON diff. Display key changed fields. The full diff format is documented in `docs/API.md`.

**Snapshot row:** Show resource type icon (post/tag/pool/category), link to the resource, operation badge (colored), user link, time.

---

## Help Page (`/help` and `/help/:section`)

**Legacy:** `help_controller.js` + `help_view.js`

The legacy help page loaded `.md` files from the server's `dist/` and rendered them as HTML. The content was static documentation about the site.

**New approach options:**

1. **Static Markdown files bundled with Vite:** Place `.md` help files in `public/help/` or `src/help/`. Import and render them using `vite-plugin-md` or fetch at runtime.
2. **Inline Vue components:** Write help content directly as Vue SFCs.
3. **Fetch from server:** Keep help docs on the server and fetch them (same as legacy).

Recommended: bundle Markdown files with the app (option 1). This keeps help content next to the frontend code.

**Sections (from legacy `html/help/` templates):**
- `about` – what is this site
- `search` – search syntax guide
- `keyboard` – keyboard shortcuts list
- `privacy` – privacy policy
- `API` – link to API docs

The `HelpView.vue` should:
- Load the correct Markdown file based on `route.params.section` (default to `about`)
- Render as HTML using `marked` + DOMPurify
- Show a sidebar with section links
- Use URL anchors for in-page navigation

---

## 404 Page (`NotFoundView.vue`)

**Legacy:** `not_found_controller.js` + `not_found_view.js`

Simple page with:
- "404 Not Found" heading
- Short message
- Link back to home `/`

Register as the catch-all route in `src/router/index.ts`:

```typescript
{ path: '/:pathMatch(.*)*', component: NotFoundView }
```

---

## Shared Components

### `CommentItem.vue`

Single comment with avatar, text, score, edit/delete. Reused in both `CommentsView.vue` and `PostSidebar.vue`.

### `RelativeTime.vue`

Displays a timestamp as "3 days ago", "just now", etc. via `Intl.RelativeTimeFormat` or a date library. Updates periodically (setInterval every minute). Reused everywhere timestamps appear.

### `OperationBadge.vue`

Colored badge for snapshot operations: "created" (green), "modified" (yellow), "deleted" (red), "merged" (blue).

---

## Acceptance Criteria

- [ ] `/comments` shows recent comments with search and pagination
- [ ] Post comments display on `/post/:id` with Markdown rendering and XSS sanitization
- [ ] Comments can be created, edited, deleted (by owner/admin)
- [ ] Comment scoring works
- [ ] `/snapshots` shows audit trail with pagination and search
- [ ] Snapshot rows link to the affected resource
- [ ] `/help` renders Markdown content for each section
- [ ] Section links in help sidebar navigate correctly
- [ ] `/:pathMatch(.*)` catch-all shows NotFoundView
- [ ] `RelativeTime.vue` shows human-readable timestamps
