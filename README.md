# Star Builders — Construction Management

React + Vite + TypeScript + Tailwind frontend, with Express + TypeScript + MongoDB/Mongoose backend. The existing V1 screens now read and save business records through authenticated APIs.

## Run

Use Node 20.19+ and MongoDB Atlas or a replica set (transactions are required for business writes).

```sh
npm run setup
npm run backend:dev
```

In a second terminal:

```sh
npm run dev
```

Keep MongoDB/JWT configuration in ignored `backend/.env`. Sign in using the existing Admin phone/password. The first Admin already exists; there is no public registration or built-in account. See [backend setup](backend/README.md).

## Connected modules

- Sites, supervisor assignment, labourers and effective-dated wage history.
- Attendance with site authorization, a cross-site daily limit and approved-week locks.
- Weekly payroll approval, immutable earnings snapshots and advance recovery.
- Full/partial salary payments inside Weekly Payroll, allocated to oldest unpaid weeks through the selected week.
- Advance/payment registers, dashboard queries and seven CSV exports.
- User management and one-day persistent login sessions.

Business records persist in MongoDB; there is no fallback to fictional data and no automatic import of example records. Empty modules need their initial records entered through the UI. The supplied logo and existing V1/mobile layouts are preserved.

Use **Settings → User Management** to create users, then assign Supervisors on **Sites**. Add labourers with their actual wage effective date before entering historical attendance. Approve pending attendance weeks in chronological order. Use an approved row's **Pay / Details** to pay; the standalone Payments page is history only.

[Business integration](docs/BACKEND_INTEGRATION.md) records the API contract, guarantees, changed files and remaining work. Audited corrections and full reversals are available; see [usage and limits](docs/CORRECTIONS_AND_REVERSALS.md). Password recovery, backups and deployment preparation remain separate work. Approved earnings remain protected from direct edits.

## Verify

```sh
npm test
npm run build:all
npm run backend:test:integration
npm run test:responsive
```

The integration command starts and removes an isolated temporary local MongoDB replica set. Install `mongod` or set `MONGOD_PATH`; it never reads the application's MongoDB URI. Without a test URI, `npm run backend:test` runs unit/HTTP tests and skips database integration tests. Browser tests use local Chrome and intercepted test APIs, without the owner's credentials.

## Structure and hosting

`frontend/` and `backend/` have separate packages and lockfiles. Root commands delegate to them. Shared UI controls live in `frontend/src/components/ui/`; screens and controllers are organized by feature. See [project structure](docs/PROJECT_STRUCTURE.md).

Vite forwards `/api` to `http://127.0.0.1:4000`. Production hosting must proxy `/api` to Express and serve `index.html` for frontend routes, including deep links. Configure CORS, database access, backups and HTTPS before deployment. See [authentication](docs/AUTH_INTEGRATION.md) and [responsive verification](docs/RESPONSIVE_UI.md).

## First free hosting

The project is prepared for a single Render Free web service serving both frontend and API, with MongoDB remaining in Atlas. Use root `render.yaml`; see [deployment instructions](docs/DEPLOYMENT.md) for private secret entry, network allowlisting, commands and free-tier limits. Deployment has not been published or verified live yet.
