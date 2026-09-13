# Mobile E2E

Browser smoke coverage lives in `tests/e2e/mobile-smoke.spec.ts`.

## Local Playwright

The default config runs landscape mobile emulation for:

- iPhone 15 / WebKit;
- Pixel 7 / Chromium.

It checks WebGL canvas boot, mobile HUD, virtual joystick pointer input, pause/settings persistence, `?perf=1` metrics, and portrait overflow.

Playwright is installed in CI with `--no-save`, so the existing lockfile and `npm ci` contract remain unchanged.

```bash
npm ci
npm install --no-save @playwright/test@1.63.0
npx playwright install chromium webkit
npm run test:e2e
```

`playwright.config.ts` builds the production bundle and starts `vite preview` automatically.

## BrowserStack real devices

`browserstack.yml` targets:

- Google Pixel 7 / Android 13 / Chrome;
- iPhone 15 Pro Max / iOS 17 / Safari.

Add repository secrets `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`, then manually run the **BrowserStack Mobile Smoke** GitHub Actions workflow. `browserstackLocal: true` exposes the production preview running on the GitHub runner to BrowserStack.

The remote run skips the trusted pointer-drag assertion; real-device smoke still validates WebGL boot, HUD, settings persistence, and runtime audit. Manual device acceptance should additionally cover camera drag, joystick feel, orientation changes, and `?perf=1` on the key vertical-slice states.

GitHub-hosted runners are not valid evidence for the 30 FPS device target; they only validate that the runtime and performance instrumentation work.
