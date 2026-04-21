# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server with HMR.
- `npm run build` — type-check (`tsc -b`) then produce a production build via Vite. Use this before shipping; it will fail on TS errors.
- `npm run buildWithoutLints` — Vite build only, skipping `tsc`. Useful when you need a quick bundle and know TS is dirty.
- `npm run lint` — run ESLint over the repo (flat config in `eslint.config.js`).
- `npm run preview` — serve the built `dist/` for local sanity checks.

There is no test runner configured — do not invent one.

## Architecture

This is the Pumpkin Market frontend: a React 19 + TypeScript + Vite SPA for a Minecraft plugin marketplace. It talks to a backend over `/api` (see `src/api.ts`); in dev, that path must be proxied or served by the same origin (no Vite proxy is configured in `vite.config.ts`, so the backend is expected to be reachable at `/api` of whatever host serves the SPA).

### Routing & layout (`src/App.tsx`)

`App.tsx` is the spine of the app and contains several things colocated that you might expect in separate files:

- The `BrowserRouter` and full route table.
- `AuthContext` / `AuthProvider` / `useAuth()` — exported from `App.tsx`. Auth state is a JWT in `localStorage` under key `token`; the payload is decoded client-side to populate `user`. `refreshUser()` calls `/user/me` and re-logs in with the new token.
- `ProtectedRoute` (requires `user`) and `AdminRoute` (requires `user.role === 'admin'`).
- `MainLayout` (Navbar + `<Outlet/>` + Footer) wraps every route. `DashboardLayout` is a nested layout under `/dashboard`.
- `Navbar` and `Footer` components.

When adding a route, add it inside the `MainLayout` `<Route>` in `App.tsx`. Auth-gated pages must be wrapped in `<ProtectedRoute>`; admin pages in `<AdminRoute>`.

### API client (`src/api.ts`)

A single shared `axios` instance with `baseURL: '/api'` and a request interceptor that attaches `Authorization: Bearer <token>` from `localStorage`. Always import this default export — do not create new axios instances ad hoc, or auth headers will be missing.

### i18n (`src/i18n.ts`, `src/locales/`)

`i18next` + `react-i18next` with `LanguageDetector`. Translation JSON is imported statically (`en.json`, `es.json`) to avoid runtime fetches. Use `useTranslation()` and `t('key')` in components. New strings should be added to both locale files.

### Page / component layout

- `src/pages/` — route-level components. Subfolders group related pages: `auth/`, `dashboard/` (with nested `dashboard/plugin/` for plugin management), `admin/`, `legal/`.
- `src/components/` — reusable pieces. `discover/DiscoverCatalog.{tsx,css}` is the main plugin browse/filter UI; `SEO.tsx` is a head-tag helper.
- `src/pages/VeinminerMockup.tsx` (route `/mockup`) is a Modrinth-style plugin-detail design mockup; treat it as a design reference, not as production behavior. It uses inline `<style>` tags rather than a sibling CSS file.

Styling is plain CSS files imported next to the component (no CSS-in-JS framework, no Tailwind). `App.css` and `index.css` hold global styles. Component-specific styles live next to the component (e.g. `DiscoverCatalog.css`, `Dashboard.css`).

### TypeScript

`tsconfig.json` is a project-references root delegating to `tsconfig.app.json` (app code) and `tsconfig.node.json` (Vite config). Auth values are intentionally `any` in `App.tsx`; if you tighten this, update both `AuthContext` and consumers.

### Conventions worth knowing

- The dev server has no API proxy configured. If you hit CORS/404 on `/api/...` during `npm run dev`, the backend isn't being served on the same origin — fix the environment, not the axios `baseURL`.
- Mobile responsiveness is handled with raw `@media` queries; common breakpoints already in use are 1300px, 960px, 768px, 720px, 480px. Match these when adding mobile styles to keep things consistent.
- The mobile filter drawer in `DiscoverCatalog` locks `document.body.style.overflow` while open; the category list inside it is its own scroll container (`max-height: 50vh; overflow-y: auto`). Don't remove either or scroll behavior on iOS will break.
