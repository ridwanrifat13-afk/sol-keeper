/**
 * "Load the snapshot first (instant, offline-safe), then upgrade to /api data if it
 * responds within 3 s" — the brief's client strategy for every place external data
 * appears, implemented once here rather than once per feature.
 */
import { useEffect, useState } from "react";
import type { Provenance } from "../../server-lib/types.js";

export type LiveOrSnapshotStatus = "loading" | Provenance;

export interface LiveOrSnapshotResult<T> {
  readonly data: T | undefined;
  readonly status: LiveOrSnapshotStatus;
}

const LIVE_UPGRADE_TIMEOUT_MS = 3000;

/**
 * `snapshotUrl` is a static asset under /snapshots (public/, precached by the service
 * worker for offline use); `liveUrl` is the matching /api route. The snapshot's own
 * `fetchedAt` is whatever the file says, not when the page happened to load, so a shown
 * fallback always states exactly when it was captured — and once a live response lands, a
 * slower-arriving snapshot response is not allowed to downgrade the display back.
 */
export function useLiveOrSnapshot<T extends { source: Provenance }>(
  snapshotUrl: string,
  liveUrl: string,
): LiveOrSnapshotResult<T> {
  const [state, setState] = useState<LiveOrSnapshotResult<T>>({ data: undefined, status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let liveWon = false;
    setState({ data: undefined, status: "loading" });

    fetch(snapshotUrl)
      .then((res) => (res.ok ? (res.json() as Promise<T>) : Promise.reject(new Error(`snapshot ${res.status}`))))
      .then((data) => {
        if (!cancelled && !liveWon) setState({ data, status: data.source });
      })
      .catch(() => {
        // No committed snapshot for this path — not fatal; the live attempt can still
        // succeed on its own and paint something.
      });

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, LIVE_UPGRADE_TIMEOUT_MS);
    fetch(liveUrl, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<T>) : Promise.reject(new Error(`live ${res.status}`))))
      .then((data) => {
        liveWon = true;
        if (!cancelled) setState({ data, status: data.source });
      })
      .catch(() => {
        // Timed out, offline, or the upstream NASA service failed — whatever the snapshot
        // fetch already put on screen stays exactly as it is.
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [snapshotUrl, liveUrl]);

  return state;
}
