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
  let n = {},
    r = !1;
  for (let [s, h] of Object.entries(e)) {
    if (!h || typeof h !== "object") {
      n[s] = h;
      continue;
    }
    let y = h;
    if (
      y.history !== void 0 ||
      y.projectOnboardingSeenCount !== void 0 ||
      y.hasCompletedProjectOnboarding !== void 0 ||
      y.devIntentsDetected !== void 0
    ) {
      r = !0;
      let {
        history: history,
        projectOnboardingSeenCount: projectOnboardingSeenCount,
        hasCompletedProjectOnboarding: hasCompletedProjectOnboarding,
        devIntentsDetected: devIntentsDetected,
        ...P
      } = y;
      n[s] = P;
    } else n[s] = h;
  }
  return r ? n : e;
}
//@ chunk-e6aww6q8.js:4291532-4291632 fingerprint = getSteps (0.334)
async function getSteps(e, n) {
  let r = await readLocalMarketplaceFile(e, "workspace", n);
  if ("absent" in r) throw enoentError(n);
  return r.text;
}

export { shouldShowProjectOnboarding, getSteps };
