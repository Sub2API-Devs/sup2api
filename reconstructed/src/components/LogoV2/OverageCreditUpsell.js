/**
 * components/LogoV2/OverageCreditUpsell.tsx
 *
 * 判断是否符合超额额度赠送（overage credit grant）推广条件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/OverageCreditUpsell.tsx
 * pieces: chunk-hgfr0vx8.js (1)
 * attribution: fingerprint 1
 */
import { Scr, l } from "../../utils/workflows/workflowGates.js";
import { env } from "../../utils/env.js";

//@ chunk-hgfr0vx8.js:2388-2465 fingerprint = isEligibleForOverageCreditGrant (0.44)
function isEligibleForOverageCreditGrant() {
  return Scr() && !env.CLAUDE_CODE_DISABLE_WORKFLOWS && l().available;
}

export { isEligibleForOverageCreditGrant };
