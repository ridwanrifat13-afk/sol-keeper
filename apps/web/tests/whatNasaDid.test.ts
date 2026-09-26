/**
 * M10.8: `dial/whatNasaDid.ts` — the Mission Report's "What NASA did" card. Every card cites
 * an `IncidentDefinition.analogue` verbatim plus its real `SOURCE_REGISTRY` entry, and only
 * for incidents that actually triggered this run.
 */
import { describe, expect, it } from "vitest";
import { INCIDENT_CATALOG, type ActiveIncident } from "@sol-keeper/sim";
import { whatNasaDidCards } from "../src/dial/whatNasaDid.js";
import { SOURCE_REGISTRY } from "../src/data/sourceRegistry.js";

function incident(definitionId: string): ActiveIncident {
  return { id: `${definitionId}-42`, definitionId, triggeredAtHour: 42, cause: "42:0" };
}

describe("M10.8: whatNasaDidCards", () => {
  it("no active incidents produces no cards", () => {
    expect(whatNasaDidCards([])).toEqual([]);
  });

  it("one card per active incident, citing its own analogue and real source", () => {
    const def = INCIDENT_CATALOG[0]!;
    const cards = whatNasaDidCards([incident(def.id)]);
    expect(cards).toEqual([
      {
        incidentId: `${def.id}-42`,
        analogue: def.analogue,
        title: SOURCE_REGISTRY[def.sourceId].title,
        url: SOURCE_REGISTRY[def.sourceId].url,
      },
    ]);
  });

  it("one card per incident catalog entry, matching its own definition exactly", () => {
    const activeIncidents = INCIDENT_CATALOG.map((def) => incident(def.id));
    const cards = whatNasaDidCards(activeIncidents);
    expect(cards).toHaveLength(INCIDENT_CATALOG.length);
    for (const def of INCIDENT_CATALOG) {
      const card = cards.find((c) => c.incidentId === `${def.id}-42`);
      expect(card, `missing card for ${def.id}`).toBeDefined();
      expect(card?.analogue).toBe(def.analogue);
      expect(card?.title).toBe(SOURCE_REGISTRY[def.sourceId].title);
    }
  });

  it("an incident whose definitionId doesn't match any catalog entry is silently skipped, not thrown", () => {
    expect(whatNasaDidCards([incident("bogus-definition-id")])).toEqual([]);
  });
});
