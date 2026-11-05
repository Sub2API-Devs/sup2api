/**
 * services/api/regimeRefusal.ts
 *
 * 2.1.316 新增：特定使用制度下的拒绝处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5xgkngpb.js:977245-977282 placement
function isRegimeRefusal(error) {
  return isHipaaFeatureError(error) && !isHumbleFlurryOn();
}
//@ chunk-5xgkngpb.js:977282-977322 placement
function recoverRegimeRefusalIfNeeded(error) {
  if (isRegimeRefusal(error)) runIdleTask().catch(logError);
}
//@ chunk-5xgkngpb.js:977322-977926 placement
/**
 * 受监管使用制度（如 HIPAA）拒绝后，按制度重建请求并重发。
 */
async function* recoverRegimeRefusal(tools, signal, toolList) {
  let hipaa = hasComplianceTaint("hipaa");
  let first = yield* toolList(tools);
  if (first === undefined) return;
  let nextTools;
  let retried = false;
  try {
    await raceWithAbortSignal(runIdleTask(), signal, () => new APIUserAbortError());
    let filtered = tools.filter((tool) => tool.isEnabled());
    if (hasComplianceTaint("hipaa") && (!hipaa || filtered.length < tools.length)) nextTools = filtered;
  } catch (error) {
    if (!signal.aborted) {
      retried = true;
      logError(error);
    }
  }
  if (signal.aborted) return;
  if (nextTools === undefined) {
    logFeatureBad("api_regime_refusal_recovery", retried ? "decision_failed" : "nothing_to_rebuild");
    yield first;
    return;
  }
  logForDebugging(
    "[regime-refusal] resending the refused request, rebuilt under the organization policy now loaded",
    {
      level: "warn",
    },
  );
  let second = yield* toolList(nextTools);
  if (second === undefined) {
    logFeatureOk("api_regime_refusal_recovery");
    return;
  }
  logFeatureBad("api_regime_refusal_recovery", "refused_again");
  yield second;
}
export { recoverRegimeRefusal, isRegimeRefusal, recoverRegimeRefusalIfNeeded };
