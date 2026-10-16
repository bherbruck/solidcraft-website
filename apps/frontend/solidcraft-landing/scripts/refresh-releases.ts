import { writeFile } from "node:fs/promises";
import { normalizeRelease } from "../src/lib/normalize-release.ts";

const tag = process.argv[2];
if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag))
	throw new Error(
		"Usage: pnpm releases:refresh vX.Y.Z. Choose a specific release for review.",
	);
const response = await fetch(
	`https://api.github.com/repos/tangency-labs/solidcraft/releases/tags/${tag}`,
	{
		headers: {
			Accept: "application/vnd.github+json",
			"User-Agent": "solidcraft-website",
		},
	},
);
if (!response.ok)
	throw new Error(
		`GitHub returned ${response.status}; existing snapshot left intact.`,
	);
const snapshot = normalizeRelease(
	await response.json(),
	new Date().toISOString(),
);
// A refresh proposes metadata. It never overwrites the input used by builds.
await writeFile(
	"src/data/release-candidate.json",
	`${JSON.stringify(snapshot, null, 2)}\n`,
	{
		flag: "wx",
	},
);
console.log(
	`Proposed ${snapshot.tag}: ${snapshot.artifacts.length} packages. Review release-candidate.json and signing/CLI facts before replacing releases.json.`,
);
