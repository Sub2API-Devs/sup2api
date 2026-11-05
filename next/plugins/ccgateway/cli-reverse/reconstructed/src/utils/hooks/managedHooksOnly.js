/**
 * utils/hooks/managedHooksOnly.ts
 *
 * 仅托管钩子（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-7jxyna5q.js:205064-205140 placement (2.1.88 match: _temp7, 0.778)
var policyHookKeysForEvent = (a_2) =>
  new Set(
    (getSettingsForSource("policySettings")?.hooks?.[a_2] ?? []).map((matcher) =>
      stableStringifySafe(matcher),
    ),
  );
//@ chunk-7jxyna5q.js:205140-205425 placement
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
//@ chunk-7jxyna5q.js:205425-205473 placement
var countHooks = (matchers) => matchers.reduce((acc, matcher) => acc + matcher.hooks.length, 0);
//@ chunk-7jxyna5q.js:205473-205500 placement
/**
 * 判断钩子是否来自官方市场或允许名单。
 */
var isManagedOrAllowlistedHook = (pluginId) =>
  isOfficialMarketplaceRef(pluginId) || isManagedHookAllowed(pluginId);
//@ chunk-7jxyna5q.js:206114-206292 placement
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
export { isManagedOrAllowlistedHook, filterHooksByManagedHold, getManagedHooksHoldState };
