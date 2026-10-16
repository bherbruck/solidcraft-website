import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
export const upstream = "https://tangency-labs.github.io/solidcore/";
const fixture = (name: string) =>
	readFileSync(`tests/fixtures/progress/${name}.html`, "utf8");
export const overviewHtml = fixture("overview");
export const unitHtml = fixture("unit");
export async function mockProgress(page: Page) {
	await page.route(`${upstream}**`, (route) => {
		const path = new URL(route.request().url()).pathname.slice(
			"/solidcore/".length,
		);
		let body: string;
		if (!path || path === "index.html") body = overviewHtml;
		else if (path === "units/" || path === "units/index.html")
			body = fixture("units");
		else if (path === "issues.html") body = fixture("issues");
		else if (path === "ssi.html") body = fixture("ssi");
		else if (/^units\/[a-z0-9_.-]+\.html$/.test(path))
			body = unitHtml.replaceAll("geom.vector3d", path.slice(6, -5));
		else
			return route.fulfill({
				status: 404,
				body: "Missing fixture",
				headers: { "access-control-allow-origin": "*" },
			});
		return route.fulfill({
			body,
			contentType: "text/html",
			headers: { "access-control-allow-origin": "*" },
		});
	});
}
