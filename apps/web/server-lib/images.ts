/**
 * NASA Image and Video Library: real mission photos for "what NASA did" fact cards
 * (the cards themselves are M6 scope; this endpoint and its data shape are M5's job).
 *
 * Checked against docs/api-samples/images_{moxie,veggie}.json: each result item's
 * metadata lives in `item.data[0]`, not on the item itself, and the thumbnail is whichever
 * entry in `item.links[]` has `rel: "preview"` — not necessarily the first link.
 */
import type { NasaImage } from "./types.js";

interface RawImageLink {
  readonly href: string;
  readonly rel: string;
}

interface RawImageItem {
  readonly data: readonly {
    readonly nasa_id: string;
    readonly title: string;
    readonly secondary_creator?: string;
    readonly center?: string;
  }[];
  readonly links?: readonly RawImageLink[];
}

interface RawImagesSearchResponse {
  readonly collection: {
    readonly items: readonly RawImageItem[];
  };
}

/** Trims a raw images-api.nasa.gov search response to exactly the four contract fields. */
export function normalizeImagesResponse(raw: RawImagesSearchResponse): NasaImage[] {
  const out: NasaImage[] = [];
  for (const item of raw.collection.items) {
    const meta = item.data[0];
    if (!meta) continue;
    const preview = item.links?.find((l) => l.rel === "preview");
    if (!preview) continue; // No usable thumbnail — not worth showing on a fact card.
    out.push({
      nasaId: meta.nasa_id,
      title: meta.title,
      thumbUrl: preview.href,
      credit: meta.secondary_creator ?? meta.center ?? "NASA",
    });
  }
  return out;
}
