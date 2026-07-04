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
- **Boot state machine** (`src/app/page.tsx`): booting → ScanDisk (only after a dirty shutdown/BSOD) → login → running, plus shutdown/BSOD branches. First-run theater (Welcome screen, timed AIM/mail events) hangs off the running state via `FirstRunHost`.
- **Window manager**: `useWindowManager` hook exposes reducer-based state; `windowReducer` is not exported. Supports owned/modal dialog windows (`ownerId`/`modal`, `ManagedDialog`), `resizable: false` enforcement, minimize-all/restore-all, and the zoom-rectangle animation (state dispatch stays synchronous; the animation is a fire-and-forget overlay).
- **App registry**: 72 lazy-loaded apps in per-category files under `src/lib/registry/`, merged and re-exported by `src/lib/appRegistry.ts`. Each app receives `{ windowId, launchParams?, launchCount? }`. Apps with `singleton: true` focus the existing window; new windows cascade by 30px, wrapping every 10.
- **Context**: `WindowProvider` wraps the app; access via `useWindows()`. Settings + per-app prefs via `useSettings()` (`getAppPref`/`setAppPref`). Virtual filesystem via `useFileSystem()` — mutations update `stateRef` synchronously so same-tick batches (create folder, then write files into it) all land.
- **Persisted filesystem** (`src/contexts/FileSystemContext.tsx`): the tree saves to `localStorage['win98-fs-v1']`. On load, `graftSystemSeeds` reconciles a saved tree with newer OS content — the desktop program folders are refreshed wholesale, and a short allow-list of seed paths is copied in only if missing. **If you add a new seeded file/folder that returning visitors must see, add it to that graft (a fresh seed alone only reaches new profiles).**
- **Mobile gate** (`src/components/system/MobileGate.tsx`, mounted in `layout.tsx`): a CSS-media-query (`(pointer: coarse) and (hover: none)`) desktop-only notice — SSR-safe, covers every state, never false-positives a narrow desktop window.

## Platform services

- **MenuBar v2** (`src/components/window/MenuBar.tsx`): data-driven menus with portaled dropdowns, nested submenus, `&` accelerators, and keyboard nav (pass `windowId`). `src/lib/menus.ts` has `standardFileMenu`/`standardEditMenu`/`standardHelpMenu` factories; About dispatches through the global dialog host.
- **Dialogs** (`src/components/dialogs/`): shared `FilePickerDialog` (open/save with "Files of type" filters), `PropertiesDialog`, `AboutDialog`, `PrintDialog`, and `DialogHost` listening on the event bus. `WindowErrorBoundary` renders app crashes as GPF dialogs.
- **Event bus** (`src/lib/eventBus.ts`): typed `emit`/`on` over the `win98-*` window CustomEvents. **Clipboard** (`src/lib/clipboard.ts`): cross-app text/image/file cut-copy-paste; Explorer and the desktop consume `kind: 'files'`.
- **Print pipeline** (`src/lib/print/`): `submitPrintJob` spools text/html/image jobs per printer; pages render to PNG data URLs and land in `C:\My Documents\Printed Documents`. Wire apps via `usePrint(windowId, appName)`; the Printers app shows the live queue.
- **Audio** (`src/lib/sounds.ts` + `src/lib/audio/`): master gain with named channels (wave/midi/cd) feeding the Volume Control mixer; per-event sound overrides power the Control Panel Sounds applet; `MusicPlayer` carries the 10-band EQ used by Winamp.
- **File associations** (`src/lib/fileAssociations.ts`) + `useFileOpener`: extension → app routing; `installer:<slug>` file content triggers the install wizard; `track:<id>` content resolves to bundled music; `app:<appId>` content is a program shortcut that opens that app. The desktop program folders come from `src/lib/desktopShortcuts.ts` (a manifest of all apps grouped into folders, kept in sync with the registry by a test).

## Games

- Game logic lives in pure, seeded-RNG modules under `src/components/apps/games/engine/` (tested without a DOM); components stay thin. `loop.ts` (RAF loop) and `rng.ts` are shared and stable.
- **Sprite/iso engine** (`games/engine/sprites/` — see its README): sprites are authored as ASCII pixel-map string arrays with palette lookup, compiled to canvases, with faction recoloring and isometric helpers. Every sheet file ships a test asserting all its defs validate.
- The three RTS titles are configs over one data-driven engine (`engine/rts.ts`); SimCity and RollerCoaster Tycoon render isometrically; Bunker 98 is a software raycaster.

## Styling

- Tailwind CSS 4 + `cn()` utility (clsx + tailwind-merge) for class merging
- Win98 look uses CSS custom properties (`--win98-button-face`, `--win98-button-highlight`, etc.)
- Font: `font-[family-name:var(--win98-font)]` at `text-[11px]`
- 3D borders via inset shadows and directional border colors

## Testing Quirks

- Vitest globals enabled — no need to import `describe`/`it`/`expect`
- `windowCounter` is module-scoped and persists across tests — assert ID uniqueness, not values
- Call `setAppRegistry()` before testing `useWindowManager` with app-aware features
- jsdom environment — test class names/attributes, not computed CSS; canvas code must guard a null 2D context
- Wrap components in `renderWithProviders` (from `src/__tests__/helpers/`) for WindowContext
- Menu items render with ARIA menu roles, and accessible names concatenate label + shortcut without spaces ("SaveCtrl+S") — match with substring regexes, not exact strings
- The app-count test derives from the registry itself; don't hardcode counts when adding apps
- React Compiler lint: no synchronous `setState` in effect bodies (defer via timeout) and no manual memo on values whose derived objects render — the games and boot code follow these patterns

## Deploy

Vercel (Next.js auto-detected). No env vars required.
