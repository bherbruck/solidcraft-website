// Presentation controls for the upstream report markup; all values come from upstream.
export function enhanceProgress(container: HTMLElement) {
	const controller = new AbortController();
	const options = { signal: controller.signal };
	container
		.querySelectorAll<HTMLTableElement>("table.sortable")
		.forEach((table) => {
			const headings = Array.from(table.tHead?.rows[0]?.cells || []);
			headings.forEach((heading, column) => {
				const kind = heading.dataset.sort;
				if (!kind) return;
				heading.tabIndex = 0;
				const value = (cell: HTMLTableCellElement) => {
					const text = cell?.dataset.v ?? cell?.textContent?.trim() ?? "";
					if (kind !== "num") return text.toLowerCase();
					const number = Number.parseFloat(text.replaceAll(",", ""));
					return Number.isNaN(number) ? -Infinity : number;
				};
				const sort = () => {
					const ascending = heading.getAttribute("aria-sort") !== "ascending";
					headings.forEach((item) => {
						item.removeAttribute("aria-sort");
					});
					heading.setAttribute(
						"aria-sort",
						ascending ? "ascending" : "descending",
					);
					const body = table.tBodies[0];
					Array.from(body.rows)
						.sort((a, b) => {
							const x = value(a.cells[column]),
								y = value(b.cells[column]);
							return (x < y ? -1 : x > y ? 1 : 0) * (ascending ? 1 : -1);
						})
						.forEach((row) => {
							body.append(row);
						});
				};
				heading.addEventListener("click", sort, options);
				heading.addEventListener(
					"keydown",
					(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							sort();
						}
					},
					options,
				);
			});
		});
	container.querySelectorAll<HTMLElement>(".filters").forEach((box) => {
		const id = box.dataset.table || box.dataset.list;
		if (!id) return;
		const target = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
		if (!target) return;
		const items = box.dataset.table
			? Array.from((target as HTMLTableElement).tBodies[0].rows)
			: (Array.from(target.children) as HTMLElement[]);
		const controls = Array.from(
			box.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
				"input,select",
			),
		);
		const params = new URLSearchParams(location.search);
		controls.forEach((control) => {
			const value = params.get(control.name);
			if (value !== null) control.value = value;
		});
		const apply = () => {
			let shown = 0;
			for (const item of items) {
				const matches = controls.every(
					(control) =>
						!control.value.trim() ||
						(control.name === "q"
							? item.textContent
									?.toLowerCase()
									.includes(control.value.trim().toLowerCase())
							: item.getAttribute(`data-${control.name}`) ===
								control.value.trim()),
				);
				item.hidden = !matches;
				if (matches) shown++;
			}
			const count = box.querySelector(".count");
			if (count) count.textContent = `${shown} of ${items.length} shown`;
			const query = new URLSearchParams(location.search);
			for (const control of controls) {
				if (control.value.trim()) query.set(control.name, control.value.trim());
				else query.delete(control.name);
			}
			history.replaceState(
				null,
				"",
				location.pathname + (query.size ? `?${query}` : "") + location.hash,
			);
		};
		controls.forEach((control) => {
			control.addEventListener("input", apply, options);
			control.addEventListener("change", apply, options);
		});
		apply();
	});
	container
		.querySelectorAll<SVGSVGElement>("svg.chart[data-points]")
		.forEach((svg) => {
			const points = JSON.parse(svg.dataset.points || "[]") as number[][];
			const cross = svg.querySelector(".cross"),
				hit = svg.querySelector<SVGElement>(".hit");
			const host = svg.parentElement,
				tip = host?.querySelector<HTMLElement>(".tip");
			if (!points.length || !cross || !hit || !host || !tip) return;
			const width = Number(svg.dataset.w),
				left = Number(svg.dataset.l),
				right = Number(svg.dataset.r),
				x0 = Number(svg.dataset.x0),
				x1 = Number(svg.dataset.x1);
			const sx = (t: number) =>
				left + ((width - left - right) * (t - x0)) / Math.max(1, x1 - x0);
			const move = (event: PointerEvent) => {
				const box = svg.getBoundingClientRect();
				const x = ((event.clientX - box.left) * width) / box.width;
				const nearest = points.reduce((best, point) =>
					Math.abs(sx(point[0]) - x) < Math.abs(sx(best[0]) - x) ? point : best,
				);
				const px = sx(nearest[0]);
				cross.setAttribute("x1", String(px));
				cross.setAttribute("x2", String(px));
				cross.setAttribute("visibility", "visible");
				tip.hidden = false;
				tip.replaceChildren();
				for (const text of [
					`${new Date(nearest[0] * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC`,
					`green: ${nearest[1].toFixed(1)}%`,
					`green + partial: ${nearest[2].toFixed(1)}%`,
					`${nearest[3]} / ${nearest[4]} units`,
				]) {
					const line = document.createElement("div");
					line.textContent = text;
					tip.append(line);
				}
				let offset = (px * box.width) / width + 8;
				if (offset + tip.offsetWidth > host.getBoundingClientRect().width - 4)
					offset -= tip.offsetWidth + 16;
				tip.style.left = `${Math.max(4, offset)}px`;
				tip.style.top = "12px";
			};
			hit.addEventListener("pointermove", move, options);
			hit.addEventListener("pointerdown", move, options);
			hit.addEventListener(
				"pointerleave",
				() => {
					cross.setAttribute("visibility", "hidden");
					tip.hidden = true;
				},
				options,
			);
		});
	return () => controller.abort();
}
