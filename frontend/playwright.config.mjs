import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || (existsSync(localChrome) ? localChrome : undefined);
export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    workers: 2,
    reporter: 'list',
    use: {baseURL: 'http://127.0.0.1:5187', browserName: 'chromium', launchOptions: {executablePath}, trace: 'retain-on-failure', screenshot: 'only-on-failure'},
    webServer: {command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort', url: 'http://127.0.0.1:5187', reuseExistingServer: false},
    projects: [
        {name: 'phone-small', use: {viewport: {width: 320, height: 640}, isMobile: true, hasTouch: true}},
        {name: 'phone', use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}},
        {name: 'phone-landscape', use: {viewport: {width: 844, height: 390}, isMobile: true, hasTouch: true}},
        {name: 'tablet', use: {viewport: {width: 768, height: 1024}, hasTouch: true}},
        {name: 'desktop', use: {viewport: {width: 1440, height: 900}}},
    ],
});
