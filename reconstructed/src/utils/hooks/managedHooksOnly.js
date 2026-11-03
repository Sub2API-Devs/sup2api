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
import { stableStringifySafe } from "./hookSerialization.js";
import {
  isOrganizationHookPolicyPending,
  isHookPolicyUnanswered,
  markOrganizationAskHeld,
} from "../../commands/goal/goal.js";
import { logError } from "../log.js";
import { isOfficialMarketplaceRef } from "../plugins/marketplaceNames.js";
import { isManagedHookAllowed } from "../hooks.js";
import { getAutoUpdatedPluginNames } from "./hooksSettings.js";

//@ chunk-s61vbvea.js:199570-199646 placement = _temp7 (0.778)
var policyHookKeysForEvent = (a_2) =>
  new Set((getSettingsForSource("policySettings")?.hooks?.[a_2] ?? []).map((n) => stableStringifySafe(n)));
//@ chunk-s61vbvea.js:199646-199931 placement
function getManagedHooksHoldState(e) {
  let n = {
    isHolding: isOrganizationHookPolicyPending(),
    isFaulted: false,
    managedKeys: new Set(),
  };
  if (!n.isHolding) return n;
  try {
    n.isHolding =
      isHookPolicyUnanswered() || getSettingsForSource("policySettings")?.allowManagedHooksOnly === true;
  } catch (error) {
    logError(error);
    n.isFaulted = true;
  }
  if (!n.isHolding) return n;
  try {
    n.managedKeys = policyHookKeysForEvent(e);
  } catch (error) {
    logError(error);
    n.isFaulted = true;
  }
  return n;
}
//@ chunk-s61vbvea.js:199931-199979 placement
var countHooks = (e) => e.reduce((acc, r) => acc + r.hooks.length, 0);
//@ chunk-s61vbvea.js:199979-200006 placement
/**
 * 判断钩子是否来自官方市场或允许名单。
 */
var isManagedOrAllowlistedHook = (e) => isOfficialMarketplaceRef(e) || isManagedHookAllowed(e);
//@ chunk-s61vbvea.js:200618-200796 placement
function filterHooksByManagedHold(e, n, held) {
  if (held === "included") return e;
  let s = held === "only";
  let managedHooksHoldState = getManagedHooksHoldState(n);
  if (!managedHooksHoldState.isHolding) return s ? [] : e;
  let flattened = e.flatMap((w) => getAutoUpdatedPluginNames(w, managedHooksHoldState, s));
  if (s ? flattened.length > 0 : countHooks(flattened) < countHooks(e)) markOrganizationAskHeld();
  return flattened;
}
export { filterHooksByManagedHold, isManagedOrAllowlistedHook, getManagedHooksHoldState };
