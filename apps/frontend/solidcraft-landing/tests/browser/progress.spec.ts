import { expect, test } from "@playwright/test";
import { mockProgress } from "./progress-fixture";

test.beforeEach(async ({ page }) => mockProgress(page));

test("native progress overview preserves data, timeline interaction and the table alternative", async ({
	page,
}) => {
	await page.goto("/solidcore/progress/");
	await expect(page.locator(".site-header .brand")).toHaveText("SolidCraft");
	await expect(page.locator("h1")).toHaveText("SolidCore progress.");
	await expect(
		page
			.getByRole("navigation", { name: "Progress navigation" })
			.getByRole("link", { name: "Overview" }),
	).toHaveAttribute("aria-current", "page");
	await expect(page.locator(".kpis .tile.big")).toContainText("59.1%");
	await expect(page.locator(".kpis .tile.big")).toContainText(
		"229,382 of 387,903",
	);
	const values = await page.locator(".kpis .tile .v").allTextContents();
	expect(values).toEqual(["59.1%", "96", "75", "25", "65", "0"]);
	await expect(page.locator(".methodology")).toHaveAttribute("open", "");
	await expect(page.locator(".methodology > p")).toBeVisible();
	await expect(page.locator(".methodology")).toContainText("1e-9 relative");
	await expect(page.locator(".methodology")).toContainText("1e-9");
	const points = await page.locator("svg.chart").getAttribute("data-points");
	expect(JSON.parse(points ?? "null")).toHaveLength(73);
	await page.locator("svg.chart .hit").hover({ position: { x: 60, y: 50 } });
	await expect(page.locator(".tip")).toBeVisible();
	await expect(page.locator(".tip")).toContainText("UTC");
	await page.getByText("Timeline as a table", { exact: true }).click();
	await expect(page.locator(".tableview tbody tr")).toHaveCount(73);
	await expect(page.locator(".progress-provenance")).toContainText("16c5ad9c");
	await page.locator(".tableview summary").click();
	await page.mouse.move(0, 0);
	await page.evaluate(() => {
		(document.activeElement as HTMLElement)?.blur();
		window.scrollTo(0, 0);
	});
	await page.screenshot({
		path: "artifacts/progress-desktop.png",
		fullPage: true,
	});
});

test("progress reports reflow, share site typography, and keep dense tables scrollable", async ({
	page,
}) => {
	for (const width of [320, 390, 768, 1280]) {
		await page.setViewportSize({ width, height: 844 });
		for (const route of [
			"",
			"units/",
			"units/geom.vector3d/",
			"issues/",
			"ssi/",
		]) {
			await page.goto(`/solidcore/progress/${route}`);
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
				`${route} at ${width}`,
			).toBe(true);
			await expect(page.locator("h1")).toHaveCount(1);
			expect(
				await page
					.locator("body")
					.evaluate((body) => getComputedStyle(body).fontFamily),
			).toContain("IBM Plex Sans");
		}
	}
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/solidcore/progress/");
	await page.screenshot({
		path: "artifacts/progress-mobile.png",
		fullPage: true,
	});
});

test("unit filters, keyboard sorting, issue anchors and legacy deep links remain usable", async ({
	page,
}) => {
	const redirect = await page.request.get(
		"/solidcore/progress/units/geom.vector3d.html",
		{
			maxRedirects: 0,
		},
	);
	expect(redirect.status()).toBe(301);
	expect(redirect.headers().location).toBe(
		"/solidcore/progress/units/geom.vector3d/",
	);
	await page.goto(
		"/solidcore/progress/units/index.html?module=geom&status=green",
	);
	await expect(
		page.getByRole("combobox", { name: "Module", exact: true }),
	).toHaveValue("geom");
	await expect(
		page.getByRole("combobox", { name: "Status", exact: true }),
	).toHaveValue("green");
	const rows = page.locator("#units tbody tr:visible");
	expect(await rows.count()).toBeGreaterThan(0);
	for (const row of await rows.all()) {
		await expect(row).toHaveAttribute("data-module", "geom");
		await expect(row).toHaveAttribute("data-status", "green");
	}
	const lines = page.getByRole("columnheader", { name: /^Lines/ });
	await lines.focus();
	await page.keyboard.press("Enter");
	await expect(lines).toHaveAttribute("aria-sort", "ascending");
	await rows.first().getByRole("link").first().click();
	await expect(page.locator(".progress-content")).toContainText("Difftest");
	await expect(page.getByRole("link", { name: "Report JSON" })).toHaveAttribute(
		"href",
		/github.com\/bherbruck\/solidcore\/blob\/16c5ad9c/,
	);
	await page.goto("/solidcore/progress/issues.html#UB-100-dup2");
	await expect(page.locator(".issue:target")).toBeVisible();
	await expect(
		page
			.getByRole("navigation", { name: "Progress navigation" })
			.getByRole("link", { name: "Upstream issues" }),
	).toHaveAttribute("aria-current", "page");
});

test("no JavaScript explains that live reports require JavaScript", async ({
	browser,
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	try {
		await page.goto("/solidcore/progress/units/");
		await expect(
			page.getByText("JavaScript is required to load these live reports.", {
				exact: false,
			}),
		).toBeVisible();
		await expect(page.locator("#units tbody tr")).toHaveCount(0);
		await expect(
			page.getByRole("link", { name: "View the upstream progress site." }),
		).toHaveAttribute("href", "https://bherbruck.github.io/solidcore/units/");
	} finally {
		await context.close();
	}
});
