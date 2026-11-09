# Star Builders — Codex project instructions

Read `docs/PROJECT_REQUIREMENTS.md`, `docs/BUSINESS_RULES.md`, `docs/DATABASE_DESIGN.md`, and `docs/DEVELOPMENT_PLAN.md` before making changes. These files capture the decisions agreed with the product owner. Treat them as project context, not as a mandate to implement everything at once.

## Non-negotiable
- The current project in this folder is the ORIGINAL V1 UI and is the visual source of truth. Preserve existing Dashboard, Sites, Labourers, Reports, sidebar, navigation, colors, typography, spacing, tables and cards. Do not replace screens with simplified versions or adopt V2 design.
- Implement only the task requested in the current Codex conversation. Propose a short plan and affected files before edits. Ask before changing business rules or visual design.
- Stack: React + Vite + TypeScript + Tailwind CSS. Future backend: Node.js + Express + TypeScript, MongoDB + Mongoose. No PostgreSQL/Prisma/NestJS.
- Extract shared reusable Button, Input, Select, Modal, Table, Badge, Card, DatePicker, FormField components while preserving their V1 rendered appearance. Organize by features; avoid monolithic App.tsx and duplicated logic.
- Frontend currently uses sample data; do not pretend persistence, financial controls, or server-side validation exist. Do not implement backend unless explicitly asked.
- Salary history is effective-dated. Approved payroll is immutable; corrections are separate adjustments. Money must use safe decimal handling on the backend. Payments and advances require ledgers and idempotency.
- Run available tests and `npm run build` after changes; report any environment blockers honestly. List changed files and behavior, and highlight any assumptions.
- Do not store credentials or real worker personal data in source control.

## Completed frontend UI tasks (see docs/FRONTEND_HANDOFF.md)
1. Add previous/next week navigation to Weekly Payroll; allow viewing/approving pending historical weeks.
2. Record full/partial payments directly in approved Weekly Payroll rows/details; show history, outstanding and brought-forward balances. Avoid accidental double payments/overpayment in UI mock, but real guarantees require backend.
3. Monday–Saturday usual working days; Sunday optional, only paid when attendance is entered at normal rate. Keep weekly payroll period Monday–Sunday.
4. Refactor reusable components without visual redesign.

The product owner has confirmed the frontend is ready and authorized backend development. Phone number + password is confirmed for login. Follow docs/DEVELOPMENT_PLAN.md for the current backend slice; do not treat the full proposed schema as a mandate to implement every phase at once.

## Application folders
React source/assets/tests/configuration now live under `frontend/`; Express source/tests/configuration remain under `backend/`. Shared decisions stay in root `docs/`. Each app has its own package.json and lockfile. Root npm scripts forward to the correct app; `npm run setup` installs both. See docs/PROJECT_STRUCTURE.md.
