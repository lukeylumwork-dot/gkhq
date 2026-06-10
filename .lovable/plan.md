## Problem

The dashboard at `/` crashes with `TypeError: Cannot read properties of null (reading 'role')` whenever no user is signed in. The offending line in `src/routes/index.tsx`:

```tsx
<PageHeader ... description={`${ROLE_LABEL[user!.role]} ...`} />
```

The `user!` non-null assertion lies — `useAuth()` returns `user: null` until someone signs in. During SSR (and on a fresh visit to `/`), React throws, which surfaces as the blank screen and the "SSR rendering failed" runtime error. The login page itself is fine; the crash happens because the root layout still tries to render the dashboard before the login redirect can occur.

## Fix

Guard the Dashboard component so it never reads `user.role` while `user` is null. If unauthenticated, redirect to `/login` (preserving the existing intent) and render nothing in the meantime.

### Change — `src/routes/index.tsx`

1. Pull `user` from `useAuth()` at the top.
2. If `user` is null, call `navigate({ to: "/login", replace: true })` inside a `useEffect` and `return null` for that render.
3. Remove the `user!` non-null assertion — once the guard is in place, `user` is safely typed as non-null below it.

No other files need changes. UI, layout, traffic-light system, and all downstream behaviour stay exactly as they are.

## Verification

- Reload `/` while signed out → should redirect to `/login` cleanly with no blank screen.
- Sign in as any demo account → dashboard renders as before.
- Console should no longer show the `Cannot read properties of null (reading 'role')` TypeError or the SSR rendering failure.
