import { useMemo } from "react";

interface StarfieldProps {
  readonly count?: number;
  readonly className?: string;
}

/**
 * A decorative starfield background — plain SVG dots, original art, never NASA imagery
 * (brief rule 5). Shared between M9.3's establishing shot and M9.4's habitat-view sky, so
 * both space-themed scenes use the same field instead of two near-identical ones.
 *
 * Positions are randomised once per mount. That's fine even though `packages/sim` forbids
 * `Math.random` (rule 2) — this component lives in `apps/web`, and nothing here is a
 * simulation input; it's decoration that never needs to reproduce identically twice.
 */
export function Starfield({ count = 60, className }: StarfieldProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.35,
      })),
    [count],
  );

  return (
    <svg
      className={`starfield${className !== undefined ? ` ${className}` : ""}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.opacity} />
      ))}
    </svg>
  );
}
