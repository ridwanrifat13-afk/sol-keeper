/**
 * Low-power mode (M9.4c): a manual override for the same reduced-motion behaviour
 * `@media (prefers-reduced-motion: reduce)` already gives an OS-level preference —
 * `navigator.deviceMemory` is Chromium-only and no reliable cross-browser "low-end device"
 * signal exists (the M9 plan's own conclusion), so this is a player choice, not
 * auto-detected. Persisted the same way the Reality Dial level is (store/dial.ts's pattern):
 * a settings choice, separate from any one mission, that should survive a reload.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

interface AccessibilityStore {
  lowPowerMode: boolean;
  setLowPowerMode: (lowPowerMode: boolean) => void;
}

/**
 * localStorage can throw (private browsing, blocked site data) or simply be unavailable.
 * That is a convenience default, not state the app depends on, so a failure here must never
 * break the reader — it falls back to "off" silently instead.
 */
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

export const useAccessibility = create<AccessibilityStore>()(
  persist(
    (set) => ({
      lowPowerMode: false,
      setLowPowerMode: (lowPowerMode) => {
        set({ lowPowerMode });
      },
    }),
    {
      name: "sol-keeper.low-power-mode",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
