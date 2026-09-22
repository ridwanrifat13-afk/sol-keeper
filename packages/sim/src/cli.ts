/**
 * Headless run summary — the M1 deliverable that proves the pipeline works before there is
 * any UI.
 *
 *   pnpm sim                      30 sols at Jezero, seed 1
 *   pnpm sim -- --seed 7 --sols 10
 *   pnpm sim -- --scenario first-light
 *
 * This is the one file in packages/sim allowed to touch the platform: it reads argv and
 * writes to stdout, and contains no simulation logic. The purity lint and
 * validation/purity.test.ts both exempt it by name.
 *
 * `--sols` still means Mars sols specifically (this CLI predates the Moon scenarios and
 * summarise() prints everything in sols) — passing it against a Moon scenario runs for that
 * many Mars-sol-lengths of hours, not lunar days. Fine for a quick debug slice; the web app
 * is where mission time is shown correctly per body (dial/missionTime.ts).
 */
import { getScenario } from "./data/scenarios/index.js";
import { createInitialState } from "./engine/state.js";
import { run } from "./engine/tick.js";
import type { LogEntry, Params, ScenarioId, SimState } from "./types.js";
import { hoursToSols, solsToHours } from "./units.js";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const raw = process.argv[i + 1];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function bar(fraction: number, width = 20): string {
  const filled = Math.max(0, Math.min(width, Math.round(fraction * width)));
  return `${"#".repeat(filled)}${".".repeat(width - filled)}`;
}

function countBy<T extends string>(items: readonly T[]): Map<T, number> {
  const out = new Map<T, number>();
  for (const item of items) out.set(item, (out.get(item) ?? 0) + 1);
  return out;
}

function summarise(state: SimState, params: Params, sols: number): void {
  const scenario = getScenario(params.scenarioId);
  const living = state.crew.filter((c) => c.alive);

  console.log("");
  console.log("=".repeat(72));
  console.log(`  SOL KEEPER — ${scenario.site.name} (${scenario.body})`);
  console.log(
    `  seed ${params.seed} | ${sols} sols requested | ended at hour ${state.hour} ` +
      `(sol ${hoursToSols(state.hour).toFixed(1)})`,
  );
  console.log("=".repeat(72));

  console.log(`  STATUS        ${state.status.toUpperCase()}  (${state.endReasonCode ?? "—"})`);
  console.log(`  CREW ALIVE    ${living.length} / ${state.crew.length}`);
  console.log("");

  console.log("  RESOURCES AT END");
  console.log(
    `    oxygen        ${state.atmosphere.o2Kg.toFixed(1)} kg  ` +
      `(pO2 ${state.atmosphere.o2PartialPressureMmHg.toFixed(0)} mmHg)`,
  );
  console.log(
    `    carbon diox.  ${state.atmosphere.co2Kg.toFixed(2)} kg  ` +
      `(pCO2 ${state.atmosphere.co2PartialPressureMmHg.toFixed(2)} mmHg)`,
  );
  console.log(
    `    water         ${state.water.potableKg.toFixed(1)} kg  ` +
      `(lost ${state.water.cumulativeLossKg.toFixed(1)} kg to the loop)`,
  );
  console.log(
    `    food          ${state.food.storedDryMassKg.toFixed(1)} kg dry  ` +
      `(harvested ${state.food.cumulativeHarvestKg.toFixed(1)} kg)`,
  );
  console.log(
    `    battery       ${state.power.batteryEnergyKwh.toFixed(1)} / ` +
      `${state.power.batteryCapacityKwh.toFixed(0)} kWh  ` +
      `[${bar(state.power.batteryEnergyKwh / state.power.batteryCapacityKwh)}]`,
  );
  console.log(`    cabin temp    ${state.thermal.habitatTempC.toFixed(1)} degC`);
  console.log(
    `    MOXIE oxygen  ${(state.isru.moxieO2ProducedKg * 1000).toFixed(0)} g  ` +
      `(real MOXIE made 122 g in its whole mission)`,
  );
  console.log(
    `    electrolysis  ${state.isru.electrolysisO2ProducedKg.toFixed(1)} kg oxygen from water`,
  );
  console.log("");

  console.log("  CREW");
  for (const c of state.crew) {
    const status = c.alive ? "alive" : "LOST ";
    console.log(
      `    ${c.name.padEnd(8)} ${status}  health [${bar(c.healthFraction, 12)}]  ` +
        `morale [${bar(c.moraleFraction, 12)}]  dose ${c.cumulativeDoseMSv.toFixed(1)} mSv`,
    );
  }
  console.log("");

  console.log("  SYSTEMS AT END");
  for (const s of Object.values(state.systems)) {
    console.log(
      `    ${s.id.padEnd(18)} ${s.operational ? "ok     " : "FAILED "} ` +
        `TRL ${s.trl}  spares ${s.spares}`,
    );
  }
  console.log("");

  const bySeverity = countBy(state.log.map((e) => e.severity));
  console.log(`  EVENT LOG — ${state.log.length} entries`);
  console.log(
    `    critical ${bySeverity.get("critical") ?? 0} | warning ${bySeverity.get("warning") ?? 0} ` +
      `| caution ${bySeverity.get("caution") ?? 0} | info ${bySeverity.get("info") ?? 0}`,
  );

  const codes = countBy(state.log.map((e) => e.code));
  const top = [...codes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log("    most frequent:");
  for (const [code, count] of top) {
    console.log(`      ${String(count).padStart(5)}  ${code}`);
  }

  const milestones: LogEntry[] = state.log.filter(
    (e) => e.kind === "milestone" || e.severity === "critical",
  );
  console.log("");
  console.log(`  FIRST 10 CRITICAL / MILESTONE EVENTS`);
  for (const e of milestones.slice(0, 10)) {
    const causes = e.causedBy?.length ? ` <- ${e.causedBy.join(",")}` : "";
    console.log(`    h${String(e.hour).padStart(4)}  ${e.code}${causes}`);
  }
  console.log("");
  console.log("=".repeat(72));
  console.log("");
}

function main(): void {
  const seed = arg("seed", 1);
  const sols = arg("sols", 30);
  const scenarioId = stringArg("scenario", "jezero-outpost") as ScenarioId;
  const scenario = getScenario(scenarioId); // throws with the known-scenario list if wrong

  const params: Params = {
    scenarioId,
    seed,
    crewSize: scenario.crewSize,
    missionStartIso: "2033-03-01",
    difficulty: "nominal",
  };

  const state = createInitialState(params);
  run(state, params, scenario, Math.ceil(solsToHours(sols)));
  summarise(state, params, sols);
}

main();
