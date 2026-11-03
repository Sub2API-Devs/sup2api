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
import { _Ot } from "../../utils/settings/permissionRuleCarveOut.js";
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
var ST = (e) => Object.fromEntries(Object.entries(e ?? {}).toSorted());
/**
 * 读取某设置来源里与插件有关的部分（enabledPlugins、pluginConfigs，键排序）。
 */
//@ chunk-e6aww6q8.js:4118103-4118220 placement
function readSourcePluginSettings(e) {
  let n = getSettingsForSource(e);
  return { source: e, enabledPlugins: ST(n?.enabledPlugins), pluginConfigs: ST(n?.pluginConfigs) };
}
/**
 * 读取管理员策略中与插件来源有关的部分（额外/严格已知市场）以及插件影响设置快照中的启用与命名。
 */
//@ chunk-e6aww6q8.js:4118220-4118555 placement
function readAdminPluginPolicy() {
  let e = getAdminAuthoredPolicySettings(),
    { enables: enables, names: names } = getPluginAffectingSettingsSnapshot();
  return {
    extraKnownMarketplaces: ST(e?.extraKnownMarketplaces),
    strictKnownMarketplaces: allowListEntriesThatVouch(e?.strictKnownMarketplaces) ?? null,
    seat: {
      enabledPlugins: ST(enables?.enabledPlugins),
      extraKnownMarketplaces: ST(names?.extraKnownMarketplaces),
      strictKnownMarketplaces: allowListEntriesThatVouch(names?.strictKnownMarketplaces) ?? null,
    },
  };
}
//@ chunk-e6aww6q8.js:4118555-4119194 placement
function readManagedHooksPolicy() {
  let e = getSettings_DEPRECATED(),
    n = getSettingsForSource("policySettings"),
    r = n?.disableCommandPluginSources;
  return {
    enabledPlugins: ST(e.enabledPlugins),
    pluginConfigs: ST(e.pluginConfigs),
    trusted: TRUSTED_SETTING_SOURCES_2.map(readSourcePluginSettings),
    extraKnownMarketplaces: ST(e.extraKnownMarketplaces),
    strictKnownMarketplaces: n?.strictKnownMarketplaces ?? null,
    blockedMarketplaces: n?.blockedMarketplaces ?? null,
    vouching: readAdminPluginPolicy(),
    disableSideloadFlags: n?.disableSideloadFlags === !0,
    disablePluginDirectory: _Ot(n?.disablePluginDirectory) ?? null,
    disableCommandPluginSources: r === void 0 ? null : r === !0,
    commandSourcesDisabled: commandPluginSourcesDisabledBySettings(),
    tierOrder: resolveManagedPluginOrder(),
    policyOnlyBits: getPolicyOnlyBuiltinPluginNames(),
    hooksDisabled: isCustomizationDisabled("hooks"),
    managedOnly: shouldAllowManagedHooksOnly(),
    allDisabled: shouldDisableAllHooksIncludingManaged(),
  };
}
//@ chunk-e6aww6q8.js:4119194-4119214 placement
var k6 = () => jsonStringify(readManagedHooksPolicy());
//@ chunk-e6aww6q8.js:4119214-4119268 placement
var ojn = (e) => e.readUnder === void 0 || e.readUnder === k6();
//@ chunk-e6aww6q8.js:4119268-4119278 placement
var rjn = 2;
//@ chunk-e6aww6q8.js:4119278-4119374 placement
async function tdt(e, n = rjn) {
  let read = await e.read();
  return ojn(read) || n === 0 ? read : tdt(await rereadPluginSettings(e, read), n - 1);
}
//@ chunk-e6aww6q8.js:4119374-4119384 placement
var T6 = "";
/**
 * 生成当前托管钩子策略的序列化快照，用于判断读取插件后策略是否变化；失败时返回空串（强制重读）。
 */
//@ chunk-e6aww6q8.js:4119384-4119561 placement
function managedHooksPolicyStamp() {
  try {
    return k6();
  } catch (error) {
    return (
      logForDebugging(
        `the settings a read of the plugins began under could not be spelled, so a hooks pass reads again: ${errorMessage(error)}`,
        { level: "error" },
      ),
      T6
    );
  }
}
//@ chunk-e6aww6q8.js:4159877-4159947 placement
function JKe() {
  return isEnvTruthy(!1) || Boolean(env.IS_DEMO) || Boolean(env.CLAUBBIT);
}
//@ chunk-e6aww6q8.js:4159947-4159986 placement
function ems(e) {
  return (getSettingsWithErrors_2(), e.computed);
}

export { JKe, managedHooksPolicyStamp, T6, tdt, k6, ems, ST };
