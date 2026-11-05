/**
 * components/wizard/useWizard.ts
 *
 * 读取 WizardProvider 上下文的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/wizard/useWizard.ts
 * pieces: chunk-pqe1nn4c.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useContext } from "../../../vendor/react/cjs/react.production.js";
import { wizardSlot } from "./WizardProvider.js";

//@ chunk-pqe1nn4c.js:2761-2865 fingerprint (2.1.88 match: useWizard, 1)
function useWizard() {
  let context = useContext(wizardSlot);
  if (!context) throw Error("useWizard must be used within a WizardProvider");
  return context;
}
export { useWizard };
