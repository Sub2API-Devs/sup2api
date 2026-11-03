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
import { _N } from "../../utils/promptSubmissionOrigin.js";
import { readUnattendedServingConsent } from "../../services/remoteTools/unattendedConsentStore.js";
import {
  buildConfigRows,
  remoteForwardedSettings,
  getEffectiveConfigValues,
  NOOP_CONFIG_WRITERS,
} from "./configSettings.js";
import { ensurePolicyLimitsLoadedForDiagnostic } from "../../bridge/bridgeGates.js";
import { logEvent } from "../../services/analytics/index.js";
import { gn } from "../../utils/shortHash.js";
import { sanitizeTelemetryString, recursivelySanitizeUnicode_2 } from "../../utils/sanitization.js";
import { h7e, CHr, parseBoundedNumber, getFormatHint } from "../../utils/plugins/pluginConfigEnv.js";
import {
  WireSafeControlError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { getRootSession } from "../../bootstrap/state.js";
import { wt } from "../../remote/remoteMode.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import {
  getInitialSettings_2,
  getSettingsForSource,
  getSettingsForSourceForUpkeep,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { dln } from "../../services/autoContinueAtUsageLimit.js";
import { resolveSetting, saveUserIntentSetting } from "../../utils/settings/userIntentSettings.js";
import { isEligibleForOverageCreditGrant } from "../../components/LogoV2/OverageCreditUpsell.js";
import { hasWorkflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { isAutoContinueUserSetting } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { isArtifactConfigToggleable } from "../../services/artifacts/artifactToolGates.js";
import { DEFAULT } from "../../constants/outputStyles.js";
import { useMainLoopModel } from "../../utils/model/modelSwitchHooks.js";
import { isFastModeEnabled } from "../../utils/fastMode.js";
import { Myt } from "../../components/Settings/configGates.js";
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
import { freeze_17, dispatchConfigSet, Qfn, pGr } from "../../plugins/functionHooks/configApi.js";
import { freeze_6 } from "../../plugins/functionHooks/dispatch/chain.js";
import { tKe } from "../../plugins/functionHooks/providerTiers.js";
import { SET_MODEL_PREFIX, toInlineCode, SAVED_AS_DEFAULT_SUFFIX } from "../model/modelMessages.js";
import { renderModelLabel } from "../model/model.js";

//@ chunk-snd3g4y1.js:31790-32132 placement
function parseConfigShorthand(n) {
  let trimmed = n.trim();
  if (!trimmed || !trimmed.includes("=")) return null;
  let parts = trimmed.split(/\s+/);
  if (count(parts, (p) => p.includes("=")) === 1) {
    let index = trimmed.indexOf("="),
      sliced = trimmed.slice(0, index);
    if (!sliced || /\s/.test(sliced)) return null;
    return [{ key: sliced, raw: trimmed.slice(index + 1) }];
  }
  let u = [];
  for (let p of parts) {
    let index = p.indexOf("=");
    if (index <= 0) return null;
    u.push({ key: p.slice(0, index), raw: p.slice(index + 1) });
  }
  return u;
}
//@ chunk-snd3g4y1.js:32132-32268 placement
function findSettingRow(n, s) {
  let lower = n.toLowerCase(),
    filtered = s.filter((p) => p.id.toLowerCase() === lower);
  return s.find((p) => p.id === n) ?? (filtered.length === 1 ? filtered[0] : void 0);
}
//@ chunk-snd3g4y1.js:32268-32422 placement
function shorthandRows({ settings: settings, dialogFieldRows: dialogFieldRows }, r) {
  if (_N(r)) return settings;
  let u = "defaultToAgentsView";
  return [...settings.filter((p) => p.id !== u), ...dialogFieldRows.filter((p) => p.id === u)];
}
//@ chunk-snd3g4y1.js:32422-32583 placement
var SETTING_REDIRECTS = new Map([
  ["agentsView", "/config (Agents view row)"],
  ["autoUpdatesChannel", "/channel"],
  ["showExternalIncludesDialog", "/config (External CLAUDE.md row)"],
]);
//@ chunk-snd3g4y1.js:32583-32698 placement
function isLockedForKey(n, s) {
  return n.lock !== void 0 && !n.lock.writableWhileLocked?.some((r) => r.toLowerCase() === s.toLowerCase());
}
//@ chunk-snd3g4y1.js:32698-33014 placement
async function applyConfigShorthand(n, s, r) {
  let u = buildShorthandRows(s, r);
  await readUnattendedServingConsent().catch(() => {
    return;
  });
  let p = Ke(shorthandRows(buildConfigRows(u), s), s);
  if (
    n.some(({ key: key, raw: raw }) => {
      let O = findSettingRow(key, p);
      return O !== void 0 && O.lock?.source !== "managed" && isLockedForKey(O, raw);
    })
  )
    (await ensurePolicyLimitsLoadedForDiagnostic().catch(() => {}),
      (p = Ke(shorthandRows(buildConfigRows(buildShorthandRows(s, r)), s), s)));
  let S = [];
  for (let { key: key, raw: raw } of n) S.push(await applyConfigShorthandEntry(key, raw, p));
  return S;
}
/**
 * 应用 /config key=value 速记：匹配设置行、校验并写入，返回结果或拒绝原因。
 */
//@ chunk-snd3g4y1.js:33014-35205 placement
async function applyConfigShorthandEntry(n, s, r) {
  let u = findSettingRow(n, r);
  if ((logEvent("tengu_config_shorthand", { key_hash: gn(n), matched: u !== void 0 }), !u)) {
    let filtered = r.filter((S) => S.id.toLowerCase() === n.toLowerCase());
    return {
      ok: !1,
      kind: "refusal",
      message:
        filtered.length > 1
          ? `${sanitizeTelemetryString(n)} matches ${filtered.map((S) => sanitizeTelemetryString(S.id)).join(" and ")}; type one exactly.`
          : `${sanitizeTelemetryString(n)} isn't a /config setting. Run /config to see what's available.`,
    };
  }
  let p = ("labelBoldSuffix" in u ? u.searchText : void 0) ?? u.label;
  if (isLockedForKey(u, s))
    return {
      ok: !1,
      kind:
        u.lock?.reason === PLUGIN_SETTINGS_REMOTE_REFUSAL || u.lock?.reasonShipsOffBox ? "refusal" : "locked",
      message: `Couldn't save ${p}: ${u.lock?.reason}`,
    };
  if (u.consentGated) {
    let m = h7e(s) === !1,
      S = (u.type === "boolean" && m) || (u.lock !== void 0 && !isLockedForKey(u, s)),
      y = u.value === !0 || u.canWithdraw?.() === !0;
    if (S && !y) return { ok: !0, kind: "refusal", message: `${n} is already off.` };
    if (!(S && y))
      return {
        ok: !1,
        kind: "refusal",
        message: `${p} can't be enabled with key=value \u2014 open /config to change it from the panel.`,
      };
  }
  switch (u.type) {
    case "boolean": {
      let m = h7e(s);
      if (m === void 0)
        return {
          ok: !1,
          kind: "refusal",
          message: `${p} takes true or false, not "${sanitizeTelemetryString(s)}".`,
        };
      let onChange = await u.onChange(m);
      if (onChange?.error) {
        if (onChange.error instanceof WireSafeControlError)
          return {
            ok: !1,
            kind: "refusal",
            message: `${p}: ${onChange.error.message}${onChange?.messageSuffix ?? ""}`,
          };
        return {
          ok: !1,
          kind: "save-failure",
          message: `Couldn't save ${p}: ${onChange.error.message}${onChange?.messageSuffix ?? ""}`,
        };
      }
      return {
        ok: !0,
        kind: "refusal",
        message: `Set ${p} to ${m ? "true" : "false"}${onChange?.messageSuffix ?? ""}`,
      };
    }
    case "enum":
    case "managedEnum": {
      let coerce = u.coerce;
      if (!u.options && !coerce)
        return {
          ok: !1,
          kind: "refusal",
          message: `${p} can't be set with key=value \u2014 use ${SETTING_REDIRECTS.get(u.id) ?? "/config"}.`,
        };
      let S = coerce ? coerce(s) : u.options?.find((w) => w.toLowerCase() === s.toLowerCase());
      if (S === void 0) {
        let w = u.type === "managedEnum" && u.optionsHint ? ` ${u.optionsHint}` : "";
        return {
          ok: !1,
          kind: "refusal",
          message: u.options
            ? `${p} takes one of: ${u.options.join(", ")}.${w}`
            : `${p} doesn't accept "${sanitizeTelemetryString(s)}".${w}`,
        };
      }
      let onChange = await u.onChange(S);
      if (onChange?.error) {
        if (onChange.error instanceof WireSafeControlError)
          return {
            ok: !1,
            kind: "refusal",
            message: `${p}: ${onChange.error.message}${onChange?.messageSuffix ?? ""}`,
          };
        return {
          ok: !1,
          kind: "save-failure",
          message: `Couldn't save ${p}: ${onChange.error.message}${onChange?.messageSuffix ?? ""}`,
        };
      }
      return {
        ok: !0,
        kind: "refusal",
        message: `Set ${p} to ${sanitizeTelemetryString(S)}${onChange?.messageSuffix ?? ""}`,
      };
    }
  }
}
//@ chunk-snd3g4y1.js:35205-35434 placement
function collapseShorthandResultOffBox(n, s) {
  if (!s) return n.message;
  switch (n.kind) {
    case "save-failure":
      return Xe;
    case "locked":
      return "Couldn't save this setting: a trusted policy owns it (detail withheld on this connection).";
    case "refusal":
      return n.message;
  }
}
//@ chunk-snd3g4y1.js:35434-35687 placement
function listConfigKeys(n) {
  return withPluginSettingRows(shorthandRows(buildConfigRows(buildShorthandRows(n)), n), n)
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
  let lookup = Oo.of(getRootSession().host).lookup(),
    index = s.indexOf("=");
  if (index === -1) {
    let lower = s.toLowerCase();
    return lookup
      .filter((w) => w.id.toLowerCase().startsWith(lower))
      .sort((w, O) => w.id.localeCompare(O.id))
      .map((w) => ({
        value: `${w.id}=`,
        description: w.options?.slice(0, 4).join(" | ") ?? w.hint,
        isFinal: !1,
        appendSpace: !1,
      }));
  }
  let sliced = s.slice(0, index),
    lower = s.slice(index + 1).toLowerCase(),
    found = lookup.find((y) => y.id.toLowerCase() === sliced.toLowerCase());
  if (!found?.options) return [];
  return found.options
    .filter((option) => option.toLowerCase().startsWith(lower))
    .map((y) => ({ value: `${found.id}=${y}`, isFinal: !0 }));
}
//@ chunk-snd3g4y1.js:36220-36395 placement
class DetachedConfigKeysCache {
  keys = void 0;
  remoteWorkspace = !1;
  lookup() {
    if (this.remoteWorkspace !== wt()) ((this.remoteWorkspace = !this.remoteWorkspace), (this.keys = void 0));
    return ((this.keys ??= createDetachedConfigContext()), this.keys);
  }
}
//@ chunk-snd3g4y1.js:36395-36420 placement
var Oo = new HostScoped(() => new DetachedConfigKeysCache());
/**
 * 构造不依赖 REPL 的最小 AppState 上下文，用于非交互地计算设置行。
 */
//@ chunk-snd3g4y1.js:36420-36949 placement
function createDetachedConfigContext() {
  let n = {
    getAppState: () => ({
      thinkingEnabled: !1,
      verbose: !1,
      mainLoopModel: null,
      mainLoopModelForSession: null,
      fastMode: !1,
      promptSuggestionEnabled: !1,
      awaySummaryEnabled: !1,
      toolPermissionContext: getEmptyToolPermissionContext(),
    }),
    setAppState: () => {},
    options: { mcpClients: [] },
  };
  return shorthandRows(buildConfigRows(buildShorthandRows(n)), n).flatMap((r) => {
    if (r.consentGated) return [];
    let u = r.type === "boolean" ? ["true", "false"] : "options" in r && r.options ? r.options : void 0;
    if (u || (r.type === "managedEnum" && r.coerce))
      return [{ id: r.id, options: u, hint: r.type === "managedEnum" ? r.optionsHint : void 0 }];
    return [];
  });
}
/**
 * 生成速记可用的设置行列表（含工作流开关等）。
 */
//@ chunk-snd3g4y1.js:36949-38487 placement
function buildShorthandRows(n, s) {
  let appState = n.getAppState(),
    u = { ...getInitialSettings_2(), ...remoteForwardedSettings(), autoContinueAtUsageLimit: dln() ?? !0 },
    p = getEffectiveConfigValues(),
    m = resolveSetting("disableWorkflows", !1),
    S = resolveSetting("enableWorkflows", !1),
    y =
      isEligibleForOverageCreditGrant() &&
      (m.value !== !0 || m.source === "userSettings") &&
      (S.source === "default" || S.source === "userSettings"),
    w = !hasWorkflowSizeSetting(),
    O = isAutoContinueUserSetting(),
    k = isArtifactConfigToggleable(),
    isBriefEntitled = require("./chunk-cv3kgbt2.js").isBriefEntitled();
  return {
    globalConfig: p,
    settingsData: u,
    storageV5: n.storageV5,
    mayBeAuthoredByNonOwner: _N(n),
    themeSetting: p.theme,
    currentOutputStyle: u?.outputStyle || DEFAULT,
    currentLanguage: u?.language,
    externalIncludesApproved: !1,
    thinkingEnabled: appState.thinkingEnabled,
    verbose: appState.verbose,
    mainLoopModel: appState.mainLoopModel,
    currentModel: useMainLoopModel(appState),
    isFastMode: isFastModeEnabled() ? appState.fastMode : !1,
    promptSuggestionEnabled: appState.promptSuggestionEnabled,
    awaySummaryEnabled: appState.awaySummaryEnabled,
    showDefaultViewPicker: isBriefEntitled,
    pushTogglesVisible: Myt(),
    crossSessionInboxRowVisible: !1,
    isConnectedToIde: hasAccessToIDEExtensionDiffFeature(n.options.mcpClients),
    inAppSelection: !0,
    tabsStandIn: !1,
    isFileCheckpointingAvailable: !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING,
    workflowsToggleable: y,
    workflowSizeGuidelineToggleable: w,
    autoContinueAtUsageLimitToggleable: O,
    artifactToggleable: k,
    remoteToolServingOn: isRemoteToolServingOnForSettings(),
    launchDirectoryKeys: null,
    shouldShowExternalIncludesToggle: !1,
    autoUpdaterDisabledReason: getAutoUpdaterDisabledReason(),
    promptSuggestionRun: n.session?.promptSuggestion,
    modelSwitchHooks: n.session
      ? {
          session: n.session,
          readState: () => n.getAppState(),
          latestPick: { current: 0 },
          latestFastPick: { current: 0 },
        }
      : null,
    setAppState: (A) => n.setAppState(A),
    setTheme:
      s?.setTheme ??
      ((A) =>
        isStorageV5Enabled() && n.storageV5 !== void 0
          ? saveUserIntentSetting("theme", A, n.storageV5)
          : saveUserIntentSetting("theme", A)),
    ...NOOP_CONFIG_WRITERS,
  };
}
//@ chunk-snd3g4y1.js:38487-38742 placement
var PLUGIN_SETTINGS_REMOTE_REFUSAL =
    "a plugin's settings can't be changed over Remote Control or from a relayed message \u2014 open /config in the session itself",
  MANAGED_PLUGIN_CONFIG_NOTE = "Set by your organization's managed settings (pluginConfigs)",
  FLAG_PLUGIN_CONFIG_NOTE = "Set by --settings for this session (pluginConfigs)";
//@ chunk-snd3g4y1.js:38742-38791 placement
function xo(n, s, r) {
  return trustedPluginSetting(n).options?.[s] ?? r;
}
//@ chunk-snd3g4y1.js:38791-38971 placement = getEnabledSettingSources (0.836)
function getPluginOptionLockingSource(n, s) {
  let r = (u) => {
    let p = getSettingsForSource(u)?.pluginConfigs;
    return pluginIdAliases(n).some((m) => p?.[m]?.options?.[s] !== void 0);
  };
  if (r("policySettings")) return MANAGED_PLUGIN_CONFIG_NOTE;
  return r("flagSettings") ? FLAG_PLUGIN_CONFIG_NOTE : void 0;
}
/**
 * 把插件配置项写入 userSettings.pluginConfigs，值未变则跳过。
 */
//@ chunk-snd3g4y1.js:38971-39346 placement
async function savePluginConfigOption(n, s, r, u) {
  let p = marketplaceSource(n),
    m = typeof r === "object" ? [...r] : r,
    S = `${p}\x00${s}`,
    y = ge.has(S)
      ? ge.get(S)
      : getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs?.[p]?.options?.[s];
  if (jsonStringify(y) === jsonStringify(m)) return;
  ge.set(S, m);
  let w = await updateSettingsForSource(
    "userSettings",
    { pluginConfigs: { [p]: { options: { [s]: m } } } },
    void 0,
    u,
  ).finally(() => {
    if (ge.get(S) === m) ge.delete(S);
  });
  if (w.error) return { error: w.error };
  return (clearPluginOptionsCache(), pluginConfigSaveSuffix(n, s));
}
//@ chunk-snd3g4y1.js:39346-39361 placement
var ge = new Map();
/**
 * 插件配置保存后给出提示后缀（需要 /reload-plugins 等）。
 */
//@ chunk-snd3g4y1.js:39361-39862 placement
async function pluginConfigSaveSuffix(n, s) {
  let r = marketplaceSource(n),
    found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === n.name);
  if (found !== void 0 && found.args.pluginStorageId !== r)
    return { messageSuffix: " \xB7 saved; /reload-plugins applies it" };
  let p = await refreshOptions();
  logOptionsReloads(p);
  let found_2 = p.find((S) => S.name === n.name);
  if (found_2 !== void 0 && found_2.kind !== "reloaded") {
    let S =
      found_2.kind === "refused"
        ? found_2.result.refused
        : found_2.kind === "held"
          ? found_2.reason
          : errorMessage(found_2.error);
    return (
      logForDebugging(`/config ${n.name}.${s}: saved; ${S}`),
      { messageSuffix: " \xB7 saved, but the plugin did not reload; /reload-plugins applies it" }
    );
  }
}
//@ chunk-snd3g4y1.js:39862-41272 placement
function pluginConfigSettings(n, s = {}) {
  let r = [];
  for (let u of n) {
    if (u.enabled === !1) continue;
    let p = u.manifest.userConfig ?? {},
      m = marketplaceSource(u),
      S = sanitizeTelemetryString(u.name),
      w = n.some(
        (O) =>
          O !== u && O.enabled !== !1 && sanitizeTelemetryString(O.name).toLowerCase() === S.toLowerCase(),
      )
        ? m
        : u.name;
    for (let [O, k] of Object.entries(p)) {
      if (k.sensitive === !0 || k.multiple === !0) continue;
      let L = `${w}.${O}`,
        A = getPluginOptionLockingSource(m, O) ?? s.refusal,
        Q = A === void 0 ? void 0 : { reason: A, source: "managed" },
        ne = sanitizeTelemetryString(k.title),
        te = sanitizeTelemetryString(k.description),
        oe = { id: L, label: ne, searchText: `${ne} ${u.name} ${te}`, ...(Q !== void 0 && { lock: Q }) },
        V = s.shown?.get(L) ?? xo(m, O, k.default),
        ie = async (q) => {
          if (Q !== void 0) return { error: new WireSafeControlError(Q.reason) };
          s.onShown?.(L, q);
          let J = await savePluginConfigOption(u, O, q, s.storageV5);
          if (J?.error && V !== void 0) s.onShown?.(L, V);
          return J;
        };
      if (k.type === "boolean") {
        r.push({
          ...oe,
          value: CHr(V),
          type: "boolean",
          provided: { plugin: S, pluginId: m, description: te, kind: "boolean" },
          onChange: ie,
        });
        continue;
      }
      if (k.type === "string" && k.options !== void 0) {
        let filtered = uniq(k.options.map(sanitizeTelemetryString)).filter((J) => J !== "");
        r.push({
          ...oe,
          value: V === void 0 ? "" : String(V),
          options: filtered,
          type: "enum",
          pickToCommit: !0,
          provided: { plugin: S, pluginId: m, description: te, kind: "choice" },
          onChange: ie,
        });
        continue;
      }
      let se = k.type === "number";
      r.push({
        ...oe,
        value: V === void 0 ? "" : String(V),
        type: "managedEnum",
        coerce: (q) => {
          if (!se) return q;
          let J = parseBoundedNumber(q, k);
          return J === void 0 ? void 0 : String(J);
        },
        optionsHint: se ? getFormatHint(k) : void 0,
        provided: { plugin: S, pluginId: m, description: te, kind: se ? "number" : "text" },
        onChange: (q) => ie(se ? Number(q) : q),
      });
    }
  }
  return r;
}
//@ chunk-snd3g4y1.js:41272-41395 placement
function shownSettingValue(n) {
  let s = String(n.value);
  return n.provided !== void 0 && n.type !== "boolean"
    ? recursivelySanitizeUnicode_2(stripControlChars(s.replace(/[\t\n\r]/g, " ")))
    : s;
}
//@ chunk-snd3g4y1.js:41395-41525 placement
function withPluginSettingRows(n, s) {
  let r = s.getAppState().plugins?.enabled ?? [];
  return [
    ...n,
    ...pluginConfigSettings(r, {
      storageV5: s.storageV5,
      ...(_N(s) && { refusal: PLUGIN_SETTINGS_REMOTE_REFUSAL }),
    }),
  ];
}
//@ chunk-snd3g4y1.js:41525-41608 placement
function Ke(n, s) {
  let r = _N(s) ? { kind: "bridge" } : freeze_17;
  return withPluginSettingRows(n, s).map((u) => throughConfigSet(u, r));
}
/**
 * 推断设置行的值类型（boolean/number/choice/text）与可选项。
 */
//@ chunk-snd3g4y1.js:41608-42209 placement
function describeConfigRowKind(n) {
  let provided = n.provided,
    r =
      n.type === "boolean"
        ? "boolean"
        : (provided?.kind ??
          (n.type === "enum"
            ? "choice"
            : n.coerce !== void 0
              ? "text"
              : n.options !== void 0
                ? "choice"
                : "text")),
    u = n.type === "boolean" ? void 0 : (n.options ?? void 0),
    p = r === "number" && typeof n.value === "string" ? Number(n.value) : Number.NaN,
    m = typeof n.value === "string" && n.value.trim() !== "" && Number.isFinite(p) ? p : n.value;
  return {
    row: {
      key: n.id,
      label: n.label,
      ...(provided !== void 0 && { description: provided.description }),
      kind: r,
      value: m,
      ...(r === "choice" && u !== void 0 && { options: u }),
      provider: provided === void 0 ? freeze_6 : tKe(provided.pluginId),
      isLocked: n.lock !== void 0,
    },
    ...(n.lock !== void 0 && { lockReason: n.lock.reason }),
  };
}
/**
 * 检查设置行能否修改（同意门槛、托管锁定等），不能时返回原因。
 */
//@ chunk-snd3g4y1.js:42209-43139 placement
async function checkConfigRowWritable(n, s) {
  let r = ("labelBoldSuffix" in n ? n.searchText : void 0) ?? n.label;
  if (n.consentGated) {
    if (!(n.type === "boolean" && s === !1 && (n.value === !0 || n.canWithdraw?.() === !0)))
      return n.type === "boolean" && s === !1 ? void 0 : `${r} can only be turned on from the /config panel.`;
  }
  let u = async (p) => {
    let m = await p;
    return m?.error ? `${m.error.message}${m.messageSuffix ?? ""}` : void 0;
  };
  switch (n.type) {
    case "boolean":
      return typeof s === "boolean" ? u(n.onChange(s)) : `${r} takes true or false.`;
    case "enum":
    case "managedEnum": {
      let p = n.type === "managedEnum" ? n.coerce : void 0;
      if (!n.options && !p) return `${r} can only be changed from the /config panel.`;
      let m = typeof s === "string" ? s : String(s),
        S = p ? p(m) : n.options?.find((y) => y.toLowerCase() === m.toLowerCase());
      if (S === void 0) {
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
function No(n) {
  return { ...describeConfigRowKind(n), write: (s) => checkConfigRowWritable(n, s) };
}
//@ chunk-snd3g4y1.js:43190-43247 placement
function configRowHandles(n) {
  return withPluginSettingRows(buildConfigRows(buildShorthandRows(n)).settings, n).map(No);
}
//@ chunk-snd3g4y1.js:43247-43399 placement
function coerceShorthandValue(n, s) {
  if (n.type === "boolean") return typeof s === "boolean" ? s : void 0;
  if (typeof s === "number") return String(s);
  return typeof s === "string" ? s : void 0;
}
/**
 * 把输入值按设置行类型转换并校验。
 */
//@ chunk-snd3g4y1.js:43399-44448 placement
function coerceConfigRowValue(n, s, r, u = freeze_17, p) {
  let { row: row } = describeConfigRowKind(n),
    S = row.kind === "number" && typeof s === "string" ? Number(s) : s,
    w =
      row.kind === "choice" && typeof S === "string" && !(row.options ?? []).includes(S)
        ? { ...row, kind: "text", options: void 0 }
        : row,
    O,
    k = !1;
  return dispatchConfigSet({
    row: w,
    value: S,
    origin: u,
    signal: p,
    write: async (L) => {
      if (p?.aborted) return `${w.label}: the change was cancelled`;
      let A = coerceShorthandValue(n, L);
      if (A === void 0) return `${w.label}: a ${w.kind} row cannot hold that value`;
      let Q = n.type === "managedEnum" ? n.coerce : void 0,
        ne = jsonStringify(L) !== jsonStringify(S),
        oe =
          ne &&
          row.kind === "choice" &&
          Q === void 0 &&
          typeof A === "string" &&
          !(row.options ?? []).includes(A)
            ? void 0
            : ne && Q !== void 0 && typeof A === "string"
              ? Q(A)
              : A;
      if (oe === void 0) {
        let ie = n.type === "managedEnum" && n.optionsHint ? ` ${n.optionsHint}` : "";
        return `${w.label} doesn't accept "${sanitizeTelemetryString(String(L))}".${ie}`;
      }
      O = r(oe);
      let V = await O;
      return ((k = V?.error !== void 0), V?.error ? `${V.error.message}${V.messageSuffix ?? ""}` : void 0);
    },
  }).then((L) => {
    if (L.deny === void 0 || k) return O;
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
function throughConfigSet(n, s = freeze_17) {
  let onChange = n.onChange;
  return { ...n, onChange: (p) => (Qfn() ? coerceConfigRowValue(n, p, onChange, s) : onChange(p)) };
}
//@ chunk-snd3g4y1.js:44537-44605 placement
function commitThroughConfigSet(n, s, r, u) {
  return n !== void 0 && Qfn() ? coerceConfigRowValue(n, s, r, freeze_17, u) : r(s);
}
//@ chunk-snd3g4y1.js:44605-44679 placement
var Xe = "Couldn't save this setting (detail withheld on this connection).";
//@ chunk-snd3g4y1.js:44679-44712 placement
function Ze(n, s) {
  return s() ? Xe : n;
}
//@ chunk-snd3g4y1.js:44712-44786 placement
var Ho = "The model changed while a plugin's hook was deciding; pick again";
//@ chunk-snd3g4y1.js:44786-45756 placement
async function commitRowThroughConfigSet(n, s, r, u, p = {}) {
  let m = Qfn()
    ? buildConfigRows(buildShorthandRows(r)).settings.find((setting) => setting.id === n)
    : void 0;
  if (m === void 0) {
    let k = await u();
    return k?.error === void 0 ? { written: s } : { refusal: ze(n, k) };
  }
  let S = {},
    y = async (k) => {
      if (p.isSuperseded?.()) return ee("a later pick replaced this one");
      if (k !== s && p.refuseRewrite !== void 0)
        return ee(
          p.refuseRewrite === !0
            ? "a plugin's hook changed the value; this command writes only what was picked (use /config)"
            : p.refuseRewrite,
        );
      let L =
        k === s
          ? await Promise.resolve()
              .then(u)
              .catch((A) => ((S.thrown = { error: A }), ee("the write failed")))
          : await checkConfigRowWritable(m, k).then((A) => (A === void 0 ? void 0 : ee(A)));
      if (L?.error === void 0) S.written = k;
      return L;
    },
    w = await coerceConfigRowValue(m, s, (k) => (S.outcome ??= y(k)), _N(r) ? { kind: "bridge" } : freeze_17);
  if (S.thrown !== void 0) throw S.thrown.error;
  if (S.written !== void 0) return { written: S.written };
  let O = ("labelBoldSuffix" in m ? m.searchText : void 0) ?? m.label;
  if (w?.error !== void 0) return { refusal: ze(O, w) };
  return { refusal: `Couldn't save ${O}: a plugin's hook answered without writing` };
}
//@ chunk-snd3g4y1.js:45756-45847 placement
function ze(n, s) {
  return `Couldn't save ${n}: ${s.error?.message ?? ""}${s.messageSuffix ?? ""}`;
}
//@ chunk-snd3g4y1.js:45847-45931 placement
function ee(n) {
  return {
    error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      n,
      "a row commit from a command was not written",
    ),
  };
}
//@ chunk-snd3g4y1.js:45931-46583 placement
async function savedModelPickReply(n, s, r, u) {
  let p = n ?? "default",
    m = "",
    S,
    y,
    w = await commitRowThroughConfigSet(
      "model",
      p,
      s,
      async () => {
        if (u.hasModelMoved?.()) return ((S = Ho), ee(S));
        let k = await r();
        if (typeof k === "string") {
          m = k;
          return;
        }
        if ("unsaved" in k) return ((y = k.unsaved), ee("the default was not saved"));
        return ((S = k.refused), ee(k.refused));
      },
      { isSuperseded: u.isSuperseded },
    );
  if (S !== void 0) return { text: S, isRefusal: !0, isOwnRefusal: !0 };
  if (y !== void 0) return { text: y, isRefusal: !1 };
  if ("refusal" in w) return { text: Ze(w.refusal, u.persistsOffBox), isRefusal: !0 };
  if (w.written === p) return { text: m, isRefusal: !1 };
  let O = w.written === "default" ? null : String(w.written);
  return {
    text: `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(O))}${SAVED_AS_DEFAULT_SUFFIX}`,
    isRefusal: !1,
    rewrittenTo: O,
  };
}
//@ chunk-snd3g4y1.js:46583-46625 placement
var FAST_TOGGLE_NOT_APPLIED = Symbol("fast toggle not applied");
//@ chunk-snd3g4y1.js:46625-46903 placement
async function savedFastModeToggle(n, s, r, u) {
  let p = {},
    m = await commitRowThroughConfigSet(
      "fast",
      n,
      s,
      async () => {
        let S = await r();
        if (((p.isDone = !0), S === FAST_TOGGLE_NOT_APPLIED)) return ee("nothing was applied");
        return ((p.refusal = S), S === void 0 ? void 0 : ee(S));
      },
      { refuseRewrite: !0 },
    );
  if (p.isDone) return p.refusal;
  return "refusal" in m ? Ze(m.refusal, u) : void 0;
}
//@ chunk-snd3g4y1.js:46903-47126 placement
async function describedSettings(n) {
  let s = new Map();
  return (
    await Promise.all(
      n.map(async (r) => {
        let { row: row } = describeConfigRowKind(r),
          p = await pGr(row);
        if (p === void 0) s.set(r.id, { label: row.label, hidden: !0 });
        else if (p !== row) s.set(r.id, { label: sanitizeTelemetryString(p.label), hidden: !1 });
      }),
    ),
    s
  );
}
//@ chunk-snd3g4y1.js:47126-47203 placement
var ROW_COMMIT = {
  isHooked: () => Qfn(),
  savedModelPickReply: savedModelPickReply,
  savedFastModeToggle: savedFastModeToggle,
};

export {
  FAST_TOGGLE_NOT_APPLIED,
  savedFastModeToggle,
  savedModelPickReply,
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
