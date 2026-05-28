# Stage 9: Polish & Progressive Enhancement

## Goal

Add the finishing touches: keyboard shortcuts, PWA manifest, performance optimizations, dark mode refinement, post notes editing, and any remaining gaps from previous stages. This stage is about feature parity completeness and quality.

## Items in Scope

### 1. Keyboard Shortcuts

**Legacy:** `util/keyboard.js` using `mousetrap` library.

Implement with `@vueuse/core`'s `useEventListener` or the `useMagicKeys` composable, or install `mousetrap`/`hotkeys-js`.

Shortcuts are enabled/disabled by `settings.keyboardShortcuts`.

**Global shortcuts (all pages):**

| Key | Action |
|---|---|
| `a` | Focus search box |
| `?` | Show keyboard shortcut help overlay |

**Post gallery (`/posts`):**

| Key | Action |
|---|---|
| `→` | Next page |
| `←` | Prev page |
| `e` | Focus search |

**Post detail (`/post/:id`):**

| Key | Action |
|---|---|
| `←` | Previous post (in search context) |
|`→` | Next post (in search context) |
| `f` | Toggle favorite |
| `e` | Open edit page |
| `n` | Toggle notes overlay |
| `space` | Scroll down |
| `a` | Play/pause video |

Wrap shortcut registration in a composable `useKeyboardShortcuts()` that checks `settings.keyboardShortcuts` before registering.

### 2. PWA Manifest

The legacy frontend shipped a `manifest.json` and generated multiple icon sizes via Jimp.

Add `vite-plugin-pwa` to the Vite config and configure:
- App name: "Oxibooru" (or configurable from server info)
- Icons: generate from a source `public/img/app.png` at sizes: 48, 72, 96, 128, 144, 152, 192, 384, 512
- Splash screens for iOS
- `theme_color` and `background_color` matching the Tailwind theme
- `display: standalone`
- `start_url: /`

### 3. Post Notes Editing

Deferred from Stage 5. The notes editor allows drawing polygon annotations on images.

**Legacy:** Polygon editor in `post_edit_sidebar_control.js` using mouse click events to define polygon points.

**New approach:**
- SVG overlay on the image (same as the read-only overlay from Stage 4)
- Click-to-add-point mode, close polygon by clicking first point
- Drag handles to move existing points
- Text editor for note content (Markdown)
- Save via PUT `/api/post/{id}` with updated `notes` array

Note polygon coordinates are stored as fractions of image dimensions (0.0–1.0).

### 4. Endless Scroll Mode

Deferred from Stage 4. When `settings.endlessScroll = true`, the posts gallery should use an `IntersectionObserver` to load the next page when the user scrolls near the bottom.

Implementation:
- Track current offset in component state
- On intersection trigger: fetch next page, append to posts array
- Show loading spinner while fetching
- Stop when all pages loaded (check against total count)

### 5. Post Flow Layout

When `settings.postFlow = true`, use a masonry/flow layout for the posts grid instead of a rigid grid. Options:
- CSS `columns` property (native masonry-like)
- `@masonry-layout/layout` library
- CSS Grid with `grid-auto-rows` and `grid-row: span N` based on image aspect ratio

### 6. Image Upscaling

When `settings.upscaleSmallPosts = true`, allow images smaller than the viewport to be scaled up in `PostMediaViewer.vue`. Toggle via CSS class.

### 7. Transparency Grid

When `settings.transparencyGrid = true`, show a checkerboard background behind the image in `PostMediaViewer.vue`. Implement as a CSS background pattern:

```css
background-image: 
  linear-gradient(45deg, #ccc 25%, transparent 25%),
  linear-gradient(-45deg, #ccc 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #ccc 75%),
  linear-gradient(-45deg, transparent 75%, #ccc 75%);
background-size: 20px 20px;
background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
```

### 8. Dark Mode Refinement

Dark mode is set via `.darktheme` class on `<body>`. Audit all components to ensure dark mode works correctly:
- Check contrast ratios
- Ensure `dark:` Tailwind variants are applied consistently
- Test tag category colors in dark mode (may need lightness adjustment)

### 9. Reverse Search (completing Stage 5)

If the reverse search results panel was simplified in Stage 5, complete it here with a proper modal or sidebar showing similar posts with similarity scores and thumbnails.

### 10. Tag Underscore Handling

When `settings.tagUnderscoresAsSpaces = true`, display `my_tag` as `my tag` in tag chips, autocomplete results, and the tag input. The underlying value sent to the API must still use underscores.

Implement as a composable `useTagDisplay(rawName: string)`:
```typescript
const { display } = useTagDisplay('my_tag_name')
// display.value = 'my tag name' if setting is on
```

### 11. Search Syntax Guide Integration

The legacy frontend's search box had a dropdown hint about search syntax. Add a "?" tooltip or link to `/help/search` near the search input in `SearchBox.vue`.

### 12. Error Recovery

- Add retry capability to failed API calls (with a "Try again" button)
- Handle 401 responses globally: clear auth cookie, redirect to login
- Handle 429 (rate limit) with a friendly message
- Handle 503 / network errors with an offline indicator

Global 401 handling: intercept in `useTokenStore().doFetch` — if response is 401, call logout action and push to `/login`.

### 13. Performance

- Lazy-load all page components in the router (Vue Router `() => import(...)` dynamic imports)
- Add `loading="lazy"` to all `<img>` tags that are below the fold
- Use `<Suspense>` for async components where appropriate
- Debounce search inputs (already partially done in `AutoCompleteTag.vue`)
- Cache tag category list in the Pinia store (only fetch once per session)

### 14. Accessibility

- All interactive elements have keyboard focus styles
- Images have meaningful `alt` text (use tag names for post images)
- ARIA roles on modal dialogs
- Screen reader announcements for dynamic content changes (live regions)

### 15. Better Markdown

The following this are what markup the legacy frontend support:
- `@426` - links to post number 426
- `#Dragon_Ball` - links to tag “Dragon_Ball”
- `+Pirate` - links to user “Pirate”
- `$12` - links to pool number 12
- `~~new~~` - adds strike-through
- `[spoiler]Lelouch survives[/spoiler]` - marks text as spoiler and hides it
- `[sjis](´･ω･`)[/sjis]` - adds SJIS art
- `[icon]https://youtube.com[/icon]` - adds the site icon next to the link

We can also specify custom width/height of an embedded image like this:
- `![alt](href =WIDTHx "title")`
- `![alt](href =xHEIGHT "title")`
- `![alt](href =WIDTHxHEIGHT "title")`

Either we just copy and paste the old legacy code, or we rework it to use a more modern approach.

Some alternatives to consider:
- markdown-it with custom plugins for each syntax
- A full blown custom parser with remark, unified, and rehype

## Acceptance Criteria

- [ ] Keyboard shortcuts work and can be toggled in settings
- [ ] PWA manifest installs correctly with icons
- [ ] Endless scroll loads additional pages without button
- [ ] Post notes can be drawn and saved
- [ ] Transparency grid shows on transparent images
- [ ] Dark mode passes visual audit on all pages
- [ ] Tag display respects underscore-as-spaces setting
- [ ] 401 responses globally redirect to login
- [ ] All route components are lazy-loaded
- [ ] Accessible keyboard navigation throughout
