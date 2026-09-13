import { expect, test, type Page } from '@playwright/test';

const browserStackRun = process.env.BROWSERSTACK_RUN === '1';

async function waitForGame(page: Page) {
  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(async () => canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    return canvasElement.width > 0
      && canvasElement.height > 0
      && canvasElement.clientWidth > 0
      && canvasElement.clientHeight > 0;
  })).toBe(true);
  return canvas;
}

test('mobile WebGL smoke journey', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  let canvas = await waitForGame(page);

  await test.step('boot WebGL scene and mobile HUD', async () => {
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
  });

  if (!browserStackRun) {
    await test.step('joystick responds to trusted pointer drag', async () => {
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

  expect(pageErrors).toEqual([]);
});
