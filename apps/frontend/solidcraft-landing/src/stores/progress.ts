import { createStore } from 'zustand/vanilla';
import { type OnlineProgress, parseOnlineProgress } from '../lib/progress-client';
import { type ProgressPage, progressOrigin } from '../lib/progress-routes';

export const progressRefreshInterval = 5 * 60_000;
interface ProgressState {
  phase: 'loading' | 'ready' | 'error';
  report: OnlineProgress | null;
  load: (url: string, force?: boolean) => Promise<void>;
  fail: () => void;
  dispose: () => void;
}
export function createProgressStore(page: ProgressPage) {
  let controller: AbortController | undefined;
  let lastAttempt = 0;
  return createStore<ProgressState>()((set) => ({
    phase: 'loading',
    report: null,
    load: async (url, force = false) => {
      if (!force && Date.now() - lastAttempt < progressRefreshInterval) return;
      lastAttempt = Date.now();
      controller?.abort();
      const request = new AbortController();
      controller = request;
      set({ phase: 'loading', report: null });
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok || !response.url.startsWith(progressOrigin))
          throw new Error('Upstream request failed.');
        const report = parseOnlineProgress(await response.text(), url, page);
        if (!request.signal.aborted) set({ phase: 'ready', report });
      } catch {
        // Fail closed: never retain earlier results or substitute checked-in data.
        if (!request.signal.aborted) set({ phase: 'error', report: null });
      }
    },
    fail: () => set({ phase: 'error', report: null }),
    dispose: () => controller?.abort(),
  }));
}
