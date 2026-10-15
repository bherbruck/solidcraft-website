// Browser-safe display/selection helpers. Release validation stays at build time.
export const platforms = ['Windows', 'macOS', 'Linux', 'FreeBSD'] as const;
export const architectures = ['x64', 'ARM64', 'x86', 'Universal'] as const;
export const packageKinds = ['EXE installer', 'MSI installer', 'Portable ZIP', 'Disk image', 'AppImage', 'DEB', 'RPM', 'Flatpak', 'Snap', 'TAR archive', 'CLI ZIP'] as const;
export interface Artifact {
  id: number; name: string; platform: typeof platforms[number]; architecture: typeof architectures[number];
  kind: typeof packageKinds[number]; bytes: number; url: string; digest: string | null;
  signing: 'unsigned' | 'unknown'; cli: 'yes' | 'unknown';
}
export function filterArtifacts(artifacts: Artifact[], filters: { platform: string; architecture: string; kind: string }) {
  return artifacts.filter((a) => (!filters.platform || a.platform === filters.platform)
    && (!filters.architecture || a.architecture === filters.architecture)
    && (!filters.kind || a.kind === filters.kind));
}
export const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

export type Platform = typeof platforms[number];
export type DownloadChoice = Pick<Artifact, 'platform' | 'architecture' | 'kind' | 'url' | 'bytes'>;

export function detectPlatform({ userAgent, platform, maxTouchPoints = 0 }: { userAgent: string; platform: string; maxTouchPoints?: number }): Platform | null {
  if (/Android|iPhone|iPad|iPod/i.test(userAgent) || (/Mac/i.test(platform) && maxTouchPoints > 1)) return null;
  const identity = `${platform} ${userAgent}`;
  if (/Windows|Win32|Win64/i.test(identity)) return 'Windows';
  if (/Mac/i.test(identity)) return 'macOS';
  if (/FreeBSD/i.test(identity)) return 'FreeBSD';
  if (/Linux/i.test(identity)) return 'Linux';
  return null;
}

export function recommendArtifact<T extends DownloadChoice>(artifacts: T[], platform: Platform | null, architecture = '', kind = ''): T | null {
  if (!platform) return null;
  // macOS has a reviewed Universal build. Other systems need an explicit CPU choice.
  const selectedArchitecture = architecture || (platform === 'macOS' ? 'Universal' : '');
  if (!selectedArchitecture) return null;
  const candidates = artifacts.filter((a) => a.platform === platform && a.architecture === selectedArchitecture && (kind ? a.kind === kind : a.kind !== 'CLI ZIP'));
  const preferred = ['Disk image', 'EXE installer', 'MSI installer', 'AppImage', 'TAR archive', 'Portable ZIP'];
  for (const type of preferred) {
    const artifact = candidates.find((candidate) => candidate.kind === type);
    if (artifact) return artifact;
  }
  return candidates[0] || null;
}
