# Design System

## Stack
- framework: Next.js (App Router)
- styling: Tailwind CSS + per-component CSS files
- components: none (hand-rolled)
- animation: Tailwind transitions / motion-reduce guards
- icons: lucide-react

## Tokens
(canonical source: `tailwind.config.ts`)
- b-blue: #252B5F   — primary brand / headings
- accent: #3B6EF6   — primary action (Student / default)
- gctu-gold: #E7AD29 — secondary brand accent
- gold-ink: #5A4A1E — readable gold text
- page-bg: #EEF1F8
- landing bg: #F7F8FB

## Decisions
- 2026-06-03 — init: Next.js + Tailwind detected. Existing token set in `tailwind.config.ts` adopted as-is; no globals/util scaffolding added (project already styled).
- 2026-06-03 — BannerInfo2 hero CTAs: settled on a single primary "Sign In" button (accent blue, person icon left, arrow right, `min-w-[220px]` on desktop, full-width on mobile). Role selection deferred to the unified sign-in page.
- 2026-06-03 — New `/login` page: split layout — tinted brand/illustration panel (desktop) + form card. Role segmented-control ("I am a" Student/Lecturer/Administrator) drives endpoint, redirect, ID label, and reset link. Reuses existing `{ id, password }` → role endpoints. Tailwind-only, no per-page CSS.

- 2026-06-03 — Student timetable refit to new UI: redesigned `studenttimetable/page.tsx` (card-wrapped tables, accent-tinted class cells, friendly empty state, iOS-style SMS toggle) and `Studentheader` (sticky white/blur bar, avatar-initials menu with click-away). Dropped legacy `studentheader.css` import; data/grouping logic unchanged.
- 2026-06-03 — Student timetable bugfix: day columns now derived from the timetable items (ordered Mon→Sun) instead of `localStorage('selectedDays')`, which only the admin dashboard writes — students saw a Time-only column otherwise.
- 2026-06-03 — Student timetable enhanced: dashboard-style insight KPI cards (weekly sessions, courses, busiest day, class days), a "Today" panel, and an Export menu (PDF/Image via `html-to-image` + `jspdf`, plus Print). Printable region wrapped in a ref with a branded document header. Matches dashboard card language (accent/gold KPIs, white `rounded-2xl shadow-sm` cards).
- 2026-06-10 — Student timetable mobile responsive fix: the desktop height-lock (`h-screen`/`overflow-hidden` + contained timetable scroll) is now gated to `lg:` so phones get natural full-page scroll. `StudentSidebar` is `hidden lg:flex` (the 76px icon rail wasted width on small screens); Logout relocated into a tap-able profile dropdown in the page header (shows name on mobile, where the sidebar is gone). KPI cards scale down on mobile (`p-3.5`/`text-xl` → `sm:p-4`/`sm:text-2xl`); KPI labels wrap instead of truncate. Skeleton fill behavior matched the same `lg:` gating.
- 2026-06-10 — Student timetable laptop (13"/1280×800) refit: main is now a fixed-height flex column (`h-screen overflow-hidden`) so only the timetable scrolls and the sidebar stays fully visible. SMS reminder toggle relocated from the page body into the `StudentSidebar` footer (defaults on, hover tooltip) alongside the restored "Take it with you" note; "Home" nav item and the in-table GCTU document header removed for space. Timetable cells merged room+lecturer onto one wrapping line (3→2 lines per cell, ~78px→~50px rows). KPI cards reverted to vertical layout (icon → `text-2xl` value → `text-xs` label, `p-4`) after a horizontal variant read as squashed; tokens accent/gctu-gold/gold-ink, white/20·40·85. Known brand tradeoff: small white labels on accent blue are ~3:1 (below AA 4.5) — kept for app-wide consistency.
- 2026-06-03 — Dashboard profile: avatar shows first+last initials. Settings + Logout moved into the admin `Sidebar` footer (new "Account" group); dashboard profile widget is now a static display (dropdown removed, dead symbols cleaned up). New `/settings` page (admin profile + logout).

## Components
- BannerInfo2 (landing hero) — `src/components/bannerInfo2/BannerInfo2.tsx`
  - SignInButton: accent CTA, hover lift + arrow slide, focus-visible ring, reduced-motion safe.
- Login (unified sign-in) — `src/app/login/page.tsx`
  - Role segmented-control (tablist) + adaptive id/password form, password reveal toggle, loading + error states.

## Non-Goals
- No Figma sync
- No image generation
