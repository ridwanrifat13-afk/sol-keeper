import { SETUP_STEPS, useSetup, type SetupStepId } from "../../store/setup.js";
import { ScenarioStep } from "./ScenarioStep.js";
import { DifficultyStep } from "./DifficultyStep.js";
import { CrewSizeStep } from "./CrewSizeStep.js";
import { LandingSiteStep } from "./LandingSiteStep.js";
import { PowerArchitectureStep } from "./PowerArchitectureStep.js";
import { ShieldingStep } from "./ShieldingStep.js";
import { LaunchPackingStep } from "./LaunchPackingStep.js";

const STEP_LABELS: Record<SetupStepId, string> = {
  scenario: "Scenario",
  difficulty: "Difficulty",
  crewSize: "Crew size",
  landingSite: "Landing site",
  power: "Power",
  shielding: "Shielding",
  launchPacking: "Launch Packing",
};

interface SetupWizardProps {
  /** Called after `commit()` actually starts the mission — App.tsx uses this to switch the
   *  shell's own view to Briefing, since this component has no reason to know about `View`. */
  readonly onLaunch: () => void;
}

/**
 * M9's mission setup wizard. Every step has real UI now (M9.2a-d) — Launch Packing is the
 * final review step, not a "choice" step, previewing the exact scenario "Launch Mission"
 * is about to commit.
 */
export function SetupWizard({ onLaunch }: SetupWizardProps) {
  const stepIndex = useSetup((s) => s.stepIndex);
  const next = useSetup((s) => s.next);
  const back = useSetup((s) => s.back);
  const commit = useSetup((s) => s.commit);

  const stepId = SETUP_STEPS[stepIndex];
  const isLastStep = stepIndex === SETUP_STEPS.length - 1;

  return (
    <div className="console">
      <header className="view-head">
        <h2>Mission Setup</h2>
        <p className="view-hint">
          Step {stepIndex + 1} of {SETUP_STEPS.length}: {stepId !== undefined ? STEP_LABELS[stepId] : ""}
        </p>
      </header>

      {stepId === "scenario" && <ScenarioStep />}
      {stepId === "difficulty" && <DifficultyStep />}
      {stepId === "crewSize" && <CrewSizeStep />}
      {stepId === "landingSite" && <LandingSiteStep />}
      {stepId === "power" && <PowerArchitectureStep />}
      {stepId === "shielding" && <ShieldingStep />}
      {stepId === "launchPacking" && <LaunchPackingStep />}

      <div className="button-row">
        <button type="button" className="btn btn-quiet" disabled={stepIndex === 0} onClick={back}>
          Back
        </button>
        {isLastStep ? (
          <button
            type="button"
            className="btn btn-active"
            onClick={() => {
              commit();
              onLaunch();
            }}
          >
            ▶ Launch Mission
          </button>
        ) : (
          <button type="button" className="btn btn-active" onClick={next}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
