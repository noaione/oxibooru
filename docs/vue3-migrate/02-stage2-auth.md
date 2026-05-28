# Stage 2: Authentication & Account Creation

## Goal

Implement all auth-related routes: login, logout, registration, and password reset. After this stage users can authenticate and the entire app correctly reflects auth state.

## Routes in Scope

| Path | Component | Method | Notes |
|---|---|---|---|
| `/login` | `LoginView.vue` | GET | Login form |
| `/logout` | (route guard action) | GET | Clear session, redirect |
| `/register` | `RegisterView.vue` | GET | New user signup |
| `/password-reset` | `PasswordResetView.vue` | GET | Request + confirm reset |

Legacy path `/user-registration` → New path `/register`.

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/user/{name}?bump-login=true` | GET | Validate token + fetch user on startup |
| `/api/user-token/{username}` | POST | Create auth token on login |
| `/api/user-token/{username}/{token}` | DELETE | Revoke token on logout |
| `/api/users` | POST | Create new user account |
| `/api/password-reset/{identifier}` | GET | Request password reset email |
| `/api/password-reset/{identifier}` | POST | Confirm reset with token |

## Auth Flow (Already Partially Implemented)

The `useTokenStore()` in `src/stores/api.ts` already handles:
- Reading the `auth` cookie on mount
- Fetching user data with token to validate session
- Storing `userToken` and `user` state

What's missing is the UI and the write-side calls.

### Login Flow

1. User submits username + password
2. POST `/api/user-token/{username}` with `Authorization: Basic base64(user:password)` header and body `{ "note": "Login from browser" }`
3. On success: store returned token in cookie (`auth` key, JSON `{user, token}`)
4. Call `refreshInfo()` to reload user + server info
5. Redirect to `/` or the `?redirect=` query param

### Logout Flow

1. DELETE `/api/user-token/{username}/{token}` with current token auth
2. Clear `auth` cookie
3. Reset `userToken` and `user` store state
4. Redirect to `/`

The logout route does not need a page component — implement as a Vue Router `beforeEnter` guard that calls a store action then redirects.

### Registration Flow

1. Validate: username, password, password confirmation (client-side)
2. POST `/api/users` with `{ name, password }`
3. On success: auto-login using the Login Flow above
4. Redirect to `/`

Registration can be disabled server-side (check `config.privileges` for `"users:create:self"`).

### Password Reset Flow

The legacy `password_reset_controller.js` handles two steps on the same page:
1. **Request step:** POST identifier (username or email) → server sends email
2. **Confirm step:** URL includes `?token=...` query param → show password entry form, POST to confirm

In the new frontend:
- `/password-reset` with no query params = request form
- `/password-reset?token=...` = confirmation form
- Both handled in `PasswordResetView.vue` using `route.query.token`

API calls:
- Request: GET `/api/password-reset/{identifier}` (just a GET triggers email)
- Confirm: POST `/api/password-reset/{identifier}` with body `{ "token": "...", "password": "..." }`

## Components to Build

### `LoginView.vue`

- Username input, password input, submit button
- Show error toast on failure (wrong credentials)
- Redirect on success
- Link to `/register` and `/password-reset`

### `RegisterView.vue`

- Username, password, confirm password inputs
- Client-side validation (passwords match, username non-empty)
- Show server errors inline (e.g., username taken)
- Hide page or show message if registration is disabled

### `PasswordResetView.vue`

- Step 1 (no token in URL): identifier input + submit
- Step 2 (token in URL): new password + confirm inputs
- Show success/error messages

## NavBar Updates (from Stage 1)

Complete the NavBar auth-state display:

- **Unauthenticated:** Show "Log in" and "Register" links
- **Authenticated:** Show username with link to `/user/:name`, and "Log out" link to `/logout`
- Use `useTokenStore().user` to check auth state (null = unauthenticated)

## Cookie Format

Legacy cookie `auth`:
```json
{ "user": "username", "token": "token-string" }
```

The `useTokenStore()` already reads this format. On login, write the same format.

Use `js-cookie` or a thin cookie utility. The cookie should have a 365-day expiry and `SameSite=Lax` for security.

## Route Guards

Add a `requireAuth` navigation guard to protect routes that need authentication:

```typescript
// src/router/index.ts
function requireAuth(to, from, next) {
  const apiStore = useTokenStore()
  if (!apiStore.user) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
}
```

Apply to: all `/user/:name/edit`, `/user/:name/delete`, `/user/:name/tokens`, `/upload`, `/post/:id/edit`, management routes.

## Privilege Checks

Some actions require specific ranks. Use `useTokenStore().hasPrivilege(privilege)` (already implemented).

Relevant privileges for this stage:
- `users:create:self` – can register (if false, hide register link)
- `users:create` – admin can create any user

## Acceptance Criteria

- [ ] Login form authenticates and sets cookie
- [ ] Auth cookie is read and user is restored on page refresh
- [ ] Logout clears cookie and redirects
- [ ] Registration creates account and auto-logs in
- [ ] Password reset request sends (server 2xx response)
- [ ] Password reset confirm changes password
- [ ] NavBar correctly shows login/user state
- [ ] Protected routes redirect unauthenticated users to `/login`
