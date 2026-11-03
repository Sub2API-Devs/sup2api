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
import { xxi } from "../../utils/settings/settingsSourceTrust.js";
import { Gts } from "./errorUtils.js";
import { logError } from "../../utils/log.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { Lf } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e6aww6q8.js:963936-963973 placement
function U7(e) {
  return isHipaaFeatureError(e) && !xxi();
}
//@ chunk-e6aww6q8.js:963973-964013 placement
function XUt(e) {
  if (U7(e)) Gts().catch(logError);
}
/**
 * 受监管使用制度（如 HIPAA）拒绝后，按制度重建请求并重发。
 */
//@ chunk-e6aww6q8.js:964013-964617 placement
async function* recoverRegimeRefusal(e, n, r) {
  let s = hasComplianceTaint("hipaa"),
    h = yield* r(e);
  if (h === void 0) return;
  let y,
    S = !1;
  try {
    await raceWithAbortSignal(Gts(), n, () => new Lf());
    let filtered = e.filter((G) => G.isEnabled());
    if (hasComplianceTaint("hipaa") && (!s || filtered.length < e.length)) y = filtered;
  } catch (error) {
    if (!n.aborted) ((S = !0), logError(error));
  }
  if (n.aborted) return;
  if (y === void 0) {
    (logFeatureBad("api_regime_refusal_recovery", S ? "decision_failed" : "nothing_to_rebuild"), yield h);
    return;
  }
  logForDebugging(
    "[regime-refusal] resending the refused request, rebuilt under the organization policy now loaded",
    { level: "warn" },
  );
  let w = yield* r(y);
  if (w === void 0) {
    logFeatureOk("api_regime_refusal_recovery");
    return;
  }
  (logFeatureBad("api_regime_refusal_recovery", "refused_again"), yield w);
}

export { recoverRegimeRefusal, U7, XUt };
