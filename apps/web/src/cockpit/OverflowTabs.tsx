import { useState, type ReactNode } from "react";

/**
 * M9.1's overflow rule: "if there are more panels than usable regions, the lowest-priority
 * regions get a tabbed container (small tabs inside the screen), NOT hidden content."
 *
 * Every overflowed panel is portaled into its own slot here (StationCockpit.tsx), always —
 * this component only controls which ONE slot is visible at a time via CSS, so a panel's own
 * component never unmounts/remounts (and so never loses state) just because its tab isn't the
 * active one.
 */
export function OverflowTabs({
  tabs,
  slot,
}: {
  readonly tabs: readonly { readonly id: string; readonly label: string }[];
  /** Renders the (always-mounted) content slot for one panel id — CSS-hidden when `id` isn't
   *  the active tab. */
  readonly slot: (id: string) => ReactNode;
}) {
  const [active, setActive] = useState<string | undefined>(tabs[0]?.id);
  const activeId = active !== undefined && tabs.some((t) => t.id === active) ? active : tabs[0]?.id;

  if (tabs.length === 0) return null;

  return (
    <div className="cockpit-overflow">
      <div className="cockpit-overflow-tabs" role="tablist" aria-label="More panels">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            className={`cockpit-overflow-tab ${tab.id === activeId ? "cockpit-overflow-tab-active" : ""}`}
            onClick={() => {
              setActive(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="cockpit-overflow-body">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            hidden={tab.id !== activeId}
            className="cockpit-overflow-panel"
          >
            {slot(tab.id)}
          </div>
        ))}
      </div>
    </div>
  );
}
