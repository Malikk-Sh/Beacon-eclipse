import { expect, test, type Locator, type Page } from '@playwright/test';

const browserStackRun = process.env.BROWSERSTACK_RUN === '1';

type CanvasDiagnostics = {
  innerWidth: number;
  innerHeight: number;
  dpr: number;
  cssWidth: number;
  cssHeight: number;
  bufferWidth: number;
  bufferHeight: number;
  rectWidth: number;
  rectHeight: number;
  hasWebGL2: boolean;
};

async function readCanvasDiagnostics(canvas: Locator): Promise<CanvasDiagnostics> {
  return canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const rect = canvasElement.getBoundingClientRect();
    return {
      innerWidth,
      innerHeight,
      dpr: devicePixelRatio,
      cssWidth: canvasElement.clientWidth,
      cssHeight: canvasElement.clientHeight,
      bufferWidth: canvasElement.width,
      bufferHeight: canvasElement.height,
      rectWidth: rect.width,
      rectHeight: rect.height,
      hasWebGL2: Boolean(canvasElement.getContext('webgl2')),
    };
  });
}

async function waitForGame(page: Page) {
  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();

  try {
    await expect.poll(async () => {
      const diagnostics = await readCanvasDiagnostics(canvas);
      return diagnostics.bufferWidth > 0
        && diagnostics.bufferHeight > 0
        && diagnostics.cssWidth > 0
        && diagnostics.cssHeight > 0;
    }, { timeout: 30_000 }).toBe(true);
  } catch (error) {
    const diagnostics = await readCanvasDiagnostics(canvas);
    console.log(`[mobile-e2e] canvas diagnostics: ${JSON.stringify(diagnostics)}`);
    throw error;
  }

  return canvas;
}

test('mobile WebGL smoke journey', async ({ page, context, browserName }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  let canvas = await waitForGame(page);

  await test.step('boot WebGL scene and mobile HUD', async () => {
    await expect(page.locator('#joystick')).toBeVisible();
    await expect(page.locator('#soykaButton')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
    await expect(page.locator('#objective')).toContainText('НАЙТИ АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ');

    const dimensions = await readCanvasDiagnostics(canvas);
    expect(dimensions.cssWidth).toBeGreaterThan(300);
    expect(dimensions.cssHeight).toBeGreaterThan(200);
    expect(dimensions.bufferWidth).toBeGreaterThan(0);
    expect(dimensions.bufferHeight).toBeGreaterThan(0);
    expect(dimensions.hasWebGL2).toBe(true);
  });

  if (!browserStackRun) {
    await test.step('joystick responds to trusted mobile pointer drag', async () => {
      const joystick = page.locator('#joystick');
      const stick = page.locator('#stick');
      const box = await joystick.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const targetX = centerX + box.width * 0.22;
      const targetY = centerY - box.height * 0.12;

      if (browserName === 'chromium') {
        // Chromium's mobile emulation suppresses Playwright mouse input for a touch-first
        // page. CDP touch injection produces trusted touch/pointer events, matching the
        // PointerEvent path used by InputController on a real Android device.
        const cdp = await context.newCDPSession(page);
        const touchPoint = (x: number, y: number) => ({
          x,
          y,
          radiusX: 1,
          radiusY: 1,
          force: 1,
        });

        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [touchPoint(centerX, centerY)],
        });
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [touchPoint(targetX, targetY)],
        });

        await expect.poll(
          async () => stick.evaluate((element) => (element as HTMLElement).style.transform),
          { timeout: 5_000 },
        ).not.toBe('translate(0px, 0px)');

        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        });
        await cdp.detach();
      } else {
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(targetX, targetY, { steps: 4 });

        await expect.poll(
          async () => stick.evaluate((element) => (element as HTMLElement).style.transform),
          { timeout: 5_000 },
        ).not.toBe('translate(0px, 0px)');

        await page.mouse.up();
      }

      await expect.poll(
        async () => stick.evaluate((element) => (element as HTMLElement).style.transform),
        { timeout: 5_000 },
      ).toBe('translate(0px, 0px)');
    });
  }

  await test.step('pause settings persist graphics quality', async () => {
    await page.getByRole('button', { name: 'Пауза' }).click();
    await expect(page.getByRole('dialog', { name: 'Пауза и настройки' })).toBeVisible();

    const quality = page.locator('#qualitySelect');
    await quality.selectOption('low');
    await expect(quality).toHaveValue('low');
    await page.getByRole('button', { name: 'ПРОДОЛЖИТЬ' }).click();

    await page.reload({ waitUntil: 'domcontentloaded' });
    canvas = await waitForGame(page);
    await page.getByRole('button', { name: 'Пауза' }).click();
    await expect(page.locator('#qualitySelect')).toHaveValue('low');
    await page.getByRole('button', { name: 'ПРОДОЛЖИТЬ' }).click();
  });

  await test.step('runtime audit exposes viewport and canvas metrics', async () => {
    const audit = page.locator('[data-runtime-performance="true"]');
    await expect(audit).toBeVisible();
    await expect(audit).toContainText('RUNTIME AUDIT');
    await expect(audit).toContainText('FPS avg');
    await expect(audit).toContainText('viewport');
    await expect(audit).toContainText('canvas CSS');
    await expect(audit).toContainText('effective pixel ratio');

    const text = await audit.textContent();
    expect(text).toMatch(/FPS avg \d+(?:\.\d+)?/);
    expect(text).toMatch(/viewport \d+x\d+/);
    expect(text).toMatch(/canvas CSS \d+x\d+\s+\|\s+buffer \d+x\d+/);
  });

  if (!browserStackRun) {
    await test.step('portrait viewport stays inside the page', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(async () => canvas.evaluate((element) => ({
        width: (element as HTMLCanvasElement).clientWidth,
        height: (element as HTMLCanvasElement).clientHeight,
      }))).toEqual({ width: 390, height: 844 });

      const layout = await page.evaluate(() => ({
        innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
      await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
    });
  }

  if (consoleErrors.length > 0) {
    console.log(`[mobile-e2e] browser console errors: ${JSON.stringify(consoleErrors)}`);
  }
  expect(pageErrors).toEqual([]);
});
