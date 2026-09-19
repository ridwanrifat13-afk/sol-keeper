/**
 * Node 22+ ships a native, SQLite-backed `globalThis.localStorage` that warns on first
 * access unless `--localstorage-file` is set. Tests exercising store/dial.ts's persistence
 * trigger that warning on every run — noise, not a failure, since store/dial.ts already
 * treats storage access as best-effort. A small in-memory stand-in avoids both the warning
 * and ever touching a real file from a test run.
 */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) ?? null) : null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});
