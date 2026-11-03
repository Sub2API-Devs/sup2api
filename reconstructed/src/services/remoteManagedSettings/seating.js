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
import { identity } from "../../utils/identity.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { bearerAccountOverride } from "../oauth/bearerAccountOverride.js";
import { marketplaceNameAnswerState } from "../../utils/plugins/marketplaceNames.js";
import { claimedSubscriptionType } from "../../entrypoints/warmSpare/claimCredentials.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-czx62zen.js:946-965 placement
/**
 * 默认要座席到最外层的安全插件标识（内置安全插件）。
 */
var DEFAULT_SECURITY_SEAT_PLUGIN = SEC_DEFAULT_PLUGIN_NAME + "@" + BUILTIN;
//@ chunk-czx62zen.js:965-1099 placement
/**
 * 默认把安全插件座席到最外层。
 */
var defaultSecuritySeat = () => ({
  outermost: [DEFAULT_SECURITY_SEAT_PLUGIN],
  seat: `${DEFAULT_SECURITY_SEAT_PLUGIN} seated outermost by default: it is not known that neither policy nor plan would seat it`,
});
//@ chunk-czx62zen.js:1099-1132 placement
/**
 * 远程设置在场信号：null（未知）、"empty"（组织答复为空）、"served"（非空设置已下发）。
 */
var settingsPresenceSignal = identity(pu(), (e) => e.set(null));
//@ chunk-czx62zen.js:1132-1249 placement
/**
 * Pro/Max 账号且远程设置为空、组织已答复。
 */
function isProMaxWithoutSettings() {
  let e = bearerAccountOverride.get();
  let n = e === "pro" || e === "max";
  let o = settingsPresenceSignal.get() === "empty" && marketplaceNameAnswerState() === "answered";
  return n && o && claimedSubscriptionType() === e;
}
//@ chunk-czx62zen.js:1249-1299 placement
/**
 * 把「组织答复为空」的信号清回未知。
 */
function clearEmptySettingsPresence() {
  if (settingsPresenceSignal.get() === "empty") settingsPresenceSignal.set(null);
}
//@ chunk-czx62zen.js:1299-1353 placement
/**
 * 把信号记为「组织答复为空」（已是 served 则不动）。
 */
function markSettingsPresenceEmpty() {
  if (settingsPresenceSignal.get() !== "served") settingsPresenceSignal.set("empty");
}
//@ chunk-czx62zen.js:1353-1524 placement
/**
 * 远程设置非空时记为 served。
 */
function noteServedSettings(e) {
  let n = isPlainObject(e);
  let settings = n ? e.settings : undefined;
  let s = isPlainObject(settings) && Object.keys(settings).length === 0;
  let r = e === null || e === undefined || e === "" || (n && Object.keys(e).length === 0);
  if (!s && !r) settingsPresenceSignal.set("served");
}
//@ chunk-czx62zen.js:1524-1537 placement
var serverFilePresenceSlot = pu();
export {
  serverFilePresenceSlot,
  isProMaxWithoutSettings,
  noteServedSettings,
  settingsPresenceSignal,
  clearEmptySettingsPresence,
  markSettingsPresenceEmpty,
  DEFAULT_SECURITY_SEAT_PLUGIN,
  defaultSecuritySeat,
};
