import { createStore } from 'zustand/vanilla';
import snapshot from '../data/releases.json';
import { normalizeRelease } from './normalize-release';
import { snapshotSchema, type Release } from './releases';

export const releaseEndpoint = 'https://api.github.com/repos/bherbruck/solidcraft/releases/latest';
export const releaseCacheKey = 'solidcraft:release:v1';
export const releaseCacheTTL = 5 * 60 * 1000;
type Listener = (release: Release, unavailable: boolean) => void;
export const releaseStore = createStore<{ release: Release; unavailable: boolean }>()(() => ({
  release: snapshotSchema.parse(snapshot), unavailable: false,
}));
let started = false;
let lastAttempt = 0;
let pending: Promise<void> | undefined;

export function readCachedRelease(value: string | null, now = Date.now()): Release | null {
  try {
    const release = snapshotSchema.parse(JSON.parse(value || 'null'));
    const age = now - Date.parse(release.observedAt);
    return release.verification === 'github-api-validated' && age >= 0 ? release : null;
  } catch { return null; }
}

async function refresh() {
  if (pending || Date.now() - lastAttempt < releaseCacheTTL) return;
  lastAttempt = Date.now();
  pending = (async () => {
    try {
      const response = await fetch(releaseEndpoint, {
        headers: { Accept: 'application/vnd.github+json' },
        credentials: 'omit', signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const release = normalizeRelease(await response.json(), new Date().toISOString(), true);
      releaseStore.setState({ release, unavailable: false });
      try { localStorage.setItem(releaseCacheKey, JSON.stringify(release)); } catch { /* Storage is optional. */ }
    } catch { releaseStore.setState({ unavailable: true }); }
  })();
  await pending;
  pending = undefined;
}

// One request/timer per document, shared by Astro metadata and React islands.
export function startReleaseUpdates() {
  if (!started) {
    started = true;
    try {
      const cached = readCachedRelease(localStorage.getItem(releaseCacheKey));
      if (cached) { releaseStore.setState({ release: cached }); lastAttempt = Date.parse(cached.observedAt); }
    } catch { /* Private browsing and disabled storage still fetch normally. */ }
    window.setInterval(() => { if (!document.hidden) void refresh(); }, releaseCacheTTL);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  }
  void refresh();
}

export function watchReleases(listener: Listener) {
  startReleaseUpdates();
  const { release, unavailable } = releaseStore.getState();
  listener(release, unavailable);
  return releaseStore.subscribe((state) => listener(state.release, state.unavailable));
}
