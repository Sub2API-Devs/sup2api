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

/**
 * 返回 tengu_onyx_plover 原值；为 null 表示 autoDream 关闭。
 */
//@ chunk-rsht1tdj.js:1080-1128 fingerprint = isAutoDreamEnabled (0.799)
function getAutoDreamConfigRaw() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_onyx_plover", null);
}
//@ chunk-rsht1tdj.js:1128-1195 placement
function Mrn() {
  let e = getAutoDreamConfigRaw();
  return e?.enabled === !0 || e?.available === !0;
}
/**
 * 判断 autoDream（自动整理记忆）是否开启：功能可用时优先用设置 autoDreamEnabled，否则看远程配置。
 */
//@ chunk-rsht1tdj.js:1195-1305 placement
function isAutoDreamEnabled() {
  if (!Mrn()) return !1;
  let autoDreamEnabled = getInitialSettings_2().autoDreamEnabled;
  if (autoDreamEnabled !== void 0) return autoDreamEnabled;
  return getAutoDreamConfigRaw()?.enabled === !0;
}
//@ chunk-rsht1tdj.js:1305-1325 placement
class Z {
  runner = null;
}
//@ chunk-rsht1tdj.js:1325-1348 placement
var B = new HostScoped(() => new Z());

export { isAutoDreamEnabled, Mrn, B };
