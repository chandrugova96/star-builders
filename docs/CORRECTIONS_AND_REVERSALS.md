# Payroll corrections and financial reversals

## How to use

- **Weekly Payroll → approved row → Pay / Details → Add correction:** choose Add missed salary or Deduct excess salary, enter a positive amount, original work date/site and reason. The original approved week remains unchanged. The signed correction settles in the first chronological week after the latest approved week. It appears in the original and settlement weeks' correction history.
- **Payments → Reverse:** enter a reason/date and confirm. The complete payment is reversed once, restoring each original payroll allocation to unpaid salary. The payment and reversal remain in history. Use for an incorrect entry or returned money; this action does not initiate a cash/bank transfer.
- **Advances → Reverse:** enter a reason/date and confirm. The outstanding portion stops being recovered. Amounts already recovered are returned through separate advance-refund adjustments in the next unapproved payroll. Original advance and approved recovery records remain unchanged.
- **Reports → Payroll Corrections:** export wage corrections and advance refunds, with original/settlement weeks, reasons and Pending/Approved status.

The product owner confirmed next-unapproved-week settlement for corrections and refunds of already-recovered advances. The owner also reported successfully testing the original attendance → advance → approval → partial-payment flow before this slice.

## Posting rules and limits

All actions are Admin-only, require a reason and UUID request key, and use the existing serialized MongoDB transaction. Retrying identical details replays the same result. Changing details with the same key is rejected. A unique (kind, sourceId) index prevents reversing a source twice, even using different request keys. Reversal dates must be between the source's date and today.

Corrections are signed deltas, not edits to attendance or salary history. They require an existing approved worker payroll and valid original site/work date. Negative corrections cannot exceed original earnings plus earlier wage corrections for that original payroll. Corrections participate in chronological approval; weeks containing only corrections/refunds can be approved, including for inactive workers. Future weeks cannot be approved early.

Ordinary wage corrections affect salary eligible for advance recovery. Advance refunds are excluded from recovery eligibility, so another advance cannot immediately consume the refund. Net salary = original attendance earnings + signed corrections/refunds − new advance recovery. Negative draft totals are displayed exactly; approval is blocked until there is sufficient valid salary or an offsetting correction. Automatic debt carry-forward or partial deduction of a negative correction is not implemented.

There are no delete/edit endpoints for corrections or reversals. Correct an erroneous wage adjustment by recording a separately reasoned opposite delta against the same original payroll. Reversals are full only; a mistaken amount can be fully reversed and then correctly re-entered. Reversing a reversal and partial advance/payment reversals are outside this slice. Payroll approval, not creation of a pending adjustment, commits its salary settlement.

Advance records retain historical issued/remaining counters. A separate reversal event removes the remaining balance from active recovery queries and the register shows zero currently recoverable balance. A refund entry is generated for each approved payroll that recovered the reversed advance, all targeted to one next unapproved week. Refunds change payable salary, not labour cost. Original payment documents/allocations likewise remain intact; only payroll settlement paid counters are restored on payment reversal.

## API

| POST path (under /api) | Body |
|---|---|
| /payroll/adjustments | labourId, originalWeek (Monday), originalDate, siteId, direction (Credit/Debit), amount (positive decimal string), reason, requestId |
| /payments/:id/reverse | date, reason, requestId |
| /advances/:id/reverse | date, reason, requestId |

Payroll responses add `adjustment` and `corrections`. Payment history adds Paid/Reversed status. Advance responses add Active/Reversed status and reversal/refund details. `/payroll/periods` includes pending correction-only weeks. GET `/reports/corrections.csv` provides the new register.

Salary CSV shows corrections separately from attendance earnings and recovery. Labour Cost CSV attributes wage deltas to original work dates/sites, includes their settlement week/status, and excludes advance refunds to avoid creating new expense. Payment CSV includes original positive payment events and negative reversal events; canonical negative amounts remain numeric, while spreadsheet formula content is escaped. Advance CSV distinguishes historical recovery, currently recoverable balance and scheduled refunds.

## Data and deployment

New Mongoose models: PayrollAdjustment and FinancialReversal. Payroll snapshots add adjustmentPaise and embedded adjustment references/amounts/reasons; existing payrolls default to zero corrections. No historical earnings, rates, advances or payments are rewritten and no owner database records were used for automated verification. Restart the API so startup creates the new collections/indexes before posting these operations.

## Files changed in this slice

- Backend: `src/domain/models.ts`, `values.ts`; `features/payroll/adjustments.ts`, `payroll.routes.ts`, `payroll.service.ts`; `features/payments/payment.routes.ts`, `advances/advance.routes.ts`, `reports/report.routes.ts`.
- Frontend: `features/payroll/CorrectionForm.tsx`, `WeeklyPayroll.tsx`, `usePayroll.ts`; `features/finance/ReversalDialog.tsx`; `features/payments/Payments.tsx`, `advances/Advances.tsx`, `reports/Reports.tsx`; `features/workspace/useBusinessData.ts`, `routes/AppRoutes.tsx`, `utils/format.ts`.
- Tests: `backend/tests/corrections.integration.test.ts`, `business.test.ts`, `business.integration.test.ts`; `frontend/tests/auth.test.mjs`, `format.test.mjs`, `fixtures/business.mjs`; `frontend/e2e/responsive.spec.ts`.
- Documentation: this handoff plus requirements, business rules, database design, development plan, backend integration notes and both READMEs.

## Verification

55 frontend tests, 16 backend tests (all three real database scenarios enabled) and 35 Chrome browser checks passed; both production builds passed. Database verification uses a temporary local replica set, never the application's Atlas URI. Tests cover immutable snapshots, inactive-worker/correction-only weeks, signed fractional amounts, negative approval rejection, full/partial-recovery refunds, multi-week refunds, duplicate/concurrent reversals, allocation rollback on ledger mismatch, case-normalized identifiers, supervisor denial and updated CSV output. Browser tests cover the correction and both reversal dialogs at five viewport sizes using test APIs.
