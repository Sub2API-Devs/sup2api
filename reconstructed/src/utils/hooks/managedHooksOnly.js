/**
 * utils/hooks/managedHooksOnly.ts
 *
 * 仅托管钩子（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (5)
 * attribution: placement 5
 */
import { getSettingsForSource } from "../settings/settings.js";
import { Rs } from "./hookSerialization.js";
import {
  isOrganizationHookPolicyPending,
  isHookPolicyUnanswered,
  markOrganizationAskHeld,
} from "../../commands/goal/goal.js";
import { logError } from "../log.js";
import { isOfficialMarketplaceRef } from "../plugins/marketplaceNames.js";
import { zlr } from "../hooks.js";
import { getAutoUpdatedPluginNames } from "./hooksSettings.js";

//@ chunk-s61vbvea.js:199570-199646 placement = _temp7 (0.778)
var Vh = (a_2) => new Set((getSettingsForSource("policySettings")?.hooks?.[a_2] ?? []).map((n) => Rs(n)));
//@ chunk-s61vbvea.js:199646-199931 placement
function getManagedHooksHoldState(e) {
  let n = { isHolding: isOrganizationHookPolicyPending(), isFaulted: !1, managedKeys: new Set() };
  if (!n.isHolding) return n;
  try {
    n.isHolding =
      isHookPolicyUnanswered() || getSettingsForSource("policySettings")?.allowManagedHooksOnly === !0;
  } catch (error) {
    (logError(error), (n.isFaulted = !0));
  }
  if (!n.isHolding) return n;
  try {
    n.managedKeys = Vh(e);
  } catch (error) {
    (logError(error), (n.isFaulted = !0));
  }
  return n;
}
//@ chunk-s61vbvea.js:199931-199979 placement
var Zu = (e) => e.reduce((n, r) => n + r.hooks.length, 0);
//@ chunk-s61vbvea.js:199979-200006 placement
var eKt = (e) => isOfficialMarketplaceRef(e) || zlr(e);
//@ chunk-s61vbvea.js:200618-200796 placement
function filterHooksByManagedHold(e, n, r) {
  if (r === "included") return e;
  let s = r === "only",
    h = getManagedHooksHoldState(n);
  if (!h.isHolding) return s ? [] : e;
  let flattened = e.flatMap((w) => getAutoUpdatedPluginNames(w, h, s));
  if (s ? flattened.length > 0 : Zu(flattened) < Zu(e)) markOrganizationAskHeld();
  return flattened;
}

export { filterHooksByManagedHold, eKt, getManagedHooksHoldState };
