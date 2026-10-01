import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiLink } from "react-icons/fi";

interface CopyLinkButtonProps {
  readonly label: string;
  /** Deferred, not a plain `url` prop: `window.location` (the origin/pathname `buildRunLinkUrl`
   *  needs) must only ever be read inside a click handler, never at render time — the same
   *  discipline `share/bootRunLink.ts`'s own doc comment establishes, so this component stays
   *  usable under the app's SSR-based render tests (`window` doesn't exist there). */
  readonly buildUrl: () => string;
}

/**
 * M10.7: "Create class link" / "Copy report link" — one shared button for both, since both
 * are "hand someone a URL" with the same two failure modes to cover: the Clipboard API can be
 * unavailable (a non-secure origin, some in-app browsers) or silently rejected (a permission
 * prompt the player dismisses), so a write that doesn't provably succeed always falls back to
 * a visible, selectable, read-only field — never a button that claims success it can't back up.
 */
export function CopyLinkButton({ label, buildUrl }: CopyLinkButtonProps) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="copy-link">
      <button
        type="button"
        className="btn"
        onClick={() => {
          const built = buildUrl();
          setUrl(built);
          setCopied(false);
          // `navigator.clipboard` itself can be undefined (a non-secure origin, an older
          // browser) — calling `.writeText` on it would throw synchronously rather than
          // reject, so this has to be checked before the call, not just caught after it.
          if (navigator.clipboard === undefined) return;
          navigator.clipboard
            .writeText(built)
            .then(() => {
              setCopied(true);
            })
            .catch(() => {
              // No-op: the visible field below is the fallback, not an error state to report.
            });
        }}
      >
        <FiLink aria-hidden="true" /> {label}
      </button>
      {url !== undefined && (
        <p className="copy-link-result">
          {copied && <span className="copy-link-status">{t("shareLink.copied")}</span>}
          <input
            className="copy-link-input"
            type="text"
            readOnly
            value={url}
            aria-label={t("shareLink.linkLabel")}
            onFocus={(e) => {
              e.currentTarget.select();
            }}
          />
        </p>
      )}
    </div>
  );
}
