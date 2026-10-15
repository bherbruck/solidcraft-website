import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import {
	detectPlatform,
	formatBytes,
	type Platform,
	recommendArtifact,
} from "../lib/download-utils";
import { useRelease } from "../lib/use-release";
import { downloadStore } from "../stores/downloads";

export default function PlatformDownload() {
	const { artifacts } = useRelease();
	const filters = useStore(downloadStore, (state) => state.filters);
	const [detected, setDetected] = useState<Platform | null>(null);
	useEffect(() => setDetected(detectPlatform(navigator)), []);
	const platform = (filters.platform || detected) as Platform | null;
	const artifact = recommendArtifact(
		artifacts,
		platform,
		filters.architecture,
		filters.kind,
	);
	const href =
		artifact?.url ||
		(platform && platform !== "macOS" && !filters.architecture
			? "#download-architecture"
			: "#packages");
	const description = artifact
		? `${artifact.architecture} · ${artifact.kind} · ${formatBytes(artifact.bytes)}`
		: platform
			? `Choose the architecture and package for ${platform} below.`
			: "Choose your platform and package below.";
	return (
		<div className="platform-download" data-platform-download>
			<a className="button primary" href={href}>
				<Download aria-hidden="true" size={18} strokeWidth={1.5} />
				<span data-download-label>
					{platform ? `Download for ${platform}` : "Download for your platform"}
				</span>
			</a>
			<p className="small muted" data-download-description>
				{description}
			</p>
		</div>
	);
}
