# Star Builders — completed frontend handoff

The product owner confirmed the frontend is ready and authorized backend development. Original V1 remains the visual source of truth. This document is the historical frontend acceptance record; [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) supersedes its in-memory behavior and unconfirmed financial assumptions. This records the changes completed during the frontend review, not production backend guarantees.

## Layout and shared components
- Preserved Dashboard, Sites, Labourers, Reports, sidebar, navigation, colors, cards and tables.
- Split screens into feature folders; extracted Button, Input, NumericInput, Select, DatePicker, FormField, Modal, Table, Badge, Card and accessible keyboard-operated Tabs.
- Installed React Router. Routes: /dashboard, /sites, /labourers, /attendance, /weekly-payroll, /advances, /payments, /reports and /settings. Root/unknown routes redirect to Dashboard. Navigation retains shared in-memory state; browser history and direct URLs use routing.
- Added the supplied frontend/public/star-builders-logo.jpg to the sidebar without editing the original image.
- Reduced the common top content gap to 12px on mobile and 16px on desktop.
- Removed the global prototype banner and visible Demo/Prototype/Sample labels. The user explicitly chose to keep all example records. Removing labels did not add persistence.

## Inputs and attendance
- Fixed labour search icon overlap with dedicated padding and centered icon.
- Numeric fields use controlled text inputs with numeric onChange validation; wheel/arrow operations no longer increment values. Amounts and overtime support decimal entry.
- Phone fields accept digits only, preserve leading zeros and use telephone keyboard hints. No final phone length/login-format policy was introduced.
- Standardized dropdown spacing, typography, chevrons, focus and disabled states in the shared Select component. Native menus remain native.
- Removed Attendance's duplicate All sites button; retained All sites in its dropdown. Date and Site filters have equal dimensions and align; they stack on mobile.
- Monday–Saturday remain usual working days. Sunday is optional and paid at the ordinary effective rate only for entered attendance. Weeks remain Monday–Sunday.
- Multiple sites, half-day plus overtime and the one-regular-day cap remain supported in the UI. Attendance affecting approved weeks is blocked locally.

## Weekly payroll and payments
- Added previous/next week navigation and independent pending/approved historical weeks. Removed the duplicate week dropdown and current-week shortcut at the user's request; arrows are the only week navigation controls.
- Payroll calculations filter the selected week and use effective work-date rates. Approvals snapshot earnings and advance recoveries in memory. Wage revisions affecting approved weeks are blocked locally.
- Approved rows open Pay / Details, supporting full/partial payments, multiple transactions, payment history, paid amounts, remaining balances and brought-forward approved salary.
- Payments remain attached to their original worker/week. Earlier unpaid weeks are explicitly selected for settlement; automatic oldest-week-first allocation was not assumed.
- Added local duplicate-request/overpayment guards and capped advance recovery/carry-forward. Ambiguous recovery chronology requests review. Oldest-advance-first and two-decimal previews remain prototype assumptions, not settled production accounting policy.
- Payments screen is history only; entry is inside Weekly Payroll.

## Users and settings
- Settings has User Management and Settings tabs. User Management is the default.
- One Add User action opens a role selector for Admin/Supervisor. User details can be edited; phone/email were optional in the frontend directory.
- Supervisor assignment was moved out of User Management to Sites. Existing cards have Assign; Add Site selects a Supervisor user or Unassigned. Cards read the shared assignment/name records. V1 displays one supervisor per site; one supervisor may cover several sites.
- Creating frontend users does not create logins. The frontend workspace is still the fixed Admin example view; there is no API authentication or authorization integration yet.

## Verification and remaining limits
28 frontend tests cover payroll calculations/guards, user validation/assignment and server-rendered routes/tab markup. npm test and npm run build passed at handoff. Browser visual/end-to-end verification has not been performed by the agent. Export buttons are placeholders. All frontend business state resets on refresh; it has not been migrated to MongoDB.

## Subsequent backend integration
This file records the original accepted frontend baseline. Authentication and user management have since been connected to MongoDB; phone and initial password are now required when creating login users. The fixed Admin display and example user directory have been replaced by authenticated/API users. See AUTH_INTEGRATION.md for current session behavior and Supervisor access restrictions. The remaining V1 business workflows have since been connected as well; runtime lists now use API records with no fallback or automatic import of examples. Automatic oldest-week-first payment allocation, paise rounding and chronological approval have now been confirmed by the owner.
