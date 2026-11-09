# MongoDB data model — proposed design and implementation status

## Implemented physical model

Authentication uses `users` with fixed ADMIN/SUPERVISOR role codes. Business integration now implements these Mongoose models (Mongoose derives physical collection names):

- Site: unique siteCode, name/location/status, budgetPaise, current supervisorId, embedded assignment history.
- Labourer: unique labourCode, name/phone/category/status and embedded effective-dated salaryHistory. Unique dates and approved-period protection are enforced transactionally; rate end is implied by the next start date.
- AttendanceDay: unique (labourId,date), embedded per-site allocations with integer halves (0/1/2), decimal-string overtime and updater. Transactional replacement and a global day cap prevent duplicate site allocations/overlapping regular days.
- PayrollPeriod: unique Monday start, Sunday end, approval status/actor/time.
- Payroll: unique (week,labourId), integer-paise totals, immutable embedded attendance/rate/earnings items and advance recoveries, plus a settlement paidPaise counter. Only settlement changes after approval. New snapshots also retain signed adjustmentPaise and embedded correction references/amounts/reasons; existing snapshots default to zero.
- LabourAdvance: issued amount, remaining balance, date and creator; recovery ledger is embedded in approved Payroll documents.
- Payment: immutable issued payment and embedded original-payroll allocations, date/mode/actor. No edit/delete endpoints exist. Full reversal events retain the original payment and restore payroll settlement counters.
- PayrollAdjustment: original payroll/week/work date/site, next settlementWeek, WAGE/ADVANCE_REFUND kind, signed integer amountPaise, reason/actor and optional sourceReversalId.
- FinancialReversal: Payment/Advance kind, sourceId, labourId, amount/date/reason/actor and refund details; unique (kind,sourceId) prevents repeated reversal.
- PostingReceipt: unique operation/request key, body/actor fingerprint and original result. Stored atomically with financial posting.
- PostingGate: singleton version counter serializes all business writes inside transactions.
- AuditLog: actor/action/entity/details/timestamps for business mutations.

Money uses integer paise within JavaScript's safe-integer range; BigInt intermediate arithmetic and explicit range checks avoid unsafe float calculations. Decimal money strings cross the API. MongoDB replica-set transactions, snapshot reads and majority writes are required. No Atlas data migration/seeding was run. See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md).

## Target logical model (future normalization/extensions)

The list below remains the logical target. Several subrecords are currently embedded as described above. Separate roles/categories remain future work. Adjustment and reversal collections are now implemented as described above.
Use Mongoose schemas and indexes, MongoDB transactions for financial posting where supported, application/service validation for cross-document invariants, and immutable posted ledger events. Use integer paise or Decimal128 consistently for money; avoid JS floating-point for authoritative calculations. Store calendar work/effective dates with explicit Asia/Kolkata interpretation; timestamps in UTC.

## Collections
- `users`: _id, name, email?, phone?, passwordHash, roleId, active, timestamps; unique verified login identifier.
- `roles`: _id, code (ADMIN/SUPERVISOR), permissions.
- `sites`: _id, siteCode unique, name, clientName?, location, startDate, expectedEndDate?, actualEndDate?, status, timestamps.
- `userSiteAssignments`: _id, userId, siteId, assignedFrom, assignedTo?; index userId/siteId.
- `labourCategories`: _id, name, active.
- `labourers`: _id, labourCode unique, fullName, phone?, categoryId, joiningDate, leavingDate?, status, notes?, timestamps.
- `labourSalaryHistory`: _id, labourId, dailyRate, effectiveFrom, effectiveTo?, reason?, changedBy, createdAt; indexed by labourId/effectiveFrom; service+transaction enforce no overlapping date ranges.
- `attendanceDays`: _id, labourId, workDate, totalDayUnits, status, createdBy, updatedBy, timestamps; unique compound (labourId, workDate).
- `attendanceAllocations`: _id, attendanceDayId, siteId, dayUnits, overtimeHours, notes?; unique (attendanceDayId, siteId); cross-document total units validation.
- `payrollPeriods`: _id, startDate (Monday), endDate (Sunday), status; unique startDate; no overlapping periods.
- `payrolls`: _id, periodId, labourId, grossAmount, advanceRecovery, netAmount, status, approvedBy?, approvedAt?, timestamps; unique (periodId, labourId).
- `payrollItems`: _id, payrollId, attendanceAllocationId?, workDate, siteId, dayUnits, dailyRateSnapshot, overtimeHours, regularAmount, overtimeAmount, totalAmount; immutable after approval.
- `labourAdvances`: _id, labourId, amount, advanceDate, status, createdBy, notes?, timestamps; issue/void events auditable.
- `advanceRecoveries`: _id, advanceId, payrollId, amount, status; committed only on approval; indexes by advanceId/payrollId.
- `payments`: _id, labourId, amount, paymentDate, mode (CASH/UPI/BANK), referenceNo?, status, idempotencyKey unique, createdBy, timestamps; reversal entries/event history.
- `paymentAllocations`: _id, paymentId, payrollId, amount; allocate to original weeks, never duplicate prior-week earnings.
- `payrollAdjustments`: _id, labourId, originalPayrollId, originalWorkDate?, siteId?, settlementPeriodId, signedAmount, reason, approvedBy, approvedAt.
- `auditLogs`: _id, entityType, entityId, action, before?, after?, actorId, createdAt.

## Indexes / invariants
- Unique labourCode, siteCode, payroll period start, (labourId, workDate), (attendanceDayId, siteId), (periodId, labourId), payment idempotency key.
- Daily allocation units total exactly matches attendanceDays.totalDayUnits; ordinary units max 1. Overtime >= 0.
- No overlapping salary rate periods for a labourer; MongoDB cannot enforce interval exclusion with a simple unique index, so use transactional service validation.
- Payroll approval locks earnings/rate snapshots; corrections use adjustments.
- Advance recovery cannot exceed outstanding advance or eligible earnings; payment allocations cannot exceed posted payment or unpaid payroll balances.
- Distinguish prior-week balance brought forward (view) from current-week earnings (ledger).
- Supervisor authorization enforced on backend per site, not just frontend.

## Notes
The earlier PostgreSQL proposal is superseded by MongoDB per product owner. The collection list remains the target logical design. Backend business APIs and transactional ledgers are now implemented as described above. Correction/full-reversal workflows are now implemented. Controlled deployment migrations remain pending. See CORRECTIONS_AND_REVERSALS.md.
