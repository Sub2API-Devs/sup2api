/**
 * commands/config/configShorthand.ts
 *
 * 2.1.316 新增：应用 /config key=value 速记：匹配设置行、校验并写入，返回结果或拒绝原因；生成速记可用的设置行列表（含工作流开关等）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xmfcjh5p.js (43)
 * attribution: placement 43
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { countWhere } from "../../utils/collections.js";
import { isBridgeOrVerifiedSlackTurn } from "../../utils/promptSubmissionOrigin.js";
import { readUnattendedServingConsent } from "../../services/remoteTools/unattendedConsentStore.js";
import {
  buildConfigRows,
  remoteForwardedSettings,
  getEffectiveConfigValues,
  NOOP_CONFIG_WRITERS,
} from "./configSettings.js";
import { ensurePolicyLimitsLoadedForDiagnostic } from "../../bridge/bridgeGates.js";
import { logEvent } from "../../services/analytics/index.js";
import { shortHash } from "../../utils/shortHash.js";
import { sanitizeTelemetryString, recursivelySanitizeUnicode_2 } from "../../utils/sanitization.js";
import {
  truthyOrFalsyEnv,
  isTrueOrTrueString,
  parseBoundedNumber,
  getFormatHint,
} from "../../utils/plugins/pluginConfigEnv.js";
import {
  WireSafeControlError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import {
  getInitialSettings,
  getSettingsForSource,
  getSettingsForSourceForUpkeep,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { getAutoContinueSettingValue } from "../../services/autoContinueAtUsageLimit.js";
import { resolveSetting, saveUserIntentSetting } from "../../utils/settings/userIntentSettings.js";
import { workflowsUsableNow } from "../../utils/workflows/workflowGates.js";
import { hasWorkflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { isAutoContinueUserSetting } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { isArtifactConfigToggleable } from "../../services/artifacts/artifactToolGates.js";
import { DEFAULT_2 } from "../../constants/outputStyles.js";
import { useMainLoopModel } from "../../utils/model/modelSwitchHooks.js";
import { isFastModeEnabled } from "../../utils/fastMode.js";
import { shouldShowConfigGate } from "../../components/Settings/configGates.js";
import { hasAccessToIDEExtensionDiffFeature } from "../../utils/ide.js";
import { env } from "../../utils/env.js";
import { isRemoteToolServingOnForSettings } from "../../services/remoteTools/servingGates.js";
import { getAutoUpdaterDisabledReason } from "../../utils/config.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { trustedPluginSetting, pluginIdAliases } from "../../utils/plugins/pluginConfigSources.js";
import { marketplaceSource, clearPluginOptionsCache } from "../../utils/plugins/pluginOptionsStorage.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { refreshOptions } from "../../plugins/functionHooks/hooksModuleLoader.js";
import { logOptionsReloads } from "../../plugins/functionHooks/devModsWatch.js";
import { logForDebugging } from "../../utils/debug.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import {
  COMPOSER_CONFIG_ORIGIN,
  dispatchConfigSet,
  isConfigSetHooked,
  describeConfigRowIfHooked,
} from "../../plugins/functionHooks/configApi.js";
import { ENGINE_ORIGIN } from "../../plugins/functionHooks/dispatch/chain.js";
import { providerTierOf } from "../../plugins/functionHooks/providerTiers.js";
import { SET_MODEL_PREFIX, toInlineCode, SAVED_AS_DEFAULT_SUFFIX } from "../model/modelMessages.js";
import { renderModelLabel } from "../model/model.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xmfcjh5p.js:31897-32239 placement
function parseConfigShorthand(text) {
  let trimmed = text.trim();
  if (!trimmed || !trimmed.includes("=")) return null;
  let parts = trimmed.split(/\s+/);
  if (countWhere(parts, (part) => part.includes("=")) === 1) {
    let index = trimmed.indexOf("=");
    let sliced = trimmed.slice(0, index);
    if (!sliced || /\s/.test(sliced)) return null;
    return [
      {
        key: sliced,
        raw: trimmed.slice(index + 1),
      },
    ];
  }
  let segments = [];
  for (let part of parts) {
    let index = part.indexOf("=");
    if (index <= 0) return null;
    segments.push({
      key: part.slice(0, index),
      raw: part.slice(index + 1),
    });
  }
  return segments;
}
//@ chunk-xmfcjh5p.js:32239-32375 placement
function findSettingRow(key, rows) {
  let lower = key.toLowerCase();
  let filtered = rows.filter((row) => row.id.toLowerCase() === lower);
  return rows.find((row) => row.id === key) ?? (filtered.length === 1 ? filtered[0] : undefined);
}
//@ chunk-xmfcjh5p.js:32375-32529 placement
function shorthandRows({ settings, dialogFieldRows }, context) {
  if (isBridgeOrVerifiedSlackTurn(context)) return settings;
  let agentsViewKey = "defaultToAgentsView";
  return [
    ...settings.filter((setting) => setting.id !== agentsViewKey),
    ...dialogFieldRows.filter((row) => row.id === agentsViewKey),
  ];
}
//@ chunk-xmfcjh5p.js:32529-32690 placement
var SETTING_REDIRECTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xmfcjh5p.js:32529", () => {
  SETTING_REDIRECTS = new Map([
    ["agentsView", "/config (Agents view row)"],
    ["autoUpdatesChannel", "/channel"],
    ["showExternalIncludesDialog", "/config (External CLAUDE.md row)"],
  ]);
});
//@ chunk-xmfcjh5p.js:32690-32805 placement
function isLockedForKey(settingRow, key) {
  return (
    settingRow.lock !== undefined &&
    !settingRow.lock.writableWhileLocked?.some((id) => id.toLowerCase() === key.toLowerCase())
  );
}
//@ chunk-xmfcjh5p.js:32805-33120 placement
async function applyConfigShorthand(settings, context, options) {
  let shorthandRows_2 = buildShorthandRows(context, options);
  await readUnattendedServingConsent().catch(() => {
    return;
  });
  let rows = withBridgeRows(shorthandRows(buildConfigRows(shorthandRows_2), context), context);
  if (
    settings.some(({ key, raw }) => {
      let settingRow = findSettingRow(key, rows);
      return (
        settingRow !== undefined && settingRow.lock?.source !== "managed" && isLockedForKey(settingRow, raw)
      );
    })
  ) {
    await ensurePolicyLimitsLoadedForDiagnostic().catch(() => {});
    rows = withBridgeRows(
      shorthandRows(buildConfigRows(buildShorthandRows(context, options)), context),
      context,
    );
  }
  let lines = [];
  for (let { key, raw } of settings) lines.push(await applyConfigShorthandEntry(key, raw, rows));
  return lines;
}
//@ chunk-xmfcjh5p.js:33120-35311 placement
/**
 * 应用 /config key=value 速记：匹配设置行、校验并写入，返回结果或拒绝原因。
 */
async function applyConfigShorthandEntry(key, key_2, rows) {
  let settingRow = findSettingRow(key, rows);
  logEvent("tengu_config_shorthand", {
    key_hash: shortHash(key),
    matched: settingRow !== undefined,
  });
  if (!settingRow) {
    let filtered = rows.filter((row) => row.id.toLowerCase() === key.toLowerCase());
    return {
      ok: false,
      kind: "refusal",
      message:
        filtered.length > 1
          ? `${sanitizeTelemetryString(key)} matches ${filtered.map((row) => sanitizeTelemetryString(row.id)).join(" and ")}; type one exactly.`
          : `${sanitizeTelemetryString(key)} isn't a /config setting. Run /config to see what's available.`,
    };
  }
  let label = ("labelBoldSuffix" in settingRow ? settingRow.searchText : undefined) ?? settingRow.label;
  if (isLockedForKey(settingRow, key_2))
    return {
      ok: false,
      kind:
        settingRow.lock?.reason === PLUGIN_SETTINGS_REMOTE_REFUSAL || settingRow.lock?.reasonShipsOffBox
          ? "refusal"
          : "locked",
      message: `Couldn't save ${label}: ${settingRow.lock?.reason}`,
    };
  if (settingRow.consentGated) {
    let isOff = truthyOrFalsyEnv(key_2) === false;
    let lines =
      (settingRow.type === "boolean" && isOff) ||
      (settingRow.lock !== undefined && !isLockedForKey(settingRow, key_2));
    let isOn = settingRow.value === true || settingRow.canWithdraw?.() === true;
    if (lines && !isOn)
      return {
        ok: true,
        kind: "refusal",
        message: `${key} is already off.`,
      };
    if (!(lines && isOn))
      return {
        ok: false,
        kind: "refusal",
        message: `${label} can't be enabled with key=value \u2014 open /config to change it from the panel.`,
      };
  }
  switch (settingRow.type) {
    case "boolean": {
      let value = truthyOrFalsyEnv(key_2);
      if (value === undefined)
        return {
          ok: false,
          kind: "refusal",
          message: `${label} takes true or false, not "${sanitizeTelemetryString(key_2)}".`,
        };
      let result = await settingRow.onChange(value);
      if (result?.error) {
        if (result.error instanceof WireSafeControlError)
          return {
            ok: false,
            kind: "refusal",
            message: `${label}: ${result.error.message}${result?.messageSuffix ?? ""}`,
          };
        return {
          ok: false,
          kind: "save-failure",
          message: `Couldn't save ${label}: ${result.error.message}${result?.messageSuffix ?? ""}`,
        };
      }
      return {
        ok: true,
        kind: "refusal",
        message: `Set ${label} to ${value ? "true" : "false"}${result?.messageSuffix ?? ""}`,
      };
    }
    case "enum":
    case "managedEnum": {
      let coerce = settingRow.coerce;
      if (!settingRow.options && !coerce)
        return {
          ok: false,
          kind: "refusal",
          message: `${label} can't be set with key=value \u2014 use ${SETTING_REDIRECTS.get(settingRow.id) ?? "/config"}.`,
        };
      let coerced = coerce
        ? coerce(key_2)
        : settingRow.options?.find((option) => option.toLowerCase() === key_2.toLowerCase());
      if (coerced === undefined) {
        let hint =
          settingRow.type === "managedEnum" && settingRow.optionsHint ? ` ${settingRow.optionsHint}` : "";
        return {
          ok: false,
          kind: "refusal",
          message: settingRow.options
            ? `${label} takes one of: ${settingRow.options.join(", ")}.${hint}`
            : `${label} doesn't accept "${sanitizeTelemetryString(key_2)}".${hint}`,
        };
      }
      let applyResult = await settingRow.onChange(coerced);
      if (applyResult?.error) {
        if (applyResult.error instanceof WireSafeControlError)
          return {
            ok: false,
            kind: "refusal",
            message: `${label}: ${applyResult.error.message}${applyResult?.messageSuffix ?? ""}`,
          };
        return {
          ok: false,
          kind: "save-failure",
          message: `Couldn't save ${label}: ${applyResult.error.message}${applyResult?.messageSuffix ?? ""}`,
        };
      }
      return {
        ok: true,
        kind: "refusal",
        message: `Set ${label} to ${sanitizeTelemetryString(coerced)}${applyResult?.messageSuffix ?? ""}`,
      };
    }
  }
}
//@ chunk-xmfcjh5p.js:35311-35540 placement
function collapseShorthandResultOffBox(result, refusal) {
  if (!refusal) return result.message;
  switch (result.kind) {
    case "save-failure":
      return WITHHELD_SAVE_ERROR_TEXT;
    case "locked":
      return "Couldn't save this setting: a trusted policy owns it (detail withheld on this connection).";
    case "refusal":
      return result.message;
  }
}
//@ chunk-xmfcjh5p.js:35540-35793 placement
function listConfigKeys(context) {
  return withPluginSettingRows(shorthandRows(buildConfigRows(buildShorthandRows(context)), context), context)
    .flatMap((row) => {
      if (row.consentGated) return [];
      let value =
        row.type === "boolean"
          ? "true|false"
          : row.options
            ? row.options.join("|")
            : row.type === "managedEnum" && row.coerce
              ? "<value>"
              : null;
      return value ? [`  ${row.id}=${value}`] : [];
    })
    .sort().join(`
`);
}
//@ chunk-xmfcjh5p.js:35793-36326 placement
function getConfigArgumentCompletions(arg, context) {
  let rows = DETACHED_CONFIG_KEYS_SLOT.of(getRootSession().host).lookup();
  let index = context.indexOf("=");
  if (index === -1) {
    let lower = context.toLowerCase();
    return rows
      .filter((row) => row.id.toLowerCase().startsWith(lower))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((row) => ({
        value: `${row.id}=`,
        description: row.options?.slice(0, 4).join(" | ") ?? row.hint,
        isFinal: false,
        appendSpace: false,
      }));
  }
  let sliced = context.slice(0, index);
  let lower = context.slice(index + 1).toLowerCase();
  let found = rows.find((row) => row.id.toLowerCase() === sliced.toLowerCase());
  if (!found?.options) return [];
  return found.options
    .filter((option) => option.toLowerCase().startsWith(lower))
    .map((option) => ({
      value: `${found.id}=${option}`,
      isFinal: true,
    }));
}
//@ chunk-xmfcjh5p.js:36326-36501 placement
class DetachedConfigKeysCache {
  keys = undefined;
  remoteWorkspace = false;
  lookup() {
    if (this.remoteWorkspace !== isRemoteSessionAvailable()) {
      this.remoteWorkspace = !this.remoteWorkspace;
      this.keys = undefined;
    }
    this.keys ??= createDetachedConfigContext();
    return this.keys;
  }
}
//@ chunk-xmfcjh5p.js:36501-36526 placement
var DETACHED_CONFIG_KEYS_SLOT; // deferred: uses DetachedConfigKeysCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xmfcjh5p.js:36501", () => {
  DETACHED_CONFIG_KEYS_SLOT = new HostScoped(() => new DetachedConfigKeysCache());
});
//@ chunk-xmfcjh5p.js:36526-37055 placement
/**
 * 构造不依赖 REPL 的最小 AppState 上下文，用于非交互地计算设置行。
 */
function createDetachedConfigContext() {
  let ctx = {
    getAppState: () => ({
      thinkingEnabled: false,
      verbose: false,
      mainLoopModel: null,
      mainLoopModelForSession: null,
      fastMode: false,
      promptSuggestionEnabled: false,
      awaySummaryEnabled: false,
      toolPermissionContext: getEmptyToolPermissionContext(),
    }),
    setAppState: () => {},
    options: {
      mcpClients: [],
    },
  };
  return shorthandRows(buildConfigRows(buildShorthandRows(ctx)), ctx).flatMap((row) => {
    if (row.consentGated) return [];
    let value =
      row.type === "boolean" ? ["true", "false"] : "options" in row && row.options ? row.options : undefined;
    if (value || (row.type === "managedEnum" && row.coerce))
      return [
        {
          id: row.id,
          options: value,
          hint: row.type === "managedEnum" ? row.optionsHint : undefined,
        },
      ];
    return [];
  });
}
//@ chunk-xmfcjh5p.js:37055-38593 placement
/**
 * 生成速记可用的设置行列表（含工作流开关等）。
 */
function buildShorthandRows(context, options) {
  let appState = context.getAppState();
  let base = {
    ...getInitialSettings(),
    ...remoteForwardedSettings(),
    autoContinueAtUsageLimit: getAutoContinueSettingValue() ?? true,
  };
  let effectiveConfigValues = getEffectiveConfigValues();
  let setting = resolveSetting("disableWorkflows", false);
  let setting_2 = resolveSetting("enableWorkflows", false);
  let workflowsToggleable =
    workflowsUsableNow() &&
    (setting.value !== true || setting.source === "userSettings") &&
    (setting_2.source === "default" || setting_2.source === "userSettings");
  let workflowSizeGuidelineToggleable = !hasWorkflowSizeSetting();
  let autoContinueAtUsageLimitToggleable = isAutoContinueUserSetting();
  let artifactToggleable = isArtifactConfigToggleable();
  let showDefaultViewPicker = require("../../tools/BriefTool/BriefTool.js").isBriefEntitled();
  return {
    globalConfig: effectiveConfigValues,
    settingsData: base,
    storageV5: context.storageV5,
    mayBeAuthoredByNonOwner: isBridgeOrVerifiedSlackTurn(context),
    themeSetting: effectiveConfigValues.theme,
    currentOutputStyle: base?.outputStyle || DEFAULT_2,
    currentLanguage: base?.language,
    externalIncludesApproved: false,
    thinkingEnabled: appState.thinkingEnabled,
    verbose: appState.verbose,
    mainLoopModel: appState.mainLoopModel,
    currentModel: useMainLoopModel(appState),
    isFastMode: isFastModeEnabled() ? appState.fastMode : false,
    promptSuggestionEnabled: appState.promptSuggestionEnabled,
    awaySummaryEnabled: appState.awaySummaryEnabled,
    showDefaultViewPicker,
    pushTogglesVisible: shouldShowConfigGate(),
    crossSessionInboxRowVisible: false,
    isConnectedToIde: hasAccessToIDEExtensionDiffFeature(context.options.mcpClients),
    inAppSelection: true,
    tabsStandIn: false,
    isFileCheckpointingAvailable: !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING,
    workflowsToggleable,
    workflowSizeGuidelineToggleable,
    autoContinueAtUsageLimitToggleable,
    artifactToggleable,
    remoteToolServingOn: isRemoteToolServingOnForSettings(),
    launchDirectoryKeys: null,
    shouldShowExternalIncludesToggle: false,
    autoUpdaterDisabledReason: getAutoUpdaterDisabledReason(),
    promptSuggestionRun: context.session?.promptSuggestion,
    modelSwitchHooks: context.session
      ? {
          session: context.session,
          readState: () => context.getAppState(),
          latestPick: {
            current: 0,
          },
          latestFastPick: {
            current: 0,
          },
        }
      : null,
    setAppState: (state) => context.setAppState(state),
    setTheme:
      options?.setTheme ??
      ((theme) =>
        isStorageV5Enabled() && context.storageV5 !== undefined
          ? saveUserIntentSetting("theme", theme, context.storageV5)
          : saveUserIntentSetting("theme", theme)),
    ...NOOP_CONFIG_WRITERS,
  };
}
//@ chunk-xmfcjh5p.js:38593-38848 placement
var PLUGIN_SETTINGS_REMOTE_REFUSAL =
  "a plugin's settings can't be changed over Remote Control or from a relayed message \u2014 open /config in the session itself";
var MANAGED_PLUGIN_CONFIG_NOTE = "Set by your organization's managed settings (pluginConfigs)";
var FLAG_PLUGIN_CONFIG_NOTE = "Set by --settings for this session (pluginConfigs)";
//@ chunk-xmfcjh5p.js:38848-38897 placement
function pluginSettingOption(source, key, defaultValue) {
  return trustedPluginSetting(source).options?.[key] ?? defaultValue;
}
//@ chunk-xmfcjh5p.js:38897-39077 placement (2.1.88 match: getEnabledSettingSources, 0.836)
function getPluginOptionLockingSource(source, key) {
  let hasOption = (pluginId) => {
    let pluginConfigs = getSettingsForSource(pluginId)?.pluginConfigs;
    return pluginIdAliases(source).some(
      (pluginId) => pluginConfigs?.[pluginId]?.options?.[key] !== undefined,
    );
  };
  if (hasOption("policySettings")) return MANAGED_PLUGIN_CONFIG_NOTE;
  return hasOption("flagSettings") ? FLAG_PLUGIN_CONFIG_NOTE : undefined;
}
//@ chunk-xmfcjh5p.js:39077-39452 placement
/**
 * 把插件配置项写入 userSettings.pluginConfigs，值未变则跳过。
 */
async function savePluginConfigOption(plugin, key, value, storageV5) {
  let marketplace = marketplaceSource(plugin);
  let nextValue = typeof value === "object" ? [...value] : value;
  let hintKey = `${marketplace}\x00${key}`;
  let hasHint = PLUGIN_SAVE_HINTS.has(hintKey)
    ? PLUGIN_SAVE_HINTS.get(hintKey)
    : getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs?.[marketplace]?.options?.[key];
  if (jsonStringify(hasHint) === jsonStringify(nextValue)) return;
  PLUGIN_SAVE_HINTS.set(hintKey, nextValue);
  let writeResult = await updateSettingsForSource(
    "userSettings",
    {
      pluginConfigs: {
        [marketplace]: {
          options: {
            [key]: nextValue,
          },
        },
      },
    },
    undefined,
    storageV5,
  ).finally(() => {
    if (PLUGIN_SAVE_HINTS.get(hintKey) === nextValue) PLUGIN_SAVE_HINTS.delete(hintKey);
  });
  if (writeResult.error)
    return {
      error: writeResult.error,
    };
  clearPluginOptionsCache();
  return pluginConfigSaveSuffix(plugin, key);
}
//@ chunk-xmfcjh5p.js:39452-39467 placement
var PLUGIN_SAVE_HINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xmfcjh5p.js:39452", () => {
  PLUGIN_SAVE_HINTS = new Map();
});
//@ chunk-xmfcjh5p.js:39467-39968 placement
/**
 * 插件配置保存后给出提示后缀（需要 /reload-plugins 等）。
 */
async function pluginConfigSaveSuffix(plugin, storageV5) {
  let marketplace = marketplaceSource(plugin);
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === plugin.name);
  if (found !== undefined && found.args.pluginStorageId !== marketplace)
    return {
      messageSuffix: " \xB7 saved; /reload-plugins applies it",
    };
  let results = await refreshOptions();
  logOptionsReloads(results);
  let found_2 = results.find((entry) => entry.name === plugin.name);
  if (found_2 !== undefined && found_2.kind !== "reloaded") {
    let suffix =
      found_2.kind === "refused"
        ? found_2.result.refused
        : found_2.kind === "held"
          ? found_2.reason
          : errorMessage(found_2.error);
    logForDebugging(`/config ${plugin.name}.${storageV5}: saved; ${suffix}`);
    return {
      messageSuffix: " \xB7 saved, but the plugin did not reload; /reload-plugins applies it",
    };
  }
}
//@ chunk-xmfcjh5p.js:39968-41378 placement
function pluginConfigSettings(enabled, options = {}) {
  let rows = [];
  for (let plugin of enabled) {
    if (plugin.enabled === false) continue;
    let userConfig = plugin.manifest.userConfig ?? {};
    let marketplace = marketplaceSource(plugin);
    let pluginLabel = sanitizeTelemetryString(plugin.name);
    let otherPlugin = enabled.some(
      (other) =>
        other !== plugin &&
        other.enabled !== false &&
        sanitizeTelemetryString(other.name).toLowerCase() === pluginLabel.toLowerCase(),
    )
      ? marketplace
      : plugin.name;
    for (let [key, value] of Object.entries(userConfig)) {
      if (value.sensitive === true || value.multiple === true) continue;
      let rowId = `${otherPlugin}.${key}`;
      let lockReason = getPluginOptionLockingSource(marketplace, key) ?? options.refusal;
      let refusal =
        lockReason === undefined
          ? undefined
          : {
              reason: lockReason,
              source: "managed",
            };
      let title = sanitizeTelemetryString(value.title);
      let description = sanitizeTelemetryString(value.description);
      let row = {
        id: rowId,
        label: title,
        searchText: `${title} ${plugin.name} ${description}`,
        ...(refusal !== undefined && {
          lock: refusal,
        }),
      };
      let shownValue = options.shown?.get(rowId) ?? pluginSettingOption(marketplace, key, value.default);
      let save = async (nextValue) => {
        if (refusal !== undefined)
          return {
            error: new WireSafeControlError(refusal.reason),
          };
        options.onShown?.(rowId, nextValue);
        let saveResult = await savePluginConfigOption(plugin, key, nextValue, options.storageV5);
        if (saveResult?.error && shownValue !== undefined) options.onShown?.(rowId, shownValue);
        return saveResult;
      };
      if (value.type === "boolean") {
        rows.push({
          ...row,
          value: isTrueOrTrueString(shownValue),
          type: "boolean",
          provided: {
            plugin: pluginLabel,
            pluginId: marketplace,
            description,
            kind: "boolean",
          },
          onChange: save,
        });
        continue;
      }
      if (value.type === "string" && value.options !== undefined) {
        let options = normalizeCaseForComparison_2(value.options.map(sanitizeTelemetryString)).filter(
          (option) => option !== "",
        );
        rows.push({
          ...row,
          value: shownValue === undefined ? "" : String(shownValue),
          options,
          type: "enum",
          pickToCommit: true,
          provided: {
            plugin: pluginLabel,
            pluginId: marketplace,
            description,
            kind: "choice",
          },
          onChange: save,
        });
        continue;
      }
      let isNumber = value.type === "number";
      rows.push({
        ...row,
        value: shownValue === undefined ? "" : String(shownValue),
        type: "managedEnum",
        coerce: (raw) => {
          if (!isNumber) return raw;
          let boundedNumber = parseBoundedNumber(raw, value);
          return boundedNumber === undefined ? undefined : String(boundedNumber);
        },
        optionsHint: isNumber ? getFormatHint(value) : undefined,
        provided: {
          plugin: pluginLabel,
          pluginId: marketplace,
          description,
          kind: isNumber ? "number" : "text",
        },
        onChange: (raw) => save(isNumber ? Number(raw) : raw),
      });
    }
  }
  return rows;
}
//@ chunk-xmfcjh5p.js:41378-41501 placement
function shownSettingValue(row) {
  let shown = String(row.value);
  return row.provided !== undefined && row.type !== "boolean"
    ? recursivelySanitizeUnicode_2(stripControlChars(shown.replace(/[\t\n\r]/g, " ")))
    : shown;
}
//@ chunk-xmfcjh5p.js:41501-41631 placement
function withPluginSettingRows(rows, context) {
  let enabled = context.getAppState().plugins?.enabled ?? [];
  return [
    ...rows,
    ...pluginConfigSettings(enabled, {
      storageV5: context.storageV5,
      ...(isBridgeOrVerifiedSlackTurn(context) && {
        refusal: PLUGIN_SETTINGS_REMOTE_REFUSAL,
      }),
    }),
  ];
}
//@ chunk-xmfcjh5p.js:41631-41714 placement
function withBridgeRows(rows, context) {
  let origin = isBridgeOrVerifiedSlackTurn(context)
    ? {
        kind: "bridge",
      }
    : COMPOSER_CONFIG_ORIGIN;
  return withPluginSettingRows(rows, context).map((row) => throughConfigSet(row, origin));
}
//@ chunk-xmfcjh5p.js:41714-42315 placement
/**
 * 推断设置行的值类型（boolean/number/choice/text）与可选项。
 */
function describeConfigRowKind(row) {
  let provided = row.provided;
  let kind =
    row.type === "boolean"
      ? "boolean"
      : (provided?.kind ??
        (row.type === "enum"
          ? "choice"
          : row.coerce !== undefined
            ? "text"
            : row.options !== undefined
              ? "choice"
              : "text"));
  let options = row.type === "boolean" ? undefined : (row.options ?? undefined);
  let coerce = kind === "number" && typeof row.value === "string" ? Number(row.value) : Number.NaN;
  let value =
    typeof row.value === "string" && row.value.trim() !== "" && Number.isFinite(coerce) ? coerce : row.value;
  return {
    row: {
      key: row.id,
      label: row.label,
      ...(provided !== undefined && {
        description: provided.description,
      }),
      kind,
      value,
      ...(kind === "choice" &&
        options !== undefined && {
          options,
        }),
      provider: provided === undefined ? ENGINE_ORIGIN : providerTierOf(provided.pluginId),
      isLocked: row.lock !== undefined,
    },
    ...(row.lock !== undefined && {
      lockReason: row.lock.reason,
    }),
  };
}
//@ chunk-xmfcjh5p.js:42315-43245 placement
/**
 * 检查设置行能否修改（同意门槛、托管锁定等），不能时返回原因。
 */
async function checkConfigRowWritable(row, raw) {
  let label = ("labelBoldSuffix" in row ? row.searchText : undefined) ?? row.label;
  if (row.consentGated) {
    if (!(row.type === "boolean" && raw === false && (row.value === true || row.canWithdraw?.() === true)))
      return row.type === "boolean" && raw === false
        ? undefined
        : `${label} can only be turned on from the /config panel.`;
  }
  let apply = async (value) => {
    let result = await value;
    return result?.error ? `${result.error.message}${result.messageSuffix ?? ""}` : undefined;
  };
  switch (row.type) {
    case "boolean":
      return typeof raw === "boolean" ? apply(row.onChange(raw)) : `${label} takes true or false.`;
    case "enum":
    case "managedEnum": {
      let coerce = row.type === "managedEnum" ? row.coerce : undefined;
      if (!row.options && !coerce) return `${label} can only be changed from the /config panel.`;
      let rawText = typeof raw === "string" ? raw : String(raw);
      let coercer = coerce
        ? coerce(rawText)
        : row.options?.find((option) => option.toLowerCase() === rawText.toLowerCase());
      if (coercer === undefined) {
        let coerced = row.type === "managedEnum" && row.optionsHint ? ` ${row.optionsHint}` : "";
        return row.options
          ? `${label} takes one of: ${row.options.join(", ")}.`
          : `${label} doesn't accept "${sanitizeTelemetryString(rawText)}".${coerced}`;
      }
      return apply(row.onChange(coercer));
    }
  }
}
//@ chunk-xmfcjh5p.js:43245-43296 placement
function describeWritableConfigRow(row) {
  return {
    ...describeConfigRowKind(row),
    write: (value) => checkConfigRowWritable(row, value),
  };
}
//@ chunk-xmfcjh5p.js:43296-43353 placement
function configRowHandles(row) {
  return withPluginSettingRows(buildConfigRows(buildShorthandRows(row)).settings, row).map(
    describeWritableConfigRow,
  );
}
//@ chunk-xmfcjh5p.js:43353-43505 placement
function coerceShorthandValue(row, raw) {
  if (row.type === "boolean") return typeof raw === "boolean" ? raw : undefined;
  if (typeof raw === "number") return String(raw);
  return typeof raw === "string" ? raw : undefined;
}
//@ chunk-xmfcjh5p.js:43505-44554 placement
/**
 * 把输入值按设置行类型转换并校验。
 */
function coerceConfigRowValue(row, raw, context, origin = COMPOSER_CONFIG_ORIGIN, options) {
  let { row: row_2 } = describeConfigRowKind(row);
  let nextValue = row_2.kind === "number" && typeof raw === "string" ? Number(raw) : raw;
  let write =
    row_2.kind === "choice" && typeof nextValue === "string" && !(row_2.options ?? []).includes(nextValue)
      ? {
          ...row_2,
          kind: "text",
          options: undefined,
        }
      : row_2;
  let started;
  let failed = false;
  return dispatchConfigSet({
    row: write,
    value: nextValue,
    origin,
    signal: options,
    write: async (value) => {
      if (options?.aborted) return `${write.label}: the change was cancelled`;
      let coerced = coerceShorthandValue(row, value);
      if (coerced === undefined) return `${write.label}: a ${write.kind} row cannot hold that value`;
      let coerce = row.type === "managedEnum" ? row.coerce : undefined;
      let changed = jsonStringify(value) !== jsonStringify(nextValue);
      let outcome =
        changed &&
        row_2.kind === "choice" &&
        coerce === undefined &&
        typeof coerced === "string" &&
        !(row_2.options ?? []).includes(coerced)
          ? undefined
          : changed && coerce !== undefined && typeof coerced === "string"
            ? coerce(coerced)
            : coerced;
      if (outcome === undefined) {
        let result = row.type === "managedEnum" && row.optionsHint ? ` ${row.optionsHint}` : "";
        return `${write.label} doesn't accept "${sanitizeTelemetryString(String(value))}".${result}`;
      }
      started = context(outcome);
      let startedResult = await started;
      failed = startedResult?.error !== undefined;
      return startedResult?.error
        ? `${startedResult.error.message}${startedResult.messageSuffix ?? ""}`
        : undefined;
    },
  }).then((decision) => {
    if (decision.deny === undefined || failed) return started;
    let denyText = sanitizeTelemetryString(decision.deny);
    return {
      error: options?.aborted
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            denyText,
            "config.set withdrawn before it was written",
          )
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            denyText,
            "config.set denied by a hook",
          ),
    };
  });
}
//@ chunk-xmfcjh5p.js:44554-44643 placement
function throughConfigSet(context, origin = COMPOSER_CONFIG_ORIGIN) {
  let onChange = context.onChange;
  return {
    ...context,
    onChange: (value) =>
      isConfigSetHooked() ? coerceConfigRowValue(context, value, onChange, origin) : onChange(value),
  };
}
//@ chunk-xmfcjh5p.js:44643-44711 placement
function commitThroughConfigSet(context, key, raw, options) {
  return context !== undefined && isConfigSetHooked()
    ? coerceConfigRowValue(context, key, raw, COMPOSER_CONFIG_ORIGIN, options)
    : raw(key);
}
//@ chunk-xmfcjh5p.js:44711-44785 placement
var WITHHELD_SAVE_ERROR_TEXT = "Couldn't save this setting (detail withheld on this connection).";
//@ chunk-xmfcjh5p.js:44785-44818 placement
function saveErrorText(refusal, denial) {
  return denial() ? WITHHELD_SAVE_ERROR_TEXT : refusal;
}
//@ chunk-xmfcjh5p.js:44818-44892 placement
var MODEL_MOVED_DURING_HOOK_TEXT = "The model changed while a plugin's hook was deciding; pick again";
//@ chunk-xmfcjh5p.js:44892-45862 placement
async function commitRowThroughConfigSet(row, key, raw, readContext, options = {}) {
  let describedRow = isConfigSetHooked()
    ? buildConfigRows(buildShorthandRows(raw)).settings.find((setting) => setting.id === row)
    : undefined;
  if (describedRow === undefined) {
    let context = await readContext();
    return context?.error === undefined
      ? {
          written: key,
        }
      : {
          refusal: configSaveRefusalText(row, context),
        };
  }
  let state = {};
  let commitOnce = async (value) => {
    if (options.isSuperseded?.()) return configSaveRefusal("a later pick replaced this one");
    if (value !== key && options.refuseRewrite !== undefined)
      return configSaveRefusal(
        options.refuseRewrite === true
          ? "a plugin's hook changed the value; this command writes only what was picked (use /config)"
          : options.refuseRewrite,
      );
    let writable =
      value === key
        ? await Promise.resolve()
            .then(readContext)
            .catch((error) => {
              state.thrown = {
                error,
              };
              return configSaveRefusal("the write failed");
            })
        : await checkConfigRowWritable(describedRow, value).then((writable) =>
            writable === undefined ? undefined : configSaveRefusal(writable),
          );
    if (writable?.error === undefined) state.written = value;
    return writable;
  };
  let outcome = await coerceConfigRowValue(
    describedRow,
    key,
    (value) => (state.outcome ??= commitOnce(value)),
    isBridgeOrVerifiedSlackTurn(raw)
      ? {
          kind: "bridge",
        }
      : COMPOSER_CONFIG_ORIGIN,
  );
  if (state.thrown !== undefined) throw state.thrown.error;
  if (state.written !== undefined)
    return {
      written: state.written,
    };
  let label = ("labelBoldSuffix" in describedRow ? describedRow.searchText : undefined) ?? describedRow.label;
  if (outcome?.error !== undefined)
    return {
      refusal: configSaveRefusalText(label, outcome),
    };
  return {
    refusal: `Couldn't save ${label}: a plugin's hook answered without writing`,
  };
}
//@ chunk-xmfcjh5p.js:45862-45953 placement
function configSaveRefusalText(refusal, label) {
  return `Couldn't save ${refusal}: ${label.error?.message ?? ""}${label.messageSuffix ?? ""}`;
}
//@ chunk-xmfcjh5p.js:45953-46037 placement
function configSaveRefusal(refusal) {
  return {
    error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      refusal,
      "a row commit from a command was not written",
    ),
  };
}
//@ chunk-xmfcjh5p.js:46037-46689 placement
async function savedModelPickReply(model, session, readContext, storageV5) {
  let chosen = model ?? "default";
  let text = "";
  let lines;
  let footer;
  let committed = await commitRowThroughConfigSet(
    "model",
    chosen,
    session,
    async () => {
      if (storageV5.hasModelMoved?.()) {
        lines = MODEL_MOVED_DURING_HOOK_TEXT;
        return configSaveRefusal(lines);
      }
      let context = await readContext();
      if (typeof context === "string") {
        text = context;
        return;
      }
      if ("unsaved" in context) {
        footer = context.unsaved;
        return configSaveRefusal("the default was not saved");
      }
      lines = context.refused;
      return configSaveRefusal(context.refused);
    },
    {
      isSuperseded: storageV5.isSuperseded,
    },
  );
  if (lines !== undefined)
    return {
      text: lines,
      isRefusal: true,
      isOwnRefusal: true,
    };
  if (footer !== undefined)
    return {
      text: footer,
      isRefusal: false,
    };
  if ("refusal" in committed)
    return {
      text: saveErrorText(committed.refusal, storageV5.persistsOffBox),
      isRefusal: true,
    };
  if (committed.written === chosen)
    return {
      text,
      isRefusal: false,
    };
  let written = committed.written === "default" ? null : String(committed.written);
  return {
    text: `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(written))}${SAVED_AS_DEFAULT_SUFFIX}`,
    isRefusal: false,
    rewrittenTo: written,
  };
}
//@ chunk-xmfcjh5p.js:46689-46731 placement
var FAST_TOGGLE_NOT_APPLIED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xmfcjh5p.js:46689", () => {
  FAST_TOGGLE_NOT_APPLIED = Symbol("fast toggle not applied");
});
//@ chunk-xmfcjh5p.js:46731-47009 placement
async function savedFastModeToggle(value, session, save, storageV5) {
  let result = {};
  let committed = await commitRowThroughConfigSet(
    "fast",
    value,
    session,
    async () => {
      let saved = await save();
      result.isDone = true;
      if (saved === FAST_TOGGLE_NOT_APPLIED) return configSaveRefusal("nothing was applied");
      result.refusal = saved;
      return saved === undefined ? undefined : configSaveRefusal(saved);
    },
    {
      refuseRewrite: true,
    },
  );
  if (result.isDone) return result.refusal;
  return "refusal" in committed ? saveErrorText(committed.refusal, storageV5) : undefined;
}
//@ chunk-xmfcjh5p.js:47009-47232 placement
async function describedSettings(rows) {
  let byId = new Map();
  await Promise.all(
    rows.map(async (row) => {
      let { row: row_2 } = describeConfigRowKind(row);
      let described = await describeConfigRowIfHooked(row_2);
      if (described === undefined)
        byId.set(row.id, {
          label: row_2.label,
          hidden: true,
        });
      else if (described !== row_2)
        byId.set(row.id, {
          label: sanitizeTelemetryString(described.label),
          hidden: false,
        });
    }),
  );
  return byId;
}
//@ chunk-xmfcjh5p.js:47232-47309 placement
var ROW_COMMIT = {
  isHooked: () => isConfigSetHooked(),
  savedModelPickReply,
  savedFastModeToggle,
};
export {
  FAST_TOGGLE_NOT_APPLIED,
  savedFastModeToggle,
  listConfigKeys,
  parseConfigShorthand,
  applyConfigShorthand,
  collapseShorthandResultOffBox,
  savedModelPickReply,
  pluginConfigSettings,
  describedSettings,
  throughConfigSet,
  commitThroughConfigSet,
  shownSettingValue,
  commitRowThroughConfigSet,
  ROW_COMMIT,
  configRowHandles,
  getConfigArgumentCompletions,
};
