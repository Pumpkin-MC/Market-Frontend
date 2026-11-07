# Pumpkin Market Frontend

The web frontend for [Pumpkin Market](https://market.pumpkinmc.org), the plugin marketplace for [Pumpkin](https://pumpkinmc.org). React 19, TypeScript and Vite, managed with bun.

## Development

```sh
bun install
bun run dev
```

The app calls the API at `/api`. In development Vite proxies `/api` to the official backend at `https://market.pumpkinmc.org`, so every action you take (logging in, saving, publishing, deleting) is real.

## Checks

```sh
bun run typecheck
bun run check:i18n
bun run build
```

## Layout

```
src/
  main.tsx          entry
  app/              routes, auth context and route guards, page shell (header, footer, layouts)
  features/         one folder per area, each owning its pages
    store/          home, search, author pages, header search
    plugin/         plugin page, video player
    account/        sign in, sign up, email flows, settings
    studio/         developer dashboard; manage/ holds the per-plugin tabs
    staff/          moderation panel
    legal/          legal documents
  components/       UI shared across features
  hooks/            shared React hooks
  lib/              API client, i18n, consent, helpers
  styles/           system.css is the design system; one stylesheet per feature
  types/            shared types
  locales/          translations; en_us.json is the reference
```

The design system lives in `src/styles/system.css`.
