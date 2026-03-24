# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

@AGENTS.md

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm test` (watch) / `pnpm test:run` (once) / `pnpm test:coverage`
- `pnpm test:types` — typecheck-only tests (`.test-d.ts` files)
- `pnpm lint` — ESLint v9 flat config

## Architecture

- **Next.js 16 App Router** with React 19 — all components are `'use client'`
- **Window manager**: `useWindowManager` hook exposes reducer-based state; `windowReducer` is not exported
- **App registry**: 56+ lazy-loaded apps in `src/lib/appRegistry.ts`, each receives `{ windowId: string }`
- **Singleton apps**: Apps with `singleton: true` focus existing window instead of opening a new one
- **Cascade positioning**: New windows offset by 30px; wraps every 10 windows
- **Context**: `WindowProvider` wraps the app; access via `useWindows()` hook

## Styling

- Tailwind CSS 4 + `cn()` utility (clsx + tailwind-merge) for class merging
- Win98 look uses CSS custom properties (`--win98-button-face`, `--win98-button-highlight`, etc.)
- Font: `font-[family-name:var(--win98-font)]` at `text-[11px]`
- 3D borders via inset shadows and directional border colors

## Testing Quirks

- Vitest globals enabled — no need to import `describe`/`it`/`expect`
- `windowCounter` is module-scoped and persists across tests — assert ID uniqueness, not values
- Call `setAppRegistry()` before testing `useWindowManager` with app-aware features
- jsdom environment — test class names/attributes, not computed CSS
- Wrap components in `renderWithProviders` (from `src/__tests__/helpers/`) for WindowContext

## Deploy

Vercel (Next.js auto-detected). No env vars required.
