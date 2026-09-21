/**
 * Every value here is copied from docs/trek_layers.md, and only from the two layers marked
 * Status ☑ tested there — the brief is explicit that a tile URL must never be guessed, and
 * this file exists so nothing in map/ has to touch trek.nasa.gov's API docs directly.
 */
import type { Body } from "@sol-keeper/sim";

export interface TrekLayer {
  readonly urlTemplate: string;
  readonly maxNativeZoom: number;
  readonly tileSize: number;
  readonly attribution: string;
}

export const TREK_LAYERS: Record<Body, TrekLayer> = {
  moon: {
    urlTemplate:
      "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
    maxNativeZoom: 8,
    tileSize: 256,
    attribution: "NASA/GSFC/Arizona State University (LRO LROC WAC), via NASA Moon Trek",
  },
  mars: {
    urlTemplate:
      "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
    maxNativeZoom: 7,
    tileSize: 256,
    attribution: "NASA Ames / USGS Astrogeology Science Center (Viking Orbiter MDIM 2.1), via NASA Mars Trek",
  },
};
