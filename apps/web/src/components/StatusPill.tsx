import type { StatusPresentation } from "./status.js";

/**
 * A filled status pill — icon + word on a tinted background (styles.css's `.status-pill`,
 * combined with the same `.is-nominal`/`.is-caution`/`.is-critical` classes `.gauge`/`.crew-row`
 * already use). One shared component so every pill across Mission Command/Habitat renders the
 * glyph the same way, rather than each call site repeating the `<span aria-hidden>{glyph}</span>`
 * markup (rule 6: the glyph and word are what carry the status, never the tint alone).
 */
export function StatusPill({ status, label }: { status: StatusPresentation; label?: string }) {
  return (
    <span className={`status-pill ${status.className}`}>
      <span aria-hidden="true">{status.glyph}</span> {label ?? status.label}
    </span>
  );
}
