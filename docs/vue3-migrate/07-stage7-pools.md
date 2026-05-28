# Stage 7: Pools & Pool Categories

## Goal

Implement all pool-related pages: pool browser, pool detail, pool creation, editing, deletion, merge, and pool category management. Pools are ordered collections of posts (like albums or series).

## Routes in Scope

| Path | Component | Legacy Controller | Notes |
|---|---|---|---|
| `/pools` | `PoolsView.vue` | `pool_list_controller.js` | Pool browser with search |
| `/pools/create` | `PoolCreateView.vue` | `pool_create_controller.js` | Create new pool |
| `/pool/:id` | `PoolView.vue` | `pool_controller.js` | Pool detail with post grid |
| `/pool/:id/edit` | `PoolEditView.vue` | `pool_controller.js` | Edit pool |
| `/pool/:id/delete` | `PoolDeleteView.vue` | `pool_controller.js` | Delete pool |
| `/pool/:id/merge/:other` | `PoolMergeView.vue` | `pool_controller.js` | Merge pools |
| `/pool-categories` | `PoolCategoriesView.vue` | `pool_categories_controller.js` | Manage pool categories |

**Note:** Legacy path `/pools/new` → New path `/pools/create`.

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/pools` | GET | Search/list pools (paged) |
| `/api/pool/{id}` | GET | Get pool detail |
| `/api/pool` | POST | Create new pool |
| `/api/pool/{id}` | PUT | Update pool |
| `/api/pool/{id}` | DELETE | Delete pool |
| `/api/pool-merge` | POST | Merge two pools |
| `/api/pool-categories` | GET | List pool categories |
| `/api/pool-categories` | POST | Create pool category |
| `/api/pool-category/{name}` | GET | Get pool category |
| `/api/pool-category/{name}` | PUT | Update pool category |
| `/api/pool-category/{name}` | DELETE | Delete pool category |
| `/api/pool-category/{name}/default` | PUT | Set default pool category |

## Data Types (from `oxibooru.gen.ts`)

```typescript
Pool            // id, names, category, description, postCount, posts (MicroPost[])
PoolCategory    // name, color, order, usages
MicroPool       // id, names, category
```

## Pools Browser (`/pools`)

**Legacy:** `pool_list_controller.js` + `pools_page_view.js` + `pools_header_view.js`

**Features:**
- Search by pool name (query param `q`)
- Sort by: name, creation time, post count
- Pagination with `Pagination.vue`
- Each row: pool thumbnail (first post's thumbnail), name (link to `/pool/:id`), category badge, post count

**API call:** `GET /api/pools?query={q}&offset={n}&limit={pageSize}&sortBy=...`

## Pool Detail (`/pool/:id`)

**Legacy:** `pool_view.js` + `pool_summary_view.js`

**Sections:**
- Pool name(s) and category badge
- Description (rendered as Markdown)
- Post count
- Post thumbnail grid (ordered) — reuse `PostThumbnail.vue` from Stage 4
- Navigation arrows within the pool (post 1 of N, prev/next)
- Admin links: "Edit", "Delete", "Merge"

**API call:** `GET /api/pool/{id}` — returns pool with embedded `posts` array of `MicroPost`.

The pool's posts are ordered. Display them in a grid in that order, with position numbers.

## Pool Create (`/pools/create`)

**Legacy:** `pool_create_controller.js` + `pool_create_view.js`

**Fields:**
- Name (required)
- Category (dropdown from pool categories)
- Description (optional, Markdown)
- Initial posts (optional — add posts by ID or search)

**API call:** POST `/api/pool` with `{ names: [name], category, description, posts: [postIds] }`

Redirect to `/pool/{newId}` on success.

## Pool Edit (`/pool/:id/edit`)

**Legacy:** `pool_edit_view.js`

**Editable fields:**

| Field | Input Type | Notes |
|---|---|---|
| Names | Multi-value text input | Aliases; first is primary |
| Category | Dropdown | From pool categories |
| Description | Textarea (Markdown) | Optional preview |
| Posts | Ordered post list | Add/remove/reorder posts |

**Post list editor:**
- Current posts displayed as small thumbnails in order
- Drag to reorder (or up/down buttons)
- Remove post from pool button
- Add posts: search by ID or tag query, add to list

**API call:** `PUT /api/pool/{id}` with full updated pool data including reordered `posts` array.

**Optimistic locking:** Include `version` from last GET.

## Pool Delete (`/pool/:id/delete`)

- Confirmation page showing pool name and post count
- DELETE `/api/pool/{id}`
- Redirect to `/pools` on success
- Posts are NOT deleted, only removed from pool

## Pool Merge (`/pool/:id/merge/:other`)

**Legacy:** `pool_merge_view.js`

- Show both pools side by side: names, post counts, first thumbnail
- User selects which pool to keep (base) and which to remove
- POST `/api/pool-merge` with `{ removePool: { version }, basePool: { version } }`
- Redirect to surviving pool `/pool/{baseId}` on success
- Posts from removed pool are appended to base pool

## Pool Categories (`/pool-categories`)

**Legacy:** `pool_categories_controller.js` + `pool_categories_view.js`

Nearly identical to tag categories (Stage 6). Same CRUD pattern:
- List all categories with name, color, tag count
- Create new category
- Edit name and color
- Delete (if no pools use it)
- Set default
- Drag to reorder

Pool category colors are used as accent colors in pool listings and the pool sidebar on post detail pages.

Apply the same CSS variable injection pattern as tag categories:
```
--pool-category-{name}: {color};
```

## Pool Input Component (`PoolInput.vue`)

Reusable pool multi-input for the post sidebar (Stage 4) and future use. Allows adding/removing a post to/from pools:

- Autocomplete pool names: `GET /api/pools?query={prefix}&limit=10`
- Show pool name + category in dropdown
- Submit via update: include/exclude pool ID in PUT request

The legacy `controls/pool_input_control.js` and `controls/pool_auto_complete_control.js` are the equivalents.

## Acceptance Criteria

- [ ] `/pools` lists all pools with search, sort, pagination
- [ ] Pool thumbnails show first post's thumbnail
- [ ] `/pool/:id` shows full pool with ordered post grid
- [ ] `/pools/create` creates pool and redirects
- [ ] `/pool/:id/edit` saves names, category, description, reordered posts
- [ ] Post reordering in pool edit persists
- [ ] `/pool/:id/delete` deletes pool, posts are unaffected
- [ ] `/pool/:id/merge/:other` merges pools and redirects
- [ ] `/pool-categories` allows CRUD on categories
- [ ] Pool category colors apply as CSS variables
