import { createStore } from "zustand/vanilla";

interface NavigationState {
	menuOpen: boolean;
	setMenuOpen: (open: boolean) => void;
}
export const createNavigationStore = () =>
	createStore<NavigationState>()((set) => ({
		menuOpen: false,
		setMenuOpen: (menuOpen) => set({ menuOpen }),
	}));
export const navigationStore = createNavigationStore();
