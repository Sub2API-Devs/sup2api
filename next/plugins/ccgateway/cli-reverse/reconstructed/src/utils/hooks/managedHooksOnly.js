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
import { filterHooksByPluginHold } from "./hooksSettings.js";

//@ chunk-s61vbvea.js:199570-199646 placement = _temp7 (0.778)
var policyHookKeysForEvent = (a_2) =>
  new Set(
    (getSettingsForSource("policySettings")?.hooks?.[a_2] ?? []).map((matcher) =>
      stableStringifySafe(matcher),
    ),
  );
//@ chunk-s61vbvea.js:199646-199931 placement
function getManagedHooksHoldState(event) {
  let state = {
    isHolding: isOrganizationHookPolicyPending(),
    isFaulted: false,
    managedKeys: new Set(),
  };
  if (!state.isHolding) return state;
  try {
    state.isHolding =
      isHookPolicyUnanswered() || getSettingsForSource("policySettings")?.allowManagedHooksOnly === true;
  } catch (error) {
    logError(error);
    state.isFaulted = true;
  }
  if (!state.isHolding) return state;
  try {
    state.managedKeys = policyHookKeysForEvent(event);
  } catch (error) {
    logError(error);
    state.isFaulted = true;
  }
  return state;
}
//@ chunk-s61vbvea.js:199931-199979 placement
var countHooks = (matchers) => matchers.reduce((acc, matcher) => acc + matcher.hooks.length, 0);
//@ chunk-s61vbvea.js:199979-200006 placement
/**
 * 判断钩子是否来自官方市场或允许名单。
 */
var isManagedOrAllowlistedHook = (pluginId) =>
  isOfficialMarketplaceRef(pluginId) || isManagedHookAllowed(pluginId);
//@ chunk-s61vbvea.js:200618-200796 placement
function filterHooksByManagedHold(matchers, event, held) {
  if (held === "included") return matchers;
  let only = held === "only";
  let managedHooksHoldState = getManagedHooksHoldState(event);
  if (!managedHooksHoldState.isHolding) return only ? [] : matchers;
  let matchers_2 = matchers.flatMap((matcher) =>
    filterHooksByPluginHold(matcher, managedHooksHoldState, only),
  );
  if (only ? matchers_2.length > 0 : countHooks(matchers_2) < countHooks(matchers)) markOrganizationAskHeld();
  return matchers_2;
}
export { filterHooksByManagedHold, isManagedOrAllowlistedHook, getManagedHooksHoldState };
