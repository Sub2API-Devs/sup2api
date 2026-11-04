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
import { LEFT_ARROW } from "../../constants/figures.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

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
var themeSettingRow = (state) => ({
  id: "theme",
  label: "Theme",
  value: themeSettingLabel(state.themeSetting),
  type: "managedEnum",
  options: CONFIG_SOURCE_LABELS,
  optionsHint: "For custom themes, use /theme.",
  onChange: state.setTheme,
});
//@ chunk-snd3g4y1.js:3195-3229 placement
function configRowLabel(row, state) {
  return isSettingsMovedToConfig() ? state : row;
}
//@ chunk-snd3g4y1.js:3229-3391 placement
/**
 * 通知渠道设置值的简短显示名（bell、iterm2+bell、none）。
 */
function notificationChannelLabel(channel) {
  switch (channel) {
    case "terminal_bell":
      return "bell";
    case "iterm2_with_bell":
      return "iterm2+bell";
    case "notifications_disabled":
      return "none";
    default:
      return channel;
  }
}
//@ chunk-snd3g4y1.js:3391-3487 placement
var ASK_QUESTION_TIMEOUT_OPTIONS; // deferred: uses POLICY_HELPER_ON_FAILURE (../../utils/settings/types.js) of its import cycle while loading; runs once the cycle is complete
var DIALOG_EXPIRY_OPTIONS;
var GENERIC_TIMEOUT_OPTIONS;
deferInit("chunk-snd3g4y1.js:3391", () => {
  ASK_QUESTION_TIMEOUT_OPTIONS = ["never", "60s", "5m", "10m"];
  DIALOG_EXPIRY_OPTIONS = ["default", "60s", "5m", "10m", "never"];
  GENERIC_TIMEOUT_OPTIONS = ["default", ...POLICY_HELPER_ON_FAILURE];
});
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
function effectiveSettingSourceValue(key) {
  return getSecuritySensitiveSettingWithSources(key).find((source) => isSettingSourceEnabled(source.source));
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
function settingOrDefault(globalConfig, key) {
  return validateConfigValue(key, globalConfig[key]) ?? DEFAULT_GLOBAL_CONFIG[key];
}
//@ chunk-snd3g4y1.js:5156-5270 placement
function selectableModelOptions() {
  let fableAvailable = isFableAvailable();
  return [
    "default",
    ...LEGACY_MODEL_IDS.filter(
      (value) =>
        (fableAvailable || !value.includes("fable")) &&
        !isOpus1mUnavailable(value) &&
        !requires1mEntitlementCheck(value) &&
        isModelAllowed(value),
    ),
  ];
}
//@ chunk-snd3g4y1.js:5270-5341 placement
var COUNTRY_TO_LANGUAGE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-snd3g4y1.js:5270", () => {
  COUNTRY_TO_LANGUAGE = new Map([
    ["jp", "ja"],
    ["kr", "ko"],
    ["cn", "zh"],
    ["tw", "zh-Hant"],
  ]);
});
//@ chunk-snd3g4y1.js:5341-5623 placement = capitalize (1)
function capitalize(str) {
  let trimmed = sanitizeTelemetryString(str).trim();
  if (!trimmed || trimmed.toLowerCase() === "default") return "default";
  if (trimmed.length <= 3) {
    let lower = trimmed.toLowerCase();
    let languageTag = COUNTRY_TO_LANGUAGE.get(lower) ?? lower;
    try {
      let displayName = languageDisplayNames().of(languageTag);
      if (displayName && displayName !== languageTag) return displayName;
    } catch {}
  }
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
function orgMemoryWritesRowSeen(entry) {
  uiSignals.orgMemoryWritesRowSeen ||= entry;
  return uiSignals.orgMemoryWritesRowSeen;
}
//@ chunk-snd3g4y1.js:5829-5903 placement
function orgMemoryReadRowSeen(entry) {
  uiSignals.orgMemoryReadRowSeen ||= entry;
  return uiSignals.orgMemoryReadRowSeen;
}
//@ chunk-snd3g4y1.js:5903-5987 placement
function remoteHomeSettingsRowSeen(entry) {
  uiSignals.remoteHomeSettingsRowSeen ||= entry;
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
  function saveUserSettings(patch) {
    return isStorageV5Enabled() && storageV5 !== undefined
      ? updateSettingsForSource("userSettings", patch, undefined, storageV5)
      : updateSettingsForSource("userSettings", patch);
  }
  function saveLocalSettings(patch) {
    return isStorageV5Enabled() && storageV5 !== undefined
      ? updateSettingsForSource("localSettings", patch, undefined, storageV5)
      : updateSettingsForSource("localSettings", patch);
  }
  function saveUserIntent(key, value) {
    if (isStorageV5Enabled() && storageV5 !== undefined) saveUserIntentSetting(key, value, storageV5);
    else saveUserIntentSetting(key, value);
  }
  function saveConfig(update) {
    if (isStorageV5Enabled() && storageV5 !== undefined) saveGlobalConfig(update, storageV5);
    else saveGlobalConfig(update);
  }
  async function applyModelChange(model, effort) {
    logEvent("tengu_config_model_changed", {
      from_model: telemetrySafeModelName(mainLoopModel),
      to_model: telemetrySafeModelName(model),
    });
    let isSessionOnly = hasLadderForSetting(model);
    let denyReason = model === null ? managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch") : null;
    if (denyReason !== null)
      return {
        error: new WireSafeControlError(denyReason, "default model blocked by managed settings"),
      };
    let hookSuffix = "";
    if (modelSwitchHooks) {
      let { session, readState } = modelSwitchHooks;
      if (hasPreModelSwitchHook(session) || switchSerializerSlot.of(session).pending > 0) {
        let pickTicket = ++modelSwitchHooks.latestPick.current;
        let decision = await serializeModelSwitch(session, () =>
          runPreModelSwitchHooks(session, readState, model, "command"),
        );
        if (pickTicket !== modelSwitchHooks.latestPick.current) return;
        if (decision.decision !== "proceed") {
          logFeatureSad("model_switch", "blocked_by_hook");
          return {
            error: new WireSafeControlError(
              preModelSwitchBlockedMessage(
                model,
                decision.decision === "ask"
                  ? `${decision.reason ?? "confirmation required"} (run /model to confirm)`
                  : decision.reason,
                decision.messages,
              ),
              "model switch blocked by a PreModelSwitch hook",
            ),
          };
        }
        if (decision.messages.length > 0)
          hookSuffix = ` \xB7 ${decision.messages.map(sanitizeHookText).join(" \xB7 ")}`;
      }
      recordSwitchIfChanged(session, readState(), model, "command");
    }
    if (effort !== undefined)
      persistEffortSetting(effort, resolveRequestedModel(model), undefined, storageV5);
    clearRefusalFallbackModelLatch();
    if (isFastModeEnabled()) clearFastModeCooldown();
    let wasFastMode = false;
    let nextFastMode = false;
    setAppState((prev) => {
      wasFastMode = !!prev.fastMode;
      nextFastMode = isFastModeEnabled() ? isFastModeActive(model, prev.fastMode) : wasFastMode;
      return {
        ...prev,
        mainLoopModel: model,
        mainLoopModelForSession: null,
        ...(effort !== undefined && {
          sessionEffort: levelEffortSetting(effort),
        }),
        ...(nextFastMode !== wasFastMode && {
          fastMode: nextFastMode,
        }),
      };
    });
    reportFastModeToggle(wasFastMode, nextFastMode);
    let fastModeSuffix = formatFastModeSuffix(wasFastMode, nextFastMode, model);
    changeLog.record(
      "model",
      modelDisplayString(model) +
        fastModeSuffix +
        hookSuffix +
        (isSessionOnly ? " \xB7 this session only \u2014 /model to set up" : ""),
      {
        moveToEnd: true,
      },
    );
    let writeResult = isSessionOnly
      ? undefined
      : await saveUserSettings({
          model: model ?? undefined,
        });
    let suffix = fastModeSuffix + hookSuffix;
    if (writeResult?.error)
      return {
        error: writeResult.error,
        ...(suffix && {
          messageSuffix: suffix,
        }),
      };
    if (suffix)
      return {
        messageSuffix: suffix,
      };
  }
  function setVerbose(enabled) {
    saveUserIntent("verbose", enabled);
    setGlobalConfig((config) => ({
      ...config,
      verbose: enabled,
    }));
    setAppState((state) => ({
      ...state,
      verbose: enabled,
    }));
    changeLog.toggle("verbose", enabled);
  }
  function setNotifChannel(channel) {
    saveUserIntent("preferredNotifChannel", channel);
    setGlobalConfig((config) => ({
      ...config,
      preferredNotifChannel: channel,
    }));
  }
  function setInputNeededNotif(enabled) {
    saveUserIntent("inputNeededNotifEnabled", enabled);
    setGlobalConfig((config) => ({
      ...config,
      inputNeededNotifEnabled: enabled,
    }));
    pushNotificationPreferences();
    logEvent("tengu_push_notif_pref_changed", {
      key: lit("inputNeededNotifEnabled"),
      value: enabled,
    });
  }
  function setAgentPushNotif(enabled) {
    saveUserIntent("agentPushNotifEnabled", enabled);
    setGlobalConfig((config) => ({
      ...config,
      agentPushNotifEnabled: enabled,
    }));
    pushNotificationPreferences();
    logEvent("tengu_push_notif_pref_changed", {
      key: lit("agentPushNotifEnabled"),
      value: enabled,
    });
  }
  let workflowSize = resolveWorkflowSize(globalConfig.workflowSizeGuideline, isProSubscriber());
  function setRemoteControl(value) {
    if (value !== "false") {
      let remoteControlPolicyLockReason = getRemoteControlPolicyLockReason();
      if (remoteControlPolicyLockReason !== null)
        return {
          error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            remoteControlPolicyLockReason,
            "Remote Control setting locked by org policy",
          ),
        };
    }
    if (value === "default") {
      saveUserIntent("remoteControlAtStartup", undefined);
      saveConfig((config) => {
        if (config.remoteControlAtStartup === undefined) return config;
        let next = {
          ...config,
        };
        delete next.remoteControlAtStartup;
        return next;
      });
      setGlobalConfig((config) => ({
        ...config,
        remoteControlAtStartup: undefined,
      }));
    } else {
      let on = value === "true";
      saveUserIntent("remoteControlAtStartup", on);
      setGlobalConfig((config) => ({
        ...config,
        remoteControlAtStartup: on,
      }));
    }
    let remoteControlAtStartup = getRemoteControlAtStartup();
    setAppState((state) => applyRemoteControlToAppState(state, remoteControlAtStartup));
    return;
  }
  function remoteControlRow() {
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
        onChange(value) {
          if (value !== "false")
            return {
              error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                remoteControlPolicyLockReason,
                "Remote Control setting locked by org policy",
              ),
            };
          return setRemoteControl(value);
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
      onChange: setRemoteControl,
    };
  }
  let model = resolveRequestedModel(currentModel);
  let thinkingCannotBeDisabledMessage = getThinkingCannotBeDisabledMessage(model);
  let agentRows = [
    ...(isAgentsFleetEnabled()
      ? [
          {
            id: "defaultToAgentsView",
            label: "Open agents view by default",
            value: globalConfig.defaultToAgentsView ?? false,
            type: "boolean",
            onChange(defaultToAgentsView) {
              saveConfig((config) => ({
                ...config,
                defaultToAgentsView,
              }));
              setGlobalConfig((config) => ({
                ...config,
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
              saveConfig((config) => ({
                ...config,
                leftArrowOpensAgents,
              }));
              setGlobalConfig((config) => ({
                ...config,
                leftArrowOpensAgents,
              }));
            },
          },
        ]
      : []),
  ];
  let viewRows = tabsStandIn ? agentRows.filter((row) => row.id !== "leftArrowOpensAgents") : agentRows;
  let notifRow = {
    id: "notifChannel",
    label: "Local notifications",
    value: globalConfig.preferredNotifChannel,
    options: [...NOTIFICATION_CHANNELS],
    type: "enum",
    onChange: setNotifChannel,
  };
  let pushRows = pushTogglesVisible
    ? [
        ...(isKairosInputNeededPushEnabled()
          ? [
              {
                id: "inputNeededNotifEnabled",
                label: "Push when actions required",
                value: globalConfig.inputNeededNotifEnabled ?? false,
                type: "boolean",
                onChange: setInputNeededNotif,
              },
            ]
          : []),
        {
          id: "agentPushNotifEnabled",
          label: "Push when Claude decides",
          value: globalConfig.agentPushNotifEnabled ?? false,
          type: "boolean",
          onChange: setAgentPushNotif,
        },
      ]
    : [];
  let source = resolveSetting("idleCompaction", true).source;
  let userSettingsEditable =
    source === "userSettings" || (source === "default" && isSettingSourceEnabled("userSettings"));
  let settingRows = [
    {
      id: "autoCompact",
      label: "Auto-compact",
      value: globalConfig.autoCompactEnabled,
      type: "boolean",
      onChange(enabled) {
        saveUserIntent("autoCompactEnabled", enabled);
        setGlobalConfig((config) => ({
          ...config,
          autoCompactEnabled: enabled,
        }));
        logEvent("tengu_auto_compact_setting_changed", {
          enabled,
        });
      },
    },
    ...(userSettingsEditable
      ? [
          {
            id: "idleCompaction",
            label: "Idle compaction",
            value: settingsData?.idleCompaction ?? true,
            type: "boolean",
            async onChange(enabled) {
              setSettingsData((data) => ({
                ...data,
                idleCompaction: enabled,
              }));
              let writeResult = await saveUserSettings({
                idleCompaction: enabled,
              });
              if (writeResult?.error) {
                let idleCompaction = isIdleCompactionEnabled();
                setSettingsData((data) => ({
                  ...data,
                  idleCompaction,
                }));
                return {
                  error: writeResult.error,
                };
              }
              logEvent("tengu_idle_compaction_setting_changed", {
                enabled,
              });
              changeLog.toggle("idleCompaction", enabled);
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
            async onChange(enabled) {
              setSettingsData((data) => ({
                ...data,
                autoContinueAtUsageLimit: enabled,
              }));
              let writeResult = await saveUserSettings({
                autoContinueAtUsageLimit: enabled,
              });
              if (writeResult?.error) {
                let autoContinueAtUsageLimit = isAutoContinueEnabled();
                setSettingsData((data) => ({
                  ...data,
                  autoContinueAtUsageLimit,
                }));
                return {
                  error: writeResult.error,
                };
              }
              logEvent("tengu_quota_auto_resume_setting_changed", {
                enabled,
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
            isDefaultValue: !IDE_KIND_LABELS.some((mode) => mode === globalConfig.remoteHomeSettingsMode),
            consentGated: true,
            canWithdraw: () => neverTrue() && globalConfig.remoteHomeSettingsMode !== "keep_local",
            grantBlocker: getHomeSettingsForwardingBlocker(true) ?? undefined,
            type: "boolean",
            onChange(value) {
              if (value)
                return {
                  error: new WireSafeControlError(
                    "Turn this on from the /config panel, which shows what will be sent",
                  ),
                };
              let mode = "keep_local";
              let remoteHomeSettingsMode = globalConfig.remoteHomeSettingsMode;
              setGlobalConfig((config) => ({
                ...config,
                remoteHomeSettingsMode: mode,
              }));
              return saveHomeSettingsMode(mode, isStorageV5Enabled() ? storageV5 : undefined).then(
                (saveResult) => {
                  switch (saveResult) {
                    case "written":
                      return;
                    case "unconfirmed":
                      return {
                        messageSuffix:
                          " (could not confirm it was written to the config file; check /config after restarting Claude Code)",
                      };
                    case "not_stored":
                      setGlobalConfig((config) => ({
                        ...config,
                        remoteHomeSettingsMode: getGlobalConfig().remoteHomeSettingsMode,
                      }));
                      return {
                        error: new WireSafeControlError(CONFIG_SAVE_FAILED),
                      };
                    case "refused":
                      setGlobalConfig((config) => ({
                        ...config,
                        remoteHomeSettingsMode,
                      }));
                      return {
                        error: new WireSafeControlError(
                          "Cloud settings forwarding is not available right now; nothing was changed",
                        ),
                      };
                  }
                },
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
            onChange(value) {
              return saveUnattendedServingConsent(
                value === UNATTENDED_CONSENT_LABELS.accepted ? "accepted" : "declined",
              ).then((outcome) => {
                if (outcome === "forbidden")
                  return {
                    error: new WireSafeControlError(unattendedServingForbiddenText()),
                  };
                setGlobalConfig((config) => ({
                  ...config,
                }));
                if (outcome === "not_saved")
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
            coerce(value) {
              let lower = value.trim().toLowerCase();
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
            onChange(value) {
              let switchAutomatically = value === FALLBACK_PREFERENCE_LABELS.switchAutomatically;
              setSettingsData((data) => ({
                ...data,
                switchModelsOnFlag: switchAutomatically,
              }));
              return setSwitchModelsOnFlag(
                switchAutomatically,
                "config",
                isStorageV5Enabled() ? storageV5 : undefined,
              ).then(({ error }) =>
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
      onChange(value) {
        saveLocalSettings({
          spinnerTipsEnabled: value,
        });
        setSettingsData((data) => ({
          ...data,
          spinnerTipsEnabled: value,
        }));
        logEvent("tengu_tips_setting_changed", {
          enabled: value,
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
            onChange(value) {
              let drafts = value;
              setFeedbackDraftsSetting(drafts, {
                storageV5,
                via: "config",
              });
              setSettingsData((data) => ({
                ...data,
                feedbackDrafts: drafts,
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
      onChange(value) {
        saveLocalSettings({
          prefersReducedMotion: value,
        });
        setSettingsData((data) => ({
          ...data,
          prefersReducedMotion: value,
        }));
        setAppState((state) => ({
          ...state,
          settings: {
            ...state.settings,
            prefersReducedMotion: value,
          },
        }));
        logEvent("tengu_reduce_motion_setting_changed", {
          enabled: value,
        });
      },
    },
    {
      id: "thinking",
      label: "Thinking mode",
      value: isThinkingEffectivelyEnabled(model, thinkingEnabled),
      type: "boolean",
      ...(thinkingCannotBeDisabledMessage !== undefined && {
        lock: {
          reason: thinkingCannotBeDisabledMessage,
          source: "managed",
          reasonShipsOffBox: true,
          writableWhileLocked: ["true", "1", "on", "yes"],
        },
      }),
      onChange(value) {
        if (!value && thinkingCannotBeDisabledMessage !== undefined)
          return {
            error: new WireSafeControlError(
              thinkingCannotBeDisabledMessage,
              "Thinking can't be turned off for this model",
            ),
          };
        setAppState((state) => ({
          ...state,
          thinkingEnabled: value,
        }));
        saveUserSettings({
          alwaysThinkingEnabled: value ? undefined : false,
        });
        logEvent("tengu_thinking_toggled", {
          enabled: value,
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
            async onChange(value) {
              let runFastModeSwitch = (fastModeSwitchModel, model, effort) => {
                if (model) {
                  let wasFast = false;
                  setAppState((state) => {
                    let fastModeSwitchModel_2 = getFastModeSwitchModel(state);
                    wasFast =
                      fastModeSwitchModel_2 !== undefined && fastModeSwitchModel_2 !== fastModeSwitchModel;
                    return state;
                  });
                  if (wasFast)
                    return {
                      error: new WireSafeControlError(
                        "Fast mode was not enabled: the model changed while PreModelSwitch hooks ran; try again",
                        "fast mode promotion stale after hooks",
                      ),
                    };
                }
                clearFastModeCooldown();
                saveUserSettings({
                  fastMode: true,
                });
                let nextFast;
                setAppState((state) => {
                  let fastModeSwitchModel_2 = getFastModeSwitchModel(state);
                  let fastSuffix =
                    fastModeSwitchModel_2 !== undefined &&
                    (!model || fastModeSwitchModel_2 === fastModeSwitchModel);
                  if (fastSuffix && modelSwitchHooks)
                    recordSwitchIfChanged(modelSwitchHooks.session, state, fastModeSwitchModel_2, "command");
                  nextFast = fastSuffix ? fastModeSwitchModel_2 : undefined;
                  return {
                    ...state,
                    ...(fastSuffix && {
                      mainLoopModel: fastModeSwitchModel_2,
                      mainLoopModelForSession: null,
                    }),
                    fastMode: true,
                  };
                });
                if (nextFast !== undefined) changeLog.record("model", nextFast ?? defaultOpusAlias());
                changeLog.record("Fast mode", "ON");
                return effort
                  ? {
                      messageSuffix: effort,
                    }
                  : undefined;
              };
              if (
                value &&
                modelSwitchHooks &&
                (hasPreModelSwitchHook(modelSwitchHooks.session) ||
                  switchSerializerSlot.of(modelSwitchHooks.session).pending > 0)
              ) {
                let { session, readState } = modelSwitchHooks;
                let ticket = ++modelSwitchHooks.latestFastPick.current;
                return serializeModelSwitch(session, async () => {
                  let fastModeSwitchModel = getFastModeSwitchModel(readState());
                  if (fastModeSwitchModel === undefined || !hasPreModelSwitchHook(session)) {
                    if (ticket !== modelSwitchHooks.latestFastPick.current) return;
                    return runFastModeSwitch(undefined, false, "");
                  }
                  let hookResult = await runPreModelSwitchHooks(
                    session,
                    readState,
                    fastModeSwitchModel,
                    "command",
                  );
                  if (ticket !== modelSwitchHooks.latestFastPick.current) return;
                  if (hookResult.decision !== "proceed") {
                    logFeatureSad("model_switch", "blocked_by_hook");
                    return {
                      error: new WireSafeControlError(
                        preModelSwitchBlockedMessage(
                          fastModeSwitchModel,
                          hookResult.decision === "ask"
                            ? `${hookResult.reason ?? "confirmation required"} (run /model to switch, then enable fast mode)`
                            : hookResult.reason,
                          hookResult.messages,
                        ),
                        "model switch blocked by a PreModelSwitch hook",
                      ),
                    };
                  }
                  return runFastModeSwitch(
                    fastModeSwitchModel,
                    true,
                    hookResult.messages.length > 0
                      ? ` \xB7 ${hookResult.messages.map(sanitizeHookText).join(" \xB7 ")}`
                      : "",
                  );
                });
              }
              if (value) return runFastModeSwitch(undefined, false, "");
              else {
                let disableFast = () => {
                  clearFastModeCooldown();
                  saveUserSettings({
                    fastMode: undefined,
                  });
                  setAppState((state) => ({
                    ...state,
                    fastMode: false,
                  }));
                  changeLog.record("Fast mode", "OFF");
                };
                if (modelSwitchHooks && switchSerializerSlot.of(modelSwitchHooks.session).pending > 0)
                  await serializeModelSwitch(modelSwitchHooks.session, async () => disableFast());
                else disableFast();
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
            onChange(value) {
              setAppState((state) => ({
                ...state,
                promptSuggestionEnabled: value,
              }));
              saveUserSettings({
                promptSuggestionEnabled: value ? undefined : false,
              });
              if (value && !promptSuggestionEnabled)
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
      onChange(value) {
        setAppState((state) => ({
          ...state,
          awaySummaryEnabled: value,
        }));
        saveUserSettings({
          awaySummaryEnabled: value ? undefined : false,
        });
        setSettingsData((data) => ({
          ...data,
          awaySummaryEnabled: value ? undefined : false,
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
            onChange(value) {
              saveUserIntent("fileCheckpointingEnabled", value);
              setGlobalConfig((config) => ({
                ...config,
                fileCheckpointingEnabled: value,
              }));
              logEvent("tengu_file_history_snapshots_setting_changed", {
                enabled: value,
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
            onChange(value) {
              setOrgMemoryRead(value, storageV5);
              setGlobalConfig((config) => ({
                ...config,
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
            onChange(value) {
              let orgMemoryWrites =
                value &&
                !isOrgMemoryWritesEnabledForAccount() &&
                getCurrentProjectConfig().orgMemoryWrites === true;
              applyOrgMemoryDecision(orgMemoryWrites ? false : value, storageV5);
              setGlobalConfig((config) => ({
                ...config,
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
            onChange(value) {
              let enableWorkflows = value === workflowsDefaultOn() ? undefined : value;
              saveUserSettings({
                enableWorkflows,
                disableWorkflows: undefined,
              });
              setSettingsData((data) => ({
                ...data,
                enableWorkflows,
                disableWorkflows: undefined,
              }));
              changeLog.record("workflows", value ? "on" : "off");
            },
          },
          {
            id: "workflowKeywordTriggerEnabled",
            label: "Ultracode keyword trigger",
            value: settingsData?.workflowKeywordTriggerEnabled ?? true,
            type: "boolean",
            onChange(value) {
              let workflowKeywordTriggerEnabled = value ? undefined : false;
              saveUserSettings({
                workflowKeywordTriggerEnabled,
              });
              setSettingsData((data) => ({
                ...data,
                workflowKeywordTriggerEnabled,
              }));
              changeLog.record("ultracodeKeywordTrigger", value ? "on" : "off");
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
            onChange(value) {
              let sizeName = workflowSizeName(value) ?? "unrestricted";
              saveConfig((config) => {
                if (config.workflowSizeGuideline === sizeName) return config;
                return {
                  ...config,
                  workflowSizeGuideline: sizeName,
                };
              });
              setGlobalConfig((config) => ({
                ...config,
                workflowSizeGuideline: sizeName,
              }));
              changeLog.record("workflowSizeGuideline", sizeName);
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
            async onChange(value) {
              let enableArtifact = value === getArtifactDefaultOn() ? undefined : value;
              setSettingsData((data) => ({
                ...data,
                enableArtifact: value,
              }));
              let writeResult = await saveUserSettings({
                enableArtifact,
                disableArtifact: undefined,
              });
              if (writeResult?.error) {
                setSettingsData((data) => ({
                  ...data,
                  enableArtifact: resolveArtifactEnableSetting().enabled,
                }));
                return {
                  error: writeResult.error,
                };
              }
              changeLog.record("artifacts", value ? "on" : "off");
            },
          },
        ]
      : []),
    {
      id: "verbose",
      label: configRowLabel("Verbose output", "Verbose"),
      value: verbose,
      type: "boolean",
      onChange: setVerbose,
    },
    {
      id: "progressBar",
      label: "Terminal progress bar",
      value: globalConfig.terminalProgressBarEnabled,
      type: "boolean",
      onChange(value) {
        saveUserIntent("terminalProgressBarEnabled", value);
        setGlobalConfig((config) => ({
          ...config,
          terminalProgressBarEnabled: value,
        }));
        logEvent("tengu_terminal_progress_bar_setting_changed", {
          enabled: value,
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
            onChange(value) {
              saveConfig((config) => ({
                ...config,
                showStatusInTerminalTab: value,
              }));
              setGlobalConfig((config) => ({
                ...config,
                showStatusInTerminalTab: value,
              }));
              logEvent("tengu_terminal_tab_status_setting_changed", {
                enabled: value,
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
      onChange(value) {
        saveUserIntent("showTurnDuration", value);
        setGlobalConfig((config) => ({
          ...config,
          showTurnDuration: value,
        }));
        logEvent("tengu_show_turn_duration_setting_changed", {
          enabled: value,
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
            onChange(value) {
              saveUserSettings({
                precomputeCompactionEnabled: value,
              });
              setSettingsData((data) => ({
                ...data,
                precomputeCompactionEnabled: value,
              }));
              logEvent("tengu_precompute_compaction_setting_changed", {
                enabled: value,
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
            onChange(value) {
              saveUserIntent("showMessageTimestamps", value);
              setGlobalConfig((config) => ({
                ...config,
                showMessageTimestamps: value,
              }));
              setAppState((state) => ({
                ...state,
                showMessageTimestamps: value,
              }));
              logEvent("tengu_show_message_timestamps_setting_changed", {
                enabled: value,
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
      onChange(value) {
        let found = AUTO_CONNECT_LABELS.find((option) => option === value);
        if (!found) return;
        saveUserSettings({
          timeFormat: found,
        });
        setSettingsData((data) => ({
          ...data,
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
        let hiddenModes = ["default", "plan"];
        let allModes = PERMISSION_MODES;
        let excludedModes = ["bypassPermissions"];
        return [
          ...hiddenModes,
          ...allModes.filter((mode) => !hiddenModes.includes(mode) && !excludedModes.includes(mode)),
        ];
      })(),
      type: "enum",
      async onChange(value) {
        let defaultMode = permissionModeFromString(value);
        let defaultMode_2 = isExternalPermissionMode(defaultMode)
          ? toExternalPermissionMode(defaultMode)
          : defaultMode;
        let defaultMode_3 = settingsData?.permissions?.defaultMode;
        setSettingsData((data) => ({
          ...data,
          permissions: {
            ...data?.permissions,
            defaultMode: defaultMode_2,
          },
        }));
        changeLog.record("permissionMode", value);
        let writeResult = await saveUserSettings({
          permissions: {
            defaultMode: defaultMode_2,
          },
        });
        if (writeResult.error) {
          setSettingsData((data) => ({
            ...data,
            permissions: {
              ...data?.permissions,
              defaultMode: defaultMode_3,
            },
          }));
          changeLog.clear("permissionMode");
          logForDebugging(`Failed to update default permission mode setting: ${writeResult.error.message}`, {
            level: "error",
          });
          return {
            error: writeResult.error,
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
      async onChange(value) {
        let baseRef = value;
        let baseRef_2 = settingsData?.worktree?.baseRef;
        setSettingsData((data) => ({
          ...data,
          worktree: {
            ...data?.worktree,
            baseRef,
          },
        }));
        changeLog.record("worktreeBaseRef", baseRef);
        let saveResult = await saveUserSettings({
          worktree: {
            baseRef,
          },
        });
        if (saveResult.error) {
          setSettingsData((data) => ({
            ...data,
            worktree: {
              ...data?.worktree,
              baseRef: baseRef_2,
            },
          }));
          changeLog.clear("worktreeBaseRef");
          logForDebugging(`Failed to update worktree.baseRef in user settings: ${saveResult.error.message}`, {
            level: "error",
          });
          return {
            error: saveResult.error,
          };
        }
      },
    },
    {
      id: "useAutoModeDuringPlan",
      label: "Use auto mode during plan",
      value: settingsData?.useAutoModeDuringPlan ?? true,
      type: "boolean",
      async onChange(value) {
        setSettingsData((data) => ({
          ...data,
          useAutoModeDuringPlan: value,
        }));
        changeLog.record("Use auto mode during plan", value);
        let { error } = await saveUserSettings({
          useAutoModeDuringPlan: value,
        });
        if (error)
          return {
            error,
          };
        setPlanAutoModeOffAtLaunch(!value);
        setAppState((state) => {
          let nextContext = transitionPlanAutoMode(state.toolPermissionContext);
          if (nextContext === state.toolPermissionContext) return state;
          return {
            ...state,
            toolPermissionContext: nextContext,
          };
        });
      },
    },
    {
      id: "gitignore",
      label: "Respect .gitignore in file picker",
      value: globalConfig.respectGitignore ?? DEFAULT_GLOBAL_CONFIG.respectGitignore,
      type: "boolean",
      onChange(value) {
        saveConfig((config) => ({
          ...config,
          respectGitignore: value,
        }));
        setGlobalConfig((config) => ({
          ...config,
          respectGitignore: value,
        }));
        logEvent("tengu_respect_gitignore_setting_changed", {
          enabled: value,
        });
      },
    },
    {
      id: "copyFullResponse",
      label: "Skip the /copy picker",
      value: globalConfig.copyFullResponse ?? DEFAULT_GLOBAL_CONFIG.copyFullResponse,
      type: "boolean",
      onChange(copyFullResponse) {
        saveConfig((config) => ({
          ...config,
          copyFullResponse,
        }));
        setGlobalConfig((config) => ({
          ...config,
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
              saveConfig((config) => ({
                ...config,
                copyOnSelect,
              }));
              setGlobalConfig((config) => ({
                ...config,
                copyOnSelect,
              }));
            },
          },
          {
            id: "autoScroll",
            label: configRowLabel("Auto-scroll", "Auto-scroll output"),
            value: globalConfig.autoScrollEnabled,
            type: "boolean",
            onChange(value) {
              saveUserIntent("autoScrollEnabled", value);
              setGlobalConfig((config) => ({
                ...config,
                autoScrollEnabled: value,
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
      : viewRows),
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
            onChange: setNotifChannel,
          },
        ]
      : [notifRow, ...pushRows]),
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
      async onChange(value) {
        if (mayBeAuthoredByNonOwner) {
          let allOutputStyles = await getAllOutputStylesCached(getCwd(), storageV5);
          if (!isBuiltInOrDefaultStyle(allOutputStyles[value]))
            return {
              error: new WireSafeControlError(CUSTOM_STYLE_REMOTE_DENIED_MESSAGE),
            };
        }
        if (value === currentOutputStyle)
          return {
            messageSuffix: " (already the current style)",
          };
        if (!isSettingSourceEnabled("localSettings"))
          return {
            error: new WireSafeControlError(STYLE_SAVE_UNAVAILABLE_MESSAGE),
          };
        setSettingsData((data) => ({
          ...data,
          outputStyle: value,
        }));
        let writeResult = await saveLocalSettings({
          outputStyle: value,
        });
        if (writeResult?.error)
          return {
            error: writeResult.error,
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
            onChange(value) {
              let nextView = value === "default" ? undefined : value;
              saveLocalSettings({
                defaultView: nextView,
              });
              setSettingsData((data) => ({
                ...data,
                defaultView: nextView,
              }));
              let isChatView = nextView === "chat";
              setUserMsgOptIn(isChatView);
              setAppState((state) => {
                if (state.isBriefOnly === isChatView) return state;
                return {
                  ...state,
                  isBriefOnly: isChatView,
                };
              });
              changeLog.record("Default view", value);
              logEvent("tengu_default_view_setting_changed", {
                value: fromEnum(nextView ?? "unset"),
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
      async onChange(value) {
        let language = value.toLowerCase() === "default" ? undefined : value;
        setSettingsData((data) => ({
          ...data,
          language,
        }));
        let writeResult = await saveUserSettings({
          language,
        });
        if (writeResult?.error)
          return {
            error: writeResult.error,
          };
      },
    },
    {
      id: "editor",
      label: "Editor mode",
      value: globalConfig.editorMode === "emacs" ? "normal" : globalConfig.editorMode || "normal",
      options: ["normal", "vim"],
      type: "enum",
      onChange(value) {
        let editorMode = value;
        saveUserIntent("editorMode", editorMode);
        setGlobalConfig((config) => ({
          ...config,
          editorMode,
        }));
        logEvent("tengu_editor_mode_changed", {
          mode: fromEnum(editorMode),
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
            async onChange(value) {
              let found = ASK_QUESTION_TIMEOUT_OPTIONS.find((option) => option === value);
              if (!found) return;
              let askUserQuestionTimeout = settingsData.askUserQuestionTimeout;
              setSettingsData((data) => ({
                ...data,
                askUserQuestionTimeout: found,
              }));
              let writeResult = await saveUserSettings({
                askUserQuestionTimeout: found,
              });
              if (writeResult?.error) {
                setSettingsData((data) => ({
                  ...data,
                  askUserQuestionTimeout,
                }));
                return {
                  error: writeResult.error,
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
            async onChange(value) {
              let found = CONFIG_BACKEND_LABELS.find((option) => option === value);
              if (!found) return;
              setSettingsData((data) => ({
                ...data,
                modelProposedGoals: found,
              }));
              let writeResult = await saveUserSettings({
                modelProposedGoals: found,
              });
              if (writeResult?.error)
                return {
                  error: writeResult.error,
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
      onChange(value) {
        saveConfig((config) => ({
          ...config,
          externalEditorContext: value,
        }));
        setGlobalConfig((config) => ({
          ...config,
          externalEditorContext: value,
        }));
        logEvent("tengu_external_editor_context_changed", {
          enabled: value,
        });
      },
    },
    {
      id: "prStatus",
      label: configRowLabel("Show PR status footer", "Show PR status"),
      value: globalConfig.prStatusFooterEnabled ?? true,
      type: "boolean",
      onChange(value) {
        saveConfig((config) => {
          if (config.prStatusFooterEnabled === value) return config;
          return {
            ...config,
            prStatusFooterEnabled: value,
          };
        });
        setGlobalConfig((config) => ({
          ...config,
          prStatusFooterEnabled: value,
        }));
        logEvent("tengu_pr_status_footer_setting_changed", {
          enabled: value,
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
      onChange(value) {
        let diffTool = value === "default" ? null : value;
        if (hasLadderForSetting(diffTool)) {
          logFeatureSad("model_fable_consent", "config_shorthand_blocked");
          return {
            error: new WireSafeControlError("needs usage-credits consent \u2014 run /model first"),
          };
        }
        return applyModelChange(diffTool);
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
            onChange(value) {
              let diffTool = value;
              saveConfig((config) => ({
                ...config,
                diffTool,
              }));
              setGlobalConfig((config) => ({
                ...config,
                diffTool,
              }));
              logEvent("tengu_diff_tool_changed", {
                tool: fromEnum(diffTool),
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
            onChange(value) {
              saveConfig((config) => ({
                ...config,
                autoConnectIde: value,
              }));
              setGlobalConfig((config) => ({
                ...config,
                autoConnectIde: value,
              }));
              logEvent("tengu_auto_connect_ide_changed", {
                enabled: value,
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
            onChange(value) {
              saveConfig((config) => ({
                ...config,
                autoInstallIdeExtension: value,
              }));
              setGlobalConfig((config) => ({
                ...config,
                autoInstallIdeExtension: value,
              }));
              logEvent("tengu_auto_install_ide_extension_changed", {
                enabled: value,
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
      onChange(value) {
        saveConfig((config) => ({
          ...config,
          claudeInChromeDefaultEnabled: value,
        }));
        setGlobalConfig((config) => ({
          ...config,
          claudeInChromeDefaultEnabled: value,
        }));
        logEvent("tengu_claude_in_chrome_setting_changed", {
          enabled: value,
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
                saveUserIntent("teammateMode", newMode);
                setGlobalConfig((config) => ({
                  ...config,
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
    ...(isBridgeEnabled() || isRemoteControlHardDisabled() ? [remoteControlRow()] : []),
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
            async onChange(value) {
              let found = DIALOG_EXPIRY_OPTIONS.find((option) => option === value);
              if (!found) return;
              let dialogExpiry = found === "default" ? undefined : found;
              let dialogExpiry_2 = settingsData.dialogExpiry;
              setSettingsData((data) => ({
                ...data,
                dialogExpiry,
              }));
              let writeResult = await saveUserSettings({
                dialogExpiry,
              });
              if (writeResult?.error) {
                setSettingsData((data) => ({
                  ...data,
                  dialogExpiry: dialogExpiry_2,
                }));
                return {
                  error: writeResult.error,
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
            async onChange(value) {
              let found = GENERIC_TIMEOUT_OPTIONS.find((option) => option === value);
              if (!found) return;
              let crossSessionInbound = found === "default" ? undefined : found;
              let crossSessionInbound_2 = settingsData.crossSessionInbound;
              setSettingsData((data) => ({
                ...data,
                crossSessionInbound,
              }));
              let writeResult = await saveUserSettings({
                crossSessionInbound,
              });
              if (writeResult?.error) {
                setSettingsData((data) => ({
                  ...data,
                  crossSessionInbound: crossSessionInbound_2,
                }));
                return {
                  error: writeResult.error,
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
            onChange(value) {
              saveConfig((config) => {
                if (!env.ANTHROPIC_API_KEY) return config;
                let { approved, rejected } = customApiKeyResponsesOf(config);
                let keyTail = tailOfId(env.ANTHROPIC_API_KEY);
                let filtered = approved.filter((key) => key !== keyTail);
                let filtered_2 = rejected.filter((key) => key !== keyTail);
                return {
                  ...config,
                  customApiKeyResponses: value
                    ? {
                        approved: [...filtered, keyTail],
                        rejected: filtered_2,
                      }
                    : {
                        approved: filtered,
                        rejected: [...filtered_2, keyTail],
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
    settings: isRemoteSessionAvailable()
      ? settingRows.filter((row) => !isSessionScopedSetting(row.id))
      : settingRows,
    dialogFieldRows: [...agentRows, notifRow, ...pushRows],
    helpers: {
      onChangeMainModelConfig: applyModelChange,
      onChangeVerbose: setVerbose,
      changeNotifChannel: setNotifChannel,
      changeInputNeededNotif: setInputNeededNotif,
      changeAgentPushNotif: setAgentPushNotif,
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
