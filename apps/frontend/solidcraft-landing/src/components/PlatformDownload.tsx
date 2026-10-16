import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import {
	type Architecture,
	detectDownloadSystem,
	formatBytes,
	type Platform,
	recommendArtifact,
} from "../lib/download-utils";
import { releaseStore } from "../lib/release-client";
import { useRelease } from "../lib/use-release";
import { downloadStore } from "../stores/downloads";

export default function PlatformDownload() {
	const { artifacts } = useRelease();
	const ready = useStore(releaseStore, (state) => state.ready);
	const filters = useStore(downloadStore, (state) => state.filters);
	const [detected, setDetected] = useState<{
		platform: Platform | null;
		architecture: Architecture | "";
	} | null>(null);
	const attempted = useRef(false);
	const link = useRef<HTMLAnchorElement>(null);
	const [started, setStarted] = useState(false);
	useEffect(() => {
		let active = true;
		void detectDownloadSystem(navigator).then((system) => {
			if (active) setDetected(system);
		});
		return () => {
			active = false;
		};
	}, []);
	const platform = (filters.platform ||
		detected?.platform ||
		null) as Platform | null;
	const architecture =
		filters.architecture ||
		(platform === detected?.platform ? detected?.architecture : "") ||
		"";
	const artifact = recommendArtifact(
		artifacts,
		platform,
		architecture,
		filters.kind,
	);
	useEffect(() => {
		if (!ready || !detected || attempted.current) return;
		attempted.current = true;
		if (!artifact || filters.platform || filters.architecture || filters.kind)
			return;
		link.current?.click();
		setStarted(true);
	}, [ready, detected, artifact, filters]);
	const href =
		artifact?.url ||
		(platform && platform !== "macOS" && !architecture
			? "#download-architecture"
			: "#packages");
	const description = artifact
		? `${artifact.architecture} · ${artifact.kind} · ${formatBytes(artifact.bytes)}`
		: platform
			? `Choose the architecture and package for ${platform} below.`
			: "Choose your platform and package below.";
	return (
		<div className="platform-download" data-platform-download>
			<a
				className="button primary"
				href={href}
				onClick={() => {
					attempted.current = true;
				}}
				ref={link}
			>
				<Download aria-hidden="true" size={18} strokeWidth={1.5} />
				<span data-download-label>
					{platform ? `Download for ${platform}` : "Download for your platform"}
				</span>
			</a>
			<p className="small muted" data-download-description>
				{description}
			</p>
			<p className="small muted" data-auto-download-status role="status">
				{started
					? "Your download should start automatically. If it doesn’t, use the download button. Other platforms and formats are listed below."
					: "Choose from all platforms and formats below."}
			</p>
		</div>
	);
}
