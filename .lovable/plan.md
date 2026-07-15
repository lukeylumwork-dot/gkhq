## Wire /system/users to the real user_roles table

Replace the local-storage-backed role editor in `src/routes/system.users.tsx` with real database-backed assign/revoke, using existing `user_roles` + `has_role`. No schema changes.

### Behavior

- Page still gated to `system.manage` (super_admin), same as today.
- User list comes from the database (`profiles` joined with `user_roles`), not `DEMO_USERS` / `usersStore`.
- Each row's role dropdown offers: **super_admin, admin, mentor_manager, mentor, — no role —**. Changing the selection replaces the user's row in `user_roles` (single-role model — delete existing, insert new; "no role" just deletes).
- Optimistic toast + query invalidation on success; error toast on failure.
- Self-guard: the signed-in super_admin cannot change or revoke their own role from this UI (row's dropdown is disabled, tooltip explains why). Prevents lockout.
- Remove the "Reset to defaults" button and the Active/Deactivate column — both are legacy local-store concepts that don't map to the real backend. The search box stays.
- The prototype disclaimer footer is removed.

### Server functions (new `src/lib/admin-users.functions.ts`)

Both use `requireSupabaseAuth` and verify the caller has `super_admin` via `context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" })`. If not, throw. Then load `supabaseAdmin` inside the handler to read/write across users.

- `listManagedUsers()` — returns `[{ id, email, name, initials, title, role | null }]` for every row in `profiles`, joined with the user's highest-precedence role (super_admin > admin > mentor_manager > mentor, matching the precedence already used in `loadSessionUser`).
- `setManagedUserRole({ userId, role })` — role is `Role | null`. Deletes all `user_roles` rows for the target user, then inserts the new role (skipped when `null`). Rejects when `userId === context.userId` (self-guard on server too).

Zod validates both inputs.

### Client wiring

- `system.users.tsx` uses TanStack Query: `queryKey: ["managed-users"]`, `queryFn: listManagedUsers`. Show a small skeleton row list while loading and an error state with retry on failure.
- Dropdown change → `useMutation` calling `setManagedUserRole`, `onSuccess` invalidates `["managed-users"]` and shows a toast; the affected user sees their new role after their next session refresh (documented in a small helper note under the header, replacing the current prototype disclaimer).
- Remove imports of `usersStore` and `DEMO_USERS` from this file. `users-store.ts` and `DEMO_USERS` stay in the repo untouched — other files still reference them and this task is scoped to the admin UI.

### Files

- New: `src/lib/admin-users.functions.ts`
- Edited: `src/routes/system.users.tsx`
- No migrations, no changes to `auth.tsx`, no changes to `users-store.ts`.
