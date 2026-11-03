/**
 * commands/config/configShorthand.ts
 *
 * 2.1.316 新增：应用 /config key=value 速记：匹配设置行、校验并写入，返回结果或拒绝原因；生成速记可用的设置行列表（含工作流开关等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-snd3g4y1.js (43)
 * attribution: placement 43
 */
import { count, uniq } from "../../utils/collections.js";
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
  getInitialSettings_2,
  getSettingsForSource,
  getSettingsForSourceForUpkeep,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { getAutoContinueSettingValue } from "../../services/autoContinueAtUsageLimit.js";
import { resolveSetting, saveUserIntentSetting } from "../../utils/settings/userIntentSettings.js";
import { isEligibleForOverageCreditGrant } from "../../components/LogoV2/OverageCreditUpsell.js";
import { hasWorkflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { isAutoContinueUserSetting } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { isArtifactConfigToggleable } from "../../services/artifacts/artifactToolGates.js";
import { DEFAULT } from "../../constants/outputStyles.js";
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
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import {
  P8n,
  dispatchConfigSet,
  isConfigSetHooked,
  describeConfigRowIfHooked,
} from "../../plugins/functionHooks/configApi.js";
import { N5e } from "../../plugins/functionHooks/dispatch/chain.js";
import { providerTierOf } from "../../plugins/functionHooks/providerTiers.js";
import { SET_MODEL_PREFIX, toInlineCode, SAVED_AS_DEFAULT_SUFFIX } from "../model/modelMessages.js";
import { renderModelLabel } from "../model/model.js";

//@ chunk-snd3g4y1.js:31790-32132 placement
function parseConfigShorthand(n) {
  let trimmed = n.trim();
  if (!trimmed || !trimmed.includes("=")) return null;
  let parts = trimmed.split(/\s+/);
  if (count(parts, (p) => p.includes("=")) === 1) {
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
  let u = [];
  for (let p of parts) {
    let index = p.indexOf("=");
    if (index <= 0) return null;
    u.push({
      key: p.slice(0, index),
      raw: p.slice(index + 1),
    });
  }
  return u;
}
//@ chunk-snd3g4y1.js:32132-32268 placement
function findSettingRow(n, s) {
  let lower = n.toLowerCase();
  let filtered = s.filter((p) => p.id.toLowerCase() === lower);
  return s.find((p) => p.id === n) ?? (filtered.length === 1 ? filtered[0] : undefined);
}
//@ chunk-snd3g4y1.js:32268-32422 placement
function shorthandRows({ settings, dialogFieldRows }, r) {
  if (isBridgeOrVerifiedSlackTurn(r)) return settings;
  let u = "defaultToAgentsView";
  return [...settings.filter((setting) => setting.id !== u), ...dialogFieldRows.filter((p) => p.id === u)];
}
//@ chunk-snd3g4y1.js:32422-32583 placement
var SETTING_REDIRECTS = new Map([
  ["agentsView", "/config (Agents view row)"],
  ["autoUpdatesChannel", "/channel"],
  ["showExternalIncludesDialog", "/config (External CLAUDE.md row)"],
]);
//@ chunk-snd3g4y1.js:32583-32698 placement
function isLockedForKey(settingRow, s) {
  return (
    settingRow.lock !== undefined &&
    !settingRow.lock.writableWhileLocked?.some((r) => r.toLowerCase() === s.toLowerCase())
  );
}
//@ chunk-snd3g4y1.js:32698-33014 placement
async function applyConfigShorthand(n, s, r) {
  let shorthandRows_2 = buildShorthandRows(s, r);
  await readUnattendedServingConsent().catch(() => {
    return;
  });
  let p = withBridgeRows(shorthandRows(buildConfigRows(shorthandRows_2), s), s);
  if (
    n.some(({ key, raw }) => {
      let settingRow = findSettingRow(key, p);
      return (
        settingRow !== undefined && settingRow.lock?.source !== "managed" && isLockedForKey(settingRow, raw)
      );
    })
  ) {
    await ensurePolicyLimitsLoadedForDiagnostic().catch(() => {});
    p = withBridgeRows(shorthandRows(buildConfigRows(buildShorthandRows(s, r)), s), s);
  }
  let S = [];
  for (let { key, raw } of n) S.push(await applyConfigShorthandEntry(key, raw, p));
  return S;
}
//@ chunk-snd3g4y1.js:33014-35205 placement
/**
 * 应用 /config key=value 速记：匹配设置行、校验并写入，返回结果或拒绝原因。
 */
async function applyConfigShorthandEntry(key, raw, r) {
  let settingRow = findSettingRow(key, r);
  logEvent("tengu_config_shorthand", {
    key_hash: shortHash(key),
    matched: settingRow !== undefined,
  });
  if (!settingRow) {
    let filtered = r.filter((S) => S.id.toLowerCase() === key.toLowerCase());
    return {
      ok: false,
      kind: "refusal",
      message:
        filtered.length > 1
          ? `${sanitizeTelemetryString(key)} matches ${filtered.map((S) => sanitizeTelemetryString(S.id)).join(" and ")}; type one exactly.`
          : `${sanitizeTelemetryString(key)} isn't a /config setting. Run /config to see what's available.`,
    };
  }
  let p = ("labelBoldSuffix" in settingRow ? settingRow.searchText : undefined) ?? settingRow.label;
  if (isLockedForKey(settingRow, raw))
    return {
      ok: false,
      kind:
        settingRow.lock?.reason === PLUGIN_SETTINGS_REMOTE_REFUSAL || settingRow.lock?.reasonShipsOffBox
          ? "refusal"
          : "locked",
      message: `Couldn't save ${p}: ${settingRow.lock?.reason}`,
    };
  if (settingRow.consentGated) {
    let m = truthyOrFalsyEnv(raw) === false;
    let S =
      (settingRow.type === "boolean" && m) ||
      (settingRow.lock !== undefined && !isLockedForKey(settingRow, raw));
    let y = settingRow.value === true || settingRow.canWithdraw?.() === true;
    if (S && !y)
      return {
        ok: true,
        kind: "refusal",
        message: `${key} is already off.`,
      };
    if (!(S && y))
      return {
        ok: false,
        kind: "refusal",
        message: `${p} can't be enabled with key=value \u2014 open /config to change it from the panel.`,
      };
  }
  switch (settingRow.type) {
    case "boolean": {
      let m = truthyOrFalsyEnv(raw);
      if (m === undefined)
        return {
          ok: false,
          kind: "refusal",
          message: `${p} takes true or false, not "${sanitizeTelemetryString(raw)}".`,
        };
      let S = await settingRow.onChange(m);
      if (S?.error) {
        if (S.error instanceof WireSafeControlError)
          return {
            ok: false,
            kind: "refusal",
            message: `${p}: ${S.error.message}${S?.messageSuffix ?? ""}`,
          };
        return {
          ok: false,
          kind: "save-failure",
          message: `Couldn't save ${p}: ${S.error.message}${S?.messageSuffix ?? ""}`,
        };
      }
      return {
        ok: true,
        kind: "refusal",
        message: `Set ${p} to ${m ? "true" : "false"}${S?.messageSuffix ?? ""}`,
      };
    }
    case "enum":
    case "managedEnum": {
      let coerce = settingRow.coerce;
      if (!settingRow.options && !coerce)
        return {
          ok: false,
          kind: "refusal",
          message: `${p} can't be set with key=value \u2014 use ${SETTING_REDIRECTS.get(settingRow.id) ?? "/config"}.`,
        };
      let S = coerce
        ? coerce(raw)
        : settingRow.options?.find((option) => option.toLowerCase() === raw.toLowerCase());
      if (S === undefined) {
        let w =
          settingRow.type === "managedEnum" && settingRow.optionsHint ? ` ${settingRow.optionsHint}` : "";
        return {
          ok: false,
          kind: "refusal",
          message: settingRow.options
            ? `${p} takes one of: ${settingRow.options.join(", ")}.${w}`
            : `${p} doesn't accept "${sanitizeTelemetryString(raw)}".${w}`,
        };
      }
      let y = await settingRow.onChange(S);
      if (y?.error) {
        if (y.error instanceof WireSafeControlError)
          return {
            ok: false,
            kind: "refusal",
            message: `${p}: ${y.error.message}${y?.messageSuffix ?? ""}`,
          };
        return {
          ok: false,
          kind: "save-failure",
          message: `Couldn't save ${p}: ${y.error.message}${y?.messageSuffix ?? ""}`,
        };
      }
      return {
        ok: true,
        kind: "refusal",
        message: `Set ${p} to ${sanitizeTelemetryString(S)}${y?.messageSuffix ?? ""}`,
      };
    }
  }
}
//@ chunk-snd3g4y1.js:35205-35434 placement
function collapseShorthandResultOffBox(n, s) {
  if (!s) return n.message;
  switch (n.kind) {
    case "save-failure":
      return WITHHELD_SAVE_ERROR_TEXT;
    case "locked":
      return "Couldn't save this setting: a trusted policy owns it (detail withheld on this connection).";
    case "refusal":
      return n.message;
  }
}
//@ chunk-snd3g4y1.js:35434-35687 placement
function listConfigKeys(context) {
  return withPluginSettingRows(shorthandRows(buildConfigRows(buildShorthandRows(context)), context), context)
    .flatMap((r) => {
      if (r.consentGated) return [];
      let u =
        r.type === "boolean"
          ? "true|false"
          : r.options
            ? r.options.join("|")
            : r.type === "managedEnum" && r.coerce
              ? "<value>"
              : null;
      return u ? [`  ${r.id}=${u}`] : [];
    })
    .sort().join(`
`);
}
//@ chunk-snd3g4y1.js:35687-36220 placement
function getConfigArgumentCompletions(n, s) {
  let r = DETACHED_CONFIG_KEYS_SLOT.of(getRootSession().host).lookup();
  let index = s.indexOf("=");
  if (index === -1) {
    let lower = s.toLowerCase();
    return r
      .filter((w) => w.id.toLowerCase().startsWith(lower))
      .sort((w, O) => w.id.localeCompare(O.id))
      .map((w) => ({
        value: `${w.id}=`,
        description: w.options?.slice(0, 4).join(" | ") ?? w.hint,
        isFinal: false,
        appendSpace: false,
      }));
  }
  let sliced = s.slice(0, index);
  let lower = s.slice(index + 1).toLowerCase();
  let found = r.find((y) => y.id.toLowerCase() === sliced.toLowerCase());
  if (!found?.options) return [];
  return found.options
    .filter((option) => option.toLowerCase().startsWith(lower))
    .map((option) => ({
      value: `${found.id}=${option}`,
      isFinal: true,
    }));
}
//@ chunk-snd3g4y1.js:36220-36395 placement
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
//@ chunk-snd3g4y1.js:36395-36420 placement
var DETACHED_CONFIG_KEYS_SLOT = new HostScoped(() => new DetachedConfigKeysCache());
//@ chunk-snd3g4y1.js:36420-36949 placement
/**
 * 构造不依赖 REPL 的最小 AppState 上下文，用于非交互地计算设置行。
 */
function createDetachedConfigContext() {
  let n = {
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
  return shorthandRows(buildConfigRows(buildShorthandRows(n)), n).flatMap((r) => {
    if (r.consentGated) return [];
    let u = r.type === "boolean" ? ["true", "false"] : "options" in r && r.options ? r.options : undefined;
    if (u || (r.type === "managedEnum" && r.coerce))
      return [
        {
          id: r.id,
          options: u,
          hint: r.type === "managedEnum" ? r.optionsHint : undefined,
        },
      ];
    return [];
  });
}
//@ chunk-snd3g4y1.js:36949-38487 placement
/**
 * 生成速记可用的设置行列表（含工作流开关等）。
 */
function buildShorthandRows(n, s) {
  let appState = n.getAppState();
  let u = {
    ...getInitialSettings_2(),
    ...remoteForwardedSettings(),
    autoContinueAtUsageLimit: getAutoContinueSettingValue() ?? true,
  };
  let effectiveConfigValues = getEffectiveConfigValues();
  let setting = resolveSetting("disableWorkflows", false);
  let setting_2 = resolveSetting("enableWorkflows", false);
  let workflowsToggleable =
    isEligibleForOverageCreditGrant() &&
    (setting.value !== true || setting.source === "userSettings") &&
    (setting_2.source === "default" || setting_2.source === "userSettings");
  let workflowSizeGuidelineToggleable = !hasWorkflowSizeSetting();
  let autoContinueAtUsageLimitToggleable = isAutoContinueUserSetting();
  let artifactToggleable = isArtifactConfigToggleable();
  let showDefaultViewPicker = require("./chunk-cv3kgbt2.js").isBriefEntitled();
  return {
    globalConfig: effectiveConfigValues,
    settingsData: u,
    storageV5: n.storageV5,
    mayBeAuthoredByNonOwner: isBridgeOrVerifiedSlackTurn(n),
    themeSetting: effectiveConfigValues.theme,
    currentOutputStyle: u?.outputStyle || DEFAULT,
    currentLanguage: u?.language,
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
    isConnectedToIde: hasAccessToIDEExtensionDiffFeature(n.options.mcpClients),
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
    promptSuggestionRun: n.session?.promptSuggestion,
    modelSwitchHooks: n.session
      ? {
          session: n.session,
          readState: () => n.getAppState(),
          latestPick: {
            current: 0,
          },
          latestFastPick: {
            current: 0,
          },
        }
      : null,
    setAppState: (A) => n.setAppState(A),
    setTheme:
      s?.setTheme ??
      ((A) =>
        isStorageV5Enabled() && n.storageV5 !== undefined
          ? saveUserIntentSetting("theme", A, n.storageV5)
          : saveUserIntentSetting("theme", A)),
    ...NOOP_CONFIG_WRITERS,
  };
}
//@ chunk-snd3g4y1.js:38487-38742 placement
var PLUGIN_SETTINGS_REMOTE_REFUSAL =
  "a plugin's settings can't be changed over Remote Control or from a relayed message \u2014 open /config in the session itself";
var MANAGED_PLUGIN_CONFIG_NOTE = "Set by your organization's managed settings (pluginConfigs)";
var FLAG_PLUGIN_CONFIG_NOTE = "Set by --settings for this session (pluginConfigs)";
//@ chunk-snd3g4y1.js:38742-38791 placement
function pluginSettingOption(n, s, r) {
  return trustedPluginSetting(n).options?.[s] ?? r;
}
//@ chunk-snd3g4y1.js:38791-38971 placement = getEnabledSettingSources (0.836)
function getPluginOptionLockingSource(n, s) {
  let r = (u) => {
    let pluginConfigs = getSettingsForSource(u)?.pluginConfigs;
    return pluginIdAliases(n).some((m) => pluginConfigs?.[m]?.options?.[s] !== undefined);
  };
  if (r("policySettings")) return MANAGED_PLUGIN_CONFIG_NOTE;
  return r("flagSettings") ? FLAG_PLUGIN_CONFIG_NOTE : undefined;
}
//@ chunk-snd3g4y1.js:38971-39346 placement
/**
 * 把插件配置项写入 userSettings.pluginConfigs，值未变则跳过。
 */
async function savePluginConfigOption(n, s, r, storageV5) {
  let p = marketplaceSource(n);
  let m = typeof r === "object" ? [...r] : r;
  let S = `${p}\x00${s}`;
  let y = PLUGIN_SAVE_HINTS.has(S)
    ? PLUGIN_SAVE_HINTS.get(S)
    : getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs?.[p]?.options?.[s];
  if (jsonStringify(y) === jsonStringify(m)) return;
  PLUGIN_SAVE_HINTS.set(S, m);
  let w = await updateSettingsForSource(
    "userSettings",
    {
      pluginConfigs: {
        [p]: {
          options: {
            [s]: m,
          },
        },
      },
    },
    undefined,
    storageV5,
  ).finally(() => {
    if (PLUGIN_SAVE_HINTS.get(S) === m) PLUGIN_SAVE_HINTS.delete(S);
  });
  if (w.error)
    return {
      error: w.error,
    };
  clearPluginOptionsCache();
  return pluginConfigSaveSuffix(n, s);
}
//@ chunk-snd3g4y1.js:39346-39361 placement
var PLUGIN_SAVE_HINTS = new Map();
//@ chunk-snd3g4y1.js:39361-39862 placement
/**
 * 插件配置保存后给出提示后缀（需要 /reload-plugins 等）。
 */
async function pluginConfigSaveSuffix(n, s) {
  let r = marketplaceSource(n);
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === n.name);
  if (found !== undefined && found.args.pluginStorageId !== r)
    return {
      messageSuffix: " \xB7 saved; /reload-plugins applies it",
    };
  let p = await refreshOptions();
  logOptionsReloads(p);
  let found_2 = p.find((S) => S.name === n.name);
  if (found_2 !== undefined && found_2.kind !== "reloaded") {
    let S =
      found_2.kind === "refused"
        ? found_2.result.refused
        : found_2.kind === "held"
          ? found_2.reason
          : errorMessage(found_2.error);
    logForDebugging(`/config ${n.name}.${s}: saved; ${S}`);
    return {
      messageSuffix: " \xB7 saved, but the plugin did not reload; /reload-plugins applies it",
    };
  }
}
//@ chunk-snd3g4y1.js:39862-41272 placement
function pluginConfigSettings(enabled, s = {}) {
  let r = [];
  for (let u of enabled) {
    if (u.enabled === false) continue;
    let userConfig = u.manifest.userConfig ?? {};
    let m = marketplaceSource(u);
    let S = sanitizeTelemetryString(u.name);
    let w = enabled.some(
      (O) =>
        O !== u && O.enabled !== false && sanitizeTelemetryString(O.name).toLowerCase() === S.toLowerCase(),
    )
      ? m
      : u.name;
    for (let [key, value] of Object.entries(userConfig)) {
      if (value.sensitive === true || value.multiple === true) continue;
      let L = `${w}.${key}`;
      let A = getPluginOptionLockingSource(m, key) ?? s.refusal;
      let Q =
        A === undefined
          ? undefined
          : {
              reason: A,
              source: "managed",
            };
      let ne = sanitizeTelemetryString(value.title);
      let te = sanitizeTelemetryString(value.description);
      let oe = {
        id: L,
        label: ne,
        searchText: `${ne} ${u.name} ${te}`,
        ...(Q !== undefined && {
          lock: Q,
        }),
      };
      let V = s.shown?.get(L) ?? pluginSettingOption(m, key, value.default);
      let ie = async (q) => {
        if (Q !== undefined)
          return {
            error: new WireSafeControlError(Q.reason),
          };
        s.onShown?.(L, q);
        let J = await savePluginConfigOption(u, key, q, s.storageV5);
        if (J?.error && V !== undefined) s.onShown?.(L, V);
        return J;
      };
      if (value.type === "boolean") {
        r.push({
          ...oe,
          value: isTrueOrTrueString(V),
          type: "boolean",
          provided: {
            plugin: S,
            pluginId: m,
            description: te,
            kind: "boolean",
          },
          onChange: ie,
        });
        continue;
      }
      if (value.type === "string" && value.options !== undefined) {
        let options = uniq(value.options.map(sanitizeTelemetryString)).filter((J) => J !== "");
        r.push({
          ...oe,
          value: V === undefined ? "" : String(V),
          options,
          type: "enum",
          pickToCommit: true,
          provided: {
            plugin: S,
            pluginId: m,
            description: te,
            kind: "choice",
          },
          onChange: ie,
        });
        continue;
      }
      let se = value.type === "number";
      r.push({
        ...oe,
        value: V === undefined ? "" : String(V),
        type: "managedEnum",
        coerce: (q) => {
          if (!se) return q;
          let boundedNumber = parseBoundedNumber(q, value);
          return boundedNumber === undefined ? undefined : String(boundedNumber);
        },
        optionsHint: se ? getFormatHint(value) : undefined,
        provided: {
          plugin: S,
          pluginId: m,
          description: te,
          kind: se ? "number" : "text",
        },
        onChange: (q) => ie(se ? Number(q) : q),
      });
    }
  }
  return r;
}
//@ chunk-snd3g4y1.js:41272-41395 placement
function shownSettingValue(n) {
  let s = String(n.value);
  return n.provided !== undefined && n.type !== "boolean"
    ? recursivelySanitizeUnicode_2(stripControlChars(s.replace(/[\t\n\r]/g, " ")))
    : s;
}
//@ chunk-snd3g4y1.js:41395-41525 placement
function withPluginSettingRows(n, s) {
  let enabled = s.getAppState().plugins?.enabled ?? [];
  return [
    ...n,
    ...pluginConfigSettings(enabled, {
      storageV5: s.storageV5,
      ...(isBridgeOrVerifiedSlackTurn(s) && {
        refusal: PLUGIN_SETTINGS_REMOTE_REFUSAL,
      }),
    }),
  ];
}
//@ chunk-snd3g4y1.js:41525-41608 placement
function withBridgeRows(n, s) {
  let r = isBridgeOrVerifiedSlackTurn(s)
    ? {
        kind: "bridge",
      }
    : P8n;
  return withPluginSettingRows(n, s).map((u) => throughConfigSet(u, r));
}
//@ chunk-snd3g4y1.js:41608-42209 placement
/**
 * 推断设置行的值类型（boolean/number/choice/text）与可选项。
 */
function describeConfigRowKind(n) {
  let provided = n.provided;
  let r =
    n.type === "boolean"
      ? "boolean"
      : (provided?.kind ??
        (n.type === "enum"
          ? "choice"
          : n.coerce !== undefined
            ? "text"
            : n.options !== undefined
              ? "choice"
              : "text"));
  let u = n.type === "boolean" ? undefined : (n.options ?? undefined);
  let p = r === "number" && typeof n.value === "string" ? Number(n.value) : Number.NaN;
  let value = typeof n.value === "string" && n.value.trim() !== "" && Number.isFinite(p) ? p : n.value;
  return {
    row: {
      key: n.id,
      label: n.label,
      ...(provided !== undefined && {
        description: provided.description,
      }),
      kind: r,
      value,
      ...(r === "choice" &&
        u !== undefined && {
          options: u,
        }),
      provider: provided === undefined ? N5e : providerTierOf(provided.pluginId),
      isLocked: n.lock !== undefined,
    },
    ...(n.lock !== undefined && {
      lockReason: n.lock.reason,
    }),
  };
}
//@ chunk-snd3g4y1.js:42209-43139 placement
/**
 * 检查设置行能否修改（同意门槛、托管锁定等），不能时返回原因。
 */
async function checkConfigRowWritable(n, s) {
  let r = ("labelBoldSuffix" in n ? n.searchText : undefined) ?? n.label;
  if (n.consentGated) {
    if (!(n.type === "boolean" && s === false && (n.value === true || n.canWithdraw?.() === true)))
      return n.type === "boolean" && s === false
        ? undefined
        : `${r} can only be turned on from the /config panel.`;
  }
  let u = async (p) => {
    let m = await p;
    return m?.error ? `${m.error.message}${m.messageSuffix ?? ""}` : undefined;
  };
  switch (n.type) {
    case "boolean":
      return typeof s === "boolean" ? u(n.onChange(s)) : `${r} takes true or false.`;
    case "enum":
    case "managedEnum": {
      let coerce = n.type === "managedEnum" ? n.coerce : undefined;
      if (!n.options && !coerce) return `${r} can only be changed from the /config panel.`;
      let m = typeof s === "string" ? s : String(s);
      let S = coerce ? coerce(m) : n.options?.find((option) => option.toLowerCase() === m.toLowerCase());
      if (S === undefined) {
        let y = n.type === "managedEnum" && n.optionsHint ? ` ${n.optionsHint}` : "";
        return n.options
          ? `${r} takes one of: ${n.options.join(", ")}.`
          : `${r} doesn't accept "${sanitizeTelemetryString(m)}".${y}`;
      }
      return u(n.onChange(S));
    }
  }
}
//@ chunk-snd3g4y1.js:43139-43190 placement
function describeWritableConfigRow(n) {
  return {
    ...describeConfigRowKind(n),
    write: (s) => checkConfigRowWritable(n, s),
  };
}
//@ chunk-snd3g4y1.js:43190-43247 placement
function configRowHandles(n) {
  return withPluginSettingRows(buildConfigRows(buildShorthandRows(n)).settings, n).map(
    describeWritableConfigRow,
  );
}
//@ chunk-snd3g4y1.js:43247-43399 placement
function coerceShorthandValue(n, s) {
  if (n.type === "boolean") return typeof s === "boolean" ? s : undefined;
  if (typeof s === "number") return String(s);
  return typeof s === "string" ? s : undefined;
}
//@ chunk-snd3g4y1.js:43399-44448 placement
/**
 * 把输入值按设置行类型转换并校验。
 */
function coerceConfigRowValue(n, s, r, origin = P8n, p) {
  let { row } = describeConfigRowKind(n);
  let S = row.kind === "number" && typeof s === "string" ? Number(s) : s;
  let w =
    row.kind === "choice" && typeof S === "string" && !(row.options ?? []).includes(S)
      ? {
          ...row,
          kind: "text",
          options: undefined,
        }
      : row;
  let O;
  let k = false;
  return dispatchConfigSet({
    row: w,
    value: S,
    origin,
    signal: p,
    write: async (L) => {
      if (p?.aborted) return `${w.label}: the change was cancelled`;
      let A = coerceShorthandValue(n, L);
      if (A === undefined) return `${w.label}: a ${w.kind} row cannot hold that value`;
      let coerce = n.type === "managedEnum" ? n.coerce : undefined;
      let ne = jsonStringify(L) !== jsonStringify(S);
      let oe =
        ne &&
        row.kind === "choice" &&
        coerce === undefined &&
        typeof A === "string" &&
        !(row.options ?? []).includes(A)
          ? undefined
          : ne && coerce !== undefined && typeof A === "string"
            ? coerce(A)
            : A;
      if (oe === undefined) {
        let ie = n.type === "managedEnum" && n.optionsHint ? ` ${n.optionsHint}` : "";
        return `${w.label} doesn't accept "${sanitizeTelemetryString(String(L))}".${ie}`;
      }
      O = r(oe);
      let V = await O;
      k = V?.error !== undefined;
      return V?.error ? `${V.error.message}${V.messageSuffix ?? ""}` : undefined;
    },
  }).then((L) => {
    if (L.deny === undefined || k) return O;
    let A = sanitizeTelemetryString(L.deny);
    return {
      error: p?.aborted
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            A,
            "config.set withdrawn before it was written",
          )
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(A, "config.set denied by a hook"),
    };
  });
}
//@ chunk-snd3g4y1.js:44448-44537 placement
function throughConfigSet(n, origin = P8n) {
  let onChange = n.onChange;
  return {
    ...n,
    onChange: (p) => (isConfigSetHooked() ? coerceConfigRowValue(n, p, onChange, origin) : onChange(p)),
  };
}
//@ chunk-snd3g4y1.js:44537-44605 placement
function commitThroughConfigSet(n, s, r, u) {
  return n !== undefined && isConfigSetHooked() ? coerceConfigRowValue(n, s, r, P8n, u) : r(s);
}
//@ chunk-snd3g4y1.js:44605-44679 placement
var WITHHELD_SAVE_ERROR_TEXT = "Couldn't save this setting (detail withheld on this connection).";
//@ chunk-snd3g4y1.js:44679-44712 placement
function saveErrorText(refusal, s) {
  return s() ? WITHHELD_SAVE_ERROR_TEXT : refusal;
}
//@ chunk-snd3g4y1.js:44712-44786 placement
var MODEL_MOVED_DURING_HOOK_TEXT = "The model changed while a plugin's hook was deciding; pick again";
//@ chunk-snd3g4y1.js:44786-45756 placement
async function commitRowThroughConfigSet(n, s, r, u, p = {}) {
  let m = isConfigSetHooked()
    ? buildConfigRows(buildShorthandRows(r)).settings.find((setting) => setting.id === n)
    : undefined;
  if (m === undefined) {
    let k = await u();
    return k?.error === undefined
      ? {
          written: s,
        }
      : {
          refusal: configSaveRefusalText(n, k),
        };
  }
  let S = {};
  let y = async (k) => {
    if (p.isSuperseded?.()) return configSaveRefusal("a later pick replaced this one");
    if (k !== s && p.refuseRewrite !== undefined)
      return configSaveRefusal(
        p.refuseRewrite === true
          ? "a plugin's hook changed the value; this command writes only what was picked (use /config)"
          : p.refuseRewrite,
      );
    let L =
      k === s
        ? await Promise.resolve()
            .then(u)
            .catch((error) => {
              S.thrown = {
                error,
              };
              return configSaveRefusal("the write failed");
            })
        : await checkConfigRowWritable(m, k).then((A) =>
            A === undefined ? undefined : configSaveRefusal(A),
          );
    if (L?.error === undefined) S.written = k;
    return L;
  };
  let w = await coerceConfigRowValue(
    m,
    s,
    (k) => (S.outcome ??= y(k)),
    isBridgeOrVerifiedSlackTurn(r)
      ? {
          kind: "bridge",
        }
      : P8n,
  );
  if (S.thrown !== undefined) throw S.thrown.error;
  if (S.written !== undefined)
    return {
      written: S.written,
    };
  let O = ("labelBoldSuffix" in m ? m.searchText : undefined) ?? m.label;
  if (w?.error !== undefined)
    return {
      refusal: configSaveRefusalText(O, w),
    };
  return {
    refusal: `Couldn't save ${O}: a plugin's hook answered without writing`,
  };
}
//@ chunk-snd3g4y1.js:45756-45847 placement
function configSaveRefusalText(n, s) {
  return `Couldn't save ${n}: ${s.error?.message ?? ""}${s.messageSuffix ?? ""}`;
}
//@ chunk-snd3g4y1.js:45847-45931 placement
function configSaveRefusal(n) {
  return {
    error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      n,
      "a row commit from a command was not written",
    ),
  };
}
//@ chunk-snd3g4y1.js:45931-46583 placement
async function savedModelPickReply(n, s, r, u) {
  let p = n ?? "default";
  let text = "";
  let S;
  let y;
  let w = await commitRowThroughConfigSet(
    "model",
    p,
    s,
    async () => {
      if (u.hasModelMoved?.()) {
        S = MODEL_MOVED_DURING_HOOK_TEXT;
        return configSaveRefusal(S);
      }
      let k = await r();
      if (typeof k === "string") {
        text = k;
        return;
      }
      if ("unsaved" in k) {
        y = k.unsaved;
        return configSaveRefusal("the default was not saved");
      }
      S = k.refused;
      return configSaveRefusal(k.refused);
    },
    {
      isSuperseded: u.isSuperseded,
    },
  );
  if (S !== undefined)
    return {
      text: S,
      isRefusal: true,
      isOwnRefusal: true,
    };
  if (y !== undefined)
    return {
      text: y,
      isRefusal: false,
    };
  if ("refusal" in w)
    return {
      text: saveErrorText(w.refusal, u.persistsOffBox),
      isRefusal: true,
    };
  if (w.written === p)
    return {
      text,
      isRefusal: false,
    };
  let O = w.written === "default" ? null : String(w.written);
  return {
    text: `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(O))}${SAVED_AS_DEFAULT_SUFFIX}`,
    isRefusal: false,
    rewrittenTo: O,
  };
}
//@ chunk-snd3g4y1.js:46583-46625 placement
var FAST_TOGGLE_NOT_APPLIED = Symbol("fast toggle not applied");
//@ chunk-snd3g4y1.js:46625-46903 placement
async function savedFastModeToggle(n, s, r, u) {
  let p = {};
  let m = await commitRowThroughConfigSet(
    "fast",
    n,
    s,
    async () => {
      let S = await r();
      p.isDone = true;
      if (S === FAST_TOGGLE_NOT_APPLIED) return configSaveRefusal("nothing was applied");
      p.refusal = S;
      return S === undefined ? undefined : configSaveRefusal(S);
    },
    {
      refuseRewrite: true,
    },
  );
  if (p.isDone) return p.refusal;
  return "refusal" in m ? saveErrorText(m.refusal, u) : undefined;
}
//@ chunk-snd3g4y1.js:46903-47126 placement
async function describedSettings(n) {
  let s = new Map();
  await Promise.all(
    n.map(async (r) => {
      let { row } = describeConfigRowKind(r);
      let p = await describeConfigRowIfHooked(row);
      if (p === undefined)
        s.set(r.id, {
          label: row.label,
          hidden: true,
        });
      else if (p !== row)
        s.set(r.id, {
          label: sanitizeTelemetryString(p.label),
          hidden: false,
        });
    }),
  );
  return s;
}
//@ chunk-snd3g4y1.js:47126-47203 placement
var ROW_COMMIT = {
  isHooked: () => isConfigSetHooked(),
  savedModelPickReply,
  savedFastModeToggle,
};
export {
  savedModelPickReply,
  FAST_TOGGLE_NOT_APPLIED,
  savedFastModeToggle,
  commitRowThroughConfigSet,
  pluginConfigSettings,
  describedSettings,
  throughConfigSet,
  commitThroughConfigSet,
  shownSettingValue,
  listConfigKeys,
  parseConfigShorthand,
  applyConfigShorthand,
  collapseShorthandResultOffBox,
};
