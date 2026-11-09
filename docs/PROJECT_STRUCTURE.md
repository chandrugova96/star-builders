# Project structure

```text
star-builders-ui/
├── frontend/
│   ├── src/                 # React screens, shared UI, hooks, services and routes
│   ├── public/              # Logo and login background assets
│   ├── tests/               # Node/jsdom frontend tests
│   ├── e2e/                 # Playwright responsive browser tests
│   ├── index.html
│   ├── vite.config.ts
│   ├── playwright.config.mjs
│   ├── tsconfig.json
│   ├── package.json
│   └── package-lock.json
├── backend/
│   ├── src/                 # Express app, authentication/users, database and config
│   ├── tests/
│   ├── .env                 # Local only, ignored; never commit
│   ├── .env.example
│   ├── tsconfig.json
│   ├── package.json
│   └── package-lock.json
├── docs/                    # Shared product decisions and handoffs
├── render.yaml              # One free Render service, frontend + API
├── AGENTS.md
├── README.md
├── package.json             # Convenience commands; no application dependencies
└── package-lock.json
```

Each application owns its dependencies, lockfile, configuration, tests and generated outputs. Source/assets were moved without changing screen behavior or business rules. Backend configuration and database records were not changed. UI assets still have the same public URLs; Vite's `/api` proxy still targets port 4000.

## From the repository root

```sh
npm run setup               # Install both applications on a fresh checkout
npm run dev                 # Frontend Vite server
npm run backend:dev         # API server (separate terminal)
npm test                    # Frontend tests
npm run test:responsive     # Frontend Playwright checks
npm run backend:test        # Backend tests
npm run build               # Frontend production build → frontend/dist
npm run backend:build       # Backend build → backend/dist
npm run build:all           # Both builds
npm run deploy:build        # Clean dependency install + both builds
npm run deploy:start        # Start compiled backend (frontend served when enabled)
```

Existing root development/testing/build commands remain available. `npm install` at the root installs no application packages; use `npm run setup`, `npm run frontend:install`, or `npm run backend:install`. For reproducible CI installs use `npm --prefix frontend ci` and `npm --prefix backend ci`.

You may also run each application's own npm commands from inside `frontend/` or `backend/`. In VS Code, the frontend entry file is now `frontend/src/App.tsx`; shared requirements remain under `docs/`.

This change separates the two applications. The deeper frontend cleanup described during review (splitting the mixed application hook/feature dialogs and individual UI primitive files) is separate work, not implied by this folder move.

## Verification after the move
47 frontend tests, 25 responsive browser checks, 11 backend tests and both builds passed. The optional live MongoDB test was skipped; no database records or backend environment values were changed. Restart any previously running Vite server so it uses frontend/ as its project root.

The first free-hosting configuration now supports serving frontend/dist from Express while preserving separate source folders. See DEPLOYMENT.md. The Vite localhost proxy remains for development only.
