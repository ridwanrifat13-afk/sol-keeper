/**
 * Whether the player has completed (or skipped) the First Light onboarding tutorial
 * (M8.7, brief: "first launch runs the 'First Light' tutorial with coach marks, introducing
 * one station at a time"), and which step they're on while it's running. Same
 * `persist`-backed, best-effort-localStorage pattern as store/dial.ts — a settings choice
 * that should survive a reload the way `useDial`'s own choice does, and must never crash the
 * app if storage is unavailable (private browsing, blocked site data).
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

interface OnboardingStore {
  seen: boolean;
  step: number;
  next: (totalSteps: number) => void;
  skip: () => void;
}

const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Best-effort only.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Best-effort only.
    }
  },
};

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      seen: false,
      step: 0,

      next: (totalSteps) => {
        const { step } = get();
        if (step + 1 >= totalSteps) {
          set({ seen: true });
        } else {
          set({ step: step + 1 });
        }
      },

      skip: () => {
        set({ seen: true });
      },
    }),
    {
      name: "sol-keeper.onboarding",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
