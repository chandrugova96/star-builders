# Frontend authentication and user integration

## Completed
- `/login` uses the shared V1 form controls and original logo for phone/password sign-in.
- Login calls POST `/api/auth/login`; the frontend then verifies GET `/api/auth/me` before mounting the workspace. It never uses the login response's role alone as an authorization check.
- A bearer token and its expiry are held in memory and localStorage, allowing tab/browser reopening until the existing token expires. Passwords and user lists are not saved in browser storage. A refresh revalidates the token through `/me`; an unavailable backend offers Retry or Sign Out without rendering private content.
- Tokens expire after the API's 1-day (24-hour) lifetime. Automatic expiration and API 401 responses clear the session and redirect to sign-in. Sign Out clears the saved token and synchronizes sign-out across open tabs and unmounts all workspace data. Re-login starts a fresh workspace instance; late API responses cannot restore a signed-out session.
- Browser sign-out removes the locally saved token, not server-side JWT revocation. A previously copied JWT may remain valid until expiry. Refresh tokens, cross-device logout and password-reset flows are not implemented.
- Sidebar name/role come from the authenticated API user, replacing the fixed Admin example label.
- Admin navigation preserves every existing V1 screen. Supervisor navigation offers Sites and Attendance only. Direct financial/user-management URLs redirect to the supervisor home route.
- Site/attendance APIs now enforce assignments. Supervisors see current assigned sites and can record attendance; wage/payment data is withheld by the API. See BACKEND_INTEGRATION.md.

## User management
- The user directory now loads all paginated GET `/api/users` results. It does not fall back to example users when the API is unavailable.
- Add User requires a digit-only phone number and initial password of 12–128 characters, matching the confirmed login scheme. Email remains optional. All writes use POST/PATCH `/api/users` and display the server's public response after success.
- Edit never posts password/passwordHash, siteIds or active fields; server validation remains authoritative. API error responses leave the form open for correction. Buttons guard duplicate submission.
- The current Admin's displayed profile updates after editing their own name/contact details. Self-demotion is rejected by the existing backend.
- Site assignment controls use the API user directory and Sites API. Business screens now load persisted records; fictional labels/records are not substituted when APIs fail. See BACKEND_INTEGRATION.md for financial transaction scope.

## Running locally
1. Keep MongoDB/JWT values in ignored `backend/.env`; the initial Admin already exists.
2. Run `npm run backend:dev` in one terminal.
3. Run `npm run dev` in another and open Vite's URL, then sign in with the existing Admin phone/password.

Both Vite dev and preview forward `/api` to `http://127.0.0.1:4000`. The frontend always calls the relative `/api` path; production hosting must reverse-proxy that path to the backend and serve `index.html` for frontend routes. Credentials must never be placed in Vite/public environment variables or source.

## Verification
The frontend suite includes jsdom interaction tests for deep-link sign-in, incorrect credentials, API-backed create/edit, digits-only phone input, rejected saves, logout, session restoration/retry, expired and invalid sessions, and supervisor isolation. Existing server-rendered route tests use an explicit test-only context fixture; the production app has no mock-login bypass. Real browser visual/end-to-end verification with the owner's Admin credentials remains manual; tests do not access the owner's Atlas data.

Verification result: 42 frontend tests passed; frontend and backend production builds passed. The 10 standard backend tests passed; the optional live MongoDB integration test was not enabled in this slice.

Persistent-session update: valid older sessionStorage sessions migrate to localStorage. New/changed sessions in another tab are revalidated through /me before rendering; sign-out clears other tabs via storage events. The backend token lifetime is now 1 day (24 hours), as requested by the product owner. Previously issued tokens keep their original expiry; sign in again to obtain a one-day token.
