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

//@ chunk-aepeg2w5.js:91282-91688 fingerprint (2.1.88 match: shouldShowProjectOnboarding, 0.618)
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
//@ chunk-e6aww6q8.js:4291532-4291632 fingerprint (2.1.88 match: getSteps, 0.334)
async function getSteps(storage, marketplacePath) {
  let localMarketplaceFile = await readLocalMarketplaceFile(storage, "workspace", marketplacePath);
  if ("absent" in localMarketplaceFile) throw enoentError(marketplacePath);
  return localMarketplaceFile.text;
}
export { shouldShowProjectOnboarding, getSteps };
