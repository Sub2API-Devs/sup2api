/**
 * projectOnboardingState.ts
 *
 * 项目引导：shouldShowProjectOnboarding 与引导步骤（CLAUDE.md、空目录等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/projectOnboardingState.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 2
 */
import { readLocalMarketplaceFile, enoentError } from "./utils/plugins/localMarketplacePaths.js";

//@ chunk-aepeg2w5.js:91282-91688 fingerprint = shouldShowProjectOnboarding (0.618)
function shouldShowProjectOnboarding(e) {
  if (!e) return e;
  let n = {};
  let r = false;
  for (let [key, value] of Object.entries(e)) {
    if (!value || typeof value !== "object") {
      n[key] = value;
      continue;
    }
    let y = value;
    if (
      y.history !== undefined ||
      y.projectOnboardingSeenCount !== undefined ||
      y.hasCompletedProjectOnboarding !== undefined ||
      y.devIntentsDetected !== undefined
    ) {
      r = true;
      let { history, projectOnboardingSeenCount, hasCompletedProjectOnboarding, devIntentsDetected, ...P } =
        y;
      n[key] = P;
    } else n[key] = value;
  }
  return r ? n : e;
}
//@ chunk-e6aww6q8.js:4291532-4291632 fingerprint = getSteps (0.334)
async function getSteps(e, n) {
  let localMarketplaceFile = await readLocalMarketplaceFile(e, "workspace", n);
  if ("absent" in localMarketplaceFile) throw enoentError(n);
  return localMarketplaceFile.text;
}
export { shouldShowProjectOnboarding, getSteps };
