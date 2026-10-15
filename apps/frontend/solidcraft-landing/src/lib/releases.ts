import { z } from 'zod';
import { platforms, architectures, packageKinds } from './download-utils.ts';
export { platforms, architectures, filterArtifacts, formatBytes } from './download-utils.ts';
export type { Artifact } from './download-utils.ts';

export function isReleaseAssetUrl(value: string, tag: string): boolean {
  try {
    const url = new URL(value);
    const prefix = `/bherbruck/solidcraft/releases/download/${encodeURIComponent(tag)}/`;
    const filename = decodeURIComponent(url.pathname.slice(prefix.length));
    return url.protocol === 'https:' && url.hostname === 'github.com' && !url.port && !url.username && !url.password
      && !url.search && !url.hash && url.pathname.startsWith(prefix)
      && filename.length > 0 && !/[\/\\]/.test(filename) && !['.', '..'].includes(filename);
  } catch { return false; }
}

export const artifactSchema = z.object({
  id: z.number().int().positive(), name: z.string().min(1),
  platform: z.enum(platforms), architecture: z.enum(architectures),
  kind: z.enum(packageKinds),
  bytes: z.number().int().positive(), url: z.url(),
  digest: z.string().regex(/^sha256:[a-f0-9]{64}$/).nullable(),
  signing: z.enum(['unsigned', 'unknown']), cli: z.enum(['yes', 'unknown']),
});
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1), repository: z.literal('bherbruck/solidcraft'),
  observedAt: z.iso.datetime(), tag: z.string().regex(/^v\d+\.\d+\.\d+$/),
  releaseId: z.number().int().positive(), publishedAt: z.iso.datetime(),
  channel: z.literal('release'), notes: z.url(), checksums: z.url().nullable(),
  verification: z.enum(['upstream-metadata-reviewed', 'github-api-validated']),
  artifacts: z.array(artifactSchema).min(1),
}).superRefine((snapshot, ctx) => {
  for (const artifact of snapshot.artifacts) {
    if (!isReleaseAssetUrl(artifact.url, snapshot.tag)) ctx.addIssue({ code: 'custom', message: `Untrusted asset: ${artifact.name}` });
    if (!decodeURIComponent(new URL(artifact.url).pathname).endsWith('/' + artifact.name)) ctx.addIssue({ code: 'custom', message: `Filename mismatch: ${artifact.name}` });
  }
  if (snapshot.checksums && !isReleaseAssetUrl(snapshot.checksums, snapshot.tag)) ctx.addIssue({ code: 'custom', message: 'Untrusted checksum URL' });
  if (snapshot.notes !== `https://github.com/bherbruck/solidcraft/releases/tag/${snapshot.tag}`) ctx.addIssue({ code: 'custom', message: 'Release notes mismatch' });
  if (new Set(snapshot.artifacts.map((a) => a.id)).size !== snapshot.artifacts.length) ctx.addIssue({ code: 'custom', message: 'Duplicate artifact IDs' });
});

export const formatDate = (value: string) => new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
export const isStale = (observedAt: string, now = Date.now()) => now - Date.parse(observedAt) > 14 * 86_400_000;

export type Release = z.infer<typeof snapshotSchema>;
