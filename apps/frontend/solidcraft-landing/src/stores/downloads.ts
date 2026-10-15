import { createStore } from 'zustand/vanilla';

export interface DownloadFilters {
  platform: string;
  architecture: string;
  kind: string;
}
interface DownloadState {
  filters: DownloadFilters;
  ready: boolean;
  enable: () => void;
  setFilter: (field: keyof DownloadFilters, value: string) => void;
  resetFilters: () => void;
}
const emptyFilters = (): DownloadFilters => ({ platform: '', architecture: '', kind: '' });
export const createDownloadStore = () =>
  createStore<DownloadState>()((set) => ({
    filters: emptyFilters(),
    ready: false,
    enable: () => set({ ready: true }),
    setFilter: (field, value) =>
      set((state) => ({ filters: { ...state.filters, [field]: value } })),
    resetFilters: () => set({ filters: emptyFilters() }),
  }));
// Shared by the separately hydrated selector and platform download button.
// UI selections are page-local; only public release metadata is cached.
export const downloadStore = createDownloadStore();
