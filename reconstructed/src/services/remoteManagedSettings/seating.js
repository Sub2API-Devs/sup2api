/**
 * services/remoteManagedSettings/seating.ts
 *
 * 2.1.316 新增：远程托管设置的座席判定（含门面导出 serverFilePresenceSlot）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-czx62zen.js (8)
 * attribution: placement 8
 */
import { SEC_DEFAULT_PLUGIN_NAME } from "../../utils/plugins/securityDefaultPlugin.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { ge } from "../../utils/identity.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { Kkn } from "../oauth/bearerAccountOverride.js";
import { J_ } from "../../utils/plugins/marketplaceNames.js";
import { Q_i } from "../../entrypoints/warmSpare/claimCredentials.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-czx62zen.js:946-965 placement
var Tte = SEC_DEFAULT_PLUGIN_NAME + "@" + BUILTIN;
/**
 * 默认把安全插件座席到最外层。
 */
//@ chunk-czx62zen.js:965-1099 placement
var defaultSecuritySeat = () => ({
  outermost: [Tte],
  seat: `${Tte} seated outermost by default: it is not known that neither policy nor plan would seat it`,
});
//@ chunk-czx62zen.js:1099-1132 placement
var xJ = ge(pu(), (e) => e.set(null));
/**
 * Pro/Max 账号且远程设置为空、组织已答复。
 */
//@ chunk-czx62zen.js:1132-1249 placement
function isProMaxWithoutSettings() {
  let e = Kkn.get(),
    n = e === "pro" || e === "max",
    o = xJ.get() === "empty" && J_() === "answered";
  return n && o && Q_i() === e;
}
//@ chunk-czx62zen.js:1249-1299 placement
function mJr() {
  if (xJ.get() === "empty") xJ.set(null);
}
//@ chunk-czx62zen.js:1299-1353 placement
function gJr() {
  if (xJ.get() !== "served") xJ.set("empty");
}
/**
 * 远程设置非空时记为 served。
 */
//@ chunk-czx62zen.js:1353-1524 placement
function noteServedSettings(e) {
  let n = isPlainObject(e),
    o = n ? e.settings : void 0,
    s = isPlainObject(o) && Object.keys(o).length === 0,
    r = e === null || e === void 0 || e === "" || (n && Object.keys(e).length === 0);
  if (!s && !r) xJ.set("served");
}
//@ chunk-czx62zen.js:1524-1537 placement
var serverFilePresenceSlot = pu();

export {
  serverFilePresenceSlot,
  isProMaxWithoutSettings,
  noteServedSettings,
  xJ,
  mJr,
  gJr,
  Tte,
  defaultSecuritySeat,
};
