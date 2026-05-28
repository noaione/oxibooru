# Stage 6: Tags & Tag Categories

## Goal

Implement all tag-related pages: tag detail, tag editing, deletion, merge, tag browser, and tag category management.

## Routes in Scope

| Path | Component | Legacy Controller | Notes |
|---|---|---|---|
| `/tags` | `TagsView.vue` | `tag_list_controller.js` | Tag browser with search |
| `/tag/:name` | `TagView.vue` | `tag_controller.js` | Tag detail |
| `/tag/:name/edit` | `TagEditView.vue` | `tag_controller.js` | Edit tag |
| `/tag/:name/delete` | `TagDeleteView.vue` | `tag_controller.js` | Delete tag |
| `/tag/:name/merge/:other` | `TagMergeView.vue` | `tag_controller.js` | Merge tags |
| `/tag-categories` | `TagCategoriesView.vue` | `tag_categories_controller.js` | Manage tag categories |

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tags` | GET | Search/list tags (paged) |
| `/api/tag/{name}` | GET | Get tag detail |
| `/api/tag-siblings/{name}` | GET | Get related tags (used in same posts) |
| `/api/tags` | POST | Create new tag |
| `/api/tag/{name}` | PUT | Update tag |
| `/api/tag/{name}` | DELETE | Delete tag |
| `/api/tag-merge` | POST | Merge two tags |
| `/api/tag-categories` | GET | List all tag categories |
| `/api/tag-categories` | POST | Create tag category |
| `/api/tag-category/{name}` | GET | Get tag category |
| `/api/tag-category/{name}` | PUT | Update tag category |
| `/api/tag-category/{name}` | DELETE | Delete tag category |
| `/api/tag-category/{name}/default` | PUT | Set default tag category |

## Data Types (from `oxibooru.gen.ts`)

```typescript
Tag             // names, category, description, postCount, usages, suggestions
TagCategory     // name, color, order, usages
MicroTag        // names, category
```

## Tags Browser (`/tags`)

**Legacy:** `tag_list_controller.js` + `tags_page_view.js` + `tags_header_view.js`

**Features:**
- Search by tag name (query param `q`)
- Sort by: name, post count, creation time
- Pagination with `Pagination.vue`
- Each row: tag name (colored by category), category badge, post count, "edit" link

**API call:** `GET /api/tags?query={q}&offset={n}&limit={pageSize}&sortBy=...`

**Tag Row component (`TagRow.vue`):**
- Tag name styled with category color (CSS variable or inline style)
- Click on name: navigates to `/posts?q={tagName}`
- Click on edit icon: navigates to `/tag/{name}/edit`

## Tag Detail (`/tag/:name`)

**Legacy:** `tag_view.js` + `tag_summary_view.js`

**Sections:**
- Tag name(s) — a tag can have multiple alias names
- Category (colored badge)
- Post count — link to `/posts?q={tagName}`
- Description (rendered as Markdown)
- Tag implications/suggestions: list of related tags from `GET /api/tag-siblings/{name}`
- Creation date, last edit date
- Admin links: "Edit", "Delete", "Merge"

## Tag Edit (`/tag/:name/edit`)

**Legacy:** `tag_edit_view.js`

**Editable fields:**

| Field | Input Type | Notes |
|---|---|---|
| Names | Multi-value text input | One name per line or comma-separated; first is primary |
| Category | Dropdown | Options from `GET /api/tag-categories` |
| Description | Textarea (Markdown) | Optional Markdown preview |
| Implications | Tag multi-input | Tags that are auto-added when this tag is used |
| Suggestions | Tag multi-input | Suggested related tags |

**API call:** `PUT /api/tag/{name}` with body from `ApiUpdateTagRequest`

**Optimistic locking:** Include `version` from the last GET response.

**Note on tag names:** The `names` array in the PUT request sets all aliases. The first element becomes the primary name. The URL must be updated if the primary name changes.

## Tag Delete (`/tag/:name/delete`)

- Confirmation page showing the tag name and post count
- Warn if tag has posts (they will lose this tag)
- DELETE `/api/tag/{name}`
- Redirect to `/tags` on success

## Tag Merge (`/tag/:name/merge/:other`)

**Legacy:** `tag_merge_view.js`

- Show both tags side by side: names, post counts
- User selects which tag to keep (base) and which to remove
- POST `/api/tag-merge` with `{ removeTag: { version, names }, baseTag: { version, names } }`
- Redirect to surviving tag `/tag/{baseName}` on success
- The removed tag's posts all get re-tagged with the base tag

## Tag Categories (`/tag-categories`)

**Legacy:** `tag_categories_controller.js` + `tag_categories_view.js`

**Features:**
- List all categories with their name, color swatch, and number of tags
- Inline create new category form
- Edit category name and color inline or via modal
- Delete category (only if no tags use it, or reassign first)
- Set default category
- Drag to reorder categories (affects display order)

### Color Picker

Each category has a color stored as a CSS color string (e.g., `#ff6600`, `hsl(...)`, or a named color). The legacy frontend used a simple text input for color. For the new frontend, use a `<input type="color">` or a simple color picker component.

### CSS Integration

Tag category colors are used to color tag names throughout the app (in post sidebars, tag lists, autocomplete). Inject CSS custom properties:

```css
--tag-category-{name}: {color};
```

Set these on `<body>` or `:root` when tag categories are loaded. Refresh when categories change.

The legacy `tags.js` file dynamically injected `<style>` tags with `.tag-{name} { color: ... }` rules. In Vue, prefer CSS variables set via `document.documentElement.style.setProperty()` in the Pinia store or a composable.

## Shared Components

| Component | Purpose |
|---|---|
| `TagChip.vue` | Single tag displayed as a colored chip/badge. Reused in post sidebar, tag lists, autocomplete. |
| `TagCategoryBadge.vue` | Small colored badge showing category name. |
| `MarkdownPreview.vue` | Renders Markdown to HTML (use `marked` library). Used for tag descriptions, pool descriptions. |

## Acceptance Criteria

- [ ] `/tags` lists all tags with search, sort, and pagination
- [ ] Tag names are colored by category throughout the app
- [ ] `/tag/:name` shows tag detail with siblings and post link
- [ ] `/tag/:name/edit` saves names, category, description, implications
- [ ] `/tag/:name/delete` deletes with warning
- [ ] `/tag/:name/merge/:other` merges tags and redirects
- [ ] `/tag-categories` allows CRUD on categories
- [ ] Category colors update CSS variables app-wide when changed
- [ ] Default category can be set
