/**
 * The /api contract, shared by the functions and the client.
 *
 * Type-only on purpose. `apps/web/src` imports these with `import type`, which TypeScript
 * erases, so no server code can ever reach the browser bundle — the thing that would leak
 * NASA_API_KEY handling into client JavaScript.
 */

export type Provenance = "live" | "snapshot";

/** Every successful payload carries where it came from and when. */
export interface Sourced {
  readonly source: Provenance;
  /** ISO timestamp of the upstream fetch. */
  readonly fetchedAt: string;
}

export interface HealthResponse extends Sourced {
  readonly status: "ok";
  readonly service: "sol-keeper";
  /** Proof that the @sol-keeper/sim workspace package resolved inside the function. */
  readonly sim: {
    readonly resolved: true;
    readonly constantCount: number;
    readonly scenarioIds: readonly string[];
  };
}

export type SpaceWeatherType = "FLR" | "SEP" | "CME" | "GST";

export interface SpaceWeatherEvent {
  readonly type: SpaceWeatherType;
  readonly startTime: string;
  readonly classType?: string;
  readonly link?: string;
}

export interface SpaceWeatherResponse extends Sourced {
  readonly events: readonly SpaceWeatherEvent[];
}

export interface LightTimeResponse extends Sourced {
  readonly body: "mars" | "moon";
  readonly distanceAu: number;
  readonly distanceKm: number;
  readonly oneWayLightSeconds: number;
}

export interface NasaImage {
  readonly nasaId: string;
  readonly title: string;
  readonly thumbUrl: string;
  readonly credit: string;
}

export interface NasaImagesResponse extends Sourced {
  readonly items: readonly NasaImage[];
}

/** Returned with HTTP 400 for a bad request, or 502 when an upstream NASA service fails. */
export interface ApiError {
  readonly error: string;
  readonly fallback?: "snapshot";
}
