/**
 * utils/model/sessionModelRestriction.ts
 *
 * 2.1.316 新增：运行中模型被缓存拒绝时重新询问服务端后再降级。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (6)
 * attribution: placement 6
 */
import { getProviderState } from "./providerCaches.js";
import { logError } from "../log.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { formatModelRestrictedNotice } from "./validateModel.js";
import { enqueueTaskNotification } from "../task/taskNotifications.js";

//@ chunk-aepeg2w5.js:408194-408238 placement
var Tk = 60000,
  SESSION_MODEL_RESTRICTED = "session-model-restricted";
//@ chunk-aepeg2w5.js:408238-408293 placement
function GEi(e) {
  getProviderState().sessionModelDenyReprobe.reprobe = e;
}
/**
 * 运行中的会话模型被缓存的拒绝规则命中时，标记争议并向服务端复查。
 */
//@ chunk-aepeg2w5.js:408293-408569 placement
function reprobeDeniedSessionModel({
  model: model,
  rowDenyKeys: rowDenyKeys,
  describeFallbackModel: describeFallbackModel,
}) {
  try {
    let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
    if (sessionModelDenyReprobe.reprobe === void 0 || sessionModelDenyReprobe.refusedModels.has(model))
      return !1;
    for (let h of rowDenyKeys) sessionModelDenyReprobe.contestedDenies.set(h, Number.POSITIVE_INFINITY);
    return (
      recheckDeniedRunningModel(sessionModelDenyReprobe, model, rowDenyKeys, describeFallbackModel).catch(
        logError,
      ),
      !0
    );
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 运行中模型被缓存拒绝时重新询问服务端后再降级。
 */
//@ chunk-aepeg2w5.js:408569-409538 placement
async function recheckDeniedRunningModel(e, n, r, s) {
  let generation = e.generation;
  try {
    logForDebugging(
      "[model-access] cached deny appeared under the running model; re-asking the server before demoting",
    );
    let y = (await e.reprobe?.(n)) ?? "probe_failed";
    if ((logEvent("tengu_session_model_cached_deny_reprobe", { outcome: fromEnum(y) }), y === "probe_failed"))
      logFeatureSad("model_cached_deny_reprobe", "probe_failed");
    else logFeatureOk("model_cached_deny_reprobe", { outcome: fromEnum(y) });
    if (e.generation !== generation) return;
    switch (y) {
      case "probe_failed": {
        let S = Date.now() + Tk;
        for (let w of r) e.contestedDenies.set(w, S);
        return;
      }
      case "overturned":
        for (let S of r) e.contestedDenies.delete(S);
        return;
      case "denied_by_server":
      case "denied_by_policy": {
        for (let w of r) e.contestedDenies.delete(w);
        e.refusedModels.add(n);
        let S = formatModelRestrictedNotice(n, s());
        (enqueueTaskNotification({
          type: "system",
          subtype: "notification",
          key: SESSION_MODEL_RESTRICTED,
          text: S,
          priority: "high",
          color: "warning",
        }),
          e.restricted.emit(S));
        return;
      }
    }
  } catch (error) {
    if (
      (logError(error),
      logFeatureBad("model_cached_deny_reprobe", "internal_error"),
      e.generation !== generation)
    )
      return;
    let S = Date.now() + Tk;
    for (let w of r) e.contestedDenies.set(w, S);
  }
}
/**
 * 清除权益拒绝缓存与会话模型复查状态（登录变化时）。
 */
//@ chunk-aepeg2w5.js:409538-409789 placement
function resetEntitlementDenies() {
  let e = getProviderState();
  (e.providerCache.confirmedEntitlementDenies.clear(), e.providerCache.overturnedEntitlementDenies.clear());
  let sessionModelDenyReprobe = e.sessionModelDenyReprobe;
  (sessionModelDenyReprobe.honoredModels.clear(),
    sessionModelDenyReprobe.contestedDenies.clear(),
    sessionModelDenyReprobe.refusedModels.clear(),
    (sessionModelDenyReprobe.generation += 1));
}
//@ chunk-aepeg2w5.js:409789-409865 placement
function KEi(e) {
  return getProviderState().sessionModelDenyReprobe.restricted.subscribe(e);
}

export { SESSION_MODEL_RESTRICTED, KEi, GEi, resetEntitlementDenies, reprobeDeniedSessionModel };
