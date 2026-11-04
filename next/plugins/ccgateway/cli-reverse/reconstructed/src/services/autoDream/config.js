/**
 * services/autoDream/config.ts
 *
 * autoDream 配置读取（tengu_onyx_plover 原值，null 表示关闭）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/autoDream/config.ts
 * pieces: chunk-rsht1tdj.js (5)
 * attribution: fingerprint 1, placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rsht1tdj.js:1080-1128 fingerprint (2.1.88 match: isAutoDreamEnabled, 0.799)
/**
 * 返回 tengu_onyx_plover 原值；为 null 表示 autoDream 关闭。
 */
function getAutoDreamConfigRaw() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_onyx_plover", null);
}
//@ chunk-rsht1tdj.js:1128-1195 placement
/**
 * 远程配置里 autoDream 是否可用（enabled 或 available 为真）。
 */
function isAutoDreamFeatureOn() {
  let autoDreamConfigRaw = getAutoDreamConfigRaw();
  return autoDreamConfigRaw?.enabled === true || autoDreamConfigRaw?.available === true;
}
//@ chunk-rsht1tdj.js:1195-1305 placement
/**
 * 判断 autoDream（自动整理记忆）是否开启：功能可用时优先用设置 autoDreamEnabled，否则看远程配置。
 */
function isAutoDreamEnabled() {
  if (!isAutoDreamFeatureOn()) return false;
  let autoDreamEnabled = getInitialSettings_2().autoDreamEnabled;
  if (autoDreamEnabled !== undefined) return autoDreamEnabled;
  return getAutoDreamConfigRaw()?.enabled === true;
}
//@ chunk-rsht1tdj.js:1305-1325 placement
/**
 * 每个宿主的 autoDream 运行状态容器，目前只有 runner 字段（由 MOs 注册）。
 */
class AutoDreamHostState {
  runner = null;
}
//@ chunk-rsht1tdj.js:1325-1348 placement
/**
 * 按宿主划分的 autoDream 状态单例（HostScoped），DOs 与 MOs 都从这里取 runner。
 */
var autoDreamHostState; // deferred: uses AutoDreamHostState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rsht1tdj.js:1325", () => {
  autoDreamHostState = new HostScoped(() => new AutoDreamHostState());
});
export { isAutoDreamEnabled, isAutoDreamFeatureOn, autoDreamHostState };
