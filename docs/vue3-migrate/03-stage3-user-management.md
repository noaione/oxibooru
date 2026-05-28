# Stage 3: User Management

## Goal

Implement all user-related pages: user profile, user edit, account deletion, auth token management, and the users directory. After this stage, full user CRUD is functional in the new frontend.

## Routes in Scope

| Path | Component | Legacy Controller | Notes |
|---|---|---|---|
| `/users` | `UsersView.vue` | `user_list_controller.js` | User directory with search |
| `/user/:name` | `UserView.vue` | `user_controller.js` | Public user profile |
| `/user/:name/edit` | `UserEditView.vue` | `user_controller.js` | Edit own or admin edit |
| `/user/:name/delete` | `UserDeleteView.vue` | `user_controller.js` | Delete account |
| `/user/:name/tokens` | `UserTokensView.vue` | `user_controller.js` | Token management |

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/users` | GET | List/search users (paged) |
| `/api/user/{name}` | GET | Get user profile |
| `/api/users` | POST | Create user (admin) |
| `/api/user/{name}` | PUT | Update user (name, password, rank, avatar) |
| `/api/user/{name}` | DELETE | Delete user |
| `/api/user-tokens/{username}` | GET | List tokens (unpaged) |
| `/api/user-token/{username}` | POST | Create token |
| `/api/user-token/{username}/{token}` | PUT | Update token (note, expiry) |
| `/api/user-token/{username}/{token}` | DELETE | Revoke token |

All user endpoints support the full privilege system. The current user can edit their own profile; admins can edit any user.

## Data Types (from `oxibooru.gen.ts`)

```typescript
// Key types to use:
MicroUser       // name, rank, avatarUrl
User            // extends MicroUser + email, creationTime, lastLoginTime, commentCount, ...
UserToken       // token, note, enabled, expirationTime, creationTime, lastUsageTime
```

## Users Directory (`/users`)

**Legacy:** `user_list_controller.js` + `users_page_view.js` + `users_header_view.js`

**Features:**
- Search by username (query param `q`)
- Sort by name, creation date, post count
- Paginated with `Pagination.vue` (Stage 1)
- Each row: avatar, username (link to profile), rank badge, creation date

**API call:** `GET /api/users?query={q}&offset={n}&limit={pageSize}&sortBy=...`

Query params:
- `query` – username search string
- `offset` / `limit` – pagination
- `sortBy` – `name`, `creationTime`, `postCount`
- `sortDirection` – `asc` / `desc`

## User Profile (`/user/:name`)

**Legacy:** `user_controller.js` + `user_view.js` + `user_summary_view.js`

**Sections to display:**
- Avatar image
- Username + rank badge
- Registration date and last login time
- Comment count, upload count, favorite count
- "Edit" link (shown only to owner or admin)
- "Delete" link (admin only)
- "Manage tokens" link (owner only)

**API call:** `GET /api/user/{name}`

## User Edit (`/user/:name/edit`)

**Legacy:** `user_edit_view.js`

**Editable fields:**
- Username (own profile or admin)
- Password (with current password confirmation for own profile)
- Email address
- Rank (admin only — dropdown of ranks)
- Avatar: gravatar (uses email) or manual upload

**Avatar upload:**
1. Select image file
2. POST `/api/uploads` to get a temporary upload token
3. Include token in PUT `/api/user/{name}` body as `avatarToken`

**API call:** `PUT /api/user/{name}` with body from `ApiUpdateUserRequest`

Access control: user can only edit their own profile. Admins can edit any. Enforce with route guard checking `useTokenStore().user.name === route.params.name || hasPrivilege('users:edit:any')`.

## User Delete (`/user/:name/delete`)

**Legacy:** `user_delete_view.js`

- Confirmation page (not just a dialog) with username pre-filled
- User must type username to confirm
- Uses `ConfirmDialog.vue` pattern from Stage 1 or inline confirmation input
- On confirm: DELETE `/api/user/{name}`, then logout if deleting own account, redirect to `/`

## Token Management (`/user/:name/tokens`)

**Legacy:** `user_tokens_view.js`

**Features:**
- List all tokens with: note, creation time, last used time, expiry, enabled status
- Create new token (form: note, optional expiry date)
- Edit token (toggle enabled, change note)
- Delete/revoke token with confirmation

**Token creation:** POST `/api/user-token/{username}` with `{ "note": "...", "expirationTime": null }`

**Revoke:** DELETE `/api/user-token/{username}/{token}`

## Shared Components for This Stage

### `UserAvatar.vue`

Displays user avatar. Props: `user: MicroUser`, `size?: 'sm' | 'md' | 'lg'`. Renders either gravatar URL or the server-hosted avatar URL.

### `RankBadge.vue`

Colored badge showing user rank. Props: `rank: string`. Uses rank-to-color mapping consistent with legacy CSS.

### `UserCard.vue`

Summary card used in the user list. Contains avatar, username, rank badge, joined date. Clicks through to `/user/:name`.

## Acceptance Criteria

- [ ] `/users` lists all users, search by name works, pagination works
- [ ] `/user/:name` shows full profile with correct conditional links
- [ ] `/user/:name/edit` saves changes (name, password, email, rank, avatar)
- [ ] Avatar upload works via upload token flow
- [ ] `/user/:name/delete` deletes account and redirects
- [ ] `/user/:name/tokens` shows all tokens, create/edit/delete work
- [ ] Edit and delete routes redirect unauthenticated users
- [ ] Admin can edit/delete any user; regular users only their own
