# Business API integration

## Completed scope

The product owner authorized connecting the remaining V1 modules after authentication/user management. Sites, assignments, labourers, wage history, attendance, advances, weekly payroll, salary payments, dashboard and CSV exports now use MongoDB-backed APIs. Business state reloads from the API after mutations and browser refresh; errors show retry rather than substituting examples. Existing screens, shared controls and responsive layouts are retained.

No existing Atlas business records were seeded, imported or altered by automated verification. Tests use fictional records in generated local databases. Start/restart the API to initialize business collections/indexes; an empty database displays empty lists.

## Confirmed accounting decisions

- Money is stored as safe integer paise. Request/response money values are decimal strings; financial calculations use BigInt intermediates with explicit supported-range checks.
- Overtime is daily wage / 8 × hours, rounded half-up to the nearest paise per site entry. A fractional-paise half-day wage is also rounded half-up. No daily overtime cap is imposed yet. Ordinary units remain 0, 0.5 or 1, totalling at most 1 across sites.
- Monday–Sunday weeks; Sunday adds ordinary-rate earnings only when attendance is entered. Explicit zero-unit records remain distinct from missing attendance. Future attendance, advances and payment dates are rejected.
- Older pending attendance weeks must be approved first. A new historical approval behind an already-approved later week is rejected for correction review.
- Approval commits rate/earnings snapshots and recovers oldest eligible outstanding advances first, capped at gross earnings. Remaining advances carry forward. Advances entered after approval never reopen that approval.
- Payments settle oldest unpaid approved weeks first, through the week selected in the UI. Carried balances remain attributed to original payrolls and site earnings; they never become new earnings.

## HTTP contract

All paths below start with `/api`; bearer authentication is required. Dates are `YYYY-MM-DD` in the Asia/Kolkata business calendar. Week parameters must be Mondays. IDs are MongoDB IDs.

| Method and path | Access and body/result |
|---|---|
| GET /sites | Admin all sites; Supervisor currently assigned sites, budget omitted |
| POST /sites | Admin: name, location?, budget?, supervisorId? |
| PATCH /sites/:id/supervisor | Admin: supervisorId or null; assignment history retained |
| GET /labourers | Admin full details/history; Supervisor active name/category picker only when assigned a site |
| POST /labourers | Admin: name, phone?, category, rate, from |
| POST /labourers/:id/rates | Admin: rate, from; unique effective dates; approved periods protected |
| GET /attendance?date=... | Assigned-site filtering; Supervisor receives no rates/earnings |
| POST /attendance | labourId, siteId, date, units (number), ot (decimal string); replaces the same worker/date/site allocation |
| GET /advances | Admin: issued/recovered/remaining register |
| POST /advances | Admin: labourId, date, amount, requestId |
| GET /payroll/periods | Admin: weeks discovered from attendance and posted periods |
| GET /payroll?week=... | Admin: calculated draft or approved snapshot, prior balances and allocation history |
| POST /payroll/approve | Admin: week, requestId |
| GET /payments | Admin: payment ledger and original-week allocations |
| POST /payments | Admin: labourId, throughWeek, date, amount, mode (Cash/UPI/Bank), requestId |
| GET /reports/dashboard | Admin: current counts and today's labour cost |
| GET /reports/:kind.csv | Admin: attendance, labour-cost, salary, advances, payments, rates or corrections |

Approval, advance and payment `requestId` values are UUIDs. A receipt stores a fingerprint of parsed request details plus actor in the same transaction as the posting. Replaying identical details returns the original result; changing details with the same key returns 409. Frontend requests retain their key while retrying an open form; there is no durable offline submission queue.

## Consistency and permissions

Business mutations acquire a singleton posting gate inside a MongoDB snapshot transaction with majority write concern. This serializes attendance, rate revisions, assignments, approval, advances and payments across API instances. Concurrent requests cannot exceed daily units, recover the same advance twice or pay more than the unpaid balance. Posting receipts, audit events, snapshots and ledger changes commit together. A standalone MongoDB server cannot provide these guarantees and business writes return an error instead of falling back to unsafe saves.

This broad gate is deliberately simple for the initial workload; it limits write throughput and needs profiling before larger deployments. Auth/user creation and edits retain their existing non-financial implementation. Every HTTP request reloads the active user's role; there is no JWT revocation mechanism or transaction-wide serialization with user-role changes. Site access is rechecked inside attendance writes. Reads are current views, not a single cross-module database snapshot; stale UI requests are revalidated on posting.

There is no worker-to-site roster in the accepted UI/data model. A Supervisor with an assigned site can choose any active contractor worker by name/category, while attendance reads/writes remain site-scoped. Worker phone, wage history, earnings, advances and payroll are omitted or forbidden server-side.

## Remaining scope

- Audited correction/adjustment posting and full payment/advance reversals are now implemented. See CORRECTIONS_AND_REVERSALS.md. Approved attendance/rate changes still require separate adjustments; direct edits are rejected. Partial reversals and negative-payroll debt carry-forward remain outside this slice.
- Site metadata/status editing, worker deactivation and category administration have no new UI workflows in this integration. Category options and general Settings information remain static.
- Wage revisions are conservatively rejected if their effective date reaches any existing approved worker payroll period, including zero-earning rows. Separate signed corrections now provide the correction workflow; the original wage-history protection remains conservative.
- No production deployment, backup/restore rehearsal, load testing, verified-phone onboarding or password reset was performed. Collection/index creation currently runs at startup; controlled migrations are future deployment work.
- CSV exports contain the real rows and money, with spreadsheet-formula escaping. Labour Cost currently exports site/date allocations, not an aggregated analytical chart or PDF.

## Verification

55 frontend tests, 16 backend tests (including all three real MongoDB integration scenarios), and 35 Chrome browser checks passed. Both production builds passed. Browser checks cover five phone/tablet/desktop viewports and a partial-payroll-payment interaction using intercepted APIs; database tests separately exercise actual transactions. No test logs in to the owner's account or uses the configured Atlas URI.

The replica-set test covers split/concurrent attendance, assignment isolation/reassignment, Supervisor financial privacy, effective wage changes, optional Sunday/zero attendance, chronological approval, recovery caps/carry-forward, approval immutability, idempotent retries, concurrent overpayment prevention, allocation history, audit events and CSV output.

## Main changed files

- Backend wiring: `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/middleware/errors.ts`.
- Backend models/money/posting: `backend/src/domain/models.ts`, `values.ts`, `posting.ts`.
- Backend feature routes: `backend/src/features/sites/site.routes.ts`, `labour/labour.routes.ts`, `attendance/attendance.routes.ts`, `payroll/payroll.routes.ts`, `payroll/payroll.service.ts`, `advances/advance.routes.ts`, `payments/payment.routes.ts`, `reports/report.routes.ts`.
- Frontend orchestration: `frontend/src/hooks/useApplication.ts` replaces `useDemoApp.ts`; `frontend/src/features/workspace/useBusinessData.ts`; `frontend/src/features/payroll/usePayroll.ts`.
- Frontend screens/wiring: `frontend/src/App.tsx`, `routes/AppRoutes.tsx`, `components/FeatureDialogs.tsx`, `components/layout/Header.tsx`, feature screens for Dashboard, Sites, Labourers, Attendance, Advances, Payments, Reports, Settings and WeeklyPayroll, and `features/settings/useUsers.ts`.
- API/display support: `frontend/src/services/api.ts`, `types/index.ts`, `utils/dates.ts`, `utils/format.ts`.
- Verification: `backend/tests/business.test.ts`, `business.integration.test.ts`, `run-replica-tests.mjs`; `frontend/tests/auth.test.mjs`, `router.test.mjs`, `fixtures/business.mjs`; `frontend/e2e/responsive.spec.ts`; root `package.json` integration-test command.
- Documentation: READMEs and requirements/business/database/development/authentication/frontend handoff documents updated for this slice.

## Subsequent correction and reversal slice
Admin payroll corrections, full payment/advance reversals, immutable event history and revised CSV exports are completed. Settlement policies were explicitly confirmed by the owner. See [CORRECTIONS_AND_REVERSALS.md](CORRECTIONS_AND_REVERSALS.md) for the additional endpoints, exact accounting behavior and complete changed-file list.
