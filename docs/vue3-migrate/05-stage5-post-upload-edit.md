# Stage 5: Post Upload & Editing

## Goal

Implement post creation (upload), post metadata editing, post merging, and reverse image search. These are write-side post operations requiring authentication.

## Routes in Scope

| Path | Component | Legacy Controller | Notes |
|---|---|---|---|
| `/upload` | `PostUploadView.vue` | `post_upload_controller.js` | Upload new post |
| `/post/:id/edit` | `PostEditView.vue` | `post_main_controller.js` | Edit post metadata |
| `/post/merge/:id1/:id2` | `PostMergeView.vue` | `post_main_controller.js` | Merge two posts |

**Note:** Legacy path `/posts/upload` → New path `/upload`. Legacy path `/posts/merge/:id1/:id2` → New path `/post/merge/:id1/:id2`.

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/uploads` | POST | Upload file, get temp token |
| `/api/posts` | POST | Create new post from upload token or URL |
| `/api/post/{id}` | PUT | Update post metadata |
| `/api/post/{id}` | DELETE | Delete post |
| `/api/post-merge` | POST | Merge two posts |
| `/api/posts/reverse-search` | POST | Find visually similar posts |
| `/api/tags` | GET | Tag autocomplete source |

## Data Types (from `oxibooru.gen.ts`)

```typescript
ApiCreatePostRequest   // tags, safety, source, contentToken / contentUrl, relations
ApiUpdatePostRequest   // tags, safety, source, relations, flags, notes
Post                   // Full post object
ImageSearchResult      // similarPosts: SimilarPost[]
```

## Post Upload (`/upload`)

### Flow

1. **Select file:** Drag-drop zone (`FileDropper.vue`) or URL input
2. **Upload file:**
   - If file: POST to `/api/uploads` with `multipart/form-data`, field `content` = file
   - If URL: skip upload, use URL directly in create request
   - Server returns `{ token: "..." }` for file uploads
3. **Reverse search (optional):** Before creating, call `POST /api/posts/reverse-search` with the same file/URL to show similar posts
4. **Fill metadata:**
   - Tags (tag input with autocomplete)
   - Safety rating (safe / sketchy / unsafe)
   - Source URL
   - Relations (related post IDs)
5. **Submit:** POST `/api/posts` with `{ tags, safety, source, contentToken }` (or `contentUrl` for URL uploads)
6. **On success:** Navigate to `/post/{newId}`

### Upload Endpoint Details

```
POST /api/uploads
Content-Type: multipart/form-data
Body: { content: File }
Response: { token: "uuid-string" }
```

The token is then used in the create post request as `contentToken`.

### Reverse Search

Before or during upload, call:
```
POST /api/posts/reverse-search
Content-Type: multipart/form-data
Body: { content: File } or { contentUrl: "..." }
Response: { exactPost?: Post, similarPosts: SimilarPost[] }
```

Display results in a sidebar or overlay. If `exactPost` is found, show a warning that this post already exists.

### Components for Upload

| Component | Purpose |
|---|---|
| `FileDropper.vue` | Drag-drop zone + file picker. Legacy: `controls/file_dropper_control.js` |
| `UploadProgress.vue` | Progress bar for file upload using `XMLHttpRequest` or `fetch` with progress |
| `ReverseSearchResults.vue` | Shows similar post thumbnails |
| `AutoCompleteTag.vue` (reworked) | Multi-tag input with autocomplete. Legacy: `controls/tag_input_control.js` |
| `RelationInput.vue` | Input to add related post IDs |

### `AutoCompleteTag.vue` in Input Mode

The `AutoCompleteTag.vue` rework is defined in [Stage 1](./01-stage1-foundation.md#autocompletagevue-rework). Use it here with `mode="input"` to get the multi-value chip input behavior for the tags field.

## Post Editing (`/post/:id/edit`)

### Layout

Same two-column layout as the post viewer but with editable fields in the sidebar.

### Editable Fields

| Field | Input Type | API field |
|---|---|---|
| Tags | `AutoCompleteTag.vue` (reworked) | `tags` (array of tag names) |
| Safety | Radio group (safe/sketchy/unsafe) | `safety` |
| Source | Text input (URL) | `source` |
| Relations | Post ID multi-input | `relations` (array of post IDs) |
| Notes | In-image polygon editor | `notes` (deferred – see below) |
| Flags | Checkboxes (e.g., `loop`) | `flags` |

**API call:** PUT `/api/post/{id}` with `ApiUpdatePostRequest`

**Optimistic locking:** The response includes `version`. When PUT-ing, include the current `version` to prevent conflicts.

### Notes Editing (Optional, can defer)

The legacy `post_edit_sidebar_control.js` has a notes editor that allows drawing polygons on the image. This is complex — defer to Stage 9 as a polish item.

For Stage 5, notes are read-only (overlay from Stage 4). The edit form can show a placeholder message.

### Delete Post

Already partially in the sidebar (Stage 4). Wire up: confirm dialog → DELETE `/api/post/{id}` → redirect to `/posts`.

## Post Merge (`/post/merge/:id1/:id2`)

### Flow

1. Show both posts side by side
2. User selects which post to keep as the "base" and which to remove
3. PUT `/api/post-merge` with `{ base: id1, removed: id2 }`
4. On success: redirect to surviving post `/post/{baseId}`

### API

```
POST /api/post-merge
Body: { removePost: { id: number }, basePost: { id: number } }
```

Both posts' metadata (tags, pools, comments) are merged into the base post. The removed post is deleted.

### Component

`PostMergeView.vue`:
- Shows two post thumbnails + key metadata
- Select buttons to pick base/removed
- Confirm merge button
- Warn if posts are already related

## Privilege Guards

- Upload: requires `posts:create` privilege
- Edit: requires `posts:edit:any` or `posts:edit:self` (own uploads)
- Delete: requires `posts:delete:any` or `posts:delete:self`
- Merge: requires `posts:merge` privilege

Apply route guards as in Stage 2.

## Acceptance Criteria

- [ ] File drag-drop or URL input triggers upload flow
- [ ] Reverse search shows similar posts before submission
- [ ] New post is created with correct tags, safety, source
- [ ] Navigation to new post after upload
- [ ] Post edit form loads existing values
- [ ] Tag input with autocomplete works
- [ ] Safety, source, relations can be updated
- [ ] Changes persist (PUT returns updated post)
- [ ] Post merge shows both posts and completes with redirect
- [ ] Privilege gates prevent unauthorized actions
