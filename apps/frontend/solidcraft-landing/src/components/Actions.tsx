import { AppWindow, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { site } from "../data/site";
import { detectPlatform, type Platform } from "../lib/download-utils";

export default function Actions({ compact = false }: { compact?: boolean }) {
	const [platform, setPlatform] = useState<Platform | null>(null);
	useEffect(() => setPlatform(detectPlatform(navigator)), []);
	return (
		<div className={`actions${compact ? " compact" : ""}`}>
			<a className="button primary" href="/download/">
				<Download aria-hidden="true" size={18} strokeWidth={1.5} />
				{compact
					? "Download"
					: platform
						? `Download for ${platform}`
						: "Download SolidCraft"}
			</a>
			<a className="button secondary" href={site.app}>
				<AppWindow aria-hidden="true" size={18} strokeWidth={1.5} />
				Try in your browser
			</a>
		</div>
	);
}
