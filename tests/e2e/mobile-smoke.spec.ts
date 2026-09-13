import { expect, test, type Page } from '@playwright/test';

const browserStackRun = process.env.BROWSERSTACK_RUN === '1';

async function openGame(page: Page, path = '/') {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(path, { waitUntil: 'domcontentloaded' });

  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(async () => canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    return canvasElement.width > 0
      && canvasElement.height > 0
      && canvasElement.clientWidth > 0
      && canvasElement.clientHeight > 0;
  })).toBe(true);

  return { canvas, pageErrors };
}

test('boots the WebGL scene with the mobile HUD', async ({ page }) => {
  const { canvas, pageErrors } = await openGame(page);

  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('#soykaButton')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
  await expect(page.locator('#objective')).toContainText('НАЙТИ АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ');

  const dimensions = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    return {
      cssWidth: canvasElement.clientWidth,
      cssHeight: canvasElement.clientHeight,
      bufferWidth: canvasElement.width,
      bufferHeight: canvasElement.height,
    };
  });

  expect(dimensions.cssWidth).toBeGreaterThan(300);
  expect(dimensions.cssHeight).toBeGreaterThan(200);
  expect(dimensions.bufferWidth).toBeGreaterThan(0);
  expect(dimensions.bufferHeight).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});

test('joystick reacts to a pointer drag and returns to neutral', async ({ page }) => {
  test.skip(browserStackRun, 'Trusted pointer-drag coverage runs in local Playwright emulation; BrowserStack covers the real-device smoke path.');

  const { pageErrors } = await openGame(page);
  const joystick = page.locator('#joystick');
  const stick = page.locator('#stick');
  const box = await joystick.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + box.width * 0.22, centerY - box.height * 0.12, { steps: 4 });

  await expect.poll(async () => stick.evaluate((element) => (element as HTMLElement).style.transform))
    .not.toBe('translate(0px, 0px)');

  await page.mouse.up();
  await expect.poll(async () => stick.evaluate((element) => (element as HTMLElement).style.transform))
    .toBe('translate(0px, 0px)');
  expect(pageErrors).toEqual([]);
});

test('pause menu changes quality and persists the setting', async ({ page }) => {
  const { pageErrors } = await openGame(page);

  await page.getByRole('button', { name: 'Пауза' }).click();
  await expect(page.getByRole('dialog', { name: 'Пауза и настройки' })).toBeVisible();

  const quality = page.locator('#qualitySelect');
  await quality.selectOption('low');
  await expect(quality).toHaveValue('low');
  await page.getByRole('button', { name: 'ПРОДОЛЖИТЬ' }).click();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Пауза' }).click();
  await expect(page.locator('#qualitySelect')).toHaveValue('low');
  expect(pageErrors).toEqual([]);
});

test('runtime audit reports viewport and canvas metrics', async ({ page }) => {
  const { pageErrors } = await openGame(page, '/?perf=1');
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
  expect(pageErrors).toEqual([]);
});

test('portrait viewport keeps the game shell inside the page', async ({ page }) => {
  test.skip(browserStackRun, 'Real-device orientation is handled separately in BrowserStack; this check validates responsive layout in emulation.');

  await page.setViewportSize({ width: 390, height: 844 });
  const { canvas, pageErrors } = await openGame(page);

  const layout = await page.evaluate(() => ({
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  const canvasSize = await canvas.evaluate((element) => ({
    width: (element as HTMLCanvasElement).clientWidth,
    height: (element as HTMLCanvasElement).clientHeight,
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(canvasSize.width).toBe(layout.innerWidth);
  expect(canvasSize.height).toBe(layout.innerHeight);
  await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
