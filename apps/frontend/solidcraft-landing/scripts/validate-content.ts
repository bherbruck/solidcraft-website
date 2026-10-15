import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { progressPages, progressUnits } from '../src/lib/progress-routes.ts';
import { snapshotSchema } from '../src/lib/releases.ts';

const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const release = snapshotSchema.parse(await json('src/data/releases.json'));
z.object({ schemaVersion: z.literal(1), observedAt: z.iso.datetime(), product: z.object({ repository: z.literal('bherbruck/solidcraft'), revision: z.string().regex(/^[a-f0-9]{40}$/) }), kernel: z.object({ repository: z.literal('bherbruck/solidcore'), revision: z.string().regex(/^[a-f0-9]{40}$/) }), applicationTests: z.literal('not-executed') }).parse(await json('src/data/source-lock.json'));
const media = z.object({ assets: z.array(z.object({ path: z.string().startsWith('/'), bytes: z.number().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/), source: z.string().min(1), creator: z.string().min(1), license: z.string().min(1), transformation: z.string().min(1) })).min(1) }).parse(await json('src/data/media.json'));
for (const asset of media.assets) {
  if (asset.path.includes('..')) throw new Error(`Unsafe media path: ${asset.path}`);
  const data = await readFile(`public${asset.path}`);
  if (data.length !== asset.bytes || createHash('sha256').update(data).digest('hex') !== asset.sha256) throw new Error(`Media changed without provenance update: ${asset.path}`);
}
if (!progressUnits.length || new Set(progressUnits).size !== progressUnits.length || new Set(progressPages.map((page) => page.path)).size !== progressPages.length) throw new Error('Invalid progress route inventory.');
for (const notice of ['Website-MIT.txt', 'SolidCraft-MIT.txt', 'SolidCraft-Apache-2.0.txt', 'SolidCraft-ATTRIBUTION.md', 'IBM-Plex-Sans-OFL.txt', 'IBM-Plex-Mono-OFL.txt', 'SolidCore-LICENSE.txt', 'SolidCore-NOTICE.txt', 'SolidCore-ATTRIBUTION.md']) await stat(`public/notices/${notice}`);
console.log(`Content valid: ${release.tag}, ${release.artifacts.length} packages, ${media.assets.length} media assets, ${progressPages.length} live progress routes.`);
