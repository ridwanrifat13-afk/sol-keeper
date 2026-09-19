/**
 * Which Reality Dial level the player has chosen. Deliberately a separate store from the
 * run: restarting a mission should not reset how the player likes their numbers shown, and
 * this choice should survive a reload the way a settings choice normally does.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { DialLevel } from "../dial/types.js";

interface DialStore {
  level: DialLevel;
  setLevel: (level: DialLevel) => void;
}

/**
 * localStorage can throw (private browsing, blocked site data) or simply be unavailable.
 * That is a convenience default, not state the app depends on, so a failure here must never
 * break the reader — it falls back to "specialist" silently instead.
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

export const useDial = create<DialStore>()(
  persist(
    (set) => ({
      level: "specialist",
      setLevel: (level) => {
        set({ level });
      },
    }),
    {
      name: "sol-keeper.dial-level",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
