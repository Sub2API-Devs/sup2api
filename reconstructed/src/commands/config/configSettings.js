/**
 * commands/config/configSettings.ts
 *
 * 2.1.316 新增：构建 /config 界面的全部设置行（主题、编辑模式、模型、通知、自动更新等）及其读写处理；合并全局配置与设置，得到 /config 界面显示的各项当前值。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-snd3g4y1.js (24)
 * attribution: placement 24
 */
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { parseCustomThemeRef } from "../../utils/customThemes.js";
import {
  P1e,
  getGlobalConfig,
  getExplicitRemoteControlAtStartup,
  DEFAULT_GLOBAL_CONFIG,
  saveGlobalConfig,
  NOTIFICATION_CHANNELS,
  Obr,
  getCurrentProjectConfig,
  Uct,
  OOn,
  customApiKeyResponsesOf,
} from "../../utils/config.js";
import { isSettingsMovedToConfig } from "../createMovedToConfigCommand.js";
import { rJt } from "../../utils/settings/types.js";
import {
  getAskUserQuestionTimeout,
  getDialogExpiry,
  getModelProposedGoalsSettingParsed,
  getSecuritySensitiveSettingWithSources,
  getInitialSettings_2,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import {
  resolveArtifactEnableSetting,
  getArtifactDefaultOn,
} from "../../services/artifacts/artifactToolGates.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { n9t, validateConfigValue } from "../../utils/config/globalConfigValidation.js";
import { isFableAvailable, modelDisplayString } from "../../utils/model/model.js";
import { E8 } from "../../utils/model/modelIds.js";
import { isOpus1mUnavailable, requires1mEntitlementCheck, aue } from "../model/model.js";
import { isModelAllowed, managedDenyStartupRefusal } from "../../utils/model/modelAllowlist.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { languageDisplayNames } from "../../utils/intl.js";
import { uiSignals } from "../../state/uiSignals.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { saveUserIntentSetting, resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { lue } from "../../utils/model/modelUnavailability.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import {
  WireSafeControlError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { WZ, sN, serializeModelSwitch, zE } from "../../utils/model/modelSwitchHooks.js";
import { runPreModelSwitchHooks, preModelSwitchBlockedMessage, Nf } from "../model/modelSwitch.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { persistEffortSetting, levelEffortSetting } from "../../utils/effort.js";
import {
  clearRefusalFallbackModelLatch,
  noteSystemPromptSectionInvalidation,
  setUserMsgOptIn,
} from "../../bootstrap/state.js";
import {
  isFastModeEnabled,
  clearFastModeCooldown,
  isFastModeActive,
  reportFastModeToggle,
  isFastModeAvailable,
  defaultOpusLabel,
  defaultOpusAlias,
} from "../../utils/fastMode.js";
import { formatFastModeSuffix, getFastModeSwitchModel } from "../fast/fast.js";
import { pushNotificationPreferences } from "../../services/notifications/notificationPreferences.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { resolveWorkflowSize } from "../../utils/workflowSizeGuideline.js";
import { isProSubscriber, nes, isWorkflowsAvailable, ees, tTn } from "../../utils/workflows/workflowGates.js";
import {
  getRemoteControlPolicyLockReason,
  isRemoteControlHardDisabled,
  isBridgeEnabled,
} from "../../bridge/bridgeEntitlement.js";
import { getRemoteControlAtStartup, applyRemoteControlToAppState } from "../../bridge/bridgeGates.js";
import { getThinkingCannotBeDisabledMessage, isThinkingEffectivelyEnabled } from "../../utils/thinking.js";
import { isAgentsFleetEnabled } from "../../utils/fleetGates.js";
import { aze } from "../../utils/backgroundHandoff.js";
import { LEFT_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { Jnr } from "../../tools/PushNotificationTool/prompt.js";
import { isIdleCompactionEnabled } from "../../services/compact/compactSettings.js";
import { isAutoContinueEnabled } from "../../services/quotaAutoResume/quotaAutoResume.js";
import {
  canForwardHomeSettings,
  isSettingsToCloudEnabledCached,
  getHomeSettingsForwardingBlocker,
} from "../../services/analytics/violinGates.js";
import { Rpn, saveHomeSettingsMode } from "../../utils/teleport/homeSettingsMode.js";
import { Uxe } from "../../utils/permissions/sensitivePaths.js";
import { BARE_SUBSCRIPT_NAME_BUILTINS_2 } from "../../utils/bash/ast.js";
import {
  UNATTENDED_CONSENT_LABELS,
  bKn,
  Ban,
  saveUnattendedServingConsent,
} from "../../services/remoteTools/unattendedServingConsent.js";
import {
  unattendedServingConsentView,
  managedSettingsForbidUnattendedServing,
} from "../../services/remoteTools/unattendedConsentStore.js";
import {
  Eir,
  hci,
  Bie,
  setSwitchModelsOnFlag,
  TENGU_JAZZY_GOBLET,
} from "../../services/api/safeguardMessages.js";
import { isFeedbackRelayEnabled, setFeedbackDraftsSetting } from "../../services/feedbackDrafts.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasGrowthBookOverride,
  isGrowthBookEnabled,
  getAllGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { fjs } from "../../services/PromptSuggestion/backOff.js";
import {
  eui,
  setOrgMemoryRead,
  GEn,
  canWriteOrgMemory,
  isOrgMemoryWritesEnabledForAccount,
  applyOrgMemoryDecision,
} from "../../services/orgMemory/orgMemoryDecision.js";
import { RHr } from "../../utils/timeFormat.js";
import { PERMISSION_MODES } from "../../types/permissions.js";
import {
  permissionModeFromString,
  isExternalPermissionMode,
  toExternalPermissionMode,
} from "../../utils/permissions/PermissionMode.js";
import { logForDebugging } from "../../utils/debug.js";
import { transitionPlanAutoMode } from "../../utils/permissions/permissionSetup.js";
import {
  OUTPUT_STYLE_CONFIG,
  getAllOutputStylesCached,
  isBuiltInOrDefaultStyle,
  CUSTOM_STYLE_REMOTE_DENIED_MESSAGE,
  STYLE_SAVE_UNAVAILABLE_MESSAGE,
} from "../../constants/outputStyles.js";
import { getCwd } from "../../utils/cwd.js";
import { isProposeGoalEnabled } from "../../tools/ProposeGoalTool/constants.js";
import { sanitizeTitle } from "../../utils/resultError.js";
import { isSupportedTerminal } from "../../utils/ide.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  getCliTeammateModeOverride,
  DEFAULT_TEAMMATE_MODE,
  clearCliTeammateModeOverride,
} from "../../utils/swarm/backends/teammateModeSnapshot.js";
import { resetBackendDetection } from "../../utils/swarm/backends/registry.js";
import { env } from "../../utils/env.js";
import { isAntBuild } from "../../utils/envUtils.js";
import { nge } from "../../utils/auth/lockHolderLiveness.js";
import { emitCredentialChange } from "../../utils/auth/credentialEpoch.js";
import { wt } from "../../remote/remoteMode.js";

//@ chunk-snd3g4y1.js:2948-3032 placement
function So(n) {
  return isCustomizationDisabled("themes") && Boolean(parseCustomThemeRef(n))
    ? `${n} (disabled in safe mode)`
    : n;
}
/**
 * /config 中的主题设置行（托管枚举，自定义主题提示用 /theme）。
 */
//@ chunk-snd3g4y1.js:3032-3195 placement
var themeSettingRow = (n) => ({
  id: "theme",
  label: "Theme",
  value: So(n.themeSetting),
  type: "managedEnum",
  options: P1e,
  optionsHint: "For custom themes, use /theme.",
  onChange: n.setTheme,
});
//@ chunk-snd3g4y1.js:3195-3229 placement
function le(n, s) {
  return isSettingsMovedToConfig() ? s : n;
}
/**
 * 通知渠道设置值的简短显示名（bell、iterm2+bell、none）。
 */
//@ chunk-snd3g4y1.js:3229-3391 placement
function notificationChannelLabel(n) {
  switch (n) {
    case "terminal_bell":
      return "bell";
    case "iterm2_with_bell":
      return "iterm2+bell";
    case "notifications_disabled":
      return "none";
    default:
      return n;
  }
}
//@ chunk-snd3g4y1.js:3391-3487 placement
var $e = ["never", "60s", "5m", "10m"],
  Be = ["default", "60s", "5m", "10m", "never"],
  Ve = ["default", ...rJt];
/**
 * 收集需要转发给远程会话的设置值（提问超时、对话框过期、跨会话入站、模型提议目标、Artifact 开关）。
 */
//@ chunk-snd3g4y1.js:3487-3671 placement
function remoteForwardedSettings() {
  return {
    ...!1,
    askUserQuestionTimeout: getAskUserQuestionTimeout(),
    dialogExpiry: getDialogExpiry(),
    crossSessionInbound: We("crossSessionInbound")?.value,
    modelProposedGoals: getModelProposedGoalsSettingParsed(),
    enableArtifact: resolveArtifactEnableSetting().enabled,
  };
}
//@ chunk-snd3g4y1.js:3671-3723 placement
function We(n) {
  return getSecuritySensitiveSettingWithSources(n).find((s) => isSettingSourceEnabled(s.source));
}
//@ chunk-snd3g4y1.js:3723-3796 placement = _temp5 (1)
function Ee(a_0) {
  let s = We(a_0)?.source;
  return s !== void 0 && s !== "userSettings";
}
//@ chunk-snd3g4y1.js:3796-4052 placement
function isSessionScopedSetting(n) {
  return (
    n === "model" ||
    n === "fast" ||
    n === "thinking" ||
    n === "useAutoModeDuringPlan" ||
    n === "autoCompact" ||
    n === "idleCompaction" ||
    n === "autoContinueAtUsageLimit" ||
    n === "precomputeCompactionEnabled" ||
    n === "checkpoints" ||
    n === "outputStyle" ||
    n === "defaultView"
  );
}
/**
 * 合并全局配置与设置，得到 /config 界面显示的各项当前值。
 */
//@ chunk-snd3g4y1.js:4052-5114 placement
function getEffectiveConfigValues() {
  let n = getGlobalConfig(),
    s = getInitialSettings_2();
  return {
    ...n,
    theme: s.theme ?? K(n, "theme"),
    editorMode: s.editorMode ?? K(n, "editorMode"),
    verbose: s.verbose ?? K(n, "verbose"),
    preferredNotifChannel: s.preferredNotifChannel ?? K(n, "preferredNotifChannel"),
    autoCompactEnabled: s.autoCompactEnabled ?? K(n, "autoCompactEnabled"),
    autoScrollEnabled: s.autoScrollEnabled ?? K(n, "autoScrollEnabled"),
    fileCheckpointingEnabled: s.fileCheckpointingEnabled ?? K(n, "fileCheckpointingEnabled"),
    showTurnDuration: s.showTurnDuration ?? K(n, "showTurnDuration"),
    showMessageTimestamps: s.showMessageTimestamps ?? K(n, "showMessageTimestamps"),
    terminalProgressBarEnabled: s.terminalProgressBarEnabled ?? K(n, "terminalProgressBarEnabled"),
    todoFeatureEnabled: s.todoFeatureEnabled ?? K(n, "todoFeatureEnabled"),
    teammateMode: s.teammateMode ?? K(n, "teammateMode"),
    remoteControlAtStartup: getExplicitRemoteControlAtStartup(),
    autoUploadSessions: s.autoUploadSessions ?? n9t("autoUploadSessions", n.autoUploadSessions),
    inputNeededNotifEnabled: s.inputNeededNotifEnabled ?? K(n, "inputNeededNotifEnabled"),
    agentPushNotifEnabled: s.agentPushNotifEnabled ?? K(n, "agentPushNotifEnabled"),
  };
}
//@ chunk-snd3g4y1.js:5114-5156 placement
function K(n, s) {
  return validateConfigValue(s, n[s]) ?? DEFAULT_GLOBAL_CONFIG[s];
}
//@ chunk-snd3g4y1.js:5156-5270 placement
function selectableModelOptions() {
  let n = isFableAvailable();
  return [
    "default",
    ...E8.filter(
      (s) =>
        (n || !s.includes("fable")) &&
        !isOpus1mUnavailable(s) &&
        !requires1mEntitlementCheck(s) &&
        isModelAllowed(s),
    ),
  ];
}
//@ chunk-snd3g4y1.js:5270-5341 placement
var COUNTRY_TO_LANGUAGE = new Map([
  ["jp", "ja"],
  ["kr", "ko"],
  ["cn", "zh"],
  ["tw", "zh-Hant"],
]);
//@ chunk-snd3g4y1.js:5341-5623 placement = capitalize (1)
function capitalize(str) {
  let trimmed = sanitizeTelemetryString(str).trim();
  if (!trimmed || trimmed.toLowerCase() === "default") return "default";
  if (trimmed.length <= 3) {
    let lower = trimmed.toLowerCase(),
      u = COUNTRY_TO_LANGUAGE.get(lower) ?? lower;
    try {
      let of = languageDisplayNames().of(u);
      if (of && of !== u) return of;
    } catch {}
  }
  return trimmed
    .split(/\s+/)
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase())
    .join(" ");
}
/**
 * 空操作函数及全部为空操作的配置写入器（只读场景使用）。
 */
//@ chunk-snd3g4y1.js:5623-5751 placement
var noop = () => {},
  NOOP_CONFIG_WRITERS = {
    setGlobalConfig: noop,
    setSettingsData: noop,
    setPlanAutoModeOffAtLaunch: noop,
    changeLog: { record: noop, clear: noop, toggle: noop },
  };
//@ chunk-snd3g4y1.js:5751-5829 placement
function yo(n) {
  return ((uiSignals.orgMemoryWritesRowSeen ||= n), uiSignals.orgMemoryWritesRowSeen);
}
//@ chunk-snd3g4y1.js:5829-5903 placement
function ko(n) {
  return ((uiSignals.orgMemoryReadRowSeen ||= n), uiSignals.orgMemoryReadRowSeen);
}
//@ chunk-snd3g4y1.js:5903-5987 placement
function Eo(n) {
  return ((uiSignals.remoteHomeSettingsRowSeen ||= n), uiSignals.remoteHomeSettingsRowSeen);
}
//@ chunk-snd3g4y1.js:5987-6011 placement
function sjs() {
  return !1;
}
/**
 * 转发设置到云会话失败的提示（版本不支持 / 未对用户开启），以及保存配置文件失败的提示。
 */
//@ chunk-snd3g4y1.js:6011-6302 placement
var FORWARD_SETTINGS_ERRORS = {
    unsupported:
      "Could not turn this on: forwarding settings to cloud sessions is not available in this version",
    flag_off:
      "Could not turn this on: forwarding settings to cloud sessions is not enabled for you right now",
  },
  CONFIG_SAVE_FAILED = "Could not save this to the config file, so nothing changed.";
/**
 * 构建 /config 界面的全部设置行（主题、编辑模式、模型、通知、自动更新等）及其读写处理。
 */
//@ chunk-snd3g4y1.js:6302-31522 placement
function buildConfigRows(n) {
  let {
    globalConfig: globalConfig,
    settingsData: settingsData,
    themeSetting: themeSetting,
    currentOutputStyle: currentOutputStyle,
    currentLanguage: currentLanguage,
    externalIncludesApproved: externalIncludesApproved,
    thinkingEnabled: thinkingEnabled,
    verbose: verbose,
    mainLoopModel: mainLoopModel,
    currentModel: currentModel,
    isFastMode: isFastMode,
    promptSuggestionEnabled: promptSuggestionEnabled,
    awaySummaryEnabled: awaySummaryEnabled,
    showDefaultViewPicker: showDefaultViewPicker,
    pushTogglesVisible: pushTogglesVisible,
    crossSessionInboxRowVisible: crossSessionInboxRowVisible,
    isConnectedToIde: isConnectedToIde,
    inAppSelection: inAppSelection,
    tabsStandIn: tabsStandIn,
    isFileCheckpointingAvailable: isFileCheckpointingAvailable,
    workflowsToggleable: workflowsToggleable,
    workflowSizeGuidelineToggleable: workflowSizeGuidelineToggleable,
    autoContinueAtUsageLimitToggleable: autoContinueAtUsageLimitToggleable,
    artifactToggleable: artifactToggleable,
    remoteToolServingOn: remoteToolServingOn,
    launchDirectoryKeys: launchDirectoryKeys,
    shouldShowExternalIncludesToggle: shouldShowExternalIncludesToggle,
    autoUpdaterDisabledReason: autoUpdaterDisabledReason,
    modelSwitchHooks: modelSwitchHooks,
    setAppState: setAppState,
    setTheme: setTheme,
    setGlobalConfig: setGlobalConfig,
    setSettingsData: setSettingsData,
    setPlanAutoModeOffAtLaunch: setPlanAutoModeOffAtLaunch,
    changeLog: changeLog,
    storageV5: storageV5,
    promptSuggestionRun: promptSuggestionRun,
    mayBeAuthoredByNonOwner: mayBeAuthoredByNonOwner,
  } = n;
  function x(e) {
    return isStorageV5Enabled() && storageV5 !== void 0
      ? updateSettingsForSource("userSettings", e, void 0, storageV5)
      : updateSettingsForSource("userSettings", e);
  }
  function pe(e) {
    return isStorageV5Enabled() && storageV5 !== void 0
      ? updateSettingsForSource("localSettings", e, void 0, storageV5)
      : updateSettingsForSource("localSettings", e);
  }
  function j(e, o) {
    if (isStorageV5Enabled() && storageV5 !== void 0) saveUserIntentSetting(e, o, storageV5);
    else saveUserIntentSetting(e, o);
  }
  function G(e) {
    if (isStorageV5Enabled() && storageV5 !== void 0) saveGlobalConfig(e, storageV5);
    else saveGlobalConfig(e);
  }
  async function Te(e, o) {
    logEvent("tengu_config_model_changed", {
      from_model: telemetrySafeModelName(mainLoopModel),
      to_model: telemetrySafeModelName(e),
    });
    let h = lue(e),
      E = e === null ? managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch") : null;
    if (E !== null)
      return { error: new WireSafeControlError(E, "default model blocked by managed settings") };
    let M = "";
    if (modelSwitchHooks) {
      let { session: session, readState: readState } = modelSwitchHooks;
      if (WZ(session) || sN.of(session).pending > 0) {
        let mo = ++modelSwitchHooks.latestPick.current,
          ae = await serializeModelSwitch(session, () =>
            runPreModelSwitchHooks(session, readState, e, "command"),
          );
        if (mo !== modelSwitchHooks.latestPick.current) return;
        if (ae.decision !== "proceed")
          return (
            logFeatureSad("model_switch", "blocked_by_hook"),
            {
              error: new WireSafeControlError(
                preModelSwitchBlockedMessage(
                  e,
                  ae.decision === "ask"
                    ? `${ae.reason ?? "confirmation required"} (run /model to confirm)`
                    : ae.reason,
                  ae.messages,
                ),
                "model switch blocked by a PreModelSwitch hook",
              ),
            }
          );
        if (ae.messages.length > 0) M = ` \xB7 ${ae.messages.map(Nf).join(" \xB7 ")}`;
      }
      zE(session, readState(), e, "command");
    }
    if (o !== void 0) persistEffortSetting(o, aue(e), void 0, storageV5);
    if ((clearRefusalFallbackModelLatch(), isFastModeEnabled())) clearFastModeCooldown();
    let P = !1,
      I = !1;
    (setAppState(
      (Z) => (
        (P = !!Z.fastMode),
        (I = isFastModeEnabled() ? isFastModeActive(e, Z.fastMode) : P),
        {
          ...Z,
          mainLoopModel: e,
          mainLoopModelForSession: null,
          ...(o !== void 0 && { sessionEffort: levelEffortSetting(o) }),
          ...(I !== P && { fastMode: I }),
        }
      ),
    ),
      reportFastModeToggle(P, I));
    let X = formatFastModeSuffix(P, I, e);
    changeLog.record(
      "model",
      modelDisplayString(e) + X + M + (h ? " \xB7 this session only \u2014 /model to set up" : ""),
      { moveToEnd: !0 },
    );
    let ye = h ? void 0 : await x({ model: e ?? void 0 }),
      re = X + M;
    if (ye?.error) return { error: ye.error, ...(re && { messageSuffix: re }) };
    if (re) return { messageSuffix: re };
  }
  function Oe(e) {
    (j("verbose", e),
      setGlobalConfig((o) => ({ ...o, verbose: e })),
      setAppState((o) => ({ ...o, verbose: e })),
      changeLog.toggle("verbose", e));
  }
  function Ce(e) {
    (j("preferredNotifChannel", e), setGlobalConfig((o) => ({ ...o, preferredNotifChannel: e })));
  }
  function Ae(e) {
    (j("inputNeededNotifEnabled", e),
      setGlobalConfig((o) => ({ ...o, inputNeededNotifEnabled: e })),
      pushNotificationPreferences(),
      logEvent("tengu_push_notif_pref_changed", { key: lit("inputNeededNotifEnabled"), value: e }));
  }
  function Fe(e) {
    (j("agentPushNotifEnabled", e),
      setGlobalConfig((o) => ({ ...o, agentPushNotifEnabled: e })),
      pushNotificationPreferences(),
      logEvent("tengu_push_notif_pref_changed", { key: lit("agentPushNotifEnabled"), value: e }));
  }
  let Ie = resolveWorkflowSize(globalConfig.workflowSizeGuideline, isProSubscriber());
  function Le(e) {
    if (e !== "false") {
      let l = getRemoteControlPolicyLockReason();
      if (l !== null)
        return {
          error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            l,
            "Remote Control setting locked by org policy",
          ),
        };
    }
    if (e === "default")
      (j("remoteControlAtStartup", void 0),
        G((l) => {
          if (l.remoteControlAtStartup === void 0) return l;
          let h = { ...l };
          return (delete h.remoteControlAtStartup, h);
        }),
        setGlobalConfig((l) => ({ ...l, remoteControlAtStartup: void 0 })));
    else {
      let l = e === "true";
      (j("remoteControlAtStartup", l), setGlobalConfig((h) => ({ ...h, remoteControlAtStartup: l })));
    }
    let o = getRemoteControlAtStartup();
    setAppState((l) => applyRemoteControlToAppState(l, o));
    return;
  }
  function co() {
    let e = getRemoteControlPolicyLockReason();
    if (e !== null)
      return {
        id: "remoteControl",
        label: "Enable Remote Control for all sessions",
        value: "disabled",
        lock: {
          reason: e,
          source: isRemoteControlHardDisabled() ? "managed" : "policy",
          writableWhileLocked: ["false"],
        },
        options: ["true", "false", "default"],
        type: "managedEnum",
        onChange(o) {
          if (o !== "false")
            return {
              error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                e,
                "Remote Control setting locked by org policy",
              ),
            };
          return Le(o);
        },
      };
    return {
      id: "remoteControl",
      label: "Enable Remote Control for all sessions",
      value:
        globalConfig.remoteControlAtStartup === void 0
          ? "default"
          : String(globalConfig.remoteControlAtStartup),
      options: ["true", "false", "default"],
      type: "enum",
      onChange: Le,
    };
  }
  let De = aue(currentModel),
    me = getThinkingCannotBeDisabledMessage(De),
    we = [
      ...(isAgentsFleetEnabled()
        ? [
            {
              id: "defaultToAgentsView",
              label: "Open agents view by default",
              value: globalConfig.defaultToAgentsView ?? !1,
              type: "boolean",
              onChange(e) {
                (G((o) => ({ ...o, defaultToAgentsView: e })),
                  setGlobalConfig((o) => ({ ...o, defaultToAgentsView: e })));
              },
            },
          ]
        : []),
      ...(aze()
        ? [
            {
              id: "leftArrowOpensAgents",
              label: `${LEFT_ARROW} opens agents`,
              value: globalConfig.leftArrowOpensAgents ?? !0,
              type: "boolean",
              onChange(e) {
                (G((o) => ({ ...o, leftArrowOpensAgents: e })),
                  setGlobalConfig((o) => ({ ...o, leftArrowOpensAgents: e })));
              },
            },
          ]
        : []),
    ],
    go = tabsStandIn ? we.filter((e) => e.id !== "leftArrowOpensAgents") : we,
    Ne = {
      id: "notifChannel",
      label: "Local notifications",
      value: globalConfig.preferredNotifChannel,
      options: [...NOTIFICATION_CHANNELS],
      type: "enum",
      onChange: Ce,
    },
    Ue = pushTogglesVisible
      ? [
          ...(Jnr()
            ? [
                {
                  id: "inputNeededNotifEnabled",
                  label: "Push when actions required",
                  value: globalConfig.inputNeededNotifEnabled ?? !1,
                  type: "boolean",
                  onChange: Ae,
                },
              ]
            : []),
          {
            id: "agentPushNotifEnabled",
            label: "Push when Claude decides",
            value: globalConfig.agentPushNotifEnabled ?? !1,
            type: "boolean",
            onChange: Fe,
          },
        ]
      : [],
    source = resolveSetting("idleCompaction", !0).source,
    po = source === "userSettings" || (source === "default" && isSettingSourceEnabled("userSettings")),
    Ge = [
      {
        id: "autoCompact",
        label: "Auto-compact",
        value: globalConfig.autoCompactEnabled,
        type: "boolean",
        onChange(e) {
          (j("autoCompactEnabled", e),
            setGlobalConfig((o) => ({ ...o, autoCompactEnabled: e })),
            logEvent("tengu_auto_compact_setting_changed", { enabled: e }));
        },
      },
      ...(po
        ? [
            {
              id: "idleCompaction",
              label: "Idle compaction",
              value: settingsData?.idleCompaction ?? !0,
              type: "boolean",
              async onChange(e) {
                setSettingsData((l) => ({ ...l, idleCompaction: e }));
                let o = await x({ idleCompaction: e });
                if (o?.error) {
                  let l = isIdleCompactionEnabled();
                  return (setSettingsData((h) => ({ ...h, idleCompaction: l })), { error: o.error });
                }
                (logEvent("tengu_idle_compaction_setting_changed", { enabled: e }),
                  changeLog.toggle("idleCompaction", e));
              },
            },
          ]
        : []),
      ...(autoContinueAtUsageLimitToggleable
        ? [
            {
              id: "autoContinueAtUsageLimit",
              label: "Continue automatically at usage limit",
              value: settingsData?.autoContinueAtUsageLimit ?? !0,
              type: "boolean",
              consentGated: !0,
              async onChange(e) {
                setSettingsData((l) => ({ ...l, autoContinueAtUsageLimit: e }));
                let o = await x({ autoContinueAtUsageLimit: e });
                if (o?.error) {
                  let l = isAutoContinueEnabled();
                  return (
                    setSettingsData((h) => ({ ...h, autoContinueAtUsageLimit: l })),
                    { error: o.error }
                  );
                }
                logEvent("tengu_quota_auto_resume_setting_changed", { enabled: e });
              },
            },
          ]
        : []),
      ...(Eo(
        canForwardHomeSettings(isSettingsToCloudEnabledCached()) ||
          globalConfig.remoteHomeSettingsMode === "forward",
      )
        ? [
            {
              id: "remoteHomeSettings",
              label: "Use this machine's settings in cloud sessions",
              value:
                globalConfig.remoteHomeSettingsMode === "forward" &&
                Rpn() &&
                (isSettingsToCloudEnabledCached() || !Uxe()),
              isDefaultValue: !Obr.some((e) => e === globalConfig.remoteHomeSettingsMode),
              consentGated: !0,
              canWithdraw: () => Uxe() && globalConfig.remoteHomeSettingsMode !== "keep_local",
              grantBlocker: getHomeSettingsForwardingBlocker(!0) ?? void 0,
              type: "boolean",
              onChange(e) {
                if (e)
                  return {
                    error: new WireSafeControlError(
                      "Turn this on from the /config panel, which shows what will be sent",
                    ),
                  };
                let o = "keep_local",
                  remoteHomeSettingsMode = globalConfig.remoteHomeSettingsMode;
                return (
                  setGlobalConfig((h) => ({ ...h, remoteHomeSettingsMode: o })),
                  saveHomeSettingsMode(o, isStorageV5Enabled() ? storageV5 : void 0).then((h) => {
                    switch (h) {
                      case "written":
                        return;
                      case "unconfirmed":
                        return {
                          messageSuffix:
                            " (could not confirm it was written to the config file; check /config after restarting Claude Code)",
                        };
                      case "not_stored":
                        return (
                          setGlobalConfig((E) => ({
                            ...E,
                            remoteHomeSettingsMode: getGlobalConfig().remoteHomeSettingsMode,
                          })),
                          { error: new WireSafeControlError(CONFIG_SAVE_FAILED) }
                        );
                      case "refused":
                        return (
                          setGlobalConfig((E) => ({ ...E, remoteHomeSettingsMode: remoteHomeSettingsMode })),
                          {
                            error: new WireSafeControlError(
                              "Cloud settings forwarding is not available right now; nothing was changed",
                            ),
                          }
                        );
                    }
                  })
                );
              },
            },
          ]
        : []),
      ...[],
      ...(BARE_SUBSCRIPT_NAME_BUILTINS_2(remoteToolServingOn)
        ? [
            {
              id: "unattendedServing",
              label: "Unattended commands from cloud sessions on this computer",
              value: UNATTENDED_CONSENT_LABELS[unattendedServingConsentView()],
              options: [UNATTENDED_CONSENT_LABELS.declined, UNATTENDED_CONSENT_LABELS.accepted],
              type: "enum",
              pickToCommit: !0,
              consentGated: !0,
              canWithdraw: bKn,
              ...(managedSettingsForbidUnattendedServing() && {
                lock: {
                  reason: Ban(),
                  source: "managed",
                  writableWhileLocked: [UNATTENDED_CONSENT_LABELS.declined],
                },
              }),
              onChange(e) {
                return saveUnattendedServingConsent(
                  e === UNATTENDED_CONSENT_LABELS.accepted ? "accepted" : "declined",
                ).then((o) => {
                  if (o === "forbidden") return { error: new WireSafeControlError(Ban()) };
                  if ((setGlobalConfig((l) => ({ ...l })), o === "not_saved"))
                    return {
                      error: new WireSafeControlError("The answer could not be saved; nothing was changed"),
                    };
                  return;
                });
              },
            },
          ]
        : []),
      ...(Eir()
        ? [
            {
              id: "switchModelsOnFlag",
              label: hci,
              value: modelSwitchPolicyLabel(settingsData?.switchModelsOnFlag),
              options: [Bie.switchAutomatically, Bie.askEachTime],
              type: "enum",
              pickToCommit: !0,
              coerce(e) {
                let lower = e.trim().toLowerCase();
                if (
                  ["true", "1", "on", "yes"].includes(lower) ||
                  lower === Bie.switchAutomatically.toLowerCase()
                )
                  return Bie.switchAutomatically;
                if (["false", "0", "off", "no"].includes(lower) || lower === Bie.askEachTime.toLowerCase())
                  return Bie.askEachTime;
                return;
              },
              onChange(e) {
                let o = e === Bie.switchAutomatically;
                return (
                  setSettingsData((l) => ({ ...l, switchModelsOnFlag: o })),
                  setSwitchModelsOnFlag(o, "config", isStorageV5Enabled() ? storageV5 : void 0).then(
                    ({ error: error }) => (error ? { error: error } : void 0),
                  )
                );
              },
            },
          ]
        : []),
      ...[],
      {
        id: "tips",
        label: "Show tips",
        value: settingsData?.spinnerTipsEnabled ?? !0,
        type: "boolean",
        onChange(e) {
          (pe({ spinnerTipsEnabled: e }),
            setSettingsData((o) => ({ ...o, spinnerTipsEnabled: e })),
            logEvent("tengu_tips_setting_changed", { enabled: e }));
        },
      },
      ...(isFeedbackRelayEnabled()
        ? [
            {
              id: "feedbackDrafts",
              label: "Claude-drafted feedback",
              value: settingsData?.feedbackDrafts ?? "notify",
              options: ["notify", "quiet", "off"],
              type: "enum",
              onChange(e) {
                let o = e;
                (setFeedbackDraftsSetting(o, { storageV5: storageV5, via: "config" }),
                  setSettingsData((l) => ({ ...l, feedbackDrafts: o })));
              },
            },
          ]
        : []),
      {
        id: "reduceMotion",
        label: "Reduce motion",
        value: settingsData?.prefersReducedMotion ?? !1,
        type: "boolean",
        onChange(e) {
          (pe({ prefersReducedMotion: e }),
            setSettingsData((o) => ({ ...o, prefersReducedMotion: e })),
            setAppState((o) => ({ ...o, settings: { ...o.settings, prefersReducedMotion: e } })),
            logEvent("tengu_reduce_motion_setting_changed", { enabled: e }));
        },
      },
      {
        id: "thinking",
        label: "Thinking mode",
        value: isThinkingEffectivelyEnabled(De, thinkingEnabled),
        type: "boolean",
        ...(me !== void 0 && {
          lock: {
            reason: me,
            source: "managed",
            reasonShipsOffBox: !0,
            writableWhileLocked: ["true", "1", "on", "yes"],
          },
        }),
        onChange(e) {
          if (!e && me !== void 0)
            return { error: new WireSafeControlError(me, "Thinking can't be turned off for this model") };
          (setAppState((o) => ({ ...o, thinkingEnabled: e })),
            x({ alwaysThinkingEnabled: e ? void 0 : !1 }),
            logEvent("tengu_thinking_toggled", { enabled: e }),
            logFeatureOk("thinking_toggle"));
        },
      },
      ...(isFastModeEnabled() && isFastModeAvailable()
        ? [
            {
              id: "fast",
              label: `Fast mode (${defaultOpusLabel()})`,
              value: !!isFastMode,
              type: "boolean",
              async onChange(e) {
                let o = (l, h, E) => {
                  if (h) {
                    let P = !1;
                    if (
                      (setAppState((I) => {
                        let X = getFastModeSwitchModel(I);
                        return ((P = X !== void 0 && X !== l), I);
                      }),
                      P)
                    )
                      return {
                        error: new WireSafeControlError(
                          "Fast mode was not enabled: the model changed while PreModelSwitch hooks ran; try again",
                          "fast mode promotion stale after hooks",
                        ),
                      };
                  }
                  (clearFastModeCooldown(), x({ fastMode: !0 }));
                  let M;
                  if (
                    (setAppState((P) => {
                      let I = getFastModeSwitchModel(P),
                        X = I !== void 0 && (!h || I === l);
                      if (X && modelSwitchHooks) zE(modelSwitchHooks.session, P, I, "command");
                      return (
                        (M = X ? I : void 0),
                        { ...P, ...(X && { mainLoopModel: I, mainLoopModelForSession: null }), fastMode: !0 }
                      );
                    }),
                    M !== void 0)
                  )
                    changeLog.record("model", M ?? defaultOpusAlias());
                  return (changeLog.record("Fast mode", "ON"), E ? { messageSuffix: E } : void 0);
                };
                if (
                  e &&
                  modelSwitchHooks &&
                  (WZ(modelSwitchHooks.session) || sN.of(modelSwitchHooks.session).pending > 0)
                ) {
                  let { session: session, readState: readState } = modelSwitchHooks,
                    E = ++modelSwitchHooks.latestFastPick.current;
                  return serializeModelSwitch(session, async () => {
                    let M = getFastModeSwitchModel(readState());
                    if (M === void 0 || !WZ(session)) {
                      if (E !== modelSwitchHooks.latestFastPick.current) return;
                      return o(void 0, !1, "");
                    }
                    let P = await runPreModelSwitchHooks(session, readState, M, "command");
                    if (E !== modelSwitchHooks.latestFastPick.current) return;
                    if (P.decision !== "proceed")
                      return (
                        logFeatureSad("model_switch", "blocked_by_hook"),
                        {
                          error: new WireSafeControlError(
                            preModelSwitchBlockedMessage(
                              M,
                              P.decision === "ask"
                                ? `${P.reason ?? "confirmation required"} (run /model to switch, then enable fast mode)`
                                : P.reason,
                              P.messages,
                            ),
                            "model switch blocked by a PreModelSwitch hook",
                          ),
                        }
                      );
                    return o(
                      M,
                      !0,
                      P.messages.length > 0 ? ` \xB7 ${P.messages.map(Nf).join(" \xB7 ")}` : "",
                    );
                  });
                }
                if (e) return o(void 0, !1, "");
                else {
                  let l = () => {
                    (clearFastModeCooldown(),
                      x({ fastMode: void 0 }),
                      setAppState((h) => ({ ...h, fastMode: !1 })),
                      changeLog.record("Fast mode", "OFF"));
                  };
                  if (modelSwitchHooks && sN.of(modelSwitchHooks.session).pending > 0)
                    await serializeModelSwitch(modelSwitchHooks.session, async () => l());
                  else l();
                }
              },
            },
          ]
        : []),
      ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_inflection", !1)
        ? [
            {
              id: "promptSuggestionEnabled",
              label: "Prompt suggestions",
              value: promptSuggestionEnabled,
              type: "boolean",
              onChange(e) {
                if (
                  (setAppState((o) => ({ ...o, promptSuggestionEnabled: e })),
                  x({ promptSuggestionEnabled: e ? void 0 : !1 }),
                  e && !promptSuggestionEnabled)
                )
                  fjs(isStorageV5Enabled() ? storageV5 : void 0, promptSuggestionRun);
              },
            },
          ]
        : []),
      {
        id: "recap",
        label: "Session recap",
        value: awaySummaryEnabled,
        type: "boolean",
        onChange(e) {
          (setAppState((o) => ({ ...o, awaySummaryEnabled: e })),
            x({ awaySummaryEnabled: e ? void 0 : !1 }),
            setSettingsData((o) => ({ ...o, awaySummaryEnabled: e ? void 0 : !1 })));
        },
      },
      ...(isFileCheckpointingAvailable
        ? [
            {
              id: "checkpoints",
              label: "Rewind code (checkpoints)",
              value: globalConfig.fileCheckpointingEnabled,
              type: "boolean",
              onChange(e) {
                (j("fileCheckpointingEnabled", e),
                  setGlobalConfig((o) => ({ ...o, fileCheckpointingEnabled: e })),
                  logEvent("tengu_file_history_snapshots_setting_changed", { enabled: e }));
              },
            },
          ]
        : []),
      ...(ko(eui())
        ? [
            {
              id: "orgMemoryRead",
              label: "Synced project memory (this directory; applies next session)",
              value: getCurrentProjectConfig().orgMemoryRead ?? !0,
              type: "boolean",
              onChange(e) {
                (setOrgMemoryRead(e, storageV5), setGlobalConfig((o) => ({ ...o })));
              },
            },
          ]
        : []),
      ...(yo(!GEn() && (canWriteOrgMemory() || getCurrentProjectConfig().orgMemoryWrites === !0))
        ? [
            {
              id: "orgMemoryWrites",
              label:
                getCurrentProjectConfig().orgMemoryRead === !1
                  ? "Synced project memory writes (enable reads first)"
                  : "Synced project memory writes (this directory; applies next session)",
              value: isOrgMemoryWritesEnabledForAccount(),
              canWithdraw: () => getCurrentProjectConfig().orgMemoryWrites === !0,
              type: "boolean",
              consentGated: !0,
              onChange(e) {
                let o =
                  e &&
                  !isOrgMemoryWritesEnabledForAccount() &&
                  getCurrentProjectConfig().orgMemoryWrites === !0;
                (applyOrgMemoryDecision(o ? !1 : e, storageV5), setGlobalConfig((l) => ({ ...l })));
              },
            },
          ]
        : []),
      ...(workflowsToggleable
        ? [
            {
              id: "workflows",
              label: "Dynamic workflows",
              value: settingsData?.disableWorkflows === !0 ? !1 : (settingsData?.enableWorkflows ?? nes()),
              type: "boolean",
              onChange(e) {
                let o = e === nes() ? void 0 : e;
                (x({ enableWorkflows: o, disableWorkflows: void 0 }),
                  setSettingsData((l) => ({ ...l, enableWorkflows: o, disableWorkflows: void 0 })),
                  changeLog.record("workflows", e ? "on" : "off"));
              },
            },
            {
              id: "workflowKeywordTriggerEnabled",
              label: "Ultracode keyword trigger",
              value: settingsData?.workflowKeywordTriggerEnabled ?? !0,
              type: "boolean",
              onChange(e) {
                let o = e ? void 0 : !1;
                (x({ workflowKeywordTriggerEnabled: o }),
                  setSettingsData((l) => ({ ...l, workflowKeywordTriggerEnabled: o })),
                  changeLog.record("ultracodeKeywordTrigger", e ? "on" : "off"));
              },
            },
          ]
        : []),
      ...(workflowSizeGuidelineToggleable && (workflowsToggleable || isWorkflowsAvailable())
        ? [
            {
              id: "workflowSizeGuideline",
              label: "Dynamic workflow size",
              value: Ie.size,
              isDefaultValue: Ie.isDefault,
              options: [...ees],
              type: "enum",
              onChange(e) {
                let o = tTn(e) ?? "unrestricted";
                (G((l) => {
                  if (l.workflowSizeGuideline === o) return l;
                  return { ...l, workflowSizeGuideline: o };
                }),
                  setGlobalConfig((l) => ({ ...l, workflowSizeGuideline: o })),
                  changeLog.record("workflowSizeGuideline", o));
              },
            },
          ]
        : []),
      ...(artifactToggleable
        ? [
            {
              id: "artifacts",
              label: "Artifacts",
              value: settingsData?.enableArtifact ?? getArtifactDefaultOn(),
              type: "boolean",
              async onChange(e) {
                let o = e === getArtifactDefaultOn() ? void 0 : e;
                setSettingsData((h) => ({ ...h, enableArtifact: e }));
                let l = await x({ enableArtifact: o, disableArtifact: void 0 });
                if (l?.error)
                  return (
                    setSettingsData((h) => ({
                      ...h,
                      enableArtifact: resolveArtifactEnableSetting().enabled,
                    })),
                    { error: l.error }
                  );
                changeLog.record("artifacts", e ? "on" : "off");
              },
            },
          ]
        : []),
      {
        id: "verbose",
        label: le("Verbose output", "Verbose"),
        value: verbose,
        type: "boolean",
        onChange: Oe,
      },
      {
        id: "progressBar",
        label: "Terminal progress bar",
        value: globalConfig.terminalProgressBarEnabled,
        type: "boolean",
        onChange(e) {
          (j("terminalProgressBarEnabled", e),
            setGlobalConfig((o) => ({ ...o, terminalProgressBarEnabled: e })),
            logEvent("tengu_terminal_progress_bar_setting_changed", { enabled: e }));
        },
      },
      ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_terminal_sidebar", !1)
        ? [
            {
              id: "showStatusInTerminalTab",
              label: "Show status in terminal tab",
              value: globalConfig.showStatusInTerminalTab ?? !1,
              type: "boolean",
              onChange(e) {
                (G((o) => ({ ...o, showStatusInTerminalTab: e })),
                  setGlobalConfig((o) => ({ ...o, showStatusInTerminalTab: e })),
                  logEvent("tengu_terminal_tab_status_setting_changed", { enabled: e }));
              },
            },
          ]
        : []),
      {
        id: "turnDuration",
        label: "Show turn duration",
        value: globalConfig.showTurnDuration,
        type: "boolean",
        onChange(e) {
          (j("showTurnDuration", e),
            setGlobalConfig((o) => ({ ...o, showTurnDuration: e })),
            logEvent("tengu_show_turn_duration_setting_changed", { enabled: e }));
        },
      },
      ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_sepia_moth", !1)
        ? [
            {
              id: "precomputeCompactionEnabled",
              label: "Precompute compaction",
              value: settingsData?.precomputeCompactionEnabled ?? !0,
              type: "boolean",
              onChange(e) {
                (x({ precomputeCompactionEnabled: e }),
                  setSettingsData((o) => ({ ...o, precomputeCompactionEnabled: e })),
                  logEvent("tengu_precompute_compaction_setting_changed", { enabled: e }));
              },
            },
          ]
        : []),
      ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_silk_hinge", !1)
        ? [
            {
              id: "timestamps",
              label: "Show message timestamps",
              value: globalConfig.showMessageTimestamps,
              type: "boolean",
              onChange(e) {
                (j("showMessageTimestamps", e),
                  setGlobalConfig((o) => ({ ...o, showMessageTimestamps: e })),
                  setAppState((o) => ({ ...o, showMessageTimestamps: e })),
                  logEvent("tengu_show_message_timestamps_setting_changed", { enabled: e }));
              },
            },
          ]
        : []),
      {
        id: "timeFormat",
        label: "Time format",
        value: RHr(settingsData?.timeFormat ?? "auto"),
        options: [...Uct],
        type: "enum",
        pickToCommit: !0,
        onChange(e) {
          let found = Uct.find((l) => l === e);
          if (!found) return;
          (x({ timeFormat: found }),
            setSettingsData((l) => ({ ...l, timeFormat: found })),
            changeLog.record("timeFormat", found),
            logEvent("tengu_time_format_setting_changed", { value: fromEnum(found) }));
        },
      },
      {
        id: "permissionMode",
        label: "Default permission mode",
        value: settingsData?.permissions?.defaultMode || "default",
        options: (() => {
          let e = ["default", "plan"],
            o = PERMISSION_MODES,
            l = ["bypassPermissions"];
          return [...e, ...o.filter((h) => !e.includes(h) && !l.includes(h))];
        })(),
        type: "enum",
        async onChange(e) {
          let o = permissionModeFromString(e),
            l = isExternalPermissionMode(o) ? toExternalPermissionMode(o) : o,
            h = settingsData?.permissions?.defaultMode;
          (setSettingsData((M) => ({ ...M, permissions: { ...M?.permissions, defaultMode: l } })),
            changeLog.record("permissionMode", e));
          let E = await x({ permissions: { defaultMode: l } });
          if (E.error)
            return (
              setSettingsData((M) => ({ ...M, permissions: { ...M?.permissions, defaultMode: h } })),
              changeLog.clear("permissionMode"),
              logForDebugging(`Failed to update default permission mode setting: ${E.error.message}`, {
                level: "error",
              }),
              { error: E.error }
            );
        },
      },
      {
        id: "worktreeBaseRef",
        label: "Worktree base ref",
        value: settingsData?.worktree?.baseRef ?? "fresh",
        options: ["fresh", "head"],
        type: "enum",
        async onChange(e) {
          let o = e,
            l = settingsData?.worktree?.baseRef;
          (setSettingsData((E) => ({ ...E, worktree: { ...E?.worktree, baseRef: o } })),
            changeLog.record("worktreeBaseRef", o));
          let h = await x({ worktree: { baseRef: o } });
          if (h.error)
            return (
              setSettingsData((E) => ({ ...E, worktree: { ...E?.worktree, baseRef: l } })),
              changeLog.clear("worktreeBaseRef"),
              logForDebugging(`Failed to update worktree.baseRef in user settings: ${h.error.message}`, {
                level: "error",
              }),
              { error: h.error }
            );
        },
      },
      {
        id: "useAutoModeDuringPlan",
        label: "Use auto mode during plan",
        value: settingsData?.useAutoModeDuringPlan ?? !0,
        type: "boolean",
        async onChange(e) {
          (setSettingsData((l) => ({ ...l, useAutoModeDuringPlan: e })),
            changeLog.record("Use auto mode during plan", e));
          let { error: error } = await x({ useAutoModeDuringPlan: e });
          if (error) return { error: error };
          (setPlanAutoModeOffAtLaunch(!e),
            setAppState((l) => {
              let h = transitionPlanAutoMode(l.toolPermissionContext);
              if (h === l.toolPermissionContext) return l;
              return { ...l, toolPermissionContext: h };
            }));
        },
      },
      {
        id: "gitignore",
        label: "Respect .gitignore in file picker",
        value: globalConfig.respectGitignore ?? DEFAULT_GLOBAL_CONFIG.respectGitignore,
        type: "boolean",
        onChange(e) {
          (G((o) => ({ ...o, respectGitignore: e })),
            setGlobalConfig((o) => ({ ...o, respectGitignore: e })),
            logEvent("tengu_respect_gitignore_setting_changed", { enabled: e }));
        },
      },
      {
        id: "copyFullResponse",
        label: "Skip the /copy picker",
        value: globalConfig.copyFullResponse ?? DEFAULT_GLOBAL_CONFIG.copyFullResponse,
        type: "boolean",
        onChange(e) {
          (G((o) => ({ ...o, copyFullResponse: e })),
            setGlobalConfig((o) => ({ ...o, copyFullResponse: e })));
        },
      },
      ...(inAppSelection
        ? [
            {
              id: "copyOnSelect",
              label: "Copy on select",
              value: globalConfig.copyOnSelect ?? !0,
              type: "boolean",
              onChange(e) {
                (G((o) => ({ ...o, copyOnSelect: e })), setGlobalConfig((o) => ({ ...o, copyOnSelect: e })));
              },
            },
            {
              id: "autoScroll",
              label: le("Auto-scroll", "Auto-scroll output"),
              value: globalConfig.autoScrollEnabled,
              type: "boolean",
              onChange(e) {
                (j("autoScrollEnabled", e), setGlobalConfig((o) => ({ ...o, autoScrollEnabled: e })));
              },
            },
          ]
        : []),
      ...(isSettingsMovedToConfig() && !tabsStandIn
        ? isAgentsFleetEnabled() || aze()
          ? [
              {
                id: "agentsView",
                label: "Agents view",
                value:
                  (aze() && (globalConfig.leftArrowOpensAgents ?? !0)) ||
                  (isAgentsFleetEnabled() && (globalConfig.defaultToAgentsView ?? !1))
                    ? "on"
                    : "off",
                type: "managedEnum",
                onChange() {},
              },
            ]
          : []
        : go),
      ...[],
      autoUpdaterDisabledReason
        ? {
            id: "autoUpdatesChannel",
            label: "Auto-update channel",
            value: "disabled",
            type: "managedEnum",
            onChange() {},
          }
        : {
            id: "autoUpdatesChannel",
            label: "Auto-update channel",
            value: Ro(settingsData?.autoUpdatesChannel),
            type: "managedEnum",
            onChange() {},
          },
      themeSettingRow({ themeSetting: themeSetting, setTheme: setTheme }),
      ...(isSettingsMovedToConfig()
        ? [
            {
              id: "notifChannel",
              label: "Notifications",
              value: notificationChannelLabel(globalConfig.preferredNotifChannel),
              type: "managedEnum",
              options: [...NOTIFICATION_CHANNELS],
              onChange: Ce,
            },
          ]
        : [Ne, ...Ue]),
      {
        id: "outputStyle",
        label: "Output style",
        value:
          isCustomizationDisabled("outputStyles") && !Object.hasOwn(OUTPUT_STYLE_CONFIG, currentOutputStyle)
            ? `${currentOutputStyle} (disabled in safe mode)`
            : currentOutputStyle,
        type: "managedEnum",
        options: Object.keys(OUTPUT_STYLE_CONFIG),
        optionsHint: "For custom styles, open /config.",
        async onChange(e) {
          if (mayBeAuthoredByNonOwner) {
            let l = await getAllOutputStylesCached(getCwd(), storageV5);
            if (!isBuiltInOrDefaultStyle(l[e]))
              return { error: new WireSafeControlError(CUSTOM_STYLE_REMOTE_DENIED_MESSAGE) };
          }
          if (e === currentOutputStyle) return { messageSuffix: " (already the current style)" };
          if (!isSettingSourceEnabled("localSettings"))
            return { error: new WireSafeControlError(STYLE_SAVE_UNAVAILABLE_MESSAGE) };
          setSettingsData((l) => ({ ...l, outputStyle: e }));
          let o = await pe({ outputStyle: e });
          if (o?.error) return { error: o.error };
          noteSystemPromptSectionInvalidation("output_style");
        },
      },
      ...(showDefaultViewPicker
        ? [
            {
              id: "defaultView",
              label: "Default view",
              value: settingsData?.defaultView === void 0 ? "default" : String(settingsData.defaultView),
              options: ["transcript", "chat", "default"],
              type: "enum",
              onChange(e) {
                let o = e === "default" ? void 0 : e;
                (pe({ defaultView: o }), setSettingsData((h) => ({ ...h, defaultView: o })));
                let l = o === "chat";
                (setUserMsgOptIn(l),
                  setAppState((h) => {
                    if (h.isBriefOnly === l) return h;
                    return { ...h, isBriefOnly: l };
                  }),
                  changeLog.record("Default view", e),
                  logEvent("tengu_default_view_setting_changed", { value: fromEnum(o ?? "unset") }));
              },
            },
          ]
        : []),
      {
        id: "language",
        label: "Language",
        value: currentLanguage ?? "Default (English)",
        type: "managedEnum",
        coerce: capitalize,
        optionsHint: "Any language name or ISO code (e.g. 'ja'); use 'default' for English.",
        async onChange(e) {
          let o = e.toLowerCase() === "default" ? void 0 : e;
          setSettingsData((h) => ({ ...h, language: o }));
          let l = await x({ language: o });
          if (l?.error) return { error: l.error };
        },
      },
      {
        id: "editor",
        label: "Editor mode",
        value: globalConfig.editorMode === "emacs" ? "normal" : globalConfig.editorMode || "normal",
        options: ["normal", "vim"],
        type: "enum",
        onChange(e) {
          let o = e;
          (j("editorMode", o),
            setGlobalConfig((l) => ({ ...l, editorMode: o })),
            logEvent("tengu_editor_mode_changed", { mode: fromEnum(o), source: lit("config_panel") }));
        },
      },
      ...(Ee("askUserQuestionTimeout")
        ? []
        : [
            {
              id: "askUserQuestionTimeout",
              label: "Question auto-continue timeout",
              consentGated: !0,
              value: settingsData?.askUserQuestionTimeout ?? getAskUserQuestionTimeout() ?? "never",
              options: [...$e],
              type: "enum",
              async onChange(e) {
                let found = $e.find((E) => E === e);
                if (!found) return;
                let askUserQuestionTimeout = settingsData.askUserQuestionTimeout;
                setSettingsData((E) => ({ ...E, askUserQuestionTimeout: found }));
                let h = await x({ askUserQuestionTimeout: found });
                if (h?.error)
                  return (
                    setSettingsData((E) => ({ ...E, askUserQuestionTimeout: askUserQuestionTimeout })),
                    { error: h.error }
                  );
                logEvent("tengu_ask_user_question_timeout_changed", {
                  value: fromEnum(found),
                  source: lit("config_panel"),
                });
              },
            },
          ]),
      ...(isProposeGoalEnabled()
        ? [
            {
              id: "modelProposedGoals",
              label: "Claude-proposed goals",
              value: settingsData?.modelProposedGoals ?? getModelProposedGoalsSettingParsed(),
              options: [...OOn],
              type: "enum",
              consentGated: !0,
              async onChange(e) {
                let found = OOn.find((h) => h === e);
                if (!found) return;
                setSettingsData((h) => ({ ...h, modelProposedGoals: found }));
                let l = await x({ modelProposedGoals: found });
                if (l?.error) return { error: l.error };
                logEvent("tengu_model_proposed_goals_changed", {
                  value: fromEnum(found),
                  source: lit("config_panel"),
                });
              },
            },
          ]
        : []),
      {
        id: "externalEditorContext",
        label: le("Show last response in external editor", "Show responses in IDE"),
        value: globalConfig.externalEditorContext ?? !1,
        type: "boolean",
        onChange(e) {
          (G((o) => ({ ...o, externalEditorContext: e })),
            setGlobalConfig((o) => ({ ...o, externalEditorContext: e })),
            logEvent("tengu_external_editor_context_changed", { enabled: e }));
        },
      },
      {
        id: "prStatus",
        label: le("Show PR status footer", "Show PR status"),
        value: globalConfig.prStatusFooterEnabled ?? !0,
        type: "boolean",
        onChange(e) {
          (G((o) => {
            if (o.prStatusFooterEnabled === e) return o;
            return { ...o, prStatusFooterEnabled: e };
          }),
            setGlobalConfig((o) => ({ ...o, prStatusFooterEnabled: e })),
            logEvent("tengu_pr_status_footer_setting_changed", { enabled: e }));
        },
      },
      {
        id: "model",
        label: "Model",
        value: currentModel === null ? "Default (recommended)" : sanitizeTitle(currentModel),
        type: "managedEnum",
        options: selectableModelOptions(),
        optionsHint: "For a specific model ID, use /model.",
        onChange(e) {
          let o = e === "default" ? null : e;
          if (lue(o))
            return (
              logFeatureSad("model_fable_consent", "config_shorthand_blocked"),
              { error: new WireSafeControlError("needs usage-credits consent \u2014 run /model first") }
            );
          return Te(o);
        },
      },
      ...(isConnectedToIde
        ? [
            {
              id: "diffTool",
              label: "Diff tool",
              value: globalConfig.diffTool ?? "auto",
              options: ["terminal", "auto"],
              type: "enum",
              onChange(e) {
                let o = e;
                (G((l) => ({ ...l, diffTool: o })),
                  setGlobalConfig((l) => ({ ...l, diffTool: o })),
                  logEvent("tengu_diff_tool_changed", { tool: fromEnum(o), source: lit("config_panel") }));
              },
            },
          ]
        : []),
      ...(!isSupportedTerminal()
        ? [
            {
              id: "autoConnectIde",
              label: "Auto-connect to IDE (external terminal)",
              value: globalConfig.autoConnectIde ?? !1,
              type: "boolean",
              onChange(e) {
                (G((o) => ({ ...o, autoConnectIde: e })),
                  setGlobalConfig((o) => ({ ...o, autoConnectIde: e })),
                  logEvent("tengu_auto_connect_ide_changed", { enabled: e, source: lit("config_panel") }));
              },
            },
          ]
        : []),
      ...(isSupportedTerminal()
        ? [
            {
              id: "autoInstallIdeExtension",
              label: "Auto-install IDE extension",
              value: globalConfig.autoInstallIdeExtension ?? !0,
              type: "boolean",
              onChange(e) {
                (G((o) => ({ ...o, autoInstallIdeExtension: e })),
                  setGlobalConfig((o) => ({ ...o, autoInstallIdeExtension: e })),
                  logEvent("tengu_auto_install_ide_extension_changed", {
                    enabled: e,
                    source: lit("config_panel"),
                  }));
              },
            },
          ]
        : []),
      {
        id: "chrome",
        label: le("Claude in Chrome enabled by default", "Claude in Chrome"),
        ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_joyful_parasol", !0) !== !1 && { consentGated: !0 }),
        value: globalConfig.claudeInChromeDefaultEnabled ?? !1,
        type: "boolean",
        onChange(e) {
          (G((o) => ({ ...o, claudeInChromeDefaultEnabled: e })),
            setGlobalConfig((o) => ({ ...o, claudeInChromeDefaultEnabled: e })),
            logEvent("tengu_claude_in_chrome_setting_changed", { enabled: e }));
        },
      },
      ...(isAgentSwarmsEnabled()
        ? (() => {
            let e = getCliTeammateModeOverride();
            return [
              {
                id: "teammateMode",
                label: e ? `Teammate mode [overridden: ${e}]` : "Teammate mode",
                value: globalConfig.teammateMode ?? DEFAULT_TEAMMATE_MODE,
                options: ["auto", "tmux", "iterm2", "in-process"],
                type: "enum",
                onChange(l) {
                  if (l !== "auto" && l !== "tmux" && l !== "iterm2" && l !== "in-process") return;
                  (clearCliTeammateModeOverride(l),
                    resetBackendDetection(),
                    j("teammateMode", l),
                    setGlobalConfig((h) => ({ ...h, teammateMode: l })),
                    logEvent("tengu_teammate_mode_changed", { mode: fromEnum(l) }));
                },
              },
            ];
          })()
        : []),
      ...(isBridgeEnabled() || isRemoteControlHardDisabled() ? [co()] : []),
      ...(Ee("dialogExpiry")
        ? []
        : [
            {
              id: "dialogExpiry",
              label: "Dialog expiry",
              consentGated: !0,
              value: settingsData.dialogExpiry ?? "default",
              options: [...Be],
              type: "enum",
              async onChange(e) {
                let found = Be.find((M) => M === e);
                if (!found) return;
                let l = found === "default" ? void 0 : found,
                  dialogExpiry = settingsData.dialogExpiry;
                setSettingsData((M) => ({ ...M, dialogExpiry: l }));
                let E = await x({ dialogExpiry: l });
                if (E?.error)
                  return (setSettingsData((M) => ({ ...M, dialogExpiry: dialogExpiry })), { error: E.error });
                logEvent("tengu_dialog_expiry_changed", {
                  value: fromEnum(found),
                  source: lit("config_panel"),
                });
              },
            },
          ]),
      ...(crossSessionInboxRowVisible && !Ee("crossSessionInbound")
        ? [
            {
              id: "crossSessionInbound",
              label: "Messages from your other sessions",
              consentGated: !0,
              pickToCommit: !0,
              value: settingsData.crossSessionInbound ?? "default",
              options: [...Ve],
              type: "enum",
              async onChange(e) {
                let found = Ve.find((M) => M === e);
                if (!found) return;
                let l = found === "default" ? void 0 : found,
                  crossSessionInbound = settingsData.crossSessionInbound;
                setSettingsData((M) => ({ ...M, crossSessionInbound: l }));
                let E = await x({ crossSessionInbound: l });
                if (E?.error)
                  return (
                    setSettingsData((M) => ({ ...M, crossSessionInbound: crossSessionInbound })),
                    { error: E.error }
                  );
                logEvent("tengu_cross_session_inbound_changed", {
                  value: fromEnum(found),
                  source: lit("config_panel"),
                });
              },
            },
          ]
        : []),
      ...[],
      ...(isBridgeEnabled(), []),
      ...[],
      ...(shouldShowExternalIncludesToggle
        ? [
            {
              id: "showExternalIncludesDialog",
              label: le("External CLAUDE.md includes", "External CLAUDE.md files"),
              value: externalIncludesApproved ? "true" : "false",
              type: "managedEnum",
              onChange() {},
            },
          ]
        : []),
      ...(env.ANTHROPIC_API_KEY && !isAntBuild()
        ? [
            {
              id: "apiKey",
              consentGated: !0,
              label: "Use custom API key: ",
              labelBoldSuffix: nge(env.ANTHROPIC_API_KEY),
              searchText: "Use custom API key",
              value: Boolean(
                env.ANTHROPIC_API_KEY &&
                customApiKeyResponsesOf(globalConfig).approved.includes(nge(env.ANTHROPIC_API_KEY)),
              ),
              type: "boolean",
              onChange(e) {
                (G((o) => {
                  if (!env.ANTHROPIC_API_KEY) return o;
                  let { approved: approved, rejected: rejected } = customApiKeyResponsesOf(o),
                    E = nge(env.ANTHROPIC_API_KEY),
                    filtered = approved.filter((I) => I !== E),
                    filtered_2 = rejected.filter((I) => I !== E);
                  return {
                    ...o,
                    customApiKeyResponses: e
                      ? { approved: [...filtered, E], rejected: filtered_2 }
                      : { approved: filtered, rejected: [...filtered_2, E] },
                  };
                }),
                  emitCredentialChange(),
                  setGlobalConfig(getEffectiveConfigValues()));
              },
            },
          ]
        : []),
    ];
  return {
    settings: wt() ? Ge.filter((e) => !isSessionScopedSetting(e.id)) : Ge,
    dialogFieldRows: [...we, Ne, ...Ue],
    helpers: {
      onChangeMainModelConfig: Te,
      onChangeVerbose: Oe,
      changeNotifChannel: Ce,
      changeInputNeededNotif: Ae,
      changeAgentPushNotif: Fe,
    },
  };
}
//@ chunk-snd3g4y1.js:31522-31652 placement
function modelSwitchPolicyLabel(n) {
  if (n !== void 0) return n ? Bie.switchAutomatically : Bie.askEachTime;
  return vo() ? Bie.notAskedYet : Bie.switchAutomatically;
}
//@ chunk-snd3g4y1.js:31652-31740 placement
function vo() {
  if (hasGrowthBookOverride(TENGU_JAZZY_GOBLET))
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAZZY_GOBLET, !1) === !0;
  if (!isGrowthBookEnabled()) return !1;
  return getAllGrowthBookFeatures()[TENGU_JAZZY_GOBLET] === !0;
}
//@ chunk-snd3g4y1.js:31740-31790 placement
function Ro(n) {
  return n === "rc" ? "slow" : (n ?? "latest");
}

export {
  getEffectiveConfigValues,
  remoteForwardedSettings,
  sjs,
  buildConfigRows,
  FORWARD_SETTINGS_ERRORS,
  CONFIG_SAVE_FAILED,
  notificationChannelLabel,
  NOOP_CONFIG_WRITERS,
  themeSettingRow,
};
