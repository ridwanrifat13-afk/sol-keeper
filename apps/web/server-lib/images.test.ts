/**
 * Parser test against the real saved NASA Image and Video Library samples — checks that
 * the per-item metadata (nested under `data[0]`, not on the item) and the thumbnail
 * (whichever link has `rel: "preview"`, not the first link) are pulled from the right place.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeImagesResponse } from "./images.js";

const samplesDir = fileURLToPath(new URL("../../../docs/api-samples/", import.meta.url));
const loadSample = (name: string): unknown => JSON.parse(readFileSync(`${samplesDir}${name}`, "utf-8"));

describe("normalizeImagesResponse", () => {
  it("trims the real MOXIE sample to exactly the four contract fields, from the right nesting", () => {
    const raw = loadSample("images_moxie.json") as Parameters<typeof normalizeImagesResponse>[0];
    const items = normalizeImagesResponse(raw);
    expect(items.length).toBeGreaterThan(0);
    const first = items[0]!;
    expect(Object.keys(first).sort()).toEqual(["credit", "nasaId", "thumbUrl", "title"]);
    expect(first.thumbUrl).toContain("~thumb.jpg"); // the "preview" link, not "~small.jpg"
    expect(first.credit.length).toBeGreaterThan(0);
  });

  it("parses the real Veggie sample too", () => {
    const raw = loadSample("images_veggie.json") as Parameters<typeof normalizeImagesResponse>[0];
    const items = normalizeImagesResponse(raw);
    expect(items.length).toBeGreaterThan(0);
  });

  it("skips an item with no preview link rather than returning a broken thumbUrl", () => {
    const items = normalizeImagesResponse({
      collection: {
        items: [
          { data: [{ nasa_id: "X1", title: "No preview" }], links: [{ href: "full.jpg", rel: "orig" }] },
          {
            data: [{ nasa_id: "X2", title: "Has preview", secondary_creator: "NASA" }],
            links: [{ href: "thumb.jpg", rel: "preview" }],
          },
        ],
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.nasaId).toBe("X2");
  });

  it("falls back to center when secondary_creator is absent, and to NASA if neither is present", () => {
    const items = normalizeImagesResponse({
      collection: {
        items: [
          { data: [{ nasa_id: "A", title: "t", center: "JPL" }], links: [{ href: "a.jpg", rel: "preview" }] },
          { data: [{ nasa_id: "B", title: "t" }], links: [{ href: "b.jpg", rel: "preview" }] },
        ],
      },
    });
    expect(items.find((i) => i.nasaId === "A")?.credit).toBe("JPL");
    expect(items.find((i) => i.nasaId === "B")?.credit).toBe("NASA");
  });
});
