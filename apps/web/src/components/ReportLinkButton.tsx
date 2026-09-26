import { useTranslation } from "react-i18next";
import { useRun, runLinkConfigFromStore } from "../store/run.js";
import { buildRunLinkUrl } from "../share/runLink.js";
import { CopyLinkButton } from "./CopyLinkButton.js";

/**
 * M10.7/M10.8: "Copy report link" — shared by `DebriefView` (works at any point in a run, not
 * only once it's finished) and `MissionReportView` (the dedicated printable page, M10.8), so
 * the exact same link-building call backs both rather than two copies that could drift.
 */
export function ReportLinkButton() {
  const { t } = useTranslation();
  const state = useRun((s) => s.state);
  const params = useRun((s) => s.params);
  const setupChoices = useRun((s) => s.setupChoices);
  const inputLog = useRun((s) => s.inputLog);

  return (
    <CopyLinkButton
      label={t("shareLink.copyReportLink")}
      buildUrl={() =>
        buildRunLinkUrl(window.location, runLinkConfigFromStore({ params, setupChoices }), {
          inputLog,
          throughHour: state.hour,
        })
      }
    />
  );
}
