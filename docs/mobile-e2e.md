# Mobile E2E

Browser smoke coverage lives in `tests/e2e/mobile-smoke.spec.ts`.

## Local Playwright

The default config runs landscape mobile emulation for:

- iPhone 15 / WebKit;
- Pixel 7 / Chromium.

It checks WebGL canvas boot, entering the title screen, mobile HUD and jump control, trusted touch/pointer input on the virtual joystick, pause/settings persistence, `?perf=1` metrics, and portrait overflow. A second journey resumes an old save from the void, checks the repaired position and preserved narrative choices, then uses the pause recovery action.

Playwright 1.63.0 is pinned in package.json and the lockfile; npm ci installs the runner without an extra dependency resolution step.

```bash
npm ci
npx playwright install chromium webkit
npm run test:e2e
```

`playwright.config.ts` builds the production bundle and starts `vite preview` automatically.

The joystick check intentionally uses Playwright's supported `touchscreen.tap()` API at an offset point inside the control and probes the resulting trusted `pointerdown`/`pointerup`. Playwright currently exposes tap for touchscreen input but not native low-level touch drag primitives, so full drag feel remains a real-device acceptance check.

## CI execution and evidence reuse

Chromium's software WebGL made the previous single-runner suite take roughly 14 minutes; push and PR repeated the entire run. The new matrix assigns five Chromium shards to separate runners and all WebKit scenarios to one runner, with one worker per runner. `fullyParallel` enables test-level sharding even though the scenarios share one file. New scenarios are automatically distributed; no grep list can silently omit them.

Traces and video are recorded on the first retry, avoiding recording successful software-rendered frames. Failure screenshots and explicit visual-journey screenshots remain. The 240-second per-test timeout, assertions, both browsers and one CI retry are retained. Each shard uploads its own report. Browser installation is restricted to that shard's browser.

The evidence job compares the checked-out integration tree with the feature commit's entire tree, then verifies a completed successful push run less than 24 hours old. All six named browser jobs and their scenario steps must have actually succeeded. It never reuses a previous skip, a fork run, a cancelled/running run, partial job results or evidence from a different tree. PR merge-tree changes therefore force a full run. A main push additionally requires the exact associated merged PR. API errors fall back to running the browsers.

`mobile-smoke` remains the stable final gate and fails unless fresh browser work succeeds or exact coverage has been verified. Push and PR workflows must finish before merging. `workflow_dispatch` always forces a full browser run. Quick unit tests and the production build still run freshly for push, PR and main.

Locally, run `npm test` and `npm run build` once after a coherent change. During implementation run only the affected test file when investigating a specific regression. Use CI for the complete browser matrix; repeat broad checks only after a failure or a relevant source change. Device FPS, subjective sound and visual composition need real-device/browser acceptance separately.

References: [Playwright sharding](https://playwright.dev/docs/test-sharding), [workflow run API](https://docs.github.com/en/rest/actions/workflow-runs).

## BrowserStack real devices

`browserstack.yml` targets:

- Google Pixel 7 / Android 13 / Chrome in landscape;
- iPhone 15 Pro Max / iOS 17 / Safari.

Add repository secrets `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`, then manually run the **BrowserStack Mobile Smoke** GitHub Actions workflow. `browserstackLocal: true` exposes the production preview running on the GitHub runner to BrowserStack.

The BrowserStack workflow installs `@playwright/test@1.59.1` because BrowserStack currently lists the 1.59 line as supporting both Android and iOS real-device Playwright runs. Local emulation CI can remain on the newer Playwright version independently.

The remote run skips the joystick touch probe; real-device smoke still validates WebGL boot, HUD, settings persistence, and runtime audit. Manual device acceptance should additionally cover camera drag, joystick drag feel, orientation changes, and `?perf=1` on the key vertical-slice states. Android is forced to landscape in BrowserStack; BrowserStack's documented Playwright orientation capability is Android-only, so iPhone landscape rotation remains part of manual acceptance.

GitHub-hosted runners are not valid evidence for the 30 FPS device target; they only validate that the runtime and performance instrumentation work.
