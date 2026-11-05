/**
 * projectOnboardingState.ts
 *
 * 项目引导：shouldShowProjectOnboarding 与引导步骤（CLAUDE.md、空目录等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/projectOnboardingState.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-exfmq47h.js (1)
 * attribution: fingerprint 2
 */
import { readLocalMarketplaceFile, enoentError } from "./utils/plugins/localMarketplacePaths.js";

//@ chunk-exfmq47h.js:95585-95991 fingerprint (2.1.88 match: shouldShowProjectOnboarding, 0.619)
function shouldShowProjectOnboarding(onboardingStateByProject) {
  if (!onboardingStateByProject) return onboardingStateByProject;
  let sanitizedState = {};
  let hasStrippedFields = false;
  for (let [key, value] of Object.entries(onboardingStateByProject)) {
    if (!value || typeof value !== "object") {
      sanitizedState[key] = value;
      continue;
    }
    let projectState = value;
    if (
      projectState.history !== undefined ||
      projectState.projectOnboardingSeenCount !== undefined ||
      projectState.hasCompletedProjectOnboarding !== undefined ||
      projectState.devIntentsDetected !== undefined
    ) {
      hasStrippedFields = true;
      let {
        history,
        projectOnboardingSeenCount,
        hasCompletedProjectOnboarding,
        devIntentsDetected,
        ...remainingFields
      } = projectState;
      sanitizedState[key] = remainingFields;
    } else sanitizedState[key] = value;
  }
  return hasStrippedFields ? sanitizedState : onboardingStateByProject;
}
//@ chunk-5xgkngpb.js:4398014-4398114 fingerprint (2.1.88 match: getSteps, 0.334)
async function getSteps(storage, marketplacePath) {
  let localMarketplaceFile = await readLocalMarketplaceFile(storage, "workspace", marketplacePath);
  if ("absent" in localMarketplaceFile) throw enoentError(marketplacePath);
  return localMarketplaceFile.text;
}
export { getSteps, shouldShowProjectOnboarding };
