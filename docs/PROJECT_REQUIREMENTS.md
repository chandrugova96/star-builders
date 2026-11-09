# Star Builders — Project requirements v1.0

## Product
Responsive construction contractor management web app for sites, direct labourers, attendance, effective-dated daily wages, weekly payroll, advances, partial payments, and reporting. Business name: Star Builders.

## Stack
- React + Vite + TypeScript
- Tailwind CSS; reusable UI primitives and feature-based folders
- Backend: Node.js + Express + TypeScript (business APIs connected)
- Database: MongoDB + Mongoose (business persistence implemented)
- JWT-based auth with roles; phone number + password confirmed for Admin and Supervisor
- Free-tier deployment initially; provider selection and limitations TBD

## Users
- Admin: all sites, labour, salary rates, attendance, advances, payroll approval, payments, reports, users.
- Supervisor: assigned sites and relevant labour, attendance creation/correction before payroll approval; no salary/payment access by default.

## Modules
Dashboard, Sites, Labourers, Attendance, Weekly Payroll (including payment entry), Advances, Reports, Settings/User Management. A standalone Payments view, if retained, is history/reporting only; users should not have to switch screens to pay payroll.

## UI preservation
Original V1 design is preferred for Dashboard, Sites, Labourers, Reports, sidebar and general layout. Previous V2 redesign was rejected. Only requested functional changes may alter UI, minimally.

## Delivery
The product owner confirmed the frontend is ready and authorized starting backend development. See FRONTEND_HANDOFF.md for the accepted frontend changes and DEVELOPMENT_PLAN.md for the staged backend work. Authentication, user management and the existing business workflows are API-connected. Records persist in MongoDB; no sample records are automatically imported. See BACKEND_INTEGRATION.md for current guarantees, verification and remaining administration/deployment work. Audited payroll corrections and full financial reversals are now connected; see CORRECTIONS_AND_REVERSALS.md.
