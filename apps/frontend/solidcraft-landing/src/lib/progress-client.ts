import DOMPurify from "dompurify";
import {
	type ProgressPage,
	progressBase,
	progressOrigin,
	progressUnits,
	validUnit,
} from "./progress-routes";

export interface OnlineProgress {
	body: string;
	revision: string;
	sourceDate: string;
	title: string;
}
const knownUnits = new Set<string>(progressUnits);
const allowedTags = [
	"html",
	"head",
	"body",
	"main",
	"footer",
	"article",
	"section",
	"div",
	"span",
	"h1",
	"h2",
	"h3",
	"h4",
	"p",
	"strong",
	"em",
	"code",
	"pre",
	"a",
	"ul",
	"ol",
	"li",
	"details",
	"summary",
	"label",
	"input",
	"select",
	"option",
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
	"dl",
	"dt",
	"dd",
	"svg",
	"g",
	"title",
	"line",
	"text",
	"polygon",
	"polyline",
	"circle",
	"rect",
	"i",
	"br",
];
const allowedAttributes = [
	"id",
	"class",
	"href",
	"title",
	"role",
	"aria-label",
	"aria-labelledby",
	"aria-live",
	"aria-sort",
	"tabindex",
	"scope",
	"colspan",
	"rowspan",
	"type",
	"name",
	"placeholder",
	"value",
	"selected",
	"hidden",
	"open",
	"style",
	"viewbox",
	"x",
	"y",
	"x1",
	"x2",
	"y1",
	"y2",
	"width",
	"height",
	"points",
	"text-anchor",
	"visibility",
];
const sanitize = (html: string) =>
	DOMPurify.sanitize(html, {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: allowedAttributes,
		ALLOW_DATA_ATTR: true,
		WHOLE_DOCUMENT: true,
	});

function localReportLink(value: string, sourceUrl: string) {
	if (value.startsWith("#")) return value;
	const url = new URL(value, sourceUrl);
	if (url.protocol !== "https:") return "#";
	if (!url.href.startsWith(progressOrigin)) return url.href;
	const relative = url.pathname.slice(new URL(progressOrigin).pathname.length);
	let path: string;
	if (relative === "" || relative === "index.html") path = progressBase;
	else if (relative === "units/" || relative === "units/index.html")
		path = `${progressBase}units/`;
	else if (relative === "issues.html" || relative === "ssi.html")
		path = progressBase + relative.replace(".html", "/");
	else if (relative.startsWith("units/") && relative.endsWith(".html")) {
		const id = relative.slice(6, -5);
		if (!validUnit(id))
			throw new Error("Invalid unit link in upstream report.");
		if (!knownUnits.has(id))
			return `${progressBase}unit/?id=${encodeURIComponent(id)}${url.hash}`;
		path = `${progressBase}units/${id}/`;
	} else return url.href;
	return path + url.search + url.hash;
}

export function parseOnlineProgress(
	html: string,
	sourceUrl: string,
	page: ProgressPage,
): OnlineProgress {
	if (html.length > 2_000_000) throw new Error("Upstream report is too large.");
	// Sanitize before parsing/rendering: remote scripts, images, embeds and styles never run.
	const doc = new DOMParser().parseFromString(sanitize(html), "text/html");
	const main = doc.querySelector("main");
	const footer = doc.querySelector("footer");
	const source =
		footer?.querySelector<HTMLAnchorElement>("a[href]")?.getAttribute("href") ||
		"";
	const revision =
		/^https:\/\/github\.com\/tangency-labs\/solidcore\/tree\/([a-f0-9]{40})$/.exec(
			source,
		)?.[1];
	const sourceDate = footer?.textContent?.match(
		/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})/,
	)?.[0];
	if (
		main?.querySelectorAll("h1").length !== 1 ||
		!revision ||
		!sourceDate ||
		!Number.isFinite(Date.parse(sourceDate))
	)
		throw new Error("Upstream report format is invalid.");
	if (page.kind === "units" && !main.querySelector("#units tbody tr"))
		throw new Error("Upstream units are missing.");
	if (page.kind === "issues" && !main.querySelector(".issue"))
		throw new Error("Upstream issues are missing.");
	if (page.kind === "ssi" && !main.querySelector("#ssi tbody tr"))
		throw new Error("Upstream corpus is missing.");
	if (page.kind === "unit" && !main.querySelector("dl.facts"))
		throw new Error("Upstream unit details are missing.");
	if (page.kind === "overview") {
		const hero = main.querySelector(".hero");
		const intro = hero?.querySelector(".lede");
		const chart = main.querySelector<SVGElement>("svg.chart[data-points]");
		const points: unknown = JSON.parse(chart?.dataset.points || "null");
		if (
			!hero ||
			!intro ||
			!main.querySelector(".kpis .v") ||
			!Array.isArray(points) ||
			!points.length ||
			!points.every(
				(point) =>
					Array.isArray(point) &&
					point.length === 5 &&
					point.every((n) => typeof n === "number" && Number.isFinite(n)),
			)
		)
			throw new Error("Upstream progress overview is incomplete.");
		const section = doc.createElement("section");
		section.className = "progress-intro";
		const heading = doc.createElement("h1");
		heading.textContent = "SolidCore progress.";
		const lead = doc.createElement("p");
		lead.className = "progress-lead";
		lead.textContent =
			"Port status, test results, and upstream bugs for SolidCore.";
		const details = doc.createElement("details");
		details.className = "methodology";
		details.open = true;
		const summary = doc.createElement("summary");
		summary.textContent = "How progress is measured";
		details.append(summary, intro);
		section.append(heading, lead, details);
		hero.replaceWith(section);
	}
	main.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
		link.setAttribute(
			"href",
			localReportLink(link.getAttribute("href") ?? "", sourceUrl),
		);
	});
	main.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
		const width = node.style.width;
		node.removeAttribute("style");
		if (
			node.tagName === "I" &&
			node.parentElement?.classList.contains("bar") &&
			/^\d+(?:\.\d+)?%$/.test(width) &&
			parseFloat(width) <= 100
		)
			node.style.width = width;
	});
	main.querySelectorAll<HTMLElement>(".scroll").forEach((node) => {
		node.tabIndex = 0;
		node.setAttribute("role", "region");
		node.setAttribute("aria-label", "Scrollable report table");
	});
	main.querySelectorAll(".legend span").forEach((node) => {
		for (const child of node.childNodes)
			if (child.nodeType === Node.TEXT_NODE)
				child.textContent =
					child.textContent?.replace(
						"green (bit-identical to C++)",
						"green (verified within documented tolerances)",
					) || "";
	});
	// Sanitize again after URL and presentation normalization.
	const body = DOMPurify.sanitize(main.innerHTML, {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: allowedAttributes,
		ALLOW_DATA_ATTR: true,
	});
	return {
		body,
		revision,
		sourceDate,
		title: main.querySelector("h1")?.textContent?.trim() || page.heading,
	};
}
