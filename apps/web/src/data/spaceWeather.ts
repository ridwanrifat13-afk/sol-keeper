/**
 * Space weather needs one more rule than the generic live-or-snapshot race
 * (data/liveOrSnapshot.ts): DONKI returning zero events is a normal, correct "quiet
 * period" response, not a failure — and an empty Live Sky teaches the wrong lesson. The
 * brief calls for falling back to the snapshot's real historical event and labeling it
 * "historical event" rather than showing nothing, which the generic hook has no way to
 * express (it only knows "snapshot" vs "live", not "live, and it says nothing happened").
 */
import { useEffect, useState } from "react";
import type { SpaceWeatherResponse } from "../../server-lib/types.js";

export type SpaceWeatherStatus = "loading" | "live" | "historical" | "snapshot";

export interface SpaceWeatherDisplay {
  readonly events: SpaceWeatherResponse["events"];
  readonly status: SpaceWeatherStatus;
  readonly fetchedAt?: string;
}

const LIVE_TIMEOUT_MS = 3000;
type LiveState = { readonly kind: "pending" } | { readonly kind: "failed" } | { readonly kind: "ok"; readonly data: SpaceWeatherResponse };

export function useSpaceWeather(days = 14): SpaceWeatherDisplay {
  const [snapshot, setSnapshot] = useState<SpaceWeatherResponse>();
  const [live, setLive] = useState<LiveState>({ kind: "pending" });

  useEffect(() => {
    let cancelled = false;
    setSnapshot(undefined);
    setLive({ kind: "pending" });

    fetch("/snapshots/space-weather.json")
      .then((res) => (res.ok ? (res.json() as Promise<SpaceWeatherResponse>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        // No committed snapshot — the live attempt below can still succeed on its own.
      });

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, LIVE_TIMEOUT_MS);
    fetch(`/api/space-weather?days=${days}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<SpaceWeatherResponse>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!cancelled) setLive({ kind: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setLive({ kind: "failed" });
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [days]);

  if (live.kind === "ok" && live.data.events.length > 0) {
    return { events: live.data.events, status: "live", fetchedAt: live.data.fetchedAt };
  }
  if (live.kind === "ok" && live.data.events.length === 0) {
    // A confirmed quiet period: DONKI itself has nothing recent, so show the snapshot's
    // real event and say plainly that it's history, not happening now.
    if (snapshot) return { events: snapshot.events, status: "historical", fetchedAt: snapshot.fetchedAt };
    return { events: [], status: "live", fetchedAt: live.data.fetchedAt };
  }
  // live is still pending, or it failed outright — either way, show the snapshot the
  // instant it's available rather than waiting on the live attempt to settle.
  if (snapshot) {
    return { events: snapshot.events, status: "snapshot", fetchedAt: snapshot.fetchedAt };
  }
  return { events: [], status: "loading" };
}
