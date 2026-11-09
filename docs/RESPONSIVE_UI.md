# Responsive V1 UI

## Completed changes
- Kept the existing desktop page layout, colors, cards and table presentation.
- All shared tables transform into labeled worker/transaction cards below 640px, using their actual column headings; no columns or financial figures are dropped. Tablet/desktop tables retain local horizontal scrolling when necessary.
- Phone page headings/actions stack, payroll week arrows fit narrow screens, and tabs stay scrollable when needed.
- Mobile/touch controls have at least 44px tap height; form text is 16px to avoid phone browser input zoom. Numeric fields remain controlled text inputs and phone numbers remain digits-only.
- The header hides the extra breadcrumb prefix on phones so the page name, mobile menu button and date fit together.
- The mobile sidebar has a scrollable navigation area, a stable account footer, dynamic viewport height and safe-area spacing. Opening it locks background scrolling; Escape, navigation and desktop resizing close it. Keyboard focus stays inside the open drawer.
- Shared dialogs fit the dynamic viewport, scroll internally and keep their heading/close control accessible on phones and touch tablets. Background scrolling is locked; focus is trapped and restored on close. Desktop dialog sizing is preserved.
- Login adapts to short/narrow viewports while retaining the accepted glass panel, image, logo and password eye.

## Actual browser verification
Playwright checks Chrome at 320×640, 390×844, 844×390 landscape, 768×1024 tablet and 1440×900 desktop. Tests cover every Admin page's width, mobile table presentation, drawer/account menu, attendance dialog, login, Supervisor isolation and partial payment dialog/interaction. API responses are intercepted with test-only records, and financial interactions use frontend example state; these tests never use the real Admin or Atlas data. Screenshots were inspected for narrow attendance, attendance dialog and desktop preservation.

Run:

```sh
npm test
npm run build
npm run test:responsive
```

`test:responsive` starts its own temporary Vite server on port 5187. It uses installed Google Chrome on macOS; set `PLAYWRIGHT_CHROME_EXECUTABLE` for a different Chrome executable. On machines without Chrome, install Playwright Chromium (`npx playwright install chromium`). Generated screenshots/traces are ignored under `frontend/test-results/`.

These are browser viewport/touch emulations, not physical iOS/Android device testing. Actual software-keyboard behavior still needs a device review. Supervisor Sites/Attendance are still the permitted empty access views pending server-side site assignment integration; responsive work does not add missing backend features.

Reference: [Playwright device emulation](https://playwright.dev/docs/emulation).

Verification result: all 47 existing frontend tests passed, the production build passed, and all 25 responsive browser checks passed (five scenarios at five viewport sizes).
