import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useStore } from "zustand";
import { nav } from "../data/site";
import { navigationStore } from "../stores/navigation";
import Actions from "./Actions";

export default function MobileMenu({ path }: { path: string }) {
	const details = useRef<HTMLDetailsElement>(null);
	const { menuOpen, setMenuOpen } = useStore(navigationStore);
	// Preserve a native disclosure opened before hydration.
	useEffect(() => setMenuOpen(details.current?.open ?? false), [setMenuOpen]);
	return (
		<details
			className="mobile-menu"
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					setMenuOpen(false);
					event.currentTarget.open = false;
					event.currentTarget.querySelector("summary")?.focus();
				}
			}}
			onToggle={(event) => setMenuOpen(event.currentTarget.open)}
			open={menuOpen}
			ref={details}
		>
			<summary className="flex select-none items-center gap-4 list-none py-3 pr-0.5 pl-4 text-[15px]">
				Menu{" "}
				<Menu
					aria-hidden="true"
					className="menu-open-icon"
					size={22}
					strokeWidth={1.75}
				/>
				<X
					aria-hidden="true"
					className="menu-close-icon"
					size={22}
					strokeWidth={1.75}
				/>
			</summary>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Delegated clicks originate on native links, which also activate with the keyboard. */}
			<nav
				aria-label="Mobile navigation"
				onClick={(event) => {
					if ((event.target as Element).closest("a")) setMenuOpen(false);
				}}
			>
				{nav.map((item) => (
					<a
						aria-current={path.startsWith(item.href) ? "page" : undefined}
						href={item.href}
						key={item.href}
					>
						{item.label}
					</a>
				))}
				<Actions />
			</nav>
		</details>
	);
}
