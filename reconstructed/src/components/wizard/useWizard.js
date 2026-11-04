/**
 * components/wizard/useWizard.ts
 *
 * 读取 WizardProvider 上下文的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/wizard/useWizard.ts
 * pieces: chunk-095ptjmr.js (1)
 * attribution: fingerprint 1
 */
import { useContext } from "../../../vendor/react/cjs/react.production.js";
import { wizardSlot } from "./WizardProvider.js";

//@ chunk-095ptjmr.js:2900-3004 fingerprint = useWizard (1)
function useWizard() {
  let context = useContext(wizardSlot);
  if (!context) throw Error("useWizard must be used within a WizardProvider");
  return context;
}
export { useWizard };
