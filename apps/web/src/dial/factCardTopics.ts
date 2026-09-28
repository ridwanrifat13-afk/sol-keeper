import type { ImageQueryKey } from "../../server-lib/validate.js";

/** Which whitelisted image topic fits the current mission body — real fact-card photos,
 *  chosen by what the player is actually doing rather than a fixed, generic set. Shared by
 *  PowerConsole and MissionCommandConsole so the same scenario shows the same power topic
 *  in both places. */
export function powerFactCardTopicFor(body: "mars" | "moon"): ImageQueryKey {
  return body === "mars" ? "moxie" : "lunar-south-pole";
}
