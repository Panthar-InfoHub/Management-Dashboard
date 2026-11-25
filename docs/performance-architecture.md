# Rendering, caching and navigation

Next.js 16.4 with `cacheComponents` and `partialPrefetching` on (`next.config.ts`).
Every dashboard route builds as `◐` (Partial Prerender): a static shell is
prerendered at build time, and per-user data streams in behind `<Suspense>`.

## Rules for new pages

1. **No request data outside `<Suspense>`.** `auth()`, `cookies()`, `headers()`,
   `await params` and `await searchParams` must run inside a component that sits
   under a `<Suspense>` boundary (or a `loading.tsx`). Page headers and titles stay
   outside it so they land in the static shell.
2. **Fetch on the server, hand data to a `*-client.tsx`.** Use `Promise.all` for
   independent reads.
3. **Client hooks that read the URL** (`usePathname`, `useSearchParams`) go in a
   small component behind `<Suspense>`. See `ActiveNavLists` in
   `components/layout/sidebar.tsx`.
4. **Don't start an uncached DB query before auth** in a `Promise.all`: it runs
   during prerender and fails the build. Cache it, or await auth first.

## Caching

- Shared reference data lives in `lib/queries/reference.queries.ts` with
  `"use cache"` + `cacheTag` + `cacheLife`. Today: role names and role permissions
  (tag `roles`).
- Every Server Action that changes cached data calls `updateTag(CACHE_TAGS.x)`
  (`lib/cache/tags.ts`). Role actions already do.
- Per-user and live data (tasks, notifications, dashboard) is not cached.

## Mutations

- Server Actions call `revalidatePath` for every page that shows the changed
  record. Task actions use `revalidateTaskViews()` (board, task, parent task,
  project, dashboard). Don't add `router.refresh()` after an action: the action's
  response already carries the refreshed page.
- Client components show the change at once with `useOptimistic`
  (see `task-detail-client.tsx`, `task-comments.tsx`).
- Every mutation writes an audit entry with `audit()` from `lib/audit.ts`. It runs
  in `after()`, so it never slows the action down.

## Navigation

- Use `<Link>` where possible. Rows that navigate with `router.push` also call
  `router.prefetch(href)` on mouse-enter.
- Heavy client code loads lazily: recharts on the dashboard, the ⌘K command
  palette (`next/dynamic`, `ssr: false`).

## Checks before merging

- `npx next build` passes with every dashboard route `◐`.
- To find the line that blocks a route: `npx next build --debug-prerender`.
