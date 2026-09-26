/**
 * The append-only, causally linked event log (brief rule 4).
 *
 * The Black Box debrief has to answer "why did the crop tray die?" with a chain, not a
 * timestamp. Threading parent ids by hand through nine models would be forgotten exactly
 * where it matters, so causality is captured structurally instead: a stage opens a cause
 * scope with `because(...)`, and everything logged inside that scope — however deep — is
 * recorded as an effect of it.
 */
import type { EventId, LogEntry, LogKind, Severity, SimState, SystemId } from "../types.js";

export interface LogInput {
  readonly kind: LogKind;
  readonly severity: Severity;
  readonly code: string;
  readonly data?: Readonly<Record<string, number | string>>;
  readonly system?: SystemId;
  /** Extra parents beyond the enclosing cause scope. */
  readonly causedBy?: readonly EventId[];
}

/**
 * Transient per-tick writer over `state.log`. Not stored in the state: the entries are the
 * durable part, this is just the pen.
 */
export class EventLogger {
  private seq: number;
  private readonly causeStack: EventId[] = [];

  constructor(
    private readonly entries: LogEntry[],
    private readonly hour: number,
  ) {
    // M10.3: a second logger for an hour the first one already wrote to (the player-decision
    // path in apps/web's store/run.ts builds one of these per action, not per tick, so an
    // hour that already had a tick's own logger gets a second instance here) must not restart
    // `seq` at 0 — that collides with `${hour}:0` the first logger already assigned, a real,
    // reproduced bug (Jezero seed 7: a duplicate "4:0" after the tick had already written
    // 4:0-4:3), and a duplicate EventId silently corrupts `rootCauses`/`causalCascade` (both
    // key by id) and any UI keyed on `entry.id`. Entries for one hour are always contiguous
    // at the tail of an append-only, hour-ordered log, so scanning backward from the end
    // until the hour changes finds every `seq` already used this hour, cheaply.
    let nextSeq = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry === undefined || entry.hour !== hour) break;
      const used = Number(entry.id.slice(entry.id.indexOf(":") + 1));
      if (Number.isFinite(used) && used >= nextSeq) nextSeq = used + 1;
    }
    this.seq = nextSeq;
  }

  /** Appends an entry and returns its id, so callers can use it as an explicit parent. */
  log(input: LogInput): EventId {
    const id: EventId = `${this.hour}:${this.seq++}`;

    const parents = [...this.causeStack, ...(input.causedBy ?? [])];
    const unique = [...new Set(parents)];

    const entry: LogEntry = {
      id,
      hour: this.hour,
      kind: input.kind,
      severity: input.severity,
      code: input.code,
      data: input.data ?? {},
      ...(unique.length > 0 ? { causedBy: unique } : {}),
      ...(input.system !== undefined ? { system: input.system } : {}),
    };
    this.entries.push(entry);
    return id;
  }

  /**
   * Logs only when a *persistent* condition changes, not every hour it holds.
   *
   * Without this a 60-hour dust storm writes 60 identical "grow lights off" entries and the
   * debrief drowns: a first pass at Jezero produced 737 entries for 740 hours, almost all of
   * them repeats. An entry is suppressed when the same key was already logged in the
   * previous hour, so a condition that lapses and returns is recorded again — the edges are
   * what a reader needs, and the edges are what the causal graph needs too.
   *
   * `dedupeKey` distinguishes states of the same condition: a brownout shedding three
   * systems is a different event from one shedding one.
   */
  logEdge(input: LogInput & { readonly dedupeKey?: string }): EventId | undefined {
    const key = `${input.code}|${input.system ?? ""}|${input.dedupeKey ?? ""}`;
    const previousHour = this.hour - 1;

    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      if (entry === undefined || entry.hour < previousHour) break;
      if (entry.hour !== previousHour) continue;
      const entryKey = `${entry.code}|${entry.system ?? ""}|${entry.data["dedupeKey"] ?? ""}`;
      if (entryKey === key) return undefined;
    }

    const data =
      input.dedupeKey === undefined ? input.data : { ...input.data, dedupeKey: input.dedupeKey };
    return this.log({ ...input, ...(data !== undefined ? { data } : {}) });
  }

  /**
   * Runs `body` with `cause` pushed as the parent of everything logged inside it.
   * Scopes nest, so a fault inside a brownout inside a dust storm records all three.
   */
  because<T>(cause: EventId, body: () => T): T {
    this.causeStack.push(cause);
    try {
      return body();
    } finally {
      this.causeStack.pop();
    }
  }
}

// ---------------------------------------------------------------------------
// Replay helpers — used by the M3 Black Box view
// ---------------------------------------------------------------------------

/** Every entry that names `id` among its causes, i.e. its direct effects. */
export function directEffects(log: readonly LogEntry[], id: EventId): LogEntry[] {
  return log.filter((e) => e.causedBy?.includes(id) ?? false);
}

/** The full downstream cascade from one entry, in log order, without repeats. */
export function causalCascade(log: readonly LogEntry[], rootId: EventId): LogEntry[] {
  const seen = new Set<EventId>([rootId]);
  const out: LogEntry[] = [];
  const queue: EventId[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const effect of directEffects(log, current)) {
      if (seen.has(effect.id)) continue;
      seen.add(effect.id);
      out.push(effect);
      queue.push(effect.id);
    }
  }
  return out.sort((a, b) => a.hour - b.hour || a.id.localeCompare(b.id));
}

/** Walks backwards from an entry to the root causes that led to it. */
export function rootCauses(log: readonly LogEntry[], id: EventId): LogEntry[] {
  const byId = new Map(log.map((e) => [e.id, e]));
  const roots: LogEntry[] = [];
  const seen = new Set<EventId>();
  const queue: EventId[] = [id];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const entry = byId.get(current);
    if (entry === undefined) continue;
    const parents = entry.causedBy ?? [];
    if (parents.length === 0 && current !== id) {
      roots.push(entry);
      continue;
    }
    for (const parent of parents) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      queue.push(parent);
    }
  }
  return roots;
}

/** Convenience for tests and the CLI. */
export function entriesWithCode(state: SimState, code: string): LogEntry[] {
  return state.log.filter((e) => e.code === code);
}
