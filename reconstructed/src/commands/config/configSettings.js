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
  CONFIG_SOURCE_LABELS,
  getGlobalConfig,
  getExplicitRemoteControlAtStartup,
  DEFAULT_GLOBAL_CONFIG,
  saveGlobalConfig,
  NOTIFICATION_CHANNELS,
  IDE_KIND_LABELS,
  getCurrentProjectConfig,
  AUTO_CONNECT_LABELS,
  CONFIG_BACKEND_LABELS,
  customApiKeyResponsesOf,
} from "../../utils/config.js";
import { isSettingsMovedToConfig } from "../createMovedToConfigCommand.js";
import { POLICY_HELPER_ON_FAILURE } from "../../utils/settings/types.js";
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
import { isValidGlobalConfigValue, validateConfigValue } from "../../utils/config/globalConfigValidation.js";
import { isFableAvailable, modelDisplayString } from "../../utils/model/model.js";
import { LEGACY_MODEL_IDS } from "../../utils/model/modelIds.js";
import { isOpus1mUnavailable, requires1mEntitlementCheck, resolveRequestedModel } from "../model/model.js";
import { isModelAllowed, managedDenyStartupRefusal } from "../../utils/model/modelAllowlist.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { languageDisplayNames } from "../../utils/intl.js";
import { uiSignals } from "../../state/uiSignals.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { saveUserIntentSetting, resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { hasLadderForSetting } from "../../utils/model/modelUnavailability.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import {
  WireSafeControlError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import {
  hasPreModelSwitchHook,
  switchSerializerSlot,
  serializeModelSwitch,
  recordSwitchIfChanged,
} from "../../utils/model/modelSwitchHooks.js";
import {
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  sanitizeHookText,
} from "../model/modelSwitch.js";
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
import {
  isProSubscriber,
  workflowsDefaultOn,
  isWorkflowsAvailable,
  WORKFLOW_SIZE_NAMES,
  workflowSizeName,
} from "../../utils/workflows/workflowGates.js";
import {
  getRemoteControlPolicyLockReason,
  isRemoteControlHardDisabled,
  isBridgeEnabled,
} from "../../bridge/bridgeEntitlement.js";
import { getRemoteControlAtStartup, applyRemoteControlToAppState } from "../../bridge/bridgeGates.js";
import { getThinkingCannotBeDisabledMessage, isThinkingEffectivelyEnabled } from "../../utils/thinking.js";
import { isAgentsFleetEnabled } from "../../utils/fleetGates.js";
import { isFleetBackgroundAllowed } from "../../utils/backgroundHandoff.js";
import { LEFT_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { isKairosInputNeededPushEnabled } from "../../tools/PushNotificationTool/prompt.js";
import { isIdleCompactionEnabled } from "../../services/compact/compactSettings.js";
import { isAutoContinueEnabled } from "../../services/quotaAutoResume/quotaAutoResume.js";
import {
  canForwardHomeSettings,
  isSettingsToCloudEnabledCached,
  getHomeSettingsForwardingBlocker,
} from "../../services/analytics/violinGates.js";
import { isHomeSettingsForwardConsent, saveHomeSettingsMode } from "../../utils/teleport/homeSettingsMode.js";
import { neverTrue } from "../../utils/permissions/sensitivePaths.js";
import { BARE_SUBSCRIPT_NAME_BUILTINS_2 } from "../../utils/bash/ast.js";
import {
  UNATTENDED_CONSENT_LABELS,
  isUnattendedServingAccepted,
  unattendedServingForbiddenText,
  saveUnattendedServingConsent,
} from "../../services/remoteTools/unattendedServingConsent.js";
import {
  unattendedServingConsentView,
  managedSettingsForbidUnattendedServing,
} from "../../services/remoteTools/unattendedConsentStore.js";
import {
  isRefusalFallbackActive,
  SWITCH_MODELS_WHEN_FLAGGED_TEXT,
  FALLBACK_PREFERENCE_LABELS,
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
import { endBackOffFromConfigToggle } from "../../services/PromptSuggestion/backOff.js";
import {
  isProjectReadDisabled,
  setOrgMemoryRead,
  isMonorepoWriteBlocked,
  canWriteOrgMemory,
  isOrgMemoryWritesEnabledForAccount,
  applyOrgMemoryDecision,
} from "../../services/orgMemory/orgMemoryDecision.js";
import { sanitizeTimeFormat } from "../../utils/timeFormat.js";
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
import { tailOfId } from "../../utils/auth/lockHolderLiveness.js";
import { emitCredentialChange } from "../../utils/auth/credentialEpoch.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";

//@ chunk-snd3g4y1.js:2948-3032 placement
function themeSettingLabel(themeSetting) {
  return isCustomizationDisabled("themes") && Boolean(parseCustomThemeRef(themeSetting))
    ? `${themeSetting} (disabled in safe mode)`
    : themeSetting;
}
//@ chunk-snd3g4y1.js:3032-3195 placement
/**
 * /config 中的主题设置行（托管枚举，自定义主题提示用 /theme）。
 */
var themeSettingRow = (n) => ({
  id: "theme",
  label: "Theme",
  value: themeSettingLabel(n.themeSetting),
  type: "managedEnum",
  options: CONFIG_SOURCE_LABELS,
  optionsHint: "For custom themes, use /theme.",
  onChange: n.setTheme,
});
//@ chunk-snd3g4y1.js:3195-3229 placement
function configRowLabel(n, s) {
  return isSettingsMovedToConfig() ? s : n;
}
//@ chunk-snd3g4y1.js:3229-3391 placement
/**
 * 通知渠道设置值的简短显示名（bell、iterm2+bell、none）。
 */
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
var ASK_QUESTION_TIMEOUT_OPTIONS = ["never", "60s", "5m", "10m"];
var DIALOG_EXPIRY_OPTIONS = ["default", "60s", "5m", "10m", "never"];
var GENERIC_TIMEOUT_OPTIONS = ["default", ...POLICY_HELPER_ON_FAILURE];
//@ chunk-snd3g4y1.js:3487-3671 placement
/**
 * 收集需要转发给远程会话的设置值（提问超时、对话框过期、跨会话入站、模型提议目标、Artifact 开关）。
 */
function remoteForwardedSettings() {
  return {
    ...false,
    askUserQuestionTimeout: getAskUserQuestionTimeout(),
    dialogExpiry: getDialogExpiry(),
    crossSessionInbound: effectiveSettingSourceValue("crossSessionInbound")?.value,
    modelProposedGoals: getModelProposedGoalsSettingParsed(),
    enableArtifact: resolveArtifactEnableSetting().enabled,
  };
}
//@ chunk-snd3g4y1.js:3671-3723 placement
function effectiveSettingSourceValue(n) {
  return getSecuritySensitiveSettingWithSources(n).find((s) => isSettingSourceEnabled(s.source));
}
//@ chunk-snd3g4y1.js:3723-3796 placement = _temp5 (1)
function isSettingSetOutsideUserSettings(a_0) {
  let source = effectiveSettingSourceValue(a_0)?.source;
  return source !== undefined && source !== "userSettings";
}
//@ chunk-snd3g4y1.js:3796-4052 placement
function isSessionScopedSetting(id) {
  return (
    id === "model" ||
    id === "fast" ||
    id === "thinking" ||
    id === "useAutoModeDuringPlan" ||
    id === "autoCompact" ||
    id === "idleCompaction" ||
    id === "autoContinueAtUsageLimit" ||
    id === "precomputeCompactionEnabled" ||
    id === "checkpoints" ||
    id === "outputStyle" ||
    id === "defaultView"
  );
}
//@ chunk-snd3g4y1.js:4052-5114 placement
/**
 * 合并全局配置与设置，得到 /config 界面显示的各项当前值。
 */
function getEffectiveConfigValues() {
  let globalConfig = getGlobalConfig();
  let initialSettings = getInitialSettings_2();
  return {
    ...globalConfig,
    theme: initialSettings.theme ?? settingOrDefault(globalConfig, "theme"),
    editorMode: initialSettings.editorMode ?? settingOrDefault(globalConfig, "editorMode"),
    verbose: initialSettings.verbose ?? settingOrDefault(globalConfig, "verbose"),
    preferredNotifChannel:
      initialSettings.preferredNotifChannel ?? settingOrDefault(globalConfig, "preferredNotifChannel"),
    autoCompactEnabled:
      initialSettings.autoCompactEnabled ?? settingOrDefault(globalConfig, "autoCompactEnabled"),
    autoScrollEnabled:
      initialSettings.autoScrollEnabled ?? settingOrDefault(globalConfig, "autoScrollEnabled"),
    fileCheckpointingEnabled:
      initialSettings.fileCheckpointingEnabled ?? settingOrDefault(globalConfig, "fileCheckpointingEnabled"),
    showTurnDuration: initialSettings.showTurnDuration ?? settingOrDefault(globalConfig, "showTurnDuration"),
    showMessageTimestamps:
      initialSettings.showMessageTimestamps ?? settingOrDefault(globalConfig, "showMessageTimestamps"),
    terminalProgressBarEnabled:
      initialSettings.terminalProgressBarEnabled ??
      settingOrDefault(globalConfig, "terminalProgressBarEnabled"),
    todoFeatureEnabled:
      initialSettings.todoFeatureEnabled ?? settingOrDefault(globalConfig, "todoFeatureEnabled"),
    teammateMode: initialSettings.teammateMode ?? settingOrDefault(globalConfig, "teammateMode"),
    remoteControlAtStartup: getExplicitRemoteControlAtStartup(),
    autoUploadSessions:
      initialSettings.autoUploadSessions ??
      isValidGlobalConfigValue("autoUploadSessions", globalConfig.autoUploadSessions),
    inputNeededNotifEnabled:
      initialSettings.inputNeededNotifEnabled ?? settingOrDefault(globalConfig, "inputNeededNotifEnabled"),
    agentPushNotifEnabled:
      initialSettings.agentPushNotifEnabled ?? settingOrDefault(globalConfig, "agentPushNotifEnabled"),
  };
}
//@ chunk-snd3g4y1.js:5114-5156 placement
function settingOrDefault(globalConfig, s) {
  return validateConfigValue(s, globalConfig[s]) ?? DEFAULT_GLOBAL_CONFIG[s];
}
//@ chunk-snd3g4y1.js:5156-5270 placement
function selectableModelOptions() {
  let n = isFableAvailable();
  return [
    "default",
    ...LEGACY_MODEL_IDS.filter(
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
    let lower = trimmed.toLowerCase();
    let u = COUNTRY_TO_LANGUAGE.get(lower) ?? lower;
    try {
      let p = languageDisplayNames().of(u);
      if (p && p !== u) return p;
    } catch {}
  }
  return trimmed
    .split(/\s+/)
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase())
    .join(" ");
}
//@ chunk-snd3g4y1.js:5623-5751 placement
/**
 * 空操作函数及全部为空操作的配置写入器（只读场景使用）。
 */
var noop = () => {};
var NOOP_CONFIG_WRITERS = {
  setGlobalConfig: noop,
  setSettingsData: noop,
  setPlanAutoModeOffAtLaunch: noop,
  changeLog: {
    record: noop,
    clear: noop,
    toggle: noop,
  },
};
//@ chunk-snd3g4y1.js:5751-5829 placement
function orgMemoryWritesRowSeen(n) {
  uiSignals.orgMemoryWritesRowSeen ||= n;
  return uiSignals.orgMemoryWritesRowSeen;
}
//@ chunk-snd3g4y1.js:5829-5903 placement
function orgMemoryReadRowSeen(n) {
  uiSignals.orgMemoryReadRowSeen ||= n;
  return uiSignals.orgMemoryReadRowSeen;
}
//@ chunk-snd3g4y1.js:5903-5987 placement
function remoteHomeSettingsRowSeen(n) {
  uiSignals.remoteHomeSettingsRowSeen ||= n;
  return uiSignals.remoteHomeSettingsRowSeen;
}
//@ chunk-snd3g4y1.js:5987-6011 placement
/**
 * 恒返回 false 的占位判断（config 设置页的一个构建期开关）。
 */
function alwaysFalse() {
  return false;
}
//@ chunk-snd3g4y1.js:6011-6302 placement
/**
 * 转发设置到云会话失败的提示（版本不支持 / 未对用户开启），以及保存配置文件失败的提示。
 */
var FORWARD_SETTINGS_ERRORS = {
  unsupported:
    "Could not turn this on: forwarding settings to cloud sessions is not available in this version",
  flag_off: "Could not turn this on: forwarding settings to cloud sessions is not enabled for you right now",
};
var CONFIG_SAVE_FAILED = "Could not save this to the config file, so nothing changed.";
//@ chunk-snd3g4y1.js:6302-31522 placement
/**
 * 构建 /config 界面的全部设置行（主题、编辑模式、模型、通知、自动更新等）及其读写处理。
 */
function buildConfigRows(shorthandRows) {
  let {
    globalConfig,
    settingsData,
    themeSetting,
    currentOutputStyle,
    currentLanguage,
    externalIncludesApproved,
    thinkingEnabled,
    verbose,
    mainLoopModel,
    currentModel,
    isFastMode,
    promptSuggestionEnabled,
    awaySummaryEnabled,
    showDefaultViewPicker,
    pushTogglesVisible,
    crossSessionInboxRowVisible,
    isConnectedToIde,
    inAppSelection,
    tabsStandIn,
    isFileCheckpointingAvailable,
    workflowsToggleable,
    workflowSizeGuidelineToggleable,
    autoContinueAtUsageLimitToggleable,
    artifactToggleable,
    remoteToolServingOn,
    launchDirectoryKeys,
    shouldShowExternalIncludesToggle,
    autoUpdaterDisabledReason,
    modelSwitchHooks,
    setAppState,
    setTheme,
    setGlobalConfig,
    setSettingsData,
    setPlanAutoModeOffAtLaunch,
    changeLog,
    storageV5,
    promptSuggestionRun,
    mayBeAuthoredByNonOwner,
  } = shorthandRows;
  function x(e) {
    return isStorageV5Enabled() && storageV5 !== undefined
      ? updateSettingsForSource("userSettings", e, undefined, storageV5)
      : updateSettingsForSource("userSettings", e);
  }
  function pe(e) {
    return isStorageV5Enabled() && storageV5 !== undefined
      ? updateSettingsForSource("localSettings", e, undefined, storageV5)
      : updateSettingsForSource("localSettings", e);
  }
  function j(e, o) {
    if (isStorageV5Enabled() && storageV5 !== undefined) saveUserIntentSetting(e, o, storageV5);
    else saveUserIntentSetting(e, o);
  }
  function G(e) {
    if (isStorageV5Enabled() && storageV5 !== undefined) saveGlobalConfig(e, storageV5);
    else saveGlobalConfig(e);
  }
  async function Te(e, o) {
    logEvent("tengu_config_model_changed", {
      from_model: telemetrySafeModelName(mainLoopModel),
      to_model: telemetrySafeModelName(e),
    });
    let h = hasLadderForSetting(e);
    let E = e === null ? managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch") : null;
    if (E !== null)
      return {
        error: new WireSafeControlError(E, "default model blocked by managed settings"),
      };
    let M = "";
    if (modelSwitchHooks) {
      let { session, readState } = modelSwitchHooks;
      if (hasPreModelSwitchHook(session) || switchSerializerSlot.of(session).pending > 0) {
        let mo = ++modelSwitchHooks.latestPick.current;
        let ae = await serializeModelSwitch(session, () =>
          runPreModelSwitchHooks(session, readState, e, "command"),
        );
        if (mo !== modelSwitchHooks.latestPick.current) return;
        if (ae.decision !== "proceed") {
          logFeatureSad("model_switch", "blocked_by_hook");
          return {
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
          };
        }
        if (ae.messages.length > 0) M = ` \xB7 ${ae.messages.map(sanitizeHookText).join(" \xB7 ")}`;
      }
      recordSwitchIfChanged(session, readState(), e, "command");
    }
    if (o !== undefined) persistEffortSetting(o, resolveRequestedModel(e), undefined, storageV5);
    clearRefusalFallbackModelLatch();
    if (isFastModeEnabled()) clearFastModeCooldown();
    let P = false;
    let I = false;
    setAppState((Z) => {
      P = !!Z.fastMode;
      I = isFastModeEnabled() ? isFastModeActive(e, Z.fastMode) : P;
      return {
        ...Z,
        mainLoopModel: e,
        mainLoopModelForSession: null,
        ...(o !== undefined && {
          sessionEffort: levelEffortSetting(o),
        }),
        ...(I !== P && {
          fastMode: I,
        }),
      };
    });
    reportFastModeToggle(P, I);
    let X = formatFastModeSuffix(P, I, e);
    changeLog.record(
      "model",
      modelDisplayString(e) + X + M + (h ? " \xB7 this session only \u2014 /model to set up" : ""),
      {
        moveToEnd: true,
      },
    );
    let ye = h
      ? undefined
      : await x({
          model: e ?? undefined,
        });
    let re = X + M;
    if (ye?.error)
      return {
        error: ye.error,
        ...(re && {
          messageSuffix: re,
        }),
      };
    if (re)
      return {
        messageSuffix: re,
      };
  }
  function Oe(e) {
    j("verbose", e);
    setGlobalConfig((o) => ({
      ...o,
      verbose: e,
    }));
    setAppState((o) => ({
      ...o,
      verbose: e,
    }));
    changeLog.toggle("verbose", e);
  }
  function Ce(e) {
    j("preferredNotifChannel", e);
    setGlobalConfig((o) => ({
      ...o,
      preferredNotifChannel: e,
    }));
  }
  function Ae(e) {
    j("inputNeededNotifEnabled", e);
    setGlobalConfig((o) => ({
      ...o,
      inputNeededNotifEnabled: e,
    }));
    pushNotificationPreferences();
    logEvent("tengu_push_notif_pref_changed", {
      key: lit("inputNeededNotifEnabled"),
      value: e,
    });
  }
  function Fe(e) {
    j("agentPushNotifEnabled", e);
    setGlobalConfig((o) => ({
      ...o,
      agentPushNotifEnabled: e,
    }));
    pushNotificationPreferences();
    logEvent("tengu_push_notif_pref_changed", {
      key: lit("agentPushNotifEnabled"),
      value: e,
    });
  }
  let workflowSize = resolveWorkflowSize(globalConfig.workflowSizeGuideline, isProSubscriber());
  function Le(e) {
    if (e !== "false") {
      let remoteControlPolicyLockReason = getRemoteControlPolicyLockReason();
      if (remoteControlPolicyLockReason !== null)
        return {
          error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            remoteControlPolicyLockReason,
            "Remote Control setting locked by org policy",
          ),
        };
    }
    if (e === "default") {
      j("remoteControlAtStartup", undefined);
      G((l) => {
        if (l.remoteControlAtStartup === undefined) return l;
        let h = {
          ...l,
        };
        delete h.remoteControlAtStartup;
        return h;
      });
      setGlobalConfig((l) => ({
        ...l,
        remoteControlAtStartup: undefined,
      }));
    } else {
      let l = e === "true";
      j("remoteControlAtStartup", l);
      setGlobalConfig((h) => ({
        ...h,
        remoteControlAtStartup: l,
      }));
    }
    let remoteControlAtStartup = getRemoteControlAtStartup();
    setAppState((l) => applyRemoteControlToAppState(l, remoteControlAtStartup));
    return;
  }
  function co() {
    let remoteControlPolicyLockReason = getRemoteControlPolicyLockReason();
    if (remoteControlPolicyLockReason !== null)
      return {
        id: "remoteControl",
        label: "Enable Remote Control for all sessions",
        value: "disabled",
        lock: {
          reason: remoteControlPolicyLockReason,
          source: isRemoteControlHardDisabled() ? "managed" : "policy",
          writableWhileLocked: ["false"],
        },
        options: ["true", "false", "default"],
        type: "managedEnum",
        onChange(o) {
          if (o !== "false")
            return {
              error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                remoteControlPolicyLockReason,
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
        globalConfig.remoteControlAtStartup === undefined
          ? "default"
          : String(globalConfig.remoteControlAtStartup),
      options: ["true", "false", "default"],
      type: "enum",
      onChange: Le,
    };
  }
  let requestedModel = resolveRequestedModel(currentModel);
  let thinkingCannotBeDisabledMessage = getThinkingCannotBeDisabledMessage(requestedModel);
  let we = [
    ...(isAgentsFleetEnabled()
      ? [
          {
            id: "defaultToAgentsView",
            label: "Open agents view by default",
            value: globalConfig.defaultToAgentsView ?? false,
            type: "boolean",
            onChange(defaultToAgentsView) {
              G((o) => ({
                ...o,
                defaultToAgentsView,
              }));
              setGlobalConfig((o) => ({
                ...o,
                defaultToAgentsView,
              }));
            },
          },
        ]
      : []),
    ...(isFleetBackgroundAllowed()
      ? [
          {
            id: "leftArrowOpensAgents",
            label: `${LEFT_ARROW} opens agents`,
            value: globalConfig.leftArrowOpensAgents ?? true,
            type: "boolean",
            onChange(leftArrowOpensAgents) {
              G((o) => ({
                ...o,
                leftArrowOpensAgents,
              }));
              setGlobalConfig((o) => ({
                ...o,
                leftArrowOpensAgents,
              }));
            },
          },
        ]
      : []),
  ];
  let go = tabsStandIn ? we.filter((e) => e.id !== "leftArrowOpensAgents") : we;
  let Ne = {
    id: "notifChannel",
    label: "Local notifications",
    value: globalConfig.preferredNotifChannel,
    options: [...NOTIFICATION_CHANNELS],
    type: "enum",
    onChange: Ce,
  };
  let Ue = pushTogglesVisible
    ? [
        ...(isKairosInputNeededPushEnabled()
          ? [
              {
                id: "inputNeededNotifEnabled",
                label: "Push when actions required",
                value: globalConfig.inputNeededNotifEnabled ?? false,
                type: "boolean",
                onChange: Ae,
              },
            ]
          : []),
        {
          id: "agentPushNotifEnabled",
          label: "Push when Claude decides",
          value: globalConfig.agentPushNotifEnabled ?? false,
          type: "boolean",
          onChange: Fe,
        },
      ]
    : [];
  let source = resolveSetting("idleCompaction", true).source;
  let po = source === "userSettings" || (source === "default" && isSettingSourceEnabled("userSettings"));
  let Ge = [
    {
      id: "autoCompact",
      label: "Auto-compact",
      value: globalConfig.autoCompactEnabled,
      type: "boolean",
      onChange(e) {
        j("autoCompactEnabled", e);
        setGlobalConfig((o) => ({
          ...o,
          autoCompactEnabled: e,
        }));
        logEvent("tengu_auto_compact_setting_changed", {
          enabled: e,
        });
      },
    },
    ...(po
      ? [
          {
            id: "idleCompaction",
            label: "Idle compaction",
            value: settingsData?.idleCompaction ?? true,
            type: "boolean",
            async onChange(e) {
              setSettingsData((l) => ({
                ...l,
                idleCompaction: e,
              }));
              let o = await x({
                idleCompaction: e,
              });
              if (o?.error) {
                let idleCompaction = isIdleCompactionEnabled();
                setSettingsData((h) => ({
                  ...h,
                  idleCompaction,
                }));
                return {
                  error: o.error,
                };
              }
              logEvent("tengu_idle_compaction_setting_changed", {
                enabled: e,
              });
              changeLog.toggle("idleCompaction", e);
            },
          },
        ]
      : []),
    ...(autoContinueAtUsageLimitToggleable
      ? [
          {
            id: "autoContinueAtUsageLimit",
            label: "Continue automatically at usage limit",
            value: settingsData?.autoContinueAtUsageLimit ?? true,
            type: "boolean",
            consentGated: true,
            async onChange(e) {
              setSettingsData((l) => ({
                ...l,
                autoContinueAtUsageLimit: e,
              }));
              let o = await x({
                autoContinueAtUsageLimit: e,
              });
              if (o?.error) {
                let autoContinueAtUsageLimit = isAutoContinueEnabled();
                setSettingsData((h) => ({
                  ...h,
                  autoContinueAtUsageLimit,
                }));
                return {
                  error: o.error,
                };
              }
              logEvent("tengu_quota_auto_resume_setting_changed", {
                enabled: e,
              });
            },
          },
        ]
      : []),
    ...(remoteHomeSettingsRowSeen(
      canForwardHomeSettings(isSettingsToCloudEnabledCached()) ||
        globalConfig.remoteHomeSettingsMode === "forward",
    )
      ? [
          {
            id: "remoteHomeSettings",
            label: "Use this machine's settings in cloud sessions",
            value:
              globalConfig.remoteHomeSettingsMode === "forward" &&
              isHomeSettingsForwardConsent() &&
              (isSettingsToCloudEnabledCached() || !neverTrue()),
            isDefaultValue: !IDE_KIND_LABELS.some((e) => e === globalConfig.remoteHomeSettingsMode),
            consentGated: true,
            canWithdraw: () => neverTrue() && globalConfig.remoteHomeSettingsMode !== "keep_local",
            grantBlocker: getHomeSettingsForwardingBlocker(true) ?? undefined,
            type: "boolean",
            onChange(e) {
              if (e)
                return {
                  error: new WireSafeControlError(
                    "Turn this on from the /config panel, which shows what will be sent",
                  ),
                };
              let mode = "keep_local";
              let remoteHomeSettingsMode = globalConfig.remoteHomeSettingsMode;
              setGlobalConfig((h) => ({
                ...h,
                remoteHomeSettingsMode: mode,
              }));
              return saveHomeSettingsMode(mode, isStorageV5Enabled() ? storageV5 : undefined).then((h) => {
                switch (h) {
                  case "written":
                    return;
                  case "unconfirmed":
                    return {
                      messageSuffix:
                        " (could not confirm it was written to the config file; check /config after restarting Claude Code)",
                    };
                  case "not_stored":
                    setGlobalConfig((E) => ({
                      ...E,
                      remoteHomeSettingsMode: getGlobalConfig().remoteHomeSettingsMode,
                    }));
                    return {
                      error: new WireSafeControlError(CONFIG_SAVE_FAILED),
                    };
                  case "refused":
                    setGlobalConfig((E) => ({
                      ...E,
                      remoteHomeSettingsMode,
                    }));
                    return {
                      error: new WireSafeControlError(
                        "Cloud settings forwarding is not available right now; nothing was changed",
                      ),
                    };
                }
              });
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
            pickToCommit: true,
            consentGated: true,
            canWithdraw: isUnattendedServingAccepted,
            ...(managedSettingsForbidUnattendedServing() && {
              lock: {
                reason: unattendedServingForbiddenText(),
                source: "managed",
                writableWhileLocked: [UNATTENDED_CONSENT_LABELS.declined],
              },
            }),
            onChange(e) {
              return saveUnattendedServingConsent(
                e === UNATTENDED_CONSENT_LABELS.accepted ? "accepted" : "declined",
              ).then((o) => {
                if (o === "forbidden")
                  return {
                    error: new WireSafeControlError(unattendedServingForbiddenText()),
                  };
                setGlobalConfig((l) => ({
                  ...l,
                }));
                if (o === "not_saved")
                  return {
                    error: new WireSafeControlError("The answer could not be saved; nothing was changed"),
                  };
                return;
              });
            },
          },
        ]
      : []),
    ...(isRefusalFallbackActive()
      ? [
          {
            id: "switchModelsOnFlag",
            label: SWITCH_MODELS_WHEN_FLAGGED_TEXT,
            value: modelSwitchPolicyLabel(settingsData?.switchModelsOnFlag),
            options: [FALLBACK_PREFERENCE_LABELS.switchAutomatically, FALLBACK_PREFERENCE_LABELS.askEachTime],
            type: "enum",
            pickToCommit: true,
            coerce(e) {
              let lower = e.trim().toLowerCase();
              if (
                ["true", "1", "on", "yes"].includes(lower) ||
                lower === FALLBACK_PREFERENCE_LABELS.switchAutomatically.toLowerCase()
              )
                return FALLBACK_PREFERENCE_LABELS.switchAutomatically;
              if (
                ["false", "0", "off", "no"].includes(lower) ||
                lower === FALLBACK_PREFERENCE_LABELS.askEachTime.toLowerCase()
              )
                return FALLBACK_PREFERENCE_LABELS.askEachTime;
              return;
            },
            onChange(e) {
              let o = e === FALLBACK_PREFERENCE_LABELS.switchAutomatically;
              setSettingsData((l) => ({
                ...l,
                switchModelsOnFlag: o,
              }));
              return setSwitchModelsOnFlag(o, "config", isStorageV5Enabled() ? storageV5 : undefined).then(
                ({ error }) =>
                  error
                    ? {
                        error,
                      }
                    : undefined,
              );
            },
          },
        ]
      : []),
    ...[],
    {
      id: "tips",
      label: "Show tips",
      value: settingsData?.spinnerTipsEnabled ?? true,
      type: "boolean",
      onChange(e) {
        pe({
          spinnerTipsEnabled: e,
        });
        setSettingsData((o) => ({
          ...o,
          spinnerTipsEnabled: e,
        }));
        logEvent("tengu_tips_setting_changed", {
          enabled: e,
        });
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
              setFeedbackDraftsSetting(o, {
                storageV5,
                via: "config",
              });
              setSettingsData((l) => ({
                ...l,
                feedbackDrafts: o,
              }));
            },
          },
        ]
      : []),
    {
      id: "reduceMotion",
      label: "Reduce motion",
      value: settingsData?.prefersReducedMotion ?? false,
      type: "boolean",
      onChange(e) {
        pe({
          prefersReducedMotion: e,
        });
        setSettingsData((o) => ({
          ...o,
          prefersReducedMotion: e,
        }));
        setAppState((o) => ({
          ...o,
          settings: {
            ...o.settings,
            prefersReducedMotion: e,
          },
        }));
        logEvent("tengu_reduce_motion_setting_changed", {
          enabled: e,
        });
      },
    },
    {
      id: "thinking",
      label: "Thinking mode",
      value: isThinkingEffectivelyEnabled(requestedModel, thinkingEnabled),
      type: "boolean",
      ...(thinkingCannotBeDisabledMessage !== undefined && {
        lock: {
          reason: thinkingCannotBeDisabledMessage,
          source: "managed",
          reasonShipsOffBox: true,
          writableWhileLocked: ["true", "1", "on", "yes"],
        },
      }),
      onChange(e) {
        if (!e && thinkingCannotBeDisabledMessage !== undefined)
          return {
            error: new WireSafeControlError(
              thinkingCannotBeDisabledMessage,
              "Thinking can't be turned off for this model",
            ),
          };
        setAppState((o) => ({
          ...o,
          thinkingEnabled: e,
        }));
        x({
          alwaysThinkingEnabled: e ? undefined : false,
        });
        logEvent("tengu_thinking_toggled", {
          enabled: e,
        });
        logFeatureOk("thinking_toggle");
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
              let o = (fastModeSwitchModel, h, E) => {
                if (h) {
                  let P = false;
                  setAppState((I) => {
                    let fastModeSwitchModel_2 = getFastModeSwitchModel(I);
                    P = fastModeSwitchModel_2 !== undefined && fastModeSwitchModel_2 !== fastModeSwitchModel;
                    return I;
                  });
                  if (P)
                    return {
                      error: new WireSafeControlError(
                        "Fast mode was not enabled: the model changed while PreModelSwitch hooks ran; try again",
                        "fast mode promotion stale after hooks",
                      ),
                    };
                }
                clearFastModeCooldown();
                x({
                  fastMode: true,
                });
                let M;
                setAppState((P) => {
                  let fastModeSwitchModel_2 = getFastModeSwitchModel(P);
                  let X =
                    fastModeSwitchModel_2 !== undefined &&
                    (!h || fastModeSwitchModel_2 === fastModeSwitchModel);
                  if (X && modelSwitchHooks)
                    recordSwitchIfChanged(modelSwitchHooks.session, P, fastModeSwitchModel_2, "command");
                  M = X ? fastModeSwitchModel_2 : undefined;
                  return {
                    ...P,
                    ...(X && {
                      mainLoopModel: fastModeSwitchModel_2,
                      mainLoopModelForSession: null,
                    }),
                    fastMode: true,
                  };
                });
                if (M !== undefined) changeLog.record("model", M ?? defaultOpusAlias());
                changeLog.record("Fast mode", "ON");
                return E
                  ? {
                      messageSuffix: E,
                    }
                  : undefined;
              };
              if (
                e &&
                modelSwitchHooks &&
                (hasPreModelSwitchHook(modelSwitchHooks.session) ||
                  switchSerializerSlot.of(modelSwitchHooks.session).pending > 0)
              ) {
                let { session, readState } = modelSwitchHooks;
                let E = ++modelSwitchHooks.latestFastPick.current;
                return serializeModelSwitch(session, async () => {
                  let fastModeSwitchModel = getFastModeSwitchModel(readState());
                  if (fastModeSwitchModel === undefined || !hasPreModelSwitchHook(session)) {
                    if (E !== modelSwitchHooks.latestFastPick.current) return;
                    return o(undefined, false, "");
                  }
                  let P = await runPreModelSwitchHooks(session, readState, fastModeSwitchModel, "command");
                  if (E !== modelSwitchHooks.latestFastPick.current) return;
                  if (P.decision !== "proceed") {
                    logFeatureSad("model_switch", "blocked_by_hook");
                    return {
                      error: new WireSafeControlError(
                        preModelSwitchBlockedMessage(
                          fastModeSwitchModel,
                          P.decision === "ask"
                            ? `${P.reason ?? "confirmation required"} (run /model to switch, then enable fast mode)`
                            : P.reason,
                          P.messages,
                        ),
                        "model switch blocked by a PreModelSwitch hook",
                      ),
                    };
                  }
                  return o(
                    fastModeSwitchModel,
                    true,
                    P.messages.length > 0 ? ` \xB7 ${P.messages.map(sanitizeHookText).join(" \xB7 ")}` : "",
                  );
                });
              }
              if (e) return o(undefined, false, "");
              else {
                let l = () => {
                  clearFastModeCooldown();
                  x({
                    fastMode: undefined,
                  });
                  setAppState((h) => ({
                    ...h,
                    fastMode: false,
                  }));
                  changeLog.record("Fast mode", "OFF");
                };
                if (modelSwitchHooks && switchSerializerSlot.of(modelSwitchHooks.session).pending > 0)
                  await serializeModelSwitch(modelSwitchHooks.session, async () => l());
                else l();
              }
            },
          },
        ]
      : []),
    ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_inflection", false)
      ? [
          {
            id: "promptSuggestionEnabled",
            label: "Prompt suggestions",
            value: promptSuggestionEnabled,
            type: "boolean",
            onChange(e) {
              setAppState((o) => ({
                ...o,
                promptSuggestionEnabled: e,
              }));
              x({
                promptSuggestionEnabled: e ? undefined : false,
              });
              if (e && !promptSuggestionEnabled)
                endBackOffFromConfigToggle(isStorageV5Enabled() ? storageV5 : undefined, promptSuggestionRun);
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
        setAppState((o) => ({
          ...o,
          awaySummaryEnabled: e,
        }));
        x({
          awaySummaryEnabled: e ? undefined : false,
        });
        setSettingsData((o) => ({
          ...o,
          awaySummaryEnabled: e ? undefined : false,
        }));
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
              j("fileCheckpointingEnabled", e);
              setGlobalConfig((o) => ({
                ...o,
                fileCheckpointingEnabled: e,
              }));
              logEvent("tengu_file_history_snapshots_setting_changed", {
                enabled: e,
              });
            },
          },
        ]
      : []),
    ...(orgMemoryReadRowSeen(isProjectReadDisabled())
      ? [
          {
            id: "orgMemoryRead",
            label: "Synced project memory (this directory; applies next session)",
            value: getCurrentProjectConfig().orgMemoryRead ?? true,
            type: "boolean",
            onChange(e) {
              setOrgMemoryRead(e, storageV5);
              setGlobalConfig((o) => ({
                ...o,
              }));
            },
          },
        ]
      : []),
    ...(orgMemoryWritesRowSeen(
      !isMonorepoWriteBlocked() &&
        (canWriteOrgMemory() || getCurrentProjectConfig().orgMemoryWrites === true),
    )
      ? [
          {
            id: "orgMemoryWrites",
            label:
              getCurrentProjectConfig().orgMemoryRead === false
                ? "Synced project memory writes (enable reads first)"
                : "Synced project memory writes (this directory; applies next session)",
            value: isOrgMemoryWritesEnabledForAccount(),
            canWithdraw: () => getCurrentProjectConfig().orgMemoryWrites === true,
            type: "boolean",
            consentGated: true,
            onChange(e) {
              let o =
                e &&
                !isOrgMemoryWritesEnabledForAccount() &&
                getCurrentProjectConfig().orgMemoryWrites === true;
              applyOrgMemoryDecision(o ? false : e, storageV5);
              setGlobalConfig((l) => ({
                ...l,
              }));
            },
          },
        ]
      : []),
    ...(workflowsToggleable
      ? [
          {
            id: "workflows",
            label: "Dynamic workflows",
            value:
              settingsData?.disableWorkflows === true
                ? false
                : (settingsData?.enableWorkflows ?? workflowsDefaultOn()),
            type: "boolean",
            onChange(e) {
              let enableWorkflows = e === workflowsDefaultOn() ? undefined : e;
              x({
                enableWorkflows,
                disableWorkflows: undefined,
              });
              setSettingsData((l) => ({
                ...l,
                enableWorkflows,
                disableWorkflows: undefined,
              }));
              changeLog.record("workflows", e ? "on" : "off");
            },
          },
          {
            id: "workflowKeywordTriggerEnabled",
            label: "Ultracode keyword trigger",
            value: settingsData?.workflowKeywordTriggerEnabled ?? true,
            type: "boolean",
            onChange(e) {
              let workflowKeywordTriggerEnabled = e ? undefined : false;
              x({
                workflowKeywordTriggerEnabled,
              });
              setSettingsData((l) => ({
                ...l,
                workflowKeywordTriggerEnabled,
              }));
              changeLog.record("ultracodeKeywordTrigger", e ? "on" : "off");
            },
          },
        ]
      : []),
    ...(workflowSizeGuidelineToggleable && (workflowsToggleable || isWorkflowsAvailable())
      ? [
          {
            id: "workflowSizeGuideline",
            label: "Dynamic workflow size",
            value: workflowSize.size,
            isDefaultValue: workflowSize.isDefault,
            options: [...WORKFLOW_SIZE_NAMES],
            type: "enum",
            onChange(e) {
              let o = workflowSizeName(e) ?? "unrestricted";
              G((l) => {
                if (l.workflowSizeGuideline === o) return l;
                return {
                  ...l,
                  workflowSizeGuideline: o,
                };
              });
              setGlobalConfig((l) => ({
                ...l,
                workflowSizeGuideline: o,
              }));
              changeLog.record("workflowSizeGuideline", o);
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
              let enableArtifact = e === getArtifactDefaultOn() ? undefined : e;
              setSettingsData((h) => ({
                ...h,
                enableArtifact: e,
              }));
              let l = await x({
                enableArtifact,
                disableArtifact: undefined,
              });
              if (l?.error) {
                setSettingsData((h) => ({
                  ...h,
                  enableArtifact: resolveArtifactEnableSetting().enabled,
                }));
                return {
                  error: l.error,
                };
              }
              changeLog.record("artifacts", e ? "on" : "off");
            },
          },
        ]
      : []),
    {
      id: "verbose",
      label: configRowLabel("Verbose output", "Verbose"),
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
        j("terminalProgressBarEnabled", e);
        setGlobalConfig((o) => ({
          ...o,
          terminalProgressBarEnabled: e,
        }));
        logEvent("tengu_terminal_progress_bar_setting_changed", {
          enabled: e,
        });
      },
    },
    ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_terminal_sidebar", false)
      ? [
          {
            id: "showStatusInTerminalTab",
            label: "Show status in terminal tab",
            value: globalConfig.showStatusInTerminalTab ?? false,
            type: "boolean",
            onChange(e) {
              G((o) => ({
                ...o,
                showStatusInTerminalTab: e,
              }));
              setGlobalConfig((o) => ({
                ...o,
                showStatusInTerminalTab: e,
              }));
              logEvent("tengu_terminal_tab_status_setting_changed", {
                enabled: e,
              });
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
        j("showTurnDuration", e);
        setGlobalConfig((o) => ({
          ...o,
          showTurnDuration: e,
        }));
        logEvent("tengu_show_turn_duration_setting_changed", {
          enabled: e,
        });
      },
    },
    ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_sepia_moth", false)
      ? [
          {
            id: "precomputeCompactionEnabled",
            label: "Precompute compaction",
            value: settingsData?.precomputeCompactionEnabled ?? true,
            type: "boolean",
            onChange(e) {
              x({
                precomputeCompactionEnabled: e,
              });
              setSettingsData((o) => ({
                ...o,
                precomputeCompactionEnabled: e,
              }));
              logEvent("tengu_precompute_compaction_setting_changed", {
                enabled: e,
              });
            },
          },
        ]
      : []),
    ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_silk_hinge", false)
      ? [
          {
            id: "timestamps",
            label: "Show message timestamps",
            value: globalConfig.showMessageTimestamps,
            type: "boolean",
            onChange(e) {
              j("showMessageTimestamps", e);
              setGlobalConfig((o) => ({
                ...o,
                showMessageTimestamps: e,
              }));
              setAppState((o) => ({
                ...o,
                showMessageTimestamps: e,
              }));
              logEvent("tengu_show_message_timestamps_setting_changed", {
                enabled: e,
              });
            },
          },
        ]
      : []),
    {
      id: "timeFormat",
      label: "Time format",
      value: sanitizeTimeFormat(settingsData?.timeFormat ?? "auto"),
      options: [...AUTO_CONNECT_LABELS],
      type: "enum",
      pickToCommit: true,
      onChange(e) {
        let found = AUTO_CONNECT_LABELS.find((l) => l === e);
        if (!found) return;
        x({
          timeFormat: found,
        });
        setSettingsData((l) => ({
          ...l,
          timeFormat: found,
        }));
        changeLog.record("timeFormat", found);
        logEvent("tengu_time_format_setting_changed", {
          value: fromEnum(found),
        });
      },
    },
    {
      id: "permissionMode",
      label: "Default permission mode",
      value: settingsData?.permissions?.defaultMode || "default",
      options: (() => {
        let e = ["default", "plan"];
        let o = PERMISSION_MODES;
        let l = ["bypassPermissions"];
        return [...e, ...o.filter((h) => !e.includes(h) && !l.includes(h))];
      })(),
      type: "enum",
      async onChange(e) {
        let o = permissionModeFromString(e);
        let defaultMode = isExternalPermissionMode(o) ? toExternalPermissionMode(o) : o;
        let defaultMode_2 = settingsData?.permissions?.defaultMode;
        setSettingsData((M) => ({
          ...M,
          permissions: {
            ...M?.permissions,
            defaultMode,
          },
        }));
        changeLog.record("permissionMode", e);
        let E = await x({
          permissions: {
            defaultMode,
          },
        });
        if (E.error) {
          setSettingsData((M) => ({
            ...M,
            permissions: {
              ...M?.permissions,
              defaultMode: defaultMode_2,
            },
          }));
          changeLog.clear("permissionMode");
          logForDebugging(`Failed to update default permission mode setting: ${E.error.message}`, {
            level: "error",
          });
          return {
            error: E.error,
          };
        }
      },
    },
    {
      id: "worktreeBaseRef",
      label: "Worktree base ref",
      value: settingsData?.worktree?.baseRef ?? "fresh",
      options: ["fresh", "head"],
      type: "enum",
      async onChange(e) {
        let o = e;
        let baseRef = settingsData?.worktree?.baseRef;
        setSettingsData((E) => ({
          ...E,
          worktree: {
            ...E?.worktree,
            baseRef: o,
          },
        }));
        changeLog.record("worktreeBaseRef", o);
        let h = await x({
          worktree: {
            baseRef: o,
          },
        });
        if (h.error) {
          setSettingsData((E) => ({
            ...E,
            worktree: {
              ...E?.worktree,
              baseRef,
            },
          }));
          changeLog.clear("worktreeBaseRef");
          logForDebugging(`Failed to update worktree.baseRef in user settings: ${h.error.message}`, {
            level: "error",
          });
          return {
            error: h.error,
          };
        }
      },
    },
    {
      id: "useAutoModeDuringPlan",
      label: "Use auto mode during plan",
      value: settingsData?.useAutoModeDuringPlan ?? true,
      type: "boolean",
      async onChange(e) {
        setSettingsData((l) => ({
          ...l,
          useAutoModeDuringPlan: e,
        }));
        changeLog.record("Use auto mode during plan", e);
        let { error } = await x({
          useAutoModeDuringPlan: e,
        });
        if (error)
          return {
            error,
          };
        setPlanAutoModeOffAtLaunch(!e);
        setAppState((l) => {
          let h = transitionPlanAutoMode(l.toolPermissionContext);
          if (h === l.toolPermissionContext) return l;
          return {
            ...l,
            toolPermissionContext: h,
          };
        });
      },
    },
    {
      id: "gitignore",
      label: "Respect .gitignore in file picker",
      value: globalConfig.respectGitignore ?? DEFAULT_GLOBAL_CONFIG.respectGitignore,
      type: "boolean",
      onChange(e) {
        G((o) => ({
          ...o,
          respectGitignore: e,
        }));
        setGlobalConfig((o) => ({
          ...o,
          respectGitignore: e,
        }));
        logEvent("tengu_respect_gitignore_setting_changed", {
          enabled: e,
        });
      },
    },
    {
      id: "copyFullResponse",
      label: "Skip the /copy picker",
      value: globalConfig.copyFullResponse ?? DEFAULT_GLOBAL_CONFIG.copyFullResponse,
      type: "boolean",
      onChange(copyFullResponse) {
        G((o) => ({
          ...o,
          copyFullResponse,
        }));
        setGlobalConfig((o) => ({
          ...o,
          copyFullResponse,
        }));
      },
    },
    ...(inAppSelection
      ? [
          {
            id: "copyOnSelect",
            label: "Copy on select",
            value: globalConfig.copyOnSelect ?? true,
            type: "boolean",
            onChange(copyOnSelect) {
              G((o) => ({
                ...o,
                copyOnSelect,
              }));
              setGlobalConfig((o) => ({
                ...o,
                copyOnSelect,
              }));
            },
          },
          {
            id: "autoScroll",
            label: configRowLabel("Auto-scroll", "Auto-scroll output"),
            value: globalConfig.autoScrollEnabled,
            type: "boolean",
            onChange(e) {
              j("autoScrollEnabled", e);
              setGlobalConfig((o) => ({
                ...o,
                autoScrollEnabled: e,
              }));
            },
          },
        ]
      : []),
    ...(isSettingsMovedToConfig() && !tabsStandIn
      ? isAgentsFleetEnabled() || isFleetBackgroundAllowed()
        ? [
            {
              id: "agentsView",
              label: "Agents view",
              value:
                (isFleetBackgroundAllowed() && (globalConfig.leftArrowOpensAgents ?? true)) ||
                (isAgentsFleetEnabled() && (globalConfig.defaultToAgentsView ?? false))
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
          value: updateChannelLabel(settingsData?.autoUpdatesChannel),
          type: "managedEnum",
          onChange() {},
        },
    themeSettingRow({
      themeSetting,
      setTheme,
    }),
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
          let allOutputStyles = await getAllOutputStylesCached(getCwd(), storageV5);
          if (!isBuiltInOrDefaultStyle(allOutputStyles[e]))
            return {
              error: new WireSafeControlError(CUSTOM_STYLE_REMOTE_DENIED_MESSAGE),
            };
        }
        if (e === currentOutputStyle)
          return {
            messageSuffix: " (already the current style)",
          };
        if (!isSettingSourceEnabled("localSettings"))
          return {
            error: new WireSafeControlError(STYLE_SAVE_UNAVAILABLE_MESSAGE),
          };
        setSettingsData((l) => ({
          ...l,
          outputStyle: e,
        }));
        let o = await pe({
          outputStyle: e,
        });
        if (o?.error)
          return {
            error: o.error,
          };
        noteSystemPromptSectionInvalidation("output_style");
      },
    },
    ...(showDefaultViewPicker
      ? [
          {
            id: "defaultView",
            label: "Default view",
            value: settingsData?.defaultView === undefined ? "default" : String(settingsData.defaultView),
            options: ["transcript", "chat", "default"],
            type: "enum",
            onChange(e) {
              let o = e === "default" ? undefined : e;
              pe({
                defaultView: o,
              });
              setSettingsData((h) => ({
                ...h,
                defaultView: o,
              }));
              let l = o === "chat";
              setUserMsgOptIn(l);
              setAppState((h) => {
                if (h.isBriefOnly === l) return h;
                return {
                  ...h,
                  isBriefOnly: l,
                };
              });
              changeLog.record("Default view", e);
              logEvent("tengu_default_view_setting_changed", {
                value: fromEnum(o ?? "unset"),
              });
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
        let language = e.toLowerCase() === "default" ? undefined : e;
        setSettingsData((h) => ({
          ...h,
          language,
        }));
        let l = await x({
          language,
        });
        if (l?.error)
          return {
            error: l.error,
          };
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
        j("editorMode", o);
        setGlobalConfig((l) => ({
          ...l,
          editorMode: o,
        }));
        logEvent("tengu_editor_mode_changed", {
          mode: fromEnum(o),
          source: lit("config_panel"),
        });
      },
    },
    ...(isSettingSetOutsideUserSettings("askUserQuestionTimeout")
      ? []
      : [
          {
            id: "askUserQuestionTimeout",
            label: "Question auto-continue timeout",
            consentGated: true,
            value: settingsData?.askUserQuestionTimeout ?? getAskUserQuestionTimeout() ?? "never",
            options: [...ASK_QUESTION_TIMEOUT_OPTIONS],
            type: "enum",
            async onChange(e) {
              let found = ASK_QUESTION_TIMEOUT_OPTIONS.find((E) => E === e);
              if (!found) return;
              let askUserQuestionTimeout = settingsData.askUserQuestionTimeout;
              setSettingsData((E) => ({
                ...E,
                askUserQuestionTimeout: found,
              }));
              let h = await x({
                askUserQuestionTimeout: found,
              });
              if (h?.error) {
                setSettingsData((E) => ({
                  ...E,
                  askUserQuestionTimeout,
                }));
                return {
                  error: h.error,
                };
              }
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
            options: [...CONFIG_BACKEND_LABELS],
            type: "enum",
            consentGated: true,
            async onChange(e) {
              let found = CONFIG_BACKEND_LABELS.find((h) => h === e);
              if (!found) return;
              setSettingsData((h) => ({
                ...h,
                modelProposedGoals: found,
              }));
              let l = await x({
                modelProposedGoals: found,
              });
              if (l?.error)
                return {
                  error: l.error,
                };
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
      label: configRowLabel("Show last response in external editor", "Show responses in IDE"),
      value: globalConfig.externalEditorContext ?? false,
      type: "boolean",
      onChange(e) {
        G((o) => ({
          ...o,
          externalEditorContext: e,
        }));
        setGlobalConfig((o) => ({
          ...o,
          externalEditorContext: e,
        }));
        logEvent("tengu_external_editor_context_changed", {
          enabled: e,
        });
      },
    },
    {
      id: "prStatus",
      label: configRowLabel("Show PR status footer", "Show PR status"),
      value: globalConfig.prStatusFooterEnabled ?? true,
      type: "boolean",
      onChange(e) {
        G((o) => {
          if (o.prStatusFooterEnabled === e) return o;
          return {
            ...o,
            prStatusFooterEnabled: e,
          };
        });
        setGlobalConfig((o) => ({
          ...o,
          prStatusFooterEnabled: e,
        }));
        logEvent("tengu_pr_status_footer_setting_changed", {
          enabled: e,
        });
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
        if (hasLadderForSetting(o)) {
          logFeatureSad("model_fable_consent", "config_shorthand_blocked");
          return {
            error: new WireSafeControlError("needs usage-credits consent \u2014 run /model first"),
          };
        }
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
              G((l) => ({
                ...l,
                diffTool: o,
              }));
              setGlobalConfig((l) => ({
                ...l,
                diffTool: o,
              }));
              logEvent("tengu_diff_tool_changed", {
                tool: fromEnum(o),
                source: lit("config_panel"),
              });
            },
          },
        ]
      : []),
    ...(!isSupportedTerminal()
      ? [
          {
            id: "autoConnectIde",
            label: "Auto-connect to IDE (external terminal)",
            value: globalConfig.autoConnectIde ?? false,
            type: "boolean",
            onChange(e) {
              G((o) => ({
                ...o,
                autoConnectIde: e,
              }));
              setGlobalConfig((o) => ({
                ...o,
                autoConnectIde: e,
              }));
              logEvent("tengu_auto_connect_ide_changed", {
                enabled: e,
                source: lit("config_panel"),
              });
            },
          },
        ]
      : []),
    ...(isSupportedTerminal()
      ? [
          {
            id: "autoInstallIdeExtension",
            label: "Auto-install IDE extension",
            value: globalConfig.autoInstallIdeExtension ?? true,
            type: "boolean",
            onChange(e) {
              G((o) => ({
                ...o,
                autoInstallIdeExtension: e,
              }));
              setGlobalConfig((o) => ({
                ...o,
                autoInstallIdeExtension: e,
              }));
              logEvent("tengu_auto_install_ide_extension_changed", {
                enabled: e,
                source: lit("config_panel"),
              });
            },
          },
        ]
      : []),
    {
      id: "chrome",
      label: configRowLabel("Claude in Chrome enabled by default", "Claude in Chrome"),
      ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_joyful_parasol", true) !== false && {
        consentGated: true,
      }),
      value: globalConfig.claudeInChromeDefaultEnabled ?? false,
      type: "boolean",
      onChange(e) {
        G((o) => ({
          ...o,
          claudeInChromeDefaultEnabled: e,
        }));
        setGlobalConfig((o) => ({
          ...o,
          claudeInChromeDefaultEnabled: e,
        }));
        logEvent("tengu_claude_in_chrome_setting_changed", {
          enabled: e,
        });
      },
    },
    ...(isAgentSwarmsEnabled()
      ? (() => {
          let cliTeammateModeOverride = getCliTeammateModeOverride();
          return [
            {
              id: "teammateMode",
              label: cliTeammateModeOverride
                ? `Teammate mode [overridden: ${cliTeammateModeOverride}]`
                : "Teammate mode",
              value: globalConfig.teammateMode ?? DEFAULT_TEAMMATE_MODE,
              options: ["auto", "tmux", "iterm2", "in-process"],
              type: "enum",
              onChange(newMode) {
                if (
                  newMode !== "auto" &&
                  newMode !== "tmux" &&
                  newMode !== "iterm2" &&
                  newMode !== "in-process"
                )
                  return;
                clearCliTeammateModeOverride(newMode);
                resetBackendDetection();
                j("teammateMode", newMode);
                setGlobalConfig((h) => ({
                  ...h,
                  teammateMode: newMode,
                }));
                logEvent("tengu_teammate_mode_changed", {
                  mode: fromEnum(newMode),
                });
              },
            },
          ];
        })()
      : []),
    ...(isBridgeEnabled() || isRemoteControlHardDisabled() ? [co()] : []),
    ...(isSettingSetOutsideUserSettings("dialogExpiry")
      ? []
      : [
          {
            id: "dialogExpiry",
            label: "Dialog expiry",
            consentGated: true,
            value: settingsData.dialogExpiry ?? "default",
            options: [...DIALOG_EXPIRY_OPTIONS],
            type: "enum",
            async onChange(e) {
              let found = DIALOG_EXPIRY_OPTIONS.find((M) => M === e);
              if (!found) return;
              let dialogExpiry = found === "default" ? undefined : found;
              let dialogExpiry_2 = settingsData.dialogExpiry;
              setSettingsData((M) => ({
                ...M,
                dialogExpiry,
              }));
              let E = await x({
                dialogExpiry,
              });
              if (E?.error) {
                setSettingsData((M) => ({
                  ...M,
                  dialogExpiry: dialogExpiry_2,
                }));
                return {
                  error: E.error,
                };
              }
              logEvent("tengu_dialog_expiry_changed", {
                value: fromEnum(found),
                source: lit("config_panel"),
              });
            },
          },
        ]),
    ...(crossSessionInboxRowVisible && !isSettingSetOutsideUserSettings("crossSessionInbound")
      ? [
          {
            id: "crossSessionInbound",
            label: "Messages from your other sessions",
            consentGated: true,
            pickToCommit: true,
            value: settingsData.crossSessionInbound ?? "default",
            options: [...GENERIC_TIMEOUT_OPTIONS],
            type: "enum",
            async onChange(e) {
              let found = GENERIC_TIMEOUT_OPTIONS.find((M) => M === e);
              if (!found) return;
              let crossSessionInbound = found === "default" ? undefined : found;
              let crossSessionInbound_2 = settingsData.crossSessionInbound;
              setSettingsData((M) => ({
                ...M,
                crossSessionInbound,
              }));
              let E = await x({
                crossSessionInbound,
              });
              if (E?.error) {
                setSettingsData((M) => ({
                  ...M,
                  crossSessionInbound: crossSessionInbound_2,
                }));
                return {
                  error: E.error,
                };
              }
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
            label: configRowLabel("External CLAUDE.md includes", "External CLAUDE.md files"),
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
            consentGated: true,
            label: "Use custom API key: ",
            labelBoldSuffix: tailOfId(env.ANTHROPIC_API_KEY),
            searchText: "Use custom API key",
            value: Boolean(
              env.ANTHROPIC_API_KEY &&
              customApiKeyResponsesOf(globalConfig).approved.includes(tailOfId(env.ANTHROPIC_API_KEY)),
            ),
            type: "boolean",
            onChange(e) {
              G((o) => {
                if (!env.ANTHROPIC_API_KEY) return o;
                let { approved, rejected } = customApiKeyResponsesOf(o);
                let E = tailOfId(env.ANTHROPIC_API_KEY);
                let filtered = approved.filter((I) => I !== E);
                let filtered_2 = rejected.filter((I) => I !== E);
                return {
                  ...o,
                  customApiKeyResponses: e
                    ? {
                        approved: [...filtered, E],
                        rejected: filtered_2,
                      }
                    : {
                        approved: filtered,
                        rejected: [...filtered_2, E],
                      },
                };
              });
              emitCredentialChange();
              setGlobalConfig(getEffectiveConfigValues());
            },
          },
        ]
      : []),
  ];
  return {
    settings: isRemoteSessionAvailable() ? Ge.filter((e) => !isSessionScopedSetting(e.id)) : Ge,
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
function modelSwitchPolicyLabel(switchModelsOnFlag) {
  if (switchModelsOnFlag !== undefined)
    return switchModelsOnFlag
      ? FALLBACK_PREFERENCE_LABELS.switchAutomatically
      : FALLBACK_PREFERENCE_LABELS.askEachTime;
  return autoUpdatesSwitchMode()
    ? FALLBACK_PREFERENCE_LABELS.notAskedYet
    : FALLBACK_PREFERENCE_LABELS.switchAutomatically;
}
//@ chunk-snd3g4y1.js:31652-31740 placement
function autoUpdatesSwitchMode() {
  if (hasGrowthBookOverride(TENGU_JAZZY_GOBLET))
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAZZY_GOBLET, false) === true;
  if (!isGrowthBookEnabled()) return false;
  return getAllGrowthBookFeatures()[TENGU_JAZZY_GOBLET] === true;
}
//@ chunk-snd3g4y1.js:31740-31790 placement
function updateChannelLabel(autoUpdatesChannel) {
  return autoUpdatesChannel === "rc" ? "slow" : (autoUpdatesChannel ?? "latest");
}
export {
  getEffectiveConfigValues,
  remoteForwardedSettings,
  alwaysFalse,
  buildConfigRows,
  FORWARD_SETTINGS_ERRORS,
  CONFIG_SAVE_FAILED,
  notificationChannelLabel,
  NOOP_CONFIG_WRITERS,
  themeSettingRow,
};
