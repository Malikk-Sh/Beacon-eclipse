# Mobile E2E

Browser smoke coverage lives in `tests/e2e/mobile-smoke.spec.ts`.

## Local Playwright

The default config runs landscape mobile emulation for:

- iPhone 15 / WebKit;
- Pixel 7 / Chromium.

It checks WebGL canvas boot, mobile HUD, trusted touch/pointer input on the virtual joystick, pause/settings persistence, `?perf=1` metrics, and portrait overflow.

Playwright is installed in CI with `--no-save`, so the existing lockfile and `npm ci` contract remain unchanged.

```bash
npm ci
npm install --no-save @playwright/test@1.63.0
npx playwright install chromium webkit
npm run test:e2e
```

`playwright.config.ts` builds the production bundle and starts `vite preview` automatically.

The joystick check intentionally uses Playwright's supported `touchscreen.tap()` API at an offset point inside the control and probes the resulting trusted `pointerdown`/`pointerup`. Playwright currently exposes tap for touchscreen input but not native low-level touch drag primitives, so full drag feel remains a real-device acceptance check.

## BrowserStack real devices

`browserstack.yml` targets:

- Google Pixel 7 / Android 13 / Chrome in landscape;
- iPhone 15 Pro Max / iOS 17 / Safari.

Add repository secrets `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`, then manually run the **BrowserStack Mobile Smoke** GitHub Actions workflow. `browserstackLocal: true` exposes the production preview running on the GitHub runner to BrowserStack.

The BrowserStack workflow installs `@playwright/test@1.59.1` because BrowserStack currently lists the 1.59 line as supporting both Android and iOS real-device Playwright runs. Local emulation CI can remain on the newer Playwright version independently.

The remote run skips the joystick touch probe; real-device smoke still validates WebGL boot, HUD, settings persistence, and runtime audit. Manual device acceptance should additionally cover camera drag, joystick drag feel, orientation changes, and `?perf=1` on the key vertical-slice states. Android is forced to landscape in BrowserStack; BrowserStack's documented Playwright orientation capability is Android-only, so iPhone landscape rotation remains part of manual acceptance.

GitHub-hosted runners are not valid evidence for the 30 FPS device target; they only validate that the runtime and performance instrumentation work.
