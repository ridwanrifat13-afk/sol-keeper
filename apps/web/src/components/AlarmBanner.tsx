import type { ReactNode } from "react";
import { STATUS } from "./status.js";

interface AlarmBannerProps {
  /** Only the two levels an alarm banner actually uses — a "nominal" banner would be a
   *  contradiction in terms, so `StatusLevel`'s third value is deliberately excluded here. */
  readonly severity: "caution" | "critical";
  /** Overrides `STATUS`'s own glyph for this one hazard (e.g. "☢" for a radiation event) —
   *  the severity's colour/pattern/border still come from `STATUS[severity]` either way, so
   *  this never becomes a second, uncontrolled way to signal severity (rule 6 still holds:
   *  glyph, word, and colour all agree, this just picks a more specific glyph than the
   *  generic three-level one). */
  readonly glyph?: string;
  readonly children: ReactNode;
}

/**
 * M9.6: one shared alarm banner, replacing three near-identical `<p className="inline-alert
 * ...">` blocks (PowerConsole's shortfall notice, HabitatView's solar-particle-event and
 * depressurization warnings) that had each hand-rolled the same glyph+word+colour pattern.
 * Severity is a real prop now, not implied by whichever `STATUS` constant a given call site
 * happened to reach for — Power's shortfall is a caution, Habitat's two hazards are critical,
 * and that distinction is visible (border/text colour and the diagonal `--pattern` fill
 * `.inline-alert` already carries), never colour alone (rule 6).
 */
export function AlarmBanner({ severity, glyph, children }: AlarmBannerProps) {
  const presentation = STATUS[severity];
  return (
    <p className={`inline-alert ${presentation.className}`}>
      <span aria-hidden="true">{glyph ?? presentation.glyph}</span> {children}
    </p>
  );
}
