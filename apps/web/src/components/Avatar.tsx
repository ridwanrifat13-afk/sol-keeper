/**
 * An initials avatar — no photo exists or should be invented for a crew member, so this is a
 * real, honest substitute (two letters, not a fabricated portrait), coloured by the same real
 * status tier (`.is-nominal`/`.is-caution`/`.is-critical`) already driving that person's other
 * indicators — decorative colour on top of the initials, which are the actual content.
 */
export function Avatar({ name, statusClassName }: { name: string; statusClassName?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className={`avatar-circle ${statusClassName ?? ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}
