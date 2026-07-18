You are an expert Next.js 16 architect and performance optimization engineer.

I have already completed a full-stack Next.js 16 project management application for my team. The application is feature complete and working correctly. Your goal is NOT to change features or UI unless required for performance still need permisison to do changes in the ui and features. Your primary objective is to refactor the entire application using modern Next.js 16 best practices to achieve the best possible performance, scalability, maintainability, and user experience.

## Primary Goals

Refactor the codebase so that it:

- Feels instant to users
- Reduces unnecessary JavaScript
- Minimizes client-side rendering
- Optimizes server rendering
- Uses streaming wherever possible
- Avoids request waterfalls
- Improves Core Web Vitals
- Reduces hydration
- Improves maintainability
- Follows production-grade architecture

The application should feel as fast as applications like Linear, Vercel Dashboard, GitHub, or Notion.

---

# General Rules

Do NOT simply make code changes.

For every optimization:

1. Explain why the current implementation is inefficient.
2. Explain why your approach is better.
3. Implement the optimized version.
4. Ensure functionality remains identical.
5. Remove dead code after refactoring.

Never optimize blindly. Every optimization should have a measurable reason.

---

# Next.js 16 Best Practices

Refactor the application to follow the latest Next.js 16 App Router recommendations.

Prioritize:

- Server Components by default
- Client Components only when absolutely necessary
- Server Actions instead of unnecessary API routes
- Streaming
- Suspense
- Partial Prerendering (PPR) where applicable
- Route-level loading.tsx
- Route-level error.tsx
- Parallel Routes if useful
- Intercepting Routes if appropriate
- Metadata optimization
- Static rendering wherever possible
- Dynamic rendering only where required
- avaoid accesive use of large prop passing and prop drilling

---

# Server Components First

The current project overuses:

- useState
- useEffect
- client components

Refactor aggressively.

Every component should be evaluated.

If a component does not require:

- browser APIs
- user interaction
- event handlers
- local UI state

then it MUST become a Server Component.

Move all data fetching into Server Components.

Reduce hydration as much as possible.

---

# Remove Unnecessary Client State

Identify every use of:

- useState
- useEffect
- useMemo
- useCallback

Remove them whenever possible.

Replace with:

- Server Components
- URL search params
- React cache
- use()
- Server Actions
- Native HTML behavior
- Form Actions

Never keep state that can be derived.

Avoid duplicated state.

Avoid syncing state.

Avoid effects used for data fetching.

---

# Data Fetching

Current implementation contains sequential requests.

Replace request waterfalls with parallel fetching.

Instead of:

await getProjects()
await getTasks()
await getUsers()

Use:

Promise.all()

or other parallel patterns.

Every independent request should execute concurrently.

No page should block because one API call is waiting for another.

---

# Streaming

Implement streaming aggressively.

Large pages should never wait for all data.

Split pages into independent Server Components.

Use:

<Suspense>

for:

- dashboard widgets
- project lists
- task tables
- activity feed
- notifications
- analytics
- comments
- recent activity

Each section should stream independently.

The page shell should render immediately.

---

# Static Rendering

Convert as much of the application as possible to static rendering.

Identify pages that rarely change.

Use:

- Static Rendering
- ISR
- Revalidation
- Cache Components
- Partial Prerendering

Only use dynamic rendering when truly required.

Examples of mostly static content:

- settings metadata
- role definitions
- team information
- navigation
- documentation
- landing pages

---

# Caching

Use proper caching.

Implement:

React cache()

"use cache"

revalidateTag()

revalidatePath()

cacheTag()

cacheLife()

Avoid duplicate database queries.

Avoid repeated API requests.

Avoid unnecessary refetching.

---

# API Architecture

Review every API route.

If an API route is only called by the Next.js application itself:

Replace it with:

Server Actions

Avoid unnecessary HTTP requests inside the same application.

Move business logic to shared services.

---

# Database Queries

Optimize all database access.

Requirements:

- eliminate N+1 queries
- fetch only required fields
- batch queries
- parallelize queries
- reduce duplicate requests
- proper indexing suggestions
- efficient pagination
- cursor pagination where appropriate

---

# Component Architecture

Split oversized components.

Move business logic out of UI.

Keep components focused.

Recommended structure:

Page

↓

Server Components

↓

Small Client Components

↓

Reusable UI

Avoid deeply nested client components.

---

# Code Splitting

Current project loads too much JavaScript.

Improve code splitting.

Lazy load:

- editors
- charts
- calendars
- dialogs
- modals
- kanban board
- markdown editor
- analytics
- heavy libraries

Use:

dynamic()

Suspense

React.lazy()

where appropriate.

---

# Bundle Optimization

Reduce JavaScript bundle size.

Find:

- unused dependencies
- duplicated libraries
- oversized packages
- unnecessary imports
- client-only packages

Replace heavy libraries with lighter alternatives where possible.

Use tree-shaking friendly imports.

---

# Images

Optimize images.

Use:

next/image

responsive images

blur placeholders

proper sizing

priority only for above-the-fold images

lazy loading everywhere else.

---

# Fonts

Optimize fonts.

Use next/font.

Avoid layout shifts.

Preload only necessary fonts.

---

# Forms

Improve forms.

Prefer:

Server Actions

Optimistic UI

Progressive enhancement

Avoid unnecessary client state.

---

# Loading UX

Every major page should include:

loading.tsx

Skeleton UI

Streaming placeholders

Avoid full-page loading spinners.

Users should always see content immediately.

---

# Error Handling

Implement:

error.tsx

not-found.tsx

Graceful server errors

Retry UI where appropriate.

---

# Navigation

Optimize navigation.

Prefetch routes.

Avoid unnecessary rerenders.

Preserve layouts.

Optimize nested layouts.

---

# React Performance

Prevent unnecessary rerenders.

Remove unstable props.

Avoid unnecessary memoization.

Only memoize when profiling proves benefit.

Avoid excessive context providers.

Split contexts if necessary.

---

# Accessibility

While refactoring:

Improve accessibility.

Proper semantics

ARIA

Keyboard navigation

Focus management

Accessible forms

---

# Project Structure

Refactor into a scalable architecture.

Avoid putting everything inside page files.

---

# Performance Targets

Optimize for:

Excellent Lighthouse score

Excellent Core Web Vitals

Minimal JavaScript

Minimal Hydration

Fast TTFB

Fast FCP

Fast LCP

Low CLS

Low INP

Fast route transitions

Instant feeling UI

---

# Maintainability

Improve:

folder structure

naming

typing

reusability

error handling

code consistency

Remove:

duplicate logic

unused files

dead code

legacy patterns

anti-patterns

---

# Constraints

Do NOT break existing functionality.

Do NOT change business logic.

Do NOT change UI unless necessary for performance.

Keep all existing features working.

Every refactor should preserve functionality while improving performance.

---

# Expected Output

For every file you modify:

1. Explain the current issue.
2. Explain the optimization.
3. Show the updated code.
4. Explain the expected performance improvement.

After completing the refactor, provide:

- A summary of all optimizations.
- Estimated improvements in bundle size, hydration, network requests, and rendering performance.
- Remaining optimization opportunities, if any.
- Any architectural recommendations for future scalability.

Your objective is to transform this codebase into a production-grade, enterprise-quality Next.js 16 application that follows the latest App Router patterns and delivers an exceptionally fast, responsive user experience.