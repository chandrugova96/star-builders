# Confirmed business rules

1. Labourers are directly hired; daily wage only; one daily rate per labourer across sites.
2. Weekly payroll periods run Monday through Sunday. Typical working days Monday–Saturday; Sunday optional, paid at ordinary daily rate if worked. No automatic Sunday attendance.
3. Attendance supports full day (1 unit), half day (0.5 unit), and overtime. Overtime allowed with half-day attendance. Normal daily allocation across sites max 1 unit; overtime separate.
4. Overtime hourly amount = effective daily rate / 8, multiplied by overtime hours; round half-up to the nearest paise for each site entry. The owner confirmed no overtime hour limit yet.
5. Same labourer may work at multiple sites on same day; allocate day units and overtime to sites without double-paying.
6. Admin and assigned supervisors may record attendance and edit past dates until that week's payroll is approved. Missing attendance is NOT equivalent to absent.
7. Historical daily wage changes are effective-dated, including midweek changes. Old workdays use their original effective rates. Approved payroll lines snapshot the applied rate.
8. Only admin approves payroll. Old unapproved weeks must remain visible and approvable; approved payroll cannot be silently changed. Retroactive changes to approved weeks become audited adjustments.
9. Advances can be issued any day. Automatically recover against next eligible unapproved weekly payroll; if issued after approval, do not reopen the approved payroll. Recover no more than available eligible earnings; carry remaining advance forward. Recover oldest eligible advances first; approve older pending attendance weeks before later weeks. The owner explicitly confirmed chronological approval.
10. Partial and multiple salary payments allowed; payment entry belongs inside Weekly Payroll. Payment history, outstanding balance, and prevention of duplicate/over payments required. Server-side transactional limits and idempotency now enforce these guarantees.
11. Unpaid salary from previous weeks must automatically appear in next week's total payable display, BUT remains attributed to the original payroll week and original site expense. Do not double count earnings. The owner confirmed automatic oldest-unpaid-week-first allocation; a payment settles approved weeks through the selected week.
12. Separate earned salary, advance recovery, payable amount, actual payments and outstanding balances.
13. Salary on Sunday uses normal daily rate. Payroll still closes on Sunday.

## Important edge cases
- Midweek rate revision, backdated rate revision, salary reduction.
- Multiple supervisors entering same worker on different sites simultaneously.
- Half-day + overtime; absent/missing day; no Sunday work.
- Advance greater than earnings; advance after approval; multiple advances.
- Payroll generation retried; payment request retried; payment reversal.
- Partial payment; prior-week carry-forward; historical correction after approval.
- Worker inactive but financial history remains.

## Open policies (do not assume silently)
- Whether Sunday requires explicit supervisor approval.
- How to handle confirmed absence vs missing attendance and optional zero-unit records.

## Authentication decision confirmed at backend start
Admin and Supervisor log in with phone number + password. Existing frontend phone entry is digits-only; verification/onboarding, recovery and exact phone length/country formatting remain to be specified. This does not change salary, payroll, attendance or payment rules.

The product owner set login token expiry to 1 day (24 hours). Newly issued tokens use this lifetime; existing tokens are not extended retroactively.

## Backend integration status
These confirmed rules now govern the connected business APIs. Historical approvals behind later approved weeks are rejected for correction review. Audited correction and full payment/advance reversal workflows are now implemented; approved earnings cannot be edited through the API. The owner confirmed that corrections settle in an unapproved week and already-recovered advances are returned there when reversed. See CORRECTIONS_AND_REVERSALS.md for safeguards and current limits. See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) for the implemented contract and limits.

## Correction and reversal decisions
- Approved payroll remains immutable. Corrections settle as separate signed entries in the next unapproved week.
- Reversing an advance stops future deductions and returns already-recovered salary via that unapproved payroll.
- Payment reversals retain the original transaction and restore its original weekly unpaid allocations. All corrections/reversals require an Admin and reason.
- Implementation safeguards: no duplicate reversals; no negative approved net salary; no deduction exceeding original earnings plus earlier wage corrections. Advance refunds are excluded from further advance recovery. See CORRECTIONS_AND_REVERSALS.md for exact settlement behavior.
