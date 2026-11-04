/**
 * plugins/functionHooks/policyGate.ts
 *
 * 2.1.316 新增：托管策略对函数钩子插件的放行判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import {
  getSettingsForSource,
  getAdminAuthoredPolicySettings,
  allowListEntriesThatVouch,
  getSettings_DEPRECATED,
  getSettingsWithErrors_2,
} from "../../utils/settings/settings.js";
import { getPluginAffectingSettingsSnapshot } from "../../utils/plugins/loadPluginHooks.js";
import { TRUSTED_SETTING_SOURCES as TRUSTED_SETTING_SOURCES_2 } from "../../utils/plugins/pluginConfigSources.js";
import { normalizeCarveOutFlag } from "../../utils/settings/permissionRuleCarveOut.js";
import { commandPluginSourcesDisabledBySettings } from "../../utils/plugins/marketplacePolicy.js";
import {
  resolveManagedPluginOrder,
  getPolicyOnlyBuiltinPluginNames,
} from "../../utils/plugins/managedPlugins.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  shouldAllowManagedHooksOnly,
  shouldDisableAllHooksIncludingManaged,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { rereadPluginSettings } from "./agentHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";

//@ chunk-e6aww6q8.js:4118038-4118103 placement
/**
 * 按键排序的条目
 */
var sortedEntries = (record) => Object.fromEntries(Object.entries(record ?? {}).toSorted());
//@ chunk-e6aww6q8.js:4118103-4118220 placement
/**
 * 读取某设置来源里与插件有关的部分（enabledPlugins、pluginConfigs，键排序）。
 */
function readSourcePluginSettings(source) {
  let settingsForSource = getSettingsForSource(source);
  return {
    source,
    enabledPlugins: sortedEntries(settingsForSource?.enabledPlugins),
    pluginConfigs: sortedEntries(settingsForSource?.pluginConfigs),
  };
}
//@ chunk-e6aww6q8.js:4118220-4118555 placement
/**
 * 读取管理员策略中与插件来源有关的部分（额外/严格已知市场）以及插件影响设置快照中的启用与命名。
 */
function readAdminPluginPolicy() {
  let adminAuthoredPolicySettings = getAdminAuthoredPolicySettings();
  let { enables, names } = getPluginAffectingSettingsSnapshot();
  return {
    extraKnownMarketplaces: sortedEntries(adminAuthoredPolicySettings?.extraKnownMarketplaces),
    strictKnownMarketplaces:
      allowListEntriesThatVouch(adminAuthoredPolicySettings?.strictKnownMarketplaces) ?? null,
    seat: {
      enabledPlugins: sortedEntries(enables?.enabledPlugins),
      extraKnownMarketplaces: sortedEntries(names?.extraKnownMarketplaces),
      strictKnownMarketplaces: allowListEntriesThatVouch(names?.strictKnownMarketplaces) ?? null,
    },
  };
}
//@ chunk-e6aww6q8.js:4118555-4119194 placement
function readManagedHooksPolicy() {
  let settings_DEPRECATED = getSettings_DEPRECATED();
  let settingsForSource = getSettingsForSource("policySettings");
  let disableCommandPluginSources = settingsForSource?.disableCommandPluginSources;
  return {
    enabledPlugins: sortedEntries(settings_DEPRECATED.enabledPlugins),
    pluginConfigs: sortedEntries(settings_DEPRECATED.pluginConfigs),
    trusted: TRUSTED_SETTING_SOURCES_2.map(readSourcePluginSettings),
    extraKnownMarketplaces: sortedEntries(settings_DEPRECATED.extraKnownMarketplaces),
    strictKnownMarketplaces: settingsForSource?.strictKnownMarketplaces ?? null,
    blockedMarketplaces: settingsForSource?.blockedMarketplaces ?? null,
    vouching: readAdminPluginPolicy(),
    disableSideloadFlags: settingsForSource?.disableSideloadFlags === true,
    disablePluginDirectory: normalizeCarveOutFlag(settingsForSource?.disablePluginDirectory) ?? null,
    disableCommandPluginSources:
      disableCommandPluginSources === undefined ? null : disableCommandPluginSources === true,
    commandSourcesDisabled: commandPluginSourcesDisabledBySettings(),
    tierOrder: resolveManagedPluginOrder(),
    policyOnlyBits: getPolicyOnlyBuiltinPluginNames(),
    hooksDisabled: isCustomizationDisabled("hooks"),
    managedOnly: shouldAllowManagedHooksOnly(),
    allDisabled: shouldDisableAllHooksIncludingManaged(),
  };
}
//@ chunk-e6aww6q8.js:4119194-4119214 placement
/**
 * 托管钩子策略快照
 */
var managedHooksPolicyStamp = () => jsonStringify(readManagedHooksPolicy());
//@ chunk-e6aww6q8.js:4119214-4119268 placement
/**
 * 策略快照是否仍然一致
 */
var isPolicyStampCurrent = (policy) =>
  policy.readUnder === undefined || policy.readUnder === managedHooksPolicyStamp();
//@ chunk-e6aww6q8.js:4119268-4119278 placement
/**
 * 2
 */
var POLICY_REREAD_TRIES = 2;
//@ chunk-e6aww6q8.js:4119278-4119374 placement
/**
 * 读到策略稳定为止
 */
async function readStablePolicy(policy, triesLeft = POLICY_REREAD_TRIES) {
  let read = await policy.read();
  return isPolicyStampCurrent(read) || triesLeft === 0
    ? read
    : readStablePolicy(await rereadPluginSettings(policy, read), triesLeft - 1);
}
//@ chunk-e6aww6q8.js:4119374-4119384 placement
/**
 * 空串
 */
var EMPTY_POLICY_STAMP = "";
//@ chunk-e6aww6q8.js:4119384-4119561 placement
/**
 * 生成当前托管钩子策略的序列化快照，用于判断读取插件后策略是否变化；失败时返回空串（强制重读）。
 */
function managedHooksPolicyStamp_2() {
  try {
    return managedHooksPolicyStamp();
  } catch (error) {
    logForDebugging(
      `the settings a read of the plugins began under could not be spelled, so a hooks pass reads again: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return EMPTY_POLICY_STAMP;
  }
}
//@ chunk-e6aww6q8.js:4159877-4159947 placement
/**
 * 演示或 claubbet 环境
 */
function isDemoOrClaubbet() {
  return isEnvTruthy(false) || Boolean(env.IS_DEMO) || Boolean(env.CLAUBBIT);
}
//@ chunk-e6aww6q8.js:4159947-4159986 placement
/**
 * 取合并后设置
 */
function computedSettings(hookedMerge) {
  getSettingsWithErrors_2();
  return hookedMerge.computed;
}
export {
  isDemoOrClaubbet,
  managedHooksPolicyStamp_2,
  EMPTY_POLICY_STAMP,
  readStablePolicy,
  managedHooksPolicyStamp,
  computedSettings,
  sortedEntries,
};
