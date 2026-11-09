# Development plan and handoff

## Current status — business integration completed

Authentication/users and all existing V1 business workflows now use the backend. Confirmed rounding, oldest-first payment allocation and chronological approval are recorded in BUSINESS_RULES.md. See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) for the implemented API, changed files, verification and limitations. The original slice notes below are historical context and do not describe the current runtime.

Next work: product-owner verification with actual sites/workers; deployment/backups/migrations and production review. No automatic sample import or test writes to Atlas were performed. Current checks: 55 frontend tests, 16 backend tests including isolated replica-set scenarios, 35 browser checks and both builds passed.

## Corrections and reversals completed
The owner authorized this slice and confirmed unapproved-week settlement for corrections and refunds of already-recovered advances. Admin correction/full-reversal actions, immutable audit history, transactional guards and CSV updates are implemented. The owner reported the original full workflow working. See [CORRECTIONS_AND_REVERSALS.md](CORRECTIONS_AND_REVERSALS.md) for usage, changed files and limits. Other pending work remains site/status editing, worker/category administration, account recovery, settings persistence and production preparation.

## Current authorization and baseline
The product owner confirmed the V1 frontend is ready and explicitly authorized starting the backend. The completed frontend decisions are recorded in [FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md). Preserve this UI during API integration; example records remain until integration replaces them. Visible prototype labels were removed at the owner's request.

## Backend slice 1 — foundation, authentication and users
- Node.js + Express + strict TypeScript; MongoDB + Mongoose.
- Environment validation, ignored local configuration, CORS allowlist, headers, bounded JSON bodies, request IDs, structured errors, MongoDB startup/readiness and graceful shutdown.
- Confirmed login identifier: phone number + password for Admin and Supervisor.
- Salted scrypt password hashes, signed short-lived JWTs, current-user endpoint, login throttling and Admin-only user creation/list/update.
- The product owner confirmed the initial Admin was created in MongoDB. The one-time bootstrap script, commands and local bootstrap credentials were then removed. Further user creation uses the authenticated Admin API; there is no public registration or sample-account seeding.
- Authentication and user-management frontend integration is now complete; other business state is still in memory. See AUTH_INTEGRATION.md.

## Original implementation slices (status superseded below)
1. Completed: sign-in/session state and API-backed user management, preserving V1. Phone/password, Admin identity, protected routes, session restoration/expiry and local sign-out are connected. See AUTH_INTEGRATION.md.
2. Sites and supervisor assignments, with server-enforced site authorization. Reconcile the V1 single-supervisor display with the proposed effective-dated assignment collection.
3. Labour, categories and effective-dated salary history with non-overlap validation and safe monetary representation.
4. Attendance allocation, concurrent validation and approved-week locks.
5. Immutable payroll approval, snapshots, advance/recovery ledgers and separate corrections.
6. Salary payment ledgers, idempotency, allocation, reversals and brought-forward views attributed to original weeks/sites.
7. Real dashboard/report queries, exports, integration/end-to-end tests, backups and deployment evaluation.

## Policies
The owner has now confirmed paise rounding, no overtime hour cap, automatic oldest-first payment allocation and chronological approval. See BUSINESS_RULES.md for remaining Sunday-specific approval and absence semantics. Frontend preview assumptions do not settle these backend policies. Refresh-token/logout/password-reset flows and verified-phone onboarding are not implemented in slice 1.

## Verification and handoff
Run frontend tests/build and backend tests/build for relevant changes. Test database operations against a dedicated disposable test database, never a worker/production database. Do not commit .env, credentials or real personal data. Record completed scope and remaining limits after each slice. Git initialization/untouched V1 commit is still absent in this folder.

## Slice 1 verification completed
Backend TypeScript build passed. All 11 backend tests passed, including the opt-in real MongoDB authentication/user integration test against a generated temporary database; cleanup completed. All 28 frontend tests and the Vite production build also passed. At slice-1 verification no real Admin account was created and no frontend data was migrated. Subsequently, the product owner confirmed first-Admin creation; the bootstrap facility was removed on request.

## Frontend authentication slice completed
Login and the user directory now use the API; example user records are removed from runtime state. Supervisors are limited to empty Sites/Attendance access views until the Sites API provides assigned records. Admin business screens retain their V1 appearance and in-memory examples. No existing real database records were modified during implementation or automated tests.

Authentication integration verification: 42 frontend tests and both builds passed; 10 backend regression tests passed, with the optional MongoDB integration test skipped.

## Mobile usability pass
Shared tables, mobile drawer/header, forms, dialogs, payroll navigation and login now adapt to phone/tablet screens while keeping the V1 desktop layout. Real Chrome viewport/touch checks cover 320px and 390px portrait, 844px landscape, 768px tablet and 1440px desktop. See RESPONSIVE_UI.md for the verification scope and remaining physical-device review.

## Frontend/backend folder separation
The React project was moved into frontend/ (including its assets, tests, config and lockfile). The Express project remains in backend/; shared documentation and root convenience commands remain at the repository root. This is a directory reorganization, not a UI or business-rule change. See PROJECT_STRUCTURE.md.

## First free hosting preparation
The owner requested an initial free deployment. A single Render Free service plus the existing Atlas database is configured in render.yaml, with same-origin frontend/API serving and deployment regression tests. See DEPLOYMENT.md. Publishing and live verification require repository/Render access and Atlas networking; no live deployment is claimed at this stage.
