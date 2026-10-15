import { useEffect } from 'react';
import { useStore } from 'zustand';
import { releaseStore, startReleaseUpdates } from './release-client';

export function useRelease() {
  const release = useStore(releaseStore, (state) => state.release);
  useEffect(startReleaseUpdates, []);
  return release;
}
