import { mockProgress } from './progress-fixture';
import { endpoint, githubRelease } from './release-fixture';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes, site } from '../../src/data/site';

test.beforeEach(async ({ page }) => {
  await mockProgress(page);
  await page.route(endpoint, (route) => route.fulfill({ json: githubRelease() }));
});

test('every website route loads with no browser errors or serious accessibility violations', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()); });
  for (const route of [...routes, '/solidcore/progress/', '/solidcore/progress/units/', '/solidcore/progress/issues/', '/solidcore/progress/ssi/']) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('h1'), route).toHaveCount(1);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(scan.violations.filter((v) => ['critical','serious'].includes(v.impact || '')), `Accessibility on ${route}`).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('interior pages reflow on mobile, and font failure preserves usable content', async ({ page }) => {
  for (const width of [320,390,768]) {
    await page.setViewportSize({ width,height:844 });
    for (const route of routes.filter((route) => route !== '/')) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow on ${route} at ${width}`).toBe(true);
    }
  }
  await page.route(/\.woff2$/, (route) => route.abort());
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto('/');
  await expect(page.locator('.hero h1')).toBeVisible();
  await expect(page.locator('.hero .actions a')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('hero actions stay visible and layouts reflow at representative widths', async ({ page }) => {
  for (const width of [320,390,430,768,1024,1280,1536]) {
    await page.setViewportSize({ width, height: 932 });
    await page.goto('/');
    const actions = page.locator('.hero .actions');
    await expect(actions.getByRole('link',{ name:'Download SolidCraft' })).toHaveAttribute('href','/download/');
    await expect(actions.getByRole('link',{ name:'Try in your browser' })).toHaveAttribute('href',site.app);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Horizontal overflow at ${width}`).toBe(true);
    if (width === 390 || width === 430) {
      const box = await actions.boundingBox();
      expect(box!.y + box!.height).toBeLessThan(844);
    }
  }
  await page.screenshot({ path:'artifacts/home-desktop.png',fullPage:true });
  await page.setViewportSize({ width:390,height:844 });
  await page.screenshot({ path:'artifacts/home-mobile.png',fullPage:true });
});

test('mobile disclosure supports keyboard, Escape, and navigation', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 });
  await page.goto('/');
  const menu = page.locator('.mobile-menu');
  const trigger = menu.locator('summary');
  await trigger.focus(); await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open','');
  await expect(menu.getByRole('link',{ name:'Try in your browser' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open','');
  await expect(trigger).toBeFocused();
  await trigger.click(); await menu.getByRole('link',{ name:'Features',exact:true }).click();
  await expect(page).toHaveURL('/features/');
});

test('download filters select correct architecture, show empty state, and reset', async ({ page }) => {
  await page.goto('/download/');
  await expect(page.getByLabel('Platform',{ exact:true })).toBeEnabled();
  await expect(page.locator('.package')).toHaveCount(22);
  const initialDownload = await page.locator('[data-platform-download] a').getAttribute('href');
  await page.getByLabel('Platform',{ exact:true }).selectOption('Linux');
  await page.getByLabel('Architecture',{ exact:true }).selectOption('ARM64');
  await page.getByLabel('Package format',{ exact:true }).selectOption('DEB');
  await expect(page.locator('.package')).toHaveCount(1);
  await expect(page.locator('.package .button')).toHaveAttribute('href',/v0\.12\.0\/solidcraft-0\.12\.0-linux-aarch64\.deb$/);
  await expect(page.locator('[data-platform-download] a')).toHaveText('Download for Linux');
  await expect(page.locator('[data-platform-download] a')).toHaveAttribute('href',/linux-aarch64\.deb$/);
  await page.getByLabel('Platform',{ exact:true }).selectOption('macOS');
  await expect(page.getByText('No matching package.',{ exact:true })).toBeVisible();
  await page.getByRole('button',{ name:'Reset filters' }).click();
  await expect(page.locator('.package')).toHaveCount(22);
  await expect(page.locator('[data-platform-download] a')).toHaveAttribute('href',initialDownload!);
  await expect(page.locator('.page-intro .actions')).not.toContainText('Try in your browser');
  await page.screenshot({ path:'artifacts/download-desktop.png',fullPage:true });
});

test('macOS gets a direct Universal download while all artifacts stay visible', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'platform',{ value:'MacIntel' });
    Object.defineProperty(navigator,'maxTouchPoints',{ value:0 });
    Object.defineProperty(navigator,'userAgent',{ value:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' });
  });
  await page.goto('/download/');
  await expect(page.locator('[data-platform-download] a')).toHaveText('Download for macOS');
  await expect(page.locator('[data-platform-download] a')).toHaveAttribute('href',/macos-universal\.dmg$/);
  await expect(page.locator('.package')).toHaveCount(22);
});

test('no JavaScript preserves navigation, all packages, and selectable setup commands', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled:false,viewport:{ width:390,height:844 } });
  const page = await context.newPage();
  await page.goto('/download/'); await expect(page.locator('.package')).toHaveCount(22);
  await page.locator('.mobile-menu summary').click();
  await page.locator('.mobile-menu').getByRole('link',{ name:'MCP',exact:true }).click();
  await expect(page.locator('pre').filter({ hasText:'claude mcp add solidcraft' })).toBeVisible();
  await expect(page.getByRole('button',{ name:'Copy command' })).toHaveCount(0);
  await context.close();
});

test('MCP copy succeeds, announces status, and retains focus', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/mcp/');
  const button = page.getByRole('button',{ name:'Copy command' }).last();
  await button.click();
  await expect(page.locator('.copy-status').last()).toHaveText('Copied.');
  await expect(button).toBeFocused();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('claude mcp add solidcraft -- solidcraft-cli mcp');
});

test('MCP copy failure keeps a selectable manual fallback', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator,'clipboard',{ value:{ writeText:() => Promise.reject(new Error('denied')) } }); });
  await page.goto('/mcp/'); await page.getByRole('button',{ name:'Copy command' }).last().click();
  await expect(page.locator('.copy-status').last()).toContainText('Select the command');
  await expect(page.locator('pre').last()).toContainText('claude mcp add');
});

test('media loads on intent, plays, and pauses without fetching third-party resources', async ({ page }) => {
  const external: string[] = []; const videos: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4322') && request.url() !== endpoint) external.push(request.url()); if (request.url().endsWith('.mp4')) videos.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('.hero video')).toHaveAttribute('preload','none');
  expect(videos).toEqual([]);
  await page.locator('.hero video').evaluate(async (video: HTMLVideoElement) => { await video.play(); });
  await expect.poll(() => page.locator('.hero video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0);
  await page.locator('.hero video').evaluate((video: HTMLVideoElement) => video.pause());
  const parameterVideo = page.getByLabel('Watch the enclosure height change from 24 to 32 mm', { exact:true });
  await expect(parameterVideo).toHaveAttribute('preload','none');
  await expect(parameterVideo.locator('source')).toHaveAttribute('src','/media/enclosure-parameter.mp4');
  await parameterVideo.evaluate(async (video: HTMLVideoElement) => { await video.play(); });
  await expect.poll(() => parameterVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0);
  expect(await parameterVideo.evaluate((video: HTMLVideoElement) => video.duration)).toBeCloseTo(7.966667,1);
  await parameterVideo.evaluate((video: HTMLVideoElement) => video.pause());
  await expect(page.locator('#parameter-change-caption')).toHaveCount(1);
  expect(external).toEqual([]);
});

test('progress report keeps unit details, source links, and working filters', async ({ page }) => {
  const response = await page.goto('/solidcore/progress/'); expect(response?.status()).toBe(200);
  await expect(page.locator('.progress-back')).toHaveAttribute('href','/solidcore/');
  await page.goto('/solidcore/progress/units/');
  const search = page.getByLabel('Search'); await search.fill('vector3d');
  await expect(page.locator('table tbody tr:visible')).not.toHaveCount(0);
  const unit = page.locator('table tbody tr:visible a').first(); await unit.click();
  await expect(page.locator('h1')).toContainText('vector3d');
  await page.goto('/solidcore/progress/ssi/'); await expect(page.locator('h1')).toHaveText('SSI corpus');
});

test('missing route returns an actual 404 and preview policies are enforced', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(response?.headers()['content-security-policy']).toContain("object-src 'none'");
  await expect(page.getByRole('heading',{ level:1 })).toHaveText('This page isn’t here.');
  await page.getByRole('link',{ name:'Back to SolidCraft' }).click();
  await expect(page).toHaveURL('/');
});
