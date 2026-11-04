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
var SESSION_MODEL_DENY_TTL_MS = 60000;
var SESSION_MODEL_RESTRICTED = "session-model-restricted";
//@ chunk-aepeg2w5.js:408238-408293 placement
/**
 * 设置会话模型拒绝的复查函数。
 */
function setSessionModelReprobe(reprobe) {
  getProviderState().sessionModelDenyReprobe.reprobe = reprobe;
}
//@ chunk-aepeg2w5.js:408293-408569 placement
/**
 * 运行中的会话模型被缓存的拒绝规则命中时，标记争议并向服务端复查。
 */
function reprobeDeniedSessionModel({ model, rowDenyKeys, describeFallbackModel }) {
  try {
    let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
    if (sessionModelDenyReprobe.reprobe === undefined || sessionModelDenyReprobe.refusedModels.has(model))
      return false;
    for (let rowDenyKey of rowDenyKeys)
      sessionModelDenyReprobe.contestedDenies.set(rowDenyKey, Number.POSITIVE_INFINITY);
    recheckDeniedRunningModel(sessionModelDenyReprobe, model, rowDenyKeys, describeFallbackModel).catch(
      logError,
    );
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-aepeg2w5.js:408569-409538 placement
/**
 * 运行中模型被缓存拒绝时重新询问服务端后再降级。
 */
async function recheckDeniedRunningModel(sessionModelDenyReprobe, model, rowDenyKeys, describeFallbackModel) {
  let generation = sessionModelDenyReprobe.generation;
  try {
    logForDebugging(
      "[model-access] cached deny appeared under the running model; re-asking the server before demoting",
    );
    let outcome = (await sessionModelDenyReprobe.reprobe?.(model)) ?? "probe_failed";
    logEvent("tengu_session_model_cached_deny_reprobe", {
      outcome: fromEnum(outcome),
    });
    if (outcome === "probe_failed") logFeatureSad("model_cached_deny_reprobe", "probe_failed");
    else
      logFeatureOk("model_cached_deny_reprobe", {
        outcome: fromEnum(outcome),
      });
    if (sessionModelDenyReprobe.generation !== generation) return;
    switch (outcome) {
      case "probe_failed": {
        let until = Date.now() + SESSION_MODEL_DENY_TTL_MS;
        for (let key of rowDenyKeys) sessionModelDenyReprobe.contestedDenies.set(key, until);
        return;
      }
      case "overturned":
        for (let key of rowDenyKeys) sessionModelDenyReprobe.contestedDenies.delete(key);
        return;
      case "denied_by_server":
      case "denied_by_policy": {
        for (let key of rowDenyKeys) sessionModelDenyReprobe.contestedDenies.delete(key);
        sessionModelDenyReprobe.refusedModels.add(model);
        let notice = formatModelRestrictedNotice(model, describeFallbackModel());
        enqueueTaskNotification({
          type: "system",
          subtype: "notification",
          key: SESSION_MODEL_RESTRICTED,
          text: notice,
          priority: "high",
          color: "warning",
        });
        sessionModelDenyReprobe.restricted.emit(notice);
        return;
      }
    }
  } catch (error) {
    logError(error);
    logFeatureBad("model_cached_deny_reprobe", "internal_error");
    if (sessionModelDenyReprobe.generation !== generation) return;
    let until = Date.now() + SESSION_MODEL_DENY_TTL_MS;
    for (let key of rowDenyKeys) sessionModelDenyReprobe.contestedDenies.set(key, until);
  }
}
//@ chunk-aepeg2w5.js:409538-409789 placement
/**
 * 清除权益拒绝缓存与会话模型复查状态（登录变化时）。
 */
function resetEntitlementDenies() {
  let providerState = getProviderState();
  providerState.providerCache.confirmedEntitlementDenies.clear();
  providerState.providerCache.overturnedEntitlementDenies.clear();
  let sessionModelDenyReprobe = providerState.sessionModelDenyReprobe;
  sessionModelDenyReprobe.honoredModels.clear();
  sessionModelDenyReprobe.contestedDenies.clear();
  sessionModelDenyReprobe.refusedModels.clear();
  sessionModelDenyReprobe.generation += 1;
}
//@ chunk-aepeg2w5.js:409789-409865 placement
/**
 * 订阅会话模型受限状态。
 */
function subscribeSessionModelRestriction(listener) {
  return getProviderState().sessionModelDenyReprobe.restricted.subscribe(listener);
}
export {
  SESSION_MODEL_RESTRICTED,
  subscribeSessionModelRestriction,
  setSessionModelReprobe,
  resetEntitlementDenies,
  reprobeDeniedSessionModel,
};
