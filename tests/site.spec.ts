import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const artifacts = path.resolve('artifacts');
const featureTitles = [
  'Жаңа әлемдерді зертте',
  'Өз жолыңды таңда',
  'Жаңа мүмкіндіктерді аш',
] as const;
const featureDescriptions = [
  'Әр бұрыштан жаңа әсерлерді ашып, ойын әлемінің атмосферасына бойла.',
  'Өзіңе қызықты бағытты таңда да, өз ойын тәжірибеңді қалыптастыр.',
  'Әр жаңа қадам — жаңа әсерлерге және тың идеяларға жол.',
] as const;

async function scrollToChapter(page: Page, selector: string) {
  await page.locator(selector).evaluate((element) => {
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await expect(page.locator(selector)).toHaveAttribute('data-current', 'true');
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function expectFullyInViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
  })).toBe(true);
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test.beforeAll(async () => {
  await mkdir(artifacts, { recursive: true });
});

test('desktop golden path renders every chapter and changes the WebGL scene', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page).toHaveTitle('Ойын әлемі — Өз ойын әлеміңді аш');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ӨЗ ОЙЫН ӘЛЕМІҢДІ АШ');
  await expect(page.getByRole('navigation', { name: 'Негізгі навигация' })).toBeVisible();
  await expect(page.locator('#universe')).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/webgl-fallback/);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(artifacts, 'desktop-01-hero.png') });

  const initialCanvas = await page.locator('#universe').screenshot();
  await expect(page.getByRole('link', { name: 'Ойынды зерттеу ↗' })).toHaveAttribute('href', '#features');
  await scrollToChapter(page, '#about');
  await expect(page.getByRole('heading', { name: 'Қиялдан артық әлем.' })).toBeVisible();

  for (const [index, title] of featureTitles.entries()) {
    const chapter = page.locator(`[data-feature="${index}"]`);
    await scrollToChapter(page, `[data-feature="${index}"]`);
    await expectFullyInViewport(chapter.getByRole('heading', { name: title }));
    await expectFullyInViewport(chapter.getByText(featureDescriptions[index], { exact: true }));
    await page.screenshot({ path: path.join(artifacts, `desktop-0${index + 2}-feature-${index + 1}.png`) });
    await expectNoHorizontalOverflow(page);
  }

  const scrolledCanvas = await page.locator('#universe').screenshot();
  expect(scrolledCanvas.equals(initialCanvas)).toBe(false);

  await scrollToChapter(page, '.closing');
  await expect(page.getByRole('heading', { name: 'Өз әлеміңді аш. Өз жолыңды тап.' })).toBeVisible();
  await expect(page.locator('.closing').getByRole('link', { name: 'Ойынды бастау ↗' })).toHaveAttribute('href', '#features');

  await page.locator('#contact').evaluate((element) => element.scrollIntoView({ block: 'end', behavior: 'instant' }));
  await expect(page.locator('#contact')).toBeVisible();
  await expect(page.getByText('© 2026 Ойын әлемі. Барлық құқықтар қорғалған.')).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'desktop-05-footer.png') });
  expect(errors).toEqual([]);
});

test('mobile navigation opens, follows links and closes with Escape', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#universe')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(artifacts, 'mobile-01-hero.png') });

  const menu = page.getByRole('button', { name: /Мәзірді (ашу|жабу)/ });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Негізгі навигация' })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'mobile-02-menu.png') });
  await page.getByRole('link', { name: 'Ойын туралы', exact: true }).click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#about')).toHaveAttribute('data-current', 'true');

  await menu.click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();

  for (const [index, title] of featureTitles.entries()) {
    const selector = `[data-feature="${index}"]`;
    await scrollToChapter(page, selector);
    await expectFullyInViewport(page.getByRole('heading', { name: title }));
    await expectFullyInViewport(page.getByText(featureDescriptions[index], { exact: true }));
    await page.screenshot({ path: path.join(artifacts, `mobile-0${index + 3}-feature-${index + 1}.png`) });
    await expectNoHorizontalOverflow(page);
  }

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#contact')).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'mobile-06-footer.png') });
  expect(errors).toEqual([]);
});

test('existing WebGL canvas resizes from desktop to mobile without overflow', async ({ page }) => {
  await page.goto('/');
  const canvas = await page.locator('#universe').elementHandle();
  expect(canvas).not.toBeNull();

  const readDimensions = () => canvas!.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('webgl2')!;
    return {
      cssWidth: canvasElement.clientWidth,
      cssHeight: canvasElement.clientHeight,
      width: canvasElement.width,
      height: canvasElement.height,
      drawingBufferWidth: context.drawingBufferWidth,
      drawingBufferHeight: context.drawingBufferHeight,
    };
  });

  await expect.poll(readDimensions).toEqual({
    cssWidth: 1440,
    cssHeight: 900,
    width: 1440,
    height: 900,
    drawingBufferWidth: 1440,
    drawingBufferHeight: 900,
  });

  await page.setViewportSize({ width: 390, height: 844 });

  await expect.poll(readDimensions).toEqual({
    cssWidth: 390,
    cssHeight: 844,
    width: 390,
    height: 844,
    drawingBufferWidth: 390,
    drawingBufferHeight: 844,
  });
  await expectNoHorizontalOverflow(page);
});

test('reduced motion keeps all content readable without cinematic transitions', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/has-cinematic-scroll/);
  await expect(page.locator('.hero__content')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#universe')).toBeVisible();
  await page.getByRole('link', { name: 'Ойынды зерттеу ↗' }).click();
  await expect(page.locator('[data-feature="0"]')).toHaveAttribute('data-current', 'true');

  for (const title of featureTitles) {
    const heading = page.getByRole('heading', { name: title });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    await expect(heading.locator('..')).toHaveCSS('opacity', '1');
  }
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('no-WebGL mode exposes an explicit fallback and preserves the content', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return getContext.call(this, type, ...args);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/webgl-fallback/);
  await expect(page.locator('#universe')).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ойынды зерттеу ↗' })).toBeVisible();
});
