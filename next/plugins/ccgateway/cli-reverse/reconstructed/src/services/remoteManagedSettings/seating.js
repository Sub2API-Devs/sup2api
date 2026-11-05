/**
 * services/remoteManagedSettings/seating.ts
 *
 * 2.1.316 新增：远程托管设置的座席判定（含门面导出 serverFilePresenceSlot）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r7hswen6.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SEC_DEFAULT_PLUGIN_NAME } from "../../utils/plugins/securityDefaultPlugin.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { identity } from "../../utils/identity.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { bearerAccountOverride } from "../oauth/bearerAccountOverride.js";
import { marketplaceNameAnswerState } from "../../utils/plugins/marketplaceNames.js";
import { claimedSubscriptionType } from "../../entrypoints/warmSpare/claimCredentials.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-r7hswen6.js:947-966 placement
/**
 * 默认要座席到最外层的安全插件标识（内置安全插件）。
 */
var DEFAULT_SECURITY_SEAT_PLUGIN; // deferred: uses INLINE_PLUGIN_MARKETPLACE (../../utils/telemetry/pluginTelemetry.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-r7hswen6.js:947", () => {
  DEFAULT_SECURITY_SEAT_PLUGIN = SEC_DEFAULT_PLUGIN_NAME + "@" + BUILTIN;
});
//@ chunk-r7hswen6.js:966-1100 placement
/**
 * 默认把安全插件座席到最外层。
 */
var defaultSecuritySeat = () => ({
  outermost: [DEFAULT_SECURITY_SEAT_PLUGIN],
  seat: `${DEFAULT_SECURITY_SEAT_PLUGIN} seated outermost by default: it is not known that neither policy nor plan would seat it`,
});
//@ chunk-r7hswen6.js:1100-1133 placement
/**
 * 远程设置在场信号：null（未知）、"empty"（组织答复为空）、"served"（非空设置已下发）。
 */
var settingsPresenceSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r7hswen6.js:1100", () => {
  settingsPresenceSignal = identity(subscribe(), (signal) => signal.set(null));
});
//@ chunk-r7hswen6.js:1133-1250 placement
/**
 * Pro/Max 账号且远程设置为空、组织已答复。
 */
function isProMaxWithoutSettings() {
  let bearerOverride = bearerAccountOverride.get();
  let isProOrMax = bearerOverride === "pro" || bearerOverride === "max";
  let noSettingsYet = settingsPresenceSignal.get() === "empty" && marketplaceNameAnswerState() === "answered";
  return isProOrMax && noSettingsYet && claimedSubscriptionType() === bearerOverride;
}
//@ chunk-r7hswen6.js:1250-1300 placement
/**
 * 把「组织答复为空」的信号清回未知。
 */
function clearEmptySettingsPresence() {
  if (settingsPresenceSignal.get() === "empty") settingsPresenceSignal.set(null);
}
//@ chunk-r7hswen6.js:1300-1354 placement
/**
 * 把信号记为「组织答复为空」（已是 served 则不动）。
 */
function markSettingsPresenceEmpty() {
  if (settingsPresenceSignal.get() !== "served") settingsPresenceSignal.set("empty");
}
//@ chunk-r7hswen6.js:1354-1525 placement
/**
 * 远程设置非空时记为 served。
 */
function noteServedSettings(payload) {
  let isObject = isPlainObject(payload);
  let settings = isObject ? payload.settings : undefined;
  let blockEmpty = isPlainObject(settings) && Object.keys(settings).length === 0;
  let wholeEmpty =
    payload === null ||
    payload === undefined ||
    payload === "" ||
    (isObject && Object.keys(payload).length === 0);
  if (!blockEmpty && !wholeEmpty) settingsPresenceSignal.set("served");
}
//@ chunk-r7hswen6.js:1525-1538 placement
var serverFilePresenceSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r7hswen6.js:1525", () => {
  serverFilePresenceSlot = subscribe();
});
export {
  DEFAULT_SECURITY_SEAT_PLUGIN,
  defaultSecuritySeat,
  clearEmptySettingsPresence,
  isProMaxWithoutSettings,
  markSettingsPresenceEmpty,
  noteServedSettings,
  settingsPresenceSignal,
  serverFilePresenceSlot,
};
