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

async function timedStep(name: string, run: () => Promise<void>): Promise<void> {
  const started = Date.now();
  try {
    await test.step(name, run);
  } finally {
    console.log(`[mobile-e2e] ${test.info().project.name}: ${name}: ${Date.now() - started} ms`);
  }
}

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

async function activateButton(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await locator.evaluate((element) => (element as HTMLButtonElement).click());
}

async function expectSelectValue(locator: Locator, expected: string): Promise<void> {
  await expect.poll(async () => locator.evaluate((element) => (element as HTMLSelectElement).value), {
    timeout: 20_000,
  }).toBe(expected);
}

async function waitForGame(page: Page, captureOpening = false) {
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

  // The scene boots behind the title screen; story timers and controls start only on entry.
  await expect(page.locator('.opening-screen')).toBeVisible();
  await expect(page.locator('#joystick')).toBeHidden();
  if (captureOpening && !browserStackRun) {
    await page.screenshot({ path: test.info().outputPath('opening.png'), scale: 'css' });
  }
  await activateButton(page.locator('.opening-start'));
  await expect(page.locator('.opening-screen')).toBeHidden();
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
  const canvas = await waitForGame(page, true);

  await timedStep('boot WebGL scene and mobile HUD', async () => {
    await expect(page.locator('#joystick')).toBeVisible();
    await expect(page.locator('#soykaButton')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Прыгнуть (пробел)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
    await expect(page.locator('#objective')).toContainText('НАЙТИ АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ');

    const dimensions = await readCanvasDiagnostics(canvas);
    expect(dimensions.cssWidth).toBeGreaterThan(300);
    expect(dimensions.cssHeight).toBeGreaterThan(200);
    expect(dimensions.bufferWidth).toBeGreaterThan(0);
    expect(dimensions.bufferHeight).toBeGreaterThan(0);
    expect(dimensions.hasWebGL2).toBe(true);
    if (!browserStackRun) await page.screenshot({ path: test.info().outputPath('lighthouse.png'), scale: 'css' });
  });

  if (consoleErrors.length > 0) {
    console.log(`[mobile-e2e] browser console errors: ${JSON.stringify(consoleErrors)}`);
  }
  expect(pageErrors).toEqual([]);
});

// Keep persistence independent of the visual boot capture. On software WebGL,
// two production boots plus screenshots exhausted one shared test budget.
test('mobile settings survive a production reload', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  await waitForGame(page);

  await timedStep('pause settings persist graphics quality', async () => {
    const pauseButton = page.getByRole('button', { name: 'Пауза' });
    const continueButton = page.getByRole('button', { name: 'ПРОДОЛЖИТЬ' });

    // This step verifies settings behavior, not touch fidelity. Use DOM activation
    // here so trusted touch emulation remains isolated from the functional checks.
    await activateButton(pauseButton);
    await expect(page.getByRole('dialog', { name: 'Пауза и настройки' })).toBeVisible();

    const quality = page.locator('#qualitySelect');
    await quality.selectOption('low');
    // BrowserStack's iOS Playwright bridge does not support locator.toHaveValue().
    // Read the native select value instead so the same persistence assertion remains portable.
    await expectSelectValue(quality, 'low');
    await activateButton(continueButton);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForGame(page);
    await activateButton(pauseButton);
    await expectSelectValue(page.locator('#qualitySelect'), 'low');
    await activateButton(continueButton);
  });

  await timedStep('runtime audit exposes viewport and canvas metrics', async () => {
    const audit = page.locator('[data-runtime-performance="true"]');
    await expect(audit).toBeVisible();

    // The Chromium project runs through software WebGL on GitHub-hosted Linux. Wait
    // for the overlay to record an actual requestAnimationFrame sample rather than
    // assuming desktop-like frame cadence after the production reload.
    await expect.poll(async () => (await audit.textContent()) ?? '', { timeout: 45_000 })
      .toMatch(/RUNTIME AUDIT[\s\S]*FPS avg \d+(?:\.\d+)?[\s\S]*sample [1-9]\d*\/180/);

    const text = (await audit.textContent()) ?? '';
    expect(text).toContain('effective pixel ratio');
    expect(text).toMatch(/viewport \d+x\d+/);
    expect(text).toMatch(/canvas CSS \d+x\d+\s+\|\s+buffer \d+x\d+/);
  });

  expect(pageErrors).toEqual([]);
});

// Orientation and trusted touch have their own browser context and time budget.
// Keep the production reload/settings journey independent: software WebGL on CI
// must not consume the orientation test's budget before it starts.
if (!browserStackRun) {
  test('mobile orientation and trusted joystick input', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('beacon-eclipse.settings.v1', JSON.stringify({ quality: 'low', sfxVolume: 0 }));
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const canvas = await waitForGame(page);
    await timedStep('portrait viewport stays inside the page', async () => {
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

    // Trusted touch follows the orientation change, exercising the resized HUD.
    await timedStep('joystick receives trusted touch pointer input', async () => {
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
    expect(pageErrors).toEqual([]);
  });
}

test('legacy void save resumes safely without losing story choices', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('beacon-eclipse.settings.v1', JSON.stringify({ quality: 'low', sfxVolume: 0 }));
    localStorage.setItem('beacon-eclipse.save.v1', JSON.stringify({
      version: 1, savedAt: 1,
      player: { position: { x: 0, y: -5000, z: -62 }, yaw: 0 },
      progress: { lighthousePowered: true, warehouseContacted: true, warehouseFarewellPlayed: true,
        bridgeStarted: true, schoolEntered: true },
      energy: ['bridge', 'lights'], choices: { introMemory: 'mara' },
      responseProfile: { direct: 1, vulnerable: 2, silent: 0 }, schoolEchoesHeard: [],
    }));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForGame(page);
  await expect(page.locator('#objective')).toContainText('ВОССТАНОВИТЬ РЕКОНСТРУКЦИЮ');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('beacon-eclipse.save.v1') ?? '{}'));
  expect(saved.player.position.y).toBeGreaterThan(0.25);
  expect(saved.player.position.y).toBeLessThan(0.8);
  expect(saved.player.position.z).toBeCloseTo(-59, 0);
  expect(saved.choices.introMemory).toBe('mara');
  expect(saved.responseProfile.vulnerable).toBe(2);
  expect(saved.energy).toEqual(['bridge', 'lights']);
  if (!browserStackRun) await page.screenshot({ path: test.info().outputPath('recovered-school.png'), scale: 'css' });

  await activateButton(page.getByRole('button', { name: 'Пауза' }));
  await activateButton(page.getByRole('button', { name: 'ВЕРНУТЬСЯ НА БЕЗОПАСНОЕ МЕСТО' }));
  await expect(page.getByRole('dialog', { name: 'Пауза и настройки' })).toBeHidden();
  await expect(page.locator('#jumpButton')).toBeEnabled();
  expect(pageErrors).toEqual([]);
});
