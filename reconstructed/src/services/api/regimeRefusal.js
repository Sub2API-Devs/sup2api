/**
 * services/api/regimeRefusal.ts
 *
 * 2.1.316 新增：特定使用制度下的拒绝处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { isHipaaFeatureError } from "./errors.js";
import { isHumbleFlurryOn } from "../../utils/settings/settingsSourceTrust.js";
import { runIdleTask } from "./errorUtils.js";
import { logError } from "../../utils/log.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { APIUserAbortError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e6aww6q8.js:963936-963973 placement
function isRegimeRefusal(e) {
  return isHipaaFeatureError(e) && !isHumbleFlurryOn();
}
//@ chunk-e6aww6q8.js:963973-964013 placement
function recoverRegimeRefusalIfNeeded(error) {
  if (isRegimeRefusal(error)) runIdleTask().catch(logError);
}
//@ chunk-e6aww6q8.js:964013-964617 placement
/**
 * 受监管使用制度（如 HIPAA）拒绝后，按制度重建请求并重发。
 */
async function* recoverRegimeRefusal(tools, signal, r) {
  let s = hasComplianceTaint("hipaa");
  let h = yield* r(tools);
  if (h === undefined) return;
  let y;
  let S = false;
  try {
    await raceWithAbortSignal(runIdleTask(), signal, () => new APIUserAbortError());
    let filtered = tools.filter((G) => G.isEnabled());
    if (hasComplianceTaint("hipaa") && (!s || filtered.length < tools.length)) y = filtered;
  } catch (error) {
    if (!signal.aborted) {
      S = true;
      logError(error);
    }
  }
  if (signal.aborted) return;
  if (y === undefined) {
    logFeatureBad("api_regime_refusal_recovery", S ? "decision_failed" : "nothing_to_rebuild");
    yield h;
    return;
  }
  logForDebugging(
    "[regime-refusal] resending the refused request, rebuilt under the organization policy now loaded",
    {
      level: "warn",
    },
  );
  let w = yield* r(y);
  if (w === undefined) {
    logFeatureOk("api_regime_refusal_recovery");
    return;
  }
  logFeatureBad("api_regime_refusal_recovery", "refused_again");
  yield w;
}
export { recoverRegimeRefusal, isRegimeRefusal, recoverRegimeRefusalIfNeeded };
