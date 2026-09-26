/**
 * Minimal RFC 4180 CSV read/write — no dependency added (CLAUDE.md: ask before adding any
 * dependency not already in the brief) for a job this small: quote every field, double an
 * embedded quote, and a straightforward state-machine parser for the reverse. Good enough for
 * docs/i18n/bn_review.csv's own single-line Bangla/English cell values; not a general CSV
 * library (no multi-line quoted fields, no configurable delimiter).
 */
export function toCsvRow(fields: readonly string[]): string {
  return fields.map((f) => `"${f.replace(/"/g, '""')}"`).join(",") + "\r\n";
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // A final row with no trailing newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
