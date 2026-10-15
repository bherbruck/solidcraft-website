import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { mockProgress, overviewHtml, upstream } from "./progress-fixture";

const newRevision = "a".repeat(40);
const newer = overviewHtml
	.replaceAll("16c5ad9cec67741ab00a41b75b18dfa7985e70ef", newRevision)
	.replace("59.1%", "72.5%");
const headers = { "access-control-allow-origin": "*" };

test("progress comes from upstream at runtime, with its source revision and no saved results", async ({
	page,
}) => {
	await page.route(upstream, (route) =>
		route.fulfill({ body: newer, contentType: "text/html", headers }),
	);
	const response = await page.goto("/solidcore/progress/");
	if (!response) throw new Error("Progress page returned no response.");
	expect(await response.text()).not.toContain("229,382");
	await expect(page.locator(".kpis .tile.big .v")).toHaveText("72.5%");
	await expect(page.locator(".progress-source code")).toHaveText("aaaaaaaa");
	await expect(page.locator(".progress-provenance")).toContainText(
		"Fetched from",
	);
	await expect(page.locator(".methodology")).toHaveAttribute("open", "");
	await expect(page.locator(".tableview tbody tr")).toHaveCount(73);
});

test("upstream failure shows an error, retry works, and a failed refresh removes previous results", async ({
	page,
}) => {
	await page.clock.install();
	let fail = true;
	await page.route(upstream, (route) =>
		route.fulfill(
			fail
				? { status: 503, body: "Unavailable", headers }
				: { body: newer, contentType: "text/html", headers },
		),
	);
	await page.goto("/solidcore/progress/");
	await expect(page.getByRole("alert")).toContainText("Couldn’t load");
	await expect(page.locator(".kpis")).toHaveCount(0);
	fail = false;
	await page.getByRole("button", { name: "Try again" }).click();
	await expect(page.locator(".kpis .tile.big .v")).toHaveText("72.5%");
	fail = true;
	await page.clock.fastForward(5 * 60_000 + 1000);
	await expect(page.getByRole("alert")).toContainText("Couldn’t load");
	await expect(page.locator(".kpis")).toHaveCount(0);
	await expect(page.locator(".progress-provenance")).toHaveCount(0);
});

test("live report scripts, embeds, external images and inline handlers cannot execute", async ({
	page,
}) => {
	const external: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("evil.example")) external.push(request.url());
	});
	const dirty = newer.replace(
		'<section class="hero">',
		'<section class="hero"><script>window.progressPwned=true</script><img src="https://evil.example/pixel" onerror="window.progressPwned=true"><iframe src="https://evil.example/frame"></iframe><p onclick="window.progressPwned=true" style="background-image:url(https://evil.example/css)">Unsafe content</p><a href="javascript:window.progressPwned=true">Unsafe link</a>',
	);
	await page.route(upstream, (route) =>
		route.fulfill({ body: dirty, contentType: "text/html", headers }),
	);
	await page.goto("/solidcore/progress/");
	await expect(page.locator(".kpis .tile.big .v")).toHaveText("72.5%");
	await expect(
		page.locator(
			'.progress-content script,.progress-content img,.progress-content iframe,.progress-content [onclick],.progress-content [onerror],.progress-content a[href^="javascript:"]',
		),
	).toHaveCount(0);
	expect(
		await page.evaluate(
			() => (window as unknown as { progressPwned?: boolean }).progressPwned,
		),
	).toBeUndefined();
	expect(external).toEqual([]);
});

test("units added upstream after the build open through the live unit viewer", async ({
	page,
}) => {
	await mockProgress(page);
	const units = readFileSync(
		"tests/fixtures/progress/units.html",
		"utf8",
	).replace(
		"</tbody>",
		'<tr data-status="green" data-module="geom"><td><a href="new.geometry.html"><code>new.geometry</code></a></td><td>green</td></tr></tbody>',
	);
	await page.route(`${upstream}units/`, (route) =>
		route.fulfill({ body: units, contentType: "text/html", headers }),
	);
	await page.goto("/solidcore/progress/units/?q=new.geometry");
	const link = page.getByRole("link", { name: "new.geometry", exact: true });
	await expect(link).toHaveAttribute(
		"href",
		"/solidcore/progress/unit/?id=new.geometry",
	);
	await link.click();
	await expect(page.locator("h1")).toContainText("new.geometry");
	await expect(page.locator(".progress-content")).toContainText("Difftest");
	await expect(page.locator(".progress-provenance a").first()).toHaveAttribute(
		"href",
		`${upstream}units/new.geometry.html`,
	);
});

test("malformed upstream reports fail instead of showing local or previous data", async ({
	page,
}) => {
	await page.route(upstream, (route) =>
		route.fulfill({
			body: "<main><h1>Not a report</h1></main>",
			contentType: "text/html",
			headers,
		}),
	);
	await page.goto("/solidcore/progress/");
	await expect(page.getByRole("alert")).toContainText("Couldn’t load");
	await expect(page.locator(".kpis")).toHaveCount(0);
});
