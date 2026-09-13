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

type JoystickProbe = {
  pointerDowns: number;
  pointerUps: number;
  trusted: boolean;
  pointerType: string;
  transformOnDown: string;
  transformOnUp: string;
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

test('mobile WebGL smoke journey', async ({ page }) => {
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
    await test.step('joystick receives trusted touch pointer input', async () => {
      const joystick = page.locator('#joystick');
      const box = await joystick.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      const targetX = box.x + box.width * 0.72;
      const targetY = box.y + box.height * 0.38;

      await page.evaluate(() => {
        const joystickElement = document.querySelector<HTMLElement>('#joystick');
        const stickElement = document.querySelector<HTMLElement>('#stick');
        if (!joystickElement || !stickElement) throw new Error('Joystick probe elements are missing');

        const probe: JoystickProbe = {
          pointerDowns: 0,
          pointerUps: 0,
          trusted: false,
          pointerType: '',
          transformOnDown: '',
          transformOnUp: '',
        };
        (window as Window & { __joystickProbe?: JoystickProbe }).__joystickProbe = probe;

        joystickElement.addEventListener('pointerdown', (event) => {
          probe.pointerDowns += 1;
          probe.trusted = event.isTrusted;
          probe.pointerType = event.pointerType;
          probe.transformOnDown = stickElement.style.transform;
        }, { once: true });

        joystickElement.addEventListener('pointerup', () => {
          probe.pointerUps += 1;
          probe.transformOnUp = stickElement.style.transform;
        }, { once: true });
      });

      // Playwright's supported touchscreen API generates real browser input. Touch-drag
      // primitives are not available yet, so an offset tap validates the trusted
      // pointerdown/up path and observes InputController's stick movement in between.
      await page.touchscreen.tap(targetX, targetY);

      const probe = await page.evaluate(() => {
        const value = (window as Window & { __joystickProbe?: JoystickProbe }).__joystickProbe;
        if (!value) throw new Error('Joystick probe did not initialize');
        return value;
      });

      expect(probe.pointerDowns).toBe(1);
      expect(probe.pointerUps).toBe(1);
      expect(probe.trusted).toBe(true);
      expect(probe.pointerType).toBe('touch');
      expect(probe.transformOnDown).not.toBe('translate(0px, 0px)');
      expect(probe.transformOnUp).toBe('translate(0px, 0px)');
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
