/**
 * components/Settings/Config.tsx
 *
 * /config 设置页（Config 标签）：可切换的全部设置项（主题、编辑器模式、通知、自动压缩、verbose、模型、输出样式、语言等），远程会话下说明作用范围。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Settings/Config.tsx
 * pieces: chunk-6f92z7de.js (1), chunk-9h8dr0qb.js (20)
 * attribution: placement 15, layout 3, fingerprint 2, sole-consumer 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { yt, R, y, Q, P, zt, Qr, ce } from "../../../vendor/react/cjs/react.production.js";
import {
  onReachabilityChange,
  getReachability,
  onHydrated,
} from "../../services/notifications/notificationPreferences.js";
import { noop_4, ColorStep } from "../agents/new-agent-creation/wizard-steps/ColorStep.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { WARNING_GLYPH, LEFT_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import {
  DEFAULT_GLOBAL_CONFIG,
  getCurrentProjectConfig,
  getAutoUpdaterDisabledReason,
  saveGlobalConfig,
  customApiKeyResponsesOf,
  formatAutoUpdaterDisabledReason,
  getGlobalConfig,
  NOTIFICATION_CHANNELS,
} from "../../utils/config.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { useStatusLineSuppressed } from "../StatusLine.js";
import { useTheme_2, useTheme, useThemeSetting } from "../design-system/ThemeProvider.js";
import { useSession } from "../../context/session.js";
import { useAppStoreDirect, useAppStateSession, useAppState, useSetAppState } from "../../state/AppState.js";
import { useNotifications } from "../../context/notifications.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { useHasScrollViewport } from "../ScrollViewportContext.js";
import {
  getEffectiveConfigValues,
  remoteForwardedSettings,
  alwaysFalse,
  buildConfigRows,
  FORWARD_SETTINGS_ERRORS,
  CONFIG_SAVE_FAILED,
} from "../../commands/config/configSettings.js";
import { getInitialSettings_2, updateSettingsForSource } from "../../utils/settings/settings.js";
import { getFeedbackDraftsSetting } from "../../services/feedbackDrafts.js";
import {
  isAutoContinueEnabled,
  isAutoContinueUserSetting,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { DEFAULT as DEFAULT_2, OUTPUT_STYLE_CONFIG } from "../../constants/outputStyles.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { isRemoteSessionAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { useMainLoopModelSetting } from "../../hooks/useMainLoopModel.js";
import { isFastModeEnabled, supportsFastMode, isFastModeAvailable } from "../../utils/fastMode.js";
import { useFastModeOnForModel } from "../../hooks/usePromptSuggestion.js";
import { CONFIG_ROWS_VERSION } from "../../plugins/functionHooks/configApi.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { hasAccessToIDEExtensionDiffFeature } from "../../utils/ide.js";
import { env } from "../../utils/env.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { isEligibleForOverageCreditGrant } from "../LogoV2/OverageCreditUpsell.js";
import { hasWorkflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { isArtifactConfigToggleable } from "../../services/artifacts/artifactToolGates.js";
import { isRemoteToolServingOnForSettings } from "../../services/remoteTools/servingGates.js";
import {
  getMemoryFilesCached,
  hasExternalClaudeMdIncludes,
  getExternalClaudeMdIncludes,
} from "../../utils/claudemd.js";
import { shouldShowConfigGate } from "./configGates.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { setPlanAutoModeOffAtLaunch } from "../../utils/permissions/autoModeState.js";
import {
  pluginConfigSettings,
  describedSettings,
  throughConfigSet,
  commitThroughConfigSet,
  shownSettingValue,
} from "../../commands/config/configShorthand.js";
import { logError } from "../../utils/log.js";
import {
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { sanitizeHookText } from "../../commands/model/modelSwitch.js";
import { logEvent } from "../../services/analytics/index.js";
import { isSettingsMovedToConfig } from "../../commands/createMovedToConfigCommand.js";
import { PANE_WIDTH_RESERVE, PANE_PADDING_X, PANE_PADDING } from "../design-system/Pane.js";
import { shortHash } from "../../utils/shortHash.js";
import { sequential } from "../../utils/sequential.js";
import { isAntBuild, getSafeModeExitHint, getClaudeConfigDir } from "../../utils/envUtils.js";
import { tailOfId } from "../../utils/auth/lockHolderLiveness.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { stripPrefix } from "../../utils/stringUtils.js";
import { ensurePolicyLimitsLoadedForDiagnostic } from "../../bridge/bridgeGates.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  recordExternalIncludesDecision,
  ClaudeMdExternalIncludesDialog,
} from "../ClaudeMdExternalIncludesDialog.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { isFleetBackgroundAllowed } from "../../utils/backgroundHandoff.js";
import { isAgentsFleetEnabled } from "../../utils/fleetGates.js";
import { merged } from "../CustomSelect/select.js";
import { merged as merged_2 } from "../CustomSelect/selectA11y.js";
import { ThemePicker } from "../ThemePicker.js";
import { themeWriter } from "../../commands/theme/themeWriter.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { parseCustomThemeRef } from "../../utils/customThemes.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { ModelPicker } from "../ModelPicker.js";
import { RemoteHomeSettingsDialog } from "../RemoteHomeSettingsDialog.js";
import { OutputStylePicker } from "../OutputStylePicker.js";
import { noteSystemPromptSectionInvalidation } from "../../bootstrap/state.js";
import { LanguagePicker } from "../LanguagePicker.js";
import { normalizeLanguageForSTT } from "../../hooks/useVoice.js";
import { localeOrNonconforming } from "../../services/analytics/metadata.js";
import { Dialog } from "../design-system/Dialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { AgentsList } from "../agents/AgentsList.js";
import { ChannelDowngradeDialog } from "../ChannelDowngradeDialog.js";
import { isKairosInputNeededPushEnabled } from "../../tools/PushNotificationTool/prompt.js";
import { SearchBox } from "../SearchBox.js";
import { cellText } from "../CustomSelect/selectTable.js";
import { permissionModeTitle } from "../../utils/permissions/PermissionMode.js";
import { workflowSizeDisplay } from "../../utils/workflows/workflowGates.js";

//@ chunk-9h8dr0qb.js:12815-13132 placement
function renderMobileNotice() {
  let u = w(1);
  if (yt(onReachabilityChange, getReachability, noop_4)?.has_active_channel !== false) {
    return null;
  }
  let p;
  if (u[0] === MEMO_CACHE_SENTINEL) {
    p = jsxProd_default_2(Text, {
      color: "warning",
      wrap: "truncate-end",
      children: [
        "  ",
        WARNING_GLYPH,
        " No mobile registered \xB7",
        " ",
        jsxProd_default(Link, {
          url: "https://claude.com/download#mobile",
          children: "get the app",
        }),
        " and turn on notif",
      ],
    });
    u[0] = p;
  } else p = u[0];
  return p;
}
//@ chunk-9h8dr0qb.js:13132-13703 placement
/**
 * 设置页分组标题（外观、模型与输出、显示、输入与控制、连接、插件、高级、实验、内部）。
 */
var CONFIG_SECTION_TITLES = [
  "Appearance",
  "Model & output",
  "Display",
  "Input & controls",
  "Connections",
  "Plugins",
  "Advanced",
  "Experimental",
  "Internal",
];
var MOVED_TO_SETTINGS_FIELDS = [
  {
    id: "autoUpdatesChannel",
    isSet: ({ settingsData }) => settingsData?.autoUpdatesChannel !== undefined,
  },
  {
    id: "worktreeBaseRef",
    isSet: ({ settingsData }) => settingsData?.worktree?.baseRef !== undefined,
  },
  {
    id: "gitignore",
    isSet: ({ globalConfig }) => globalConfig.respectGitignore !== DEFAULT_GLOBAL_CONFIG.respectGitignore,
  },
  {
    id: "copyFullResponse",
    isSet: ({ globalConfig }) => globalConfig.copyFullResponse !== DEFAULT_GLOBAL_CONFIG.copyFullResponse,
  },
  {
    id: "recap",
    isSet: ({ settingsData }) => settingsData?.awaySummaryEnabled !== undefined,
  },
];
var MOVED_TO_SETTINGS_IDS = new Set(MOVED_TO_SETTINGS_FIELDS.map((o) => o.id));
//@ chunk-9h8dr0qb.js:13703-13735 placement
function isMovedToSettings(o) {
  return MOVED_TO_SETTINGS_IDS.has(o);
}
//@ chunk-9h8dr0qb.js:13735-13830 placement
function sectionTitleWithNote(o, id) {
  return o === "Advanced" && isMovedToSettings(id)
    ? {
        name: o,
        note: "moving to settings.json",
      }
    : {
        name: o,
      };
}
//@ chunk-9h8dr0qb.js:13830-15061 placement
/**
 * 各分组包含的设置键。
 */
var CONFIG_SECTION_KEYS = {
  Appearance: ["theme", "language", "reduceMotion"],
  "Model & output": [
    "model",
    "fast",
    "switchModelsOnFlag",
    "autoContinueAtUsageLimit",
    "outputStyle",
    "defaultView",
    "verbose",
    "autoCompact",
    "idleCompaction",
    "thinking",
    "permissionMode",
    "useAutoModeDuringPlan",
  ],
  Display: [
    "autoScroll",
    "progressBar",
    "tips",
    "turnDuration",
    "timeFormat",
    "prStatus",
    "externalEditorContext",
  ],
  "Input & controls": [
    "editor",
    "askUserQuestionTimeout",
    "modelProposedGoals",
    "copyOnSelect",
    "promptSuggestionEnabled",
    "agentsView",
    "defaultToAgentsView",
    "checkpoints",
    "workflows",
    "workflowKeywordTriggerEnabled",
    "artifacts",
  ],
  Connections: [
    "notifChannel",
    "inputNeededNotifEnabled",
    "agentPushNotifEnabled",
    "autoConnectIde",
    "autoInstallIdeExtension",
    "diffTool",
    "chrome",
    "remoteControl",
    "remoteHomeSettings",
    ...[],
    "dialogExpiry",
    "crossSessionInbound",
    "showExternalIncludesDialog",
    "apiKey",
  ],
  Plugins: [],
  Advanced: MOVED_TO_SETTINGS_FIELDS.map((o) => o.id),
  Experimental: ["precomputeCompactionEnabled", "timestamps", "showStatusInTerminalTab", "teammateMode"],
  Internal: [
    ...[],
    "snipEnabled",
    "snipDebug",
    "doneMeansMerged",
    "autoUploadSessions",
    "autoAddRemoteControlDaemonWorker",
    "autofixPrMode",
  ],
};
var settingToSectionMap = new Map(
  CONFIG_SECTION_TITLES.flatMap((o) => CONFIG_SECTION_KEYS[o].map((u) => [u, o])),
);
var settingOrderMap = new Map(
  CONFIG_SECTION_TITLES.flatMap((o, u) => CONFIG_SECTION_KEYS[o].map((p, h) => [p, u * 1000 + h])),
);
//@ chunk-9h8dr0qb.js:15061-15099 placement
function isNestedSettingKey(o) {
  return o.includes(".");
}
//@ chunk-9h8dr0qb.js:15099-15161 placement
function sectionForSetting(id) {
  return settingToSectionMap.get(id) ?? (isNestedSettingKey(id) ? "Plugins" : "Advanced");
}
//@ chunk-9h8dr0qb.js:15161-15230 placement
var PLUGINS_SECTION_ORDER = CONFIG_SECTION_TITLES.indexOf("Plugins") * 1000;
var ADVANCED_SECTION_ORDER = CONFIG_SECTION_TITLES.indexOf("Advanced") * 1000 + 999;
//@ chunk-9h8dr0qb.js:15230-15277 placement
function settingSortKey(id) {
  return settingOrderMap.get(id) ?? (isNestedSettingKey(id) ? PLUGINS_SECTION_ORDER : ADVANCED_SECTION_ORDER);
}
//@ chunk-9h8dr0qb.js:15277-15419 placement
function sortSettingsByOrder(o) {
  return o
    .map((item, p) => ({
      item,
      i: p,
    }))
    .sort((u, p) => {
      let h = settingSortKey(u.item.id) - settingSortKey(p.item.id);
      return h !== 0 ? h : u.i - p.i;
    })
    .map(({ item }) => item);
}
//@ chunk-9h8dr0qb.js:15419-15563 placement
var SETTING_ID_RE = /^[a-z][A-Za-z0-9]{0,63}$/;
var SETTING_VALUE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
var FIXED_VALUE_LABELS = new Set(["Allowed", "Not allowed", "Switch automatically", "Ask each time", ...[]]);
//@ chunk-9h8dr0qb.js:15563-15621 placement
function markSettingIdSafe(id) {
  return SETTING_ID_RE.test(id) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(id) : lit("nonconforming");
}
//@ chunk-9h8dr0qb.js:15621-15690 placement
function markSettingValueSafe(o) {
  return SETTING_VALUE_ID_RE.test(o) || FIXED_VALUE_LABELS.has(o)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(o)
    : lit("nonconforming");
}
//@ chunk-9h8dr0qb.js:15690-15898 placement
function truncateToWidth(searchQuery, u) {
  if (bunStringWidth(searchQuery) <= u) return searchQuery;
  let max = Math.max(1, u - 1);
  let h = 0;
  let D = 0;
  while (D < searchQuery.length) {
    let code = searchQuery.charCodeAt(D);
    let T = code >= 55296 && code <= 56319 ? 2 : 1;
    let A = bunStringWidth(searchQuery.slice(D, D + T));
    if (h + A > max) break;
    h += A;
    D += T;
  }
  return searchQuery.slice(0, D) + "\u2026";
}
//@ chunk-9h8dr0qb.js:15898-15950 layout
function settingIdsKey(o) {
  return o.map((u) => u.id).join("\x00");
}
//@ chunk-9h8dr0qb.js:15950-16100 layout
function sameSettingLabels(o, prev) {
  if (o.size !== prev.size) return false;
  for (let [p, h] of o) {
    let D = prev.get(p);
    if (D === undefined || D.label !== h.label || D.hidden !== h.hidden) return false;
  }
  return true;
}
//@ chunk-9h8dr0qb.js:16100-16144 layout
function stopClickPropagation(event) {
  event.stopImmediatePropagation();
}
//@ chunk-9h8dr0qb.js:16144-41746 fingerprint = Config (0.475)
/**
 * /config 主体：可搜索的设置列表，布尔项回车切换、枚举项左右切换（主题、编辑器模式 normal/vim、通知方式、自动压缩、显示回合耗时、自动复制、减少动画、输出样式、模型、语言等），修改写入对应 settings 并记录事件。
 */
function Config({
  onClose,
  mcpClients,
  messages,
  setTabsHidden,
  onIsSearchModeChange,
  unclaimedPaneClick,
  contentHeight,
}) {
  let inAppSelection = useIsFullscreen();
  let v = false;
  let F = stableEmptyObject(false);
  let tabsStandIn = useStatusLineSuppressed();
  let { storageV5, credentials } = useTheme_2();
  let session = useSession();
  let appStoreDirect = useAppStoreDirect();
  let session_2 = useAppStateSession();
  let { addNotification } = useNotifications();
  let latestPick = R(0);
  let latestFastPick = R(0);
  let { headerFocused, focusHeader, blurHeader } = useTabHeaderFocus();
  let insideModal = useHasScrollViewport();
  let [, fe] = useTheme();
  let themeSetting = useThemeSetting();
  let [de, ve] = y(getEffectiveConfigValues);
  let pe = R(de);
  let [Ce, He] = y(() => ({
    ...getInitialSettings_2(),
    ...remoteForwardedSettings(),
    feedbackDrafts: getFeedbackDraftsSetting(),
    autoContinueAtUsageLimit: isAutoContinueEnabled(),
  }));
  let initialSettingsRef = R(getInitialSettings_2());
  let [outputStyle, setOutputStyle] = y(Ce?.outputStyle || DEFAULT_2);
  let outputStyleRef = R(outputStyle);
  let [Ue, Ie] = y(() => getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved === true);
  let [language, setLanguage] = y(Ce?.language);
  let languageRef = R(language);
  let [Ne, at] = y(undefined);
  let [ot, st] = y(undefined);
  let [et, Ge] = y(0);
  let [, Qe] = y(0);
  let idRef = R(null);
  let parsedModeRef = R("");
  let kt = R(null);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  useFocusOnMount(kt, isScreenReaderEnabled ? false : !headerFocused);
  let [Xe, tt] = y(!isScreenReaderEnabled);
  let isTerminalFocused = useTerminalFocus();
  let { rows, columns } = useTerminalSize();
  let _n = R(null);
  let [Qt, ps] = y(1);
  let In = contentHeight ?? Math.min(Math.floor(rows * 0.8), 30);
  let hn = !isRemoteSessionAvailable()
    ? null
    : getRemoteCaps()?.sessionId !== undefined
      ? "Changes here update this machine's settings and future cloud sessions, not the running one."
      : "Changes here update this machine's settings, not the running remote session.";
  let zi = hn === null ? 0 : Math.ceil((hn.length + 2) / Math.max(1, columns - 4));
  let maxVisible = Math.max(5, In - 8 - Qt - zi);
  let mainLoopModel = useAppState((k) => k.mainLoopModel);
  let mainLoopModelForSession = useAppState((s_0) => s_0.mainLoopModelForSession);
  let gs = useMainLoopModelSetting() ?? mainLoopModel;
  let verbose = useAppState((s_1) => s_1.verbose);
  let thinkingEnabled = useAppState((s_2) => s_2.thinkingEnabled);
  let promptSuggestionEnabled = useAppState((s_3) => (isFastModeEnabled() ? s_3.fastMode : false));
  let fastModeOnForModel = useFastModeOnForModel(promptSuggestionEnabled, gs);
  let promptSuggestionEnabled_2 = useAppState((k) => k.promptSuggestionEnabled);
  let awaySummaryEnabled = useAppState((k) => k.awaySummaryEnabled);
  let showDefaultViewPicker = require("./chunk-cv3kgbt2.js").isBriefEntitled();
  let setAppState = useSetAppState();
  let [Yi, hs] = y(() => new Map());
  let changeLog = Q(
    () => ({
      record: (k, oe, se) =>
        hs((ge) => {
          let be = new Map(ge);
          if (se?.moveToEnd) be.delete(k);
          return be.set(k, oe);
        }),
      clear: (k) =>
        hs((oe) => {
          let se = new Map(oe);
          se.delete(k);
          return se;
        }),
      toggle: (k, oe) =>
        hs((se) => {
          let ge = new Map(se);
          return ge.delete(k) ? ge : ge.set(k, oe);
        }),
    }),
    [],
  );
  let thinkingEnabledRef = R(thinkingEnabled);
  P(() => onHydrated(() => ve(getEffectiveConfigValues())), []);
  let [zl, ho] = y(false);
  let [qi, On] = y(null);
  let [Be, Fe] = y(null);
  let Ln = R(0);
  let [Qi, Xi] = y(null);
  let [Ji, Zi] = y(null);
  let [Ss, ta] = y("");
  let enabled = useAppState((k) => k.plugins.enabled);
  let [Gl, Yl] = y(() => new Map());
  let [ql, Ql] = y(() => new Map());
  let Xl = yt(CONFIG_ROWS_VERSION.subscribe, CONFIG_ROWS_VERSION.get);
  zt(() => {
    if (!_n.current) return;
    let height = measureElement(_n.current).height;
    if (height !== Qt) ps(height);
  }, [headerFocused, Xe, columns, rows, Qt, Be]);
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: Xe && Be === null && !headerFocused,
    onExit: () => tt(false),
    onExitUp: focusHeader,
    passthroughCtrlKeys: ["c", "d"],
  });
  let oa = !headerFocused;
  P(() => {
    onIsSearchModeChange(oa);
  }, [oa, onIsSearchModeChange]);
  let isConnectedToIde = hasAccessToIDEExtensionDiffFeature(mcpClients);
  let isFileCheckpointingAvailable = !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING;
  let setting = resolveSetting("disableWorkflows", false);
  let setting_2 = resolveSetting("enableWorkflows", false);
  let workflowsToggleable =
    isEligibleForOverageCreditGrant() &&
    (setting.value !== true || setting.source === "userSettings") &&
    (setting_2.source === "default" || setting_2.source === "userSettings");
  let workflowSizeGuidelineToggleable = !hasWorkflowSizeSetting();
  let autoContinueAtUsageLimitToggleable = isAutoContinueUserSetting();
  let artifactToggleable = isArtifactConfigToggleable();
  let [ac] = y(isRemoteToolServingOnForSettings);
  let rc = alwaysFalse();
  let launchDirectoryKeys = Q(() => null, [rc]);
  let isConnectedToIde_2 = Qr(getMemoryFilesCached(session, true, storageV5, credentials));
  let shouldShowExternalIncludesToggle = hasExternalClaudeMdIncludes(isConnectedToIde_2);
  let autoUpdaterDisabledReason = getAutoUpdaterDisabledReason();
  let bs = shouldShowConfigGate();
  let {
    settings,
    dialogFieldRows,
    helpers: { onChangeMainModelConfig, changeNotifChannel, changeInputNeededNotif, changeAgentPushNotif },
  } = buildConfigRows({
    globalConfig: de,
    settingsData: Ce,
    themeSetting,
    currentOutputStyle: outputStyle,
    currentLanguage: language,
    externalIncludesApproved: Ue,
    thinkingEnabled,
    verbose,
    mainLoopModel,
    currentModel: gs,
    isFastMode: promptSuggestionEnabled,
    promptSuggestionEnabled: promptSuggestionEnabled_2,
    awaySummaryEnabled,
    showDefaultViewPicker,
    pushTogglesVisible: bs,
    crossSessionInboxRowVisible: isCrossSessionMessagingEnabled(),
    isConnectedToIde,
    inAppSelection,
    tabsStandIn,
    isFileCheckpointingAvailable,
    workflowsToggleable,
    workflowSizeGuidelineToggleable,
    autoContinueAtUsageLimitToggleable,
    artifactToggleable,
    remoteToolServingOn: ac,
    launchDirectoryKeys,
    shouldShowExternalIncludesToggle,
    autoUpdaterDisabledReason,
    storageV5,
    promptSuggestionRun: session.promptSuggestion,
    mayBeAuthoredByNonOwner: false,
    modelSwitchHooks: {
      session: session_2,
      readState: appStoreDirect.getState,
      latestPick,
      latestFastPick,
    },
    setAppState,
    setTheme: fe,
    setGlobalConfig: ve,
    setSettingsData: He,
    setPlanAutoModeOffAtLaunch,
    changeLog,
  });
  let Nn = [
    ...settings,
    ...pluginConfigSettings(enabled, {
      storageV5,
      shown: Gl,
      onShown: (k, oe) => Yl((value) => new Map(value).set(k, oe)),
    }),
  ];
  let hc = settingIdsKey(Nn);
  P(() => {
    let k = true;
    describedSettings(Nn)
      .then((prev) => {
        if (k) Ql((prev_0) => (sameSettingLabels(prev_0, prev) ? prev_0 : prev));
      })
      .catch((value_0) => {
        logError(toError(value_0));
      });
    return () => {
      k = false;
    };
  }, [hc, Xl]);
  let flattened = Nn.flatMap((current) => {
    let oe = ql.get(current.id);
    if (oe?.hidden) return [];
    let se =
      oe === undefined || oe.label === current.label
        ? current
        : "labelBoldSuffix" in current
          ? {
              ...current,
              label: oe.label,
              labelBoldSuffix: "",
            }
          : {
              ...current,
              label: oe.label,
            };
    return [throughConfigSet(se)];
  });
  let Sn = ce(
    (k, oe) => {
      Promise.resolve(k)
        .then((prev_1) => {
          if (prev_1 && "error" in prev_1 && prev_1.error) {
            oe?.();
            addNotification({
              key: "config-change-refused",
              kind: "warning",
              text: prev_1.error.message,
              color: "warning",
              priority: "immediate",
            });
          }
        })
        .catch((prev_2) => {
          logError(toError(prev_2));
        });
    },
    [addNotification],
  );
  let So = (current_0) => {
    let found = Nn.find((prev_3) => prev_3.id === current_0);
    return found === undefined ? undefined : throughConfigSet(found);
  };
  let Cs = (k, oe, se, ge) => {
    let be = dialogFieldRows.find((prev_4) => prev_4.id === k) ?? Nn.find((prev_5) => prev_5.id === k);
    Sn(commitThroughConfigSet(be, oe, se), ge);
  };
  let bo = (k, oe, se) => {
    let ge = Ln.current;
    Cs(k, oe, se, () => {
      if (Ln.current === ge) {
        Ln.current += 1;
        Fe(null);
        setTabsHidden(false);
      }
    });
  };
  let Co = ce(
    (k, oe) => {
      if (k !== "latest" && k !== "stable")
        return {
          error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Auto-update channel doesn't accept "${sanitizeHookText(String(k))}".`,
            "auto-update channel rewritten to a value the row does not know",
          ),
        };
      if (oe.kind === "enable") {
        saveGlobalConfig(
          (prev_6) => ({
            ...prev_6,
            autoUpdates: true,
          }),
          storageV5,
        );
        ve((prev_7) => ({
          ...prev_7,
          autoUpdates: true,
        }));
        updateSettingsForSource(
          "userSettings",
          {
            autoUpdatesChannel: k,
            minimumVersion: undefined,
          },
          undefined,
          storageV5,
        );
        He((prev_8) => ({
          ...prev_8,
          autoUpdatesChannel: k,
          minimumVersion: undefined,
        }));
        logEvent("tengu_autoupdate_enabled", {
          channel: fromEnum(k),
        });
        return;
      }
      let se =
        k === "latest"
          ? {
              autoUpdatesChannel: undefined,
              minimumVersion: undefined,
            }
          : oe.minimumVersion === undefined
            ? {
                autoUpdatesChannel: k,
              }
            : {
                autoUpdatesChannel: k,
                minimumVersion: oe.minimumVersion,
              };
      updateSettingsForSource("userSettings", se, undefined, storageV5);
      He((prev_9) => ({
        ...prev_9,
        ...se,
      }));
      logEvent("tengu_autoupdate_channel_changed", {
        channel: fromEnum(k),
        ...(k === "stable" && {
          minimum_version_set: oe.minimumVersion !== undefined,
        }),
      });
    },
    [storageV5],
  );
  let en = isSettingsMovedToConfig();
  let bt = Q(() => {
    let settingsItems = en ? sortSettingsByOrder(flattened) : flattened;
    if (!searchQuery) return settingsItems;
    let lowerQuery = searchQuery.toLowerCase();
    return settingsItems.filter((setting) => {
      if (setting.id.toLowerCase().includes(lowerQuery)) return true;
      if (
        (("searchText" in setting ? setting.searchText : undefined) ?? setting.label)
          .toLowerCase()
          .includes(lowerQuery)
      )
        return true;
      if (setting.type === "enum")
        return setting.options.some((prev_11) => prev_11.toLowerCase().includes(lowerQuery));
      return false;
    });
  }, [flattened, searchQuery, en]);
  P(() => {
    if (isScreenReaderEnabled || idRef.current === null) return;
    if (Xe || Ne !== idRef.current) idRef.current = null;
  }, [isScreenReaderEnabled, Ne, Xe]);
  let yc = yt(onReachabilityChange, getReachability, () => {
    return;
  });
  let max = Math.max(1, columns - 2 * (insideModal ? PANE_WIDTH_RESERVE + PANE_PADDING_X : PANE_PADDING));
  let max_2 = Math.max(1, max - 7);
  let ws = truncateToWidth(searchQuery, max_2);
  let cursorOffset = Math.min(searchCursorOffset, ws.length);
  let wc = ce(() => {
    if (Be !== null) return;
    let formattedChanges = [...Yi].map(([key, value]) => {
      let Wn = fromEnum(key);
      logEvent("tengu_config_changed", {
        key: Wn,
        setting: Wn,
        value: shortHash(String(value)),
      });
      return `Set ${key} to ${sequential.bold(value)}`;
    });
    let effectiveApiKey = isAntBuild() ? undefined : env.ANTHROPIC_API_KEY;
    let initialUsingCustomKey = Boolean(
      effectiveApiKey && customApiKeyResponsesOf(pe.current).approved.includes(tailOfId(effectiveApiKey)),
    );
    let currentUsingCustomKey = Boolean(
      effectiveApiKey && customApiKeyResponsesOf(de).approved.includes(tailOfId(effectiveApiKey)),
    );
    if (initialUsingCustomKey !== currentUsingCustomKey) {
      formattedChanges.push(`${currentUsingCustomKey ? "Enabled" : "Disabled"} custom API key`);
      logEvent("tengu_config_changed", {
        key: lit("env.ANTHROPIC_API_KEY"),
        setting: lit("env.ANTHROPIC_API_KEY"),
        value: currentUsingCustomKey,
      });
    }
    if (de.theme !== pe.current.theme) formattedChanges.push(`Set theme to ${sequential.bold(de.theme)}`);
    if (de.preferredNotifChannel !== pe.current.preferredNotifChannel)
      formattedChanges.push(`Set notifications to ${sequential.bold(de.preferredNotifChannel)}`);
    if (outputStyle !== outputStyleRef.current)
      formattedChanges.push(`Set output style to ${sequential.bold(outputStyle)}`);
    if (language !== languageRef.current)
      formattedChanges.push(`Set response language to ${sequential.bold(language ?? "Default (English)")}`);
    if (de.editorMode !== pe.current.editorMode)
      formattedChanges.push(`Set editor mode to ${sequential.bold(de.editorMode || "emacs")}`);
    if (de.diffTool !== pe.current.diffTool)
      formattedChanges.push(`Set diff tool to ${sequential.bold(de.diffTool)}`);
    if (de.autoConnectIde !== pe.current.autoConnectIde)
      formattedChanges.push(`${de.autoConnectIde ? "Enabled" : "Disabled"} auto-connect to IDE`);
    if (de.autoInstallIdeExtension !== pe.current.autoInstallIdeExtension)
      formattedChanges.push(
        `${de.autoInstallIdeExtension ? "Enabled" : "Disabled"} auto-install IDE extension`,
      );
    if (de.autoCompactEnabled !== pe.current.autoCompactEnabled)
      formattedChanges.push(`${de.autoCompactEnabled ? "Enabled" : "Disabled"} auto-compact`);
    if (de.autoScrollEnabled !== pe.current.autoScrollEnabled)
      formattedChanges.push(`${de.autoScrollEnabled ? "Enabled" : "Disabled"} auto-scroll`);
    if (de.respectGitignore !== pe.current.respectGitignore)
      formattedChanges.push(
        `${de.respectGitignore ? "Enabled" : "Disabled"} respect .gitignore in file picker`,
      );
    if (de.copyFullResponse !== pe.current.copyFullResponse)
      formattedChanges.push(`${de.copyFullResponse ? "Enabled" : "Disabled"} always copy full response`);
    if (de.copyOnSelect !== pe.current.copyOnSelect)
      formattedChanges.push(`${de.copyOnSelect ? "Enabled" : "Disabled"} copy on select`);
    if (de.leftArrowOpensAgents !== pe.current.leftArrowOpensAgents)
      formattedChanges.push(
        `${(de.leftArrowOpensAgents ?? true) ? "Enabled" : "Disabled"} ${LEFT_ARROW} opens agents`,
      );
    if (de.defaultToAgentsView !== pe.current.defaultToAgentsView)
      formattedChanges.push(`${de.defaultToAgentsView ? "Enabled" : "Disabled"} open agents view by default`);
    if (de.terminalProgressBarEnabled !== pe.current.terminalProgressBarEnabled)
      formattedChanges.push(
        `${de.terminalProgressBarEnabled ? "Enabled" : "Disabled"} terminal progress bar`,
      );
    if (de.showStatusInTerminalTab !== pe.current.showStatusInTerminalTab)
      formattedChanges.push(`${de.showStatusInTerminalTab ? "Enabled" : "Disabled"} terminal tab status`);
    if (de.showTurnDuration !== pe.current.showTurnDuration)
      formattedChanges.push(`${de.showTurnDuration ? "Enabled" : "Disabled"} turn duration`);
    if (de.showMessageTimestamps !== pe.current.showMessageTimestamps)
      formattedChanges.push(`${de.showMessageTimestamps ? "Enabled" : "Disabled"} message timestamps`);
    if (de.remoteControlAtStartup !== pe.current.remoteControlAtStartup) {
      let remoteLabel =
        de.remoteControlAtStartup === undefined
          ? "Reset Remote Control to default"
          : `${de.remoteControlAtStartup ? "Enabled" : "Disabled"} Remote Control for all sessions`;
      formattedChanges.push(remoteLabel);
    }
    if (Ce?.autoUpdatesChannel !== initialSettingsRef.current?.autoUpdatesChannel)
      formattedChanges.push(
        `Set auto-update channel to ${sequential.bold(Ce?.autoUpdatesChannel === "rc" ? "slow" : (Ce?.autoUpdatesChannel ?? "latest"))}`,
      );
    if (formattedChanges.length > 0)
      onClose(
        formattedChanges.join(`
`),
      );
    else
      onClose("Config dialog dismissed", {
        display: "system",
      });
  }, [
    Be,
    Yi,
    de,
    mainLoopModel,
    outputStyle,
    language,
    Ce?.autoUpdatesChannel,
    isFastModeEnabled() ? Ce?.fastMode : undefined,
    onClose,
  ]);
  useKeybinding("confirm:no", wc, {
    context: "Settings",
    isActive: Be === null && !Xe && !headerFocused,
  });
  let ks = ce(
    (current_1) =>
      en && current_1.type === "managedEnum" && current_1.id === "showExternalIncludesDialog" && Ue,
    [en, Ue],
  );
  let kc = ce(
    (current_2) =>
      MOVED_TO_SETTINGS_FIELDS.find((current_3) => current_3.id === current_2)?.isSet({
        settingsData: Ce,
        globalConfig: de,
      }) ?? false,
    [Ce, de],
  );
  let wo = ce(
    (k, oe) => {
      let se = k.onChange(oe);
      let ge = (current_4) => {
        if (current_4 && "error" in current_4 && current_4.error) {
          addNotification({
            key: "config-change-refused",
            kind: "warning",
            text: current_4.error.message,
            color: "warning",
            priority: "immediate",
          });
          return;
        }
        if (current_4 && "messageSuffix" in current_4 && current_4.messageSuffix)
          addNotification({
            key: "config-change-note",
            kind: "feedback",
            text: stripPrefix(current_4.messageSuffix, " \xB7 "),
            priority: "immediate",
          });
        logEvent("tengu_config_changed", {
          setting: markSettingIdSafe(k.id),
          value: k.provided === undefined ? markSettingValueSafe(oe) : lit("plugin_field"),
        });
      };
      if (se instanceof Promise) {
        se.then(ge);
        return;
      }
      ge(se);
    },
    [addNotification],
  );
  let Tt = Q(() => {
    let found = flattened.find((current_5) => current_5.id === Qi);
    return found && found.type === "enum" ? found : undefined;
  }, [flattened, Qi]);
  let tn = ce(() => {
    Xi(null);
    Fe(null);
    setTabsHidden(false);
  }, [setTabsHidden]);
  let Dt = Q(() => {
    let found = flattened.find((oe) => oe.id === Ji);
    return found && found.type === "managedEnum" ? found : undefined;
  }, [flattened, Ji]);
  let bn = ce(() => {
    Zi(null);
    Fe(null);
    setTabsHidden(false);
  }, [setTabsHidden]);
  zt(() => {
    if (Be === "TextEdit" && Dt === undefined) bn();
    else if (Be === "EnumPicker" && Tt === undefined) tn();
  }, [Be, Dt, Tt, bn, tn]);
  P(
    () =>
      unclaimedPaneClick.subscribe(() => {
        if (Be === "EnumPicker") tn();
        else if (Be === "TextEdit") bn();
      }),
    [unclaimedPaneClick, Be, tn, bn],
  );
  let Fn = ce(
    (k, oe) => {
      if (idRef.current !== null && idRef.current !== k.id) {
        let parsedMode = settingIdsKey(bt);
        if (isScreenReaderEnabled && parsedMode !== parsedModeRef.current) {
          idRef.current = null;
          parsedModeRef.current = parsedMode;
          return;
        }
        idRef.current = null;
      }
      if (k.lock !== undefined) {
        if (k.lock.source === "managed") return;
        idRef.current = k.id;
        parsedModeRef.current = settingIdsKey(bt);
        ensurePolicyLimitsLoadedForDiagnostic()
          .catch(() => {})
          .finally(() => Qe((se) => se + 1));
        return;
      }
      if (idRef.current === k.id) {
        idRef.current = null;
        Qe((se) => se + 1);
        return;
      }
      if (k.id === "remoteHomeSettings" && k.value === false) {
        if (k.grantBlocker !== undefined) {
          logFeatureBad("remote_home_settings_mode", k.grantBlocker);
          On(FORWARD_SETTINGS_ERRORS[k.grantBlocker]);
        } else {
          Fe("RemoteHomeSettings");
          setTabsHidden(true);
        }
        return;
      }
      if (k.type === "boolean") {
        let se = typeof oe === "boolean" ? oe : !k.value;
        let ge = k.onChange(se);
        if (k.id === "remoteHomeSettings") {
          On(null);
          Promise.resolve(ge).then((prev_12) => {
            if (prev_12?.error) On(prev_12.error.message);
            else if (prev_12?.messageSuffix) On(`Saved${prev_12.messageSuffix}`);
          });
        }
        Promise.resolve(ge)
          .then((prev_13) => {
            if (k.id === "remoteHomeSettings") return;
            if (prev_13 && "error" in prev_13 && prev_13.error) {
              addNotification({
                key: "config-change-refused",
                kind: "warning",
                text: prev_13.error.message,
                color: "warning",
                priority: "immediate",
              });
              return;
            }
            if (prev_13 && prev_13.messageSuffix)
              addNotification({
                key: "config-change-note",
                kind: "feedback",
                text: stripPrefix(prev_13.messageSuffix, " \xB7 "),
                priority: "immediate",
              });
          })
          .catch((prev_14) => {
            logError(toError(prev_14));
            addNotification({
              key: "config-change-refused",
              kind: "warning",
              text: `Setting change failed: ${sanitizeHookText(errorMessage(prev_14))}`,
              color: "warning",
              priority: "immediate",
            });
          });
        logEvent("tengu_config_changed", {
          setting: markSettingIdSafe(k.id),
          value: se,
        });
        if (k.id === "thinking") {
          if (se === thinkingEnabledRef.current) ho(false);
          else if (messages.some((prev_15) => prev_15.type === "assistant")) ho(true);
        }
        return;
      }
      if (ks(k)) {
        recordExternalIncludesDecision(false, "config_toggle", storageV5);
        Ie(false);
        return;
      }
      if (k.id === "agentsView") {
        Fe("AgentsView");
        setTabsHidden(true);
        return;
      }
      if (k.id === "notifChannel" && k.type === "managedEnum") {
        Fe("Notifications");
        setTabsHidden(true);
        return;
      }
      if (k.provided !== undefined && k.type === "managedEnum") {
        Zi(k.id);
        ta(shownSettingValue(k));
        Fe("TextEdit");
        setTabsHidden(true);
        return;
      }
      if (
        k.id === "theme" ||
        k.id === "model" ||
        k.id === "showExternalIncludesDialog" ||
        k.id === "outputStyle" ||
        k.id === "language"
      )
        switch (k.id) {
          case "theme":
            Fe("Theme");
            setTabsHidden(true);
            return;
          case "model":
            Fe("Model");
            setTabsHidden(true);
            return;
          case "showExternalIncludesDialog":
            Fe("ExternalIncludes");
            setTabsHidden(true);
            return;
          case "outputStyle":
            Fe("OutputStyle");
            setTabsHidden(true);
            return;
          case "language":
            Fe("Language");
            setTabsHidden(true);
            return;
        }
      if (k.id === "autoUpdatesChannel") {
        if (autoUpdaterDisabledReason) {
          Fe("EnableAutoUpdates");
          setTabsHidden(true);
          return;
        }
        if ((Ce?.autoUpdatesChannel ?? "latest") === "latest") {
          Fe("ChannelDowngrade");
          setTabsHidden(true);
        } else
          Sn(
            commitThroughConfigSet(k, "latest", (prev_16) =>
              Co(prev_16, {
                kind: "switch",
              }),
            ),
          );
        return;
      }
      if (k.type === "enum" && k.pickToCommit) {
        Xi(k.id);
        Fe("EnumPicker");
        setTabsHidden(true);
        return;
      }
      if (k.type === "enum") {
        let ge = (k.options.indexOf(k.value) + 1) % k.options.length;
        wo(k, typeof oe === "string" && k.options.includes(oe) ? oe : k.options[ge]);
        return;
      }
    },
    [
      addNotification,
      autoUpdaterDisabledReason,
      wo,
      ks,
      bt,
      isScreenReaderEnabled,
      Sn,
      Ce?.autoUpdatesChannel,
      setTabsHidden,
      storageV5,
      Co,
    ],
  );
  MessageActionsKeybindings(
    {
      "settings:search": () => {
        tt(true);
        setSearchQuery("");
      },
    },
    {
      context: "Settings",
      isActive: Be === null && !Xe && !headerFocused && !isScreenReaderEnabled,
    },
  );
  let ra = Q(
    () => [
      ...(isFleetBackgroundAllowed()
        ? [
            {
              id: "leftArrowOpensAgents",
              label: `${LEFT_ARROW} opens agents`,
              value: de.leftArrowOpensAgents ?? true,
            },
          ]
        : []),
      ...(isAgentsFleetEnabled()
        ? [
            {
              id: "defaultToAgentsView",
              label: "Start in agent view",
              value: de.defaultToAgentsView ?? false,
            },
          ]
        : []),
    ],
    [de.leftArrowOpensAgents, de.defaultToAgentsView],
  );
  let Tc = ce(
    (k, oe) => {
      if (k === "leftArrowOpensAgents") {
        saveGlobalConfig(
          (current_6) => ({
            ...current_6,
            leftArrowOpensAgents: oe,
          }),
          storageV5,
        );
        ve((current_7) => ({
          ...current_7,
          leftArrowOpensAgents: oe,
        }));
      } else {
        saveGlobalConfig(
          (current_8) => ({
            ...current_8,
            defaultToAgentsView: oe,
          }),
          storageV5,
        );
        ve((current_9) => ({
          ...current_9,
          defaultToAgentsView: oe,
        }));
      }
      logEvent("tengu_config_changed", {
        setting: fromEnum(k),
        value: oe,
      });
    },
    [storageV5],
  );
  let onKeyDown = ce(
    (e) => {
      if (Be !== null) return;
      if (headerFocused) return;
      if (Xe) {
        if ((e.key === "return" || e.key === "down") && bt.length === 0) {
          e.preventDefault();
          return;
        }
        handleKeyDown(e);
        if (e.key === "escape") {
          e.preventDefault();
          if (searchQuery.length > 0) setSearchQuery("");
          else tt(false);
          return;
        }
        if (e.key === "return" || e.key === "down") {
          e.preventDefault();
          tt(false);
          Ge((current_11) => current_11 + 1);
        }
        return;
      }
      if (e.defaultPrevented) return;
      if (e.key === "tab" || e.key === "left" || e.key === "right") {
        e.preventDefault();
        return;
      }
      if (e.ctrl || e.meta) return;
      if (e.key.length === 1 && e.key !== " ") {
        e.preventDefault();
        tt(true);
        setSearchQuery(e.key === "/" ? "" : e.key);
      }
    },
    [Be, headerFocused, Xe, searchQuery, setSearchQuery, handleKeyDown, bt.length],
  );
  let Ts = !headerFocused && !Xe;
  let la = () => {
    if (headerFocused) blurHeader();
    tt(false);
  };
  let Ds = `${et} ${searchQuery}`;
  let lock = (ot === Ds ? bt.find((current_12) => current_12.id === Ne) : bt[0])?.lock;
  let ca = 0;
  let Un = maxVisible - ca - 1 >= 5 ? ca : 0;
  let vc = Un > 0;
  let children = bt.flatMap((k, oe) => {
    let se = en ? sectionForSetting(k.id) : undefined;
    let ge = se !== undefined && (oe === 0 || sectionForSetting(bt[oe - 1]?.id ?? "") !== se);
    let children =
      k.id === "autoUpdatesChannel" && autoUpdaterDisabledReason
        ? `disabled (${formatAutoUpdaterDisabledReason(autoUpdaterDisabledReason)})`
        : formatSettingValue(k, shownSettingValue(k), en, false);
    let mt = ge ? sectionTitleWithNote(se, k.id) : undefined;
    let Wn = k.lock !== undefined;
    let Mc =
      ks(k) ||
      (k.type === "enum" && !k.pickToCommit) ||
      (k.id === "autoUpdatesChannel" &&
        autoUpdaterDisabledReason === null &&
        (Ce?.autoUpdatesChannel ?? "latest") !== "latest");
    return [
      ...(ge && oe > 0 ? [jsxProd_default(merged.Heading, {}, `${se} gap`)] : []),
      ...(mt
        ? [
            jsxProd_default(
              merged.Heading,
              {
                children: jsxProd_default_2(Text, {
                  wrap: "truncate-end",
                  children: [
                    jsxProd_default(Text, {
                      bold: true,
                      children: mt.name,
                    }),
                    mt.note !== undefined &&
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: ["  ", mt.note],
                      }),
                  ],
                }),
              },
              se,
            ),
          ]
        : []),
      jsxProd_default(
        merged_2.Field,
        {
          label: [
            "labelBoldSuffix" in k ? k.label + k.labelBoldSuffix : k.label,
            ...(k.provided === undefined ? [] : [k.provided.plugin]),
          ].join(" \xB7 "),
          description:
            [
              zl && k.id === "thinking" ? `${WARNING_GLYPH} ${THINKING_CHANGE_WARNING}` : undefined,
              k.id === "remoteHomeSettings" && qi !== null ? `${WARNING_GLYPH} ${qi}` : undefined,
              k.notice === undefined ? undefined : `${WARNING_GLYPH} ${k.notice}`,
              vc ? undefined : k.lock?.reason,
              se === "Advanced" && kc(k.id) ? "\u2192 settings.json" : undefined,
            ]
              .filter((prev_18) => prev_18 !== undefined)
              .join(" ") || undefined,
          ink: undefined,
          children:
            k.lock?.source === "policy"
              ? jsxProd_default(merged_2.Button, {
                  onPress: () => Fn(k),
                  children,
                })
              : k.type === "boolean"
                ? jsxProd_default(merged_2.Toggle, {
                    value: k.value,
                    onChange: (prev_19) => Fn(k, prev_19),
                    disabled: Wn,
                  })
                : Wn
                  ? jsxProd_default(merged_2.Button, {
                      onPress: () => {},
                      disabled: true,
                      children,
                    })
                  : k.type === "enum" && !k.pickToCommit && k.options.includes(k.value)
                    ? jsxProd_default(merged_2.Select, {
                        value: k.value,
                        options: k.options.map((current_13) => ({
                          value: current_13,
                          label: formatSettingValue(
                            k,
                            shownSettingValue({
                              ...k,
                              value: current_13,
                            }),
                            en,
                            false,
                          ),
                        })),
                        onChange: (current_14) => Fn(k, current_14),
                      })
                    : Mc
                      ? jsxProd_default(merged_2.Button, {
                          onPress: () => Fn(k),
                          children,
                        })
                      : jsxProd_default(merged_2.Link, {
                          onOpen: () => Fn(k),
                          children,
                        }),
        },
        k.id,
      ),
      ...((k.id === "inputNeededNotifEnabled" || k.id === "agentPushNotifEnabled") &&
      yc?.has_active_channel === false
        ? [jsxProd_default(renderMobileNotice, {}, `${k.id} warning`)]
        : []),
    ];
  });
  return jsxProd_default(Box, {
    ref: kt,
    flexDirection: "column",
    width: "100%",
    ...(isScreenReaderEnabled
      ? {}
      : {
          tabIndex: 0,
          autoFocus: !headerFocused,
          onKeyDown,
          onPaste: handlePaste,
          onWheel: Be === null && !Ts && bt.length > 0 ? la : undefined,
        }),
    children:
      Be === "Theme"
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(ThemePicker, {
                onThemeSelect: (current_15) => {
                  let oe = commitThroughConfigSet(So("theme"), current_15, themeWriter(fe));
                  Sn(oe);
                  Fe(null);
                  setTabsHidden(false);
                  return oe;
                },
                onCancel: () => {
                  Fe(null);
                  setTabsHidden(false);
                },
                helpText: isCustomizationDisabled("themes")
                  ? `Custom themes are disabled in safe mode \u2014 ${getSafeModeExitHint()} to load them${parseCustomThemeRef(themeSetting) ? `. Your saved theme "${parseCustomThemeRef(themeSetting)}" is a custom theme; selecting a preset here replaces it` : ""}`
                  : "",
                hideEscToCancel: true,
                skipExitHandling: true,
              }),
              jsxProd_default(Box, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: jsxProd_default_2(Byline, {
                    children: [
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "enter",
                        action: "select",
                      }),
                      jsxProd_default(ConfigurableShortcutHint, {
                        action: "confirm:no",
                        context: "Confirmation",
                        fallback: "Esc",
                        description: "cancel",
                      }),
                    ],
                  }),
                }),
              }),
            ],
          })
        : Be === "Model"
          ? jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(ModelPicker, {
                  initial: mainLoopModel,
                  sessionModel: mainLoopModelForSession,
                  onSelect: (k, oe) => {
                    Promise.resolve(
                      commitThroughConfigSet(So("model"), k ?? "default", (current_16) =>
                        onChangeMainModelConfig(current_16 === "default" ? null : String(current_16), oe),
                      ),
                    )
                      .then((current_17) => {
                        if (current_17 && "error" in current_17 && current_17.error)
                          addNotification({
                            key: "model-switch-blocked",
                            kind: "warning",
                            text: current_17.error.message,
                            color: "warning",
                            priority: "immediate",
                          });
                      })
                      .catch((current_18) => {
                        logError(toError(current_18));
                        addNotification({
                          key: "model-switch-blocked",
                          kind: "warning",
                          text: `Model switch failed: ${sanitizeHookText(errorMessage(current_18))}`,
                          color: "warning",
                          priority: "immediate",
                        });
                      });
                    Fe(null);
                    setTabsHidden(false);
                  },
                  onCancel: () => {
                    Fe(null);
                    setTabsHidden(false);
                  },
                  showFastModeNotice: isFastModeEnabled()
                    ? fastModeOnForModel && supportsFastMode(gs) && isFastModeAvailable()
                    : false,
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  italic: false,
                  children: jsxProd_default_2(Byline, {
                    children: [
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "enter",
                        action: "confirm",
                        ...F,
                      }),
                      jsxProd_default(ConfigurableShortcutHint, {
                        action: "confirm:no",
                        context: "Confirmation",
                        fallback: "Esc",
                        description: "cancel",
                        ...F,
                      }),
                    ],
                  }),
                }),
              ],
            })
          : Be === "RemoteHomeSettings"
            ? jsxProd_default(RemoteHomeSettingsDialog, {
                configHome: getClaudeConfigDir(),
                storageV5,
                origin: "config_panel",
                onDone: (current_19) => {
                  On(
                    current_19 === "not_saved"
                      ? FORWARD_SETTINGS_ERRORS.flag_off
                      : current_19 === "not_stored"
                        ? CONFIG_SAVE_FAILED
                        : null,
                  );
                  if (current_19 === "forward")
                    logEvent("tengu_config_changed", {
                      setting: lit("remoteHomeSettings"),
                      value: true,
                    });
                  if (current_19 === "forward" || current_19 === "keep_local")
                    ve((current_20) => ({
                      ...current_20,
                      remoteHomeSettingsMode: getGlobalConfig().remoteHomeSettingsMode,
                    }));
                  Fe(null);
                  setTabsHidden(false);
                },
              })
            : Be === "ExternalIncludes"
              ? jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default(ClaudeMdExternalIncludesDialog, {
                      onDone: () => {
                        Ie(getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved === true);
                        Fe(null);
                        setTabsHidden(false);
                      },
                      externalIncludes: getExternalClaudeMdIncludes(isConnectedToIde_2),
                    }),
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: jsxProd_default_2(Byline, {
                        children: [
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "enter",
                            action: "confirm",
                          }),
                          jsxProd_default(ConfigurableShortcutHint, {
                            action: "confirm:no",
                            context: "Confirmation",
                            fallback: "Esc",
                            description: "disable external includes",
                          }),
                        ],
                      }),
                    }),
                  ],
                })
              : Be === "OutputStyle"
                ? jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(OutputStylePicker, {
                        initialStyle: outputStyle,
                        visibleCount: Math.max(3, In - 7),
                        onComplete: (current_21) => {
                          Fe(null);
                          setTabsHidden(false);
                          let oe = (style) => {
                            let truncatedKey = String(style);
                            setOutputStyle(truncatedKey || DEFAULT_2);
                            noteSystemPromptSectionInvalidation("output_style");
                            updateSettingsForSource(
                              "localSettings",
                              {
                                outputStyle: truncatedKey || undefined,
                              },
                              undefined,
                              storageV5,
                            );
                            logEvent("tengu_output_style_changed", {
                              style: markCustomSetting(truncatedKey || DEFAULT_2),
                              source: lit("config_panel"),
                              settings_source: lit("localSettings"),
                            });
                          };
                          Sn(commitThroughConfigSet(So("outputStyle"), current_21 ?? "", oe));
                        },
                        onCancel: () => {
                          Fe(null);
                          setTabsHidden(false);
                        },
                      }),
                      jsxProd_default(Text, {
                        dimColor: true,
                        italic: false,
                        children: jsxProd_default_2(Byline, {
                          children: [
                            jsxProd_default(KeyboardShortcutHint, {
                              chord: "enter",
                              action: "confirm",
                              ...F,
                            }),
                            jsxProd_default(ConfigurableShortcutHint, {
                              action: "confirm:no",
                              context: "Confirmation",
                              fallback: "Esc",
                              description: "cancel",
                              ...F,
                            }),
                          ],
                        }),
                      }),
                    ],
                  })
                : Be === "Language"
                  ? jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(LanguagePicker, {
                          initialLanguage: language,
                          onComplete: (k) => {
                            Fe(null);
                            setTabsHidden(false);
                            let oe = (k_0) => {
                              let ge = String(k_0) || undefined;
                              setLanguage(ge);
                              updateSettingsForSource(
                                "userSettings",
                                {
                                  language: ge,
                                },
                                undefined,
                                storageV5,
                              );
                              let be = normalizeLanguageForSTT(ge);
                              logEvent("tengu_language_changed", {
                                language: !ge
                                  ? lit("default")
                                  : be.fellBackFrom === undefined
                                    ? localeOrNonconforming(be.code)
                                    : lit("custom"),
                                source: lit("config_panel"),
                              });
                            };
                            Sn(commitThroughConfigSet(So("language"), k ?? "", oe));
                          },
                          onCancel: () => {
                            Fe(null);
                            setTabsHidden(false);
                          },
                        }),
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: jsxProd_default_2(Byline, {
                            children: [
                              jsxProd_default(KeyboardShortcutHint, {
                                chord: "enter",
                                action: "confirm",
                              }),
                              jsxProd_default(ConfigurableShortcutHint, {
                                action: "confirm:no",
                                context: "Settings",
                                fallback: "Esc",
                                description: "cancel",
                              }),
                            ],
                          }),
                        }),
                      ],
                    })
                  : Be === "AgentsView"
                    ? jsxProd_default_2(Dialog, {
                        title: "Agents view",
                        onCancel: () => {
                          Ln.current += 1;
                          Fe(null);
                          setTabsHidden(false);
                        },
                        hideBorder: true,
                        hideInputGuide: true,
                        children: [
                          jsxProd_default(merged_2, {
                            visibleCount: ra.length * 2,
                            children: ra.map((k_1) =>
                              jsxProd_default(
                                merged_2.Field,
                                {
                                  label: k_1.label,
                                  children: jsxProd_default(merged_2.Toggle, {
                                    value: k_1.value,
                                    onChange: (k_2) =>
                                      bo(k_1.id, k_2, (setting) => Tc(k_1.id, setting === true)),
                                  }),
                                },
                                k_1.id,
                              ),
                            ),
                          }),
                          jsxProd_default(Text, {
                            dimColor: true,
                            children: jsxProd_default_2(Byline, {
                              children: [
                                !isScreenReaderEnabled &&
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: ["enter", "space"],
                                    action: "toggle",
                                  }),
                                jsxProd_default(ConfigurableShortcutHint, {
                                  action: "confirm:no",
                                  context: "Confirmation",
                                  fallback: "Esc",
                                  description: "close",
                                }),
                              ],
                            }),
                          }),
                        ],
                      })
                    : Be === "EnumPicker" && Tt
                      ? jsxProd_default_2(Box, {
                          flexDirection: "column",
                          onClick: stopClickPropagation,
                          children: [
                            jsxProd_default(Dialog, {
                              title: Tt.label,
                              subtitle:
                                Tt.provided === undefined
                                  ? undefined
                                  : `${Tt.provided.description} \xB7 ${Tt.provided.plugin}`,
                              onCancel: tn,
                              hideBorder: true,
                              hideInputGuide: true,
                              children: jsxProd_default(ModelSelector, {
                                options: Tt.options.map((prev_21) => ({
                                  label: prev_21,
                                  value: prev_21,
                                })),
                                defaultValue: String(Tt.value),
                                defaultFocusValue: String(Tt.value),
                                onChange: (newIndex_0) => {
                                  tn();
                                  wo(Tt, newIndex_0);
                                },
                                onCancel: tn,
                              }),
                            }),
                            jsxProd_default(Text, {
                              dimColor: true,
                              children: jsxProd_default_2(Byline, {
                                children: [
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: "enter",
                                    action: "confirm",
                                  }),
                                  jsxProd_default(ConfigurableShortcutHint, {
                                    action: "confirm:no",
                                    context: "Settings",
                                    fallback: "Esc",
                                    description: "cancel",
                                  }),
                                ],
                              }),
                            }),
                          ],
                        })
                      : Be === "TextEdit" && Dt
                        ? jsxProd_default(Box, {
                            flexDirection: "column",
                            onClick: stopClickPropagation,
                            children: jsxProd_default(AgentsList, {
                              title: Dt.label,
                              subtitle:
                                Dt.provided === undefined
                                  ? undefined
                                  : `${Dt.provided.description} \xB7 ${Dt.provided.plugin}`,
                              fields: [
                                {
                                  type: "text",
                                  key: "value",
                                  label: Dt.label,
                                  validate: (prev_22) =>
                                    Dt.coerce?.(prev_22) === undefined
                                      ? (Dt.optionsHint ?? "Not a value it takes")
                                      : null,
                                },
                              ],
                              values: {
                                value: Ss,
                              },
                              onChange: (k, oe) => ta(oe),
                              onSubmit: () => {
                                let k = Dt;
                                let oe = k.coerce?.(Ss) ?? Ss;
                                bn();
                                if (oe !== shownSettingValue(k)) wo(k, oe);
                              },
                              onCancel: bn,
                            }),
                          })
                        : Be === "EnableAutoUpdates"
                          ? jsxProd_default(Dialog, {
                              title: "Enable Auto-Updates",
                              onCancel: () => {
                                Fe(null);
                                setTabsHidden(false);
                              },
                              hideBorder: true,
                              hideInputGuide: true,
                              children:
                                autoUpdaterDisabledReason?.type !== "config"
                                  ? jsxProd_default_2(Fragment, {
                                      children: [
                                        jsxProd_default(Text, {
                                          children:
                                            autoUpdaterDisabledReason?.type === "env"
                                              ? "Auto-updates are controlled by an environment variable and cannot be changed here."
                                              : "Auto-updates are disabled in development builds.",
                                        }),
                                        autoUpdaterDisabledReason?.type === "env" &&
                                          jsxProd_default_2(Text, {
                                            dimColor: true,
                                            children: [
                                              "Unset ",
                                              autoUpdaterDisabledReason.envVar,
                                              " to re-enable auto-updates.",
                                            ],
                                          }),
                                      ],
                                    })
                                  : jsxProd_default(ModelSelector, {
                                      options: [
                                        {
                                          label: "Enable with latest channel",
                                          value: "latest",
                                        },
                                        {
                                          label: "Enable with stable channel",
                                          value: "stable",
                                        },
                                      ],
                                      onChange: (prev_24) => {
                                        Fe(null);
                                        setTabsHidden(false);
                                        Cs("autoUpdatesChannel", prev_24, (delta) =>
                                          Co(delta, {
                                            kind: "enable",
                                          }),
                                        );
                                      },
                                    }),
                            })
                          : Be === "ChannelDowngrade"
                            ? jsxProd_default(ChannelDowngradeDialog, {
                                currentVersion: {
                                  ISSUES_EXPLAINER:
                                    "report the issue at https://github.com/anthropics/claude-code/issues",
                                  PACKAGE_URL: "@anthropic-ai/claude-code",
                                  README_URL: "https://code.claude.com/docs/en/overview",
                                  VERSION: "2.1.316",
                                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                                  BUILD_TIME: "2026-10-30T23:28:13Z",
                                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                                  HOOKS_WORKER_URL:
                                    import.meta.dir +
                                    "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                                  DD_SOURCEMAP_GROUP: "default",
                                }.VERSION,
                                onChoice: (k) => {
                                  Fe(null);
                                  setTabsHidden(false);
                                  if (k === "cancel") return;
                                  Cs("autoUpdatesChannel", "stable", (setting_1) =>
                                    Co(
                                      setting_1,
                                      k === "stay"
                                        ? {
                                            kind: "switch",
                                            minimumVersion: {
                                              ISSUES_EXPLAINER:
                                                "report the issue at https://github.com/anthropics/claude-code/issues",
                                              PACKAGE_URL: "@anthropic-ai/claude-code",
                                              README_URL: "https://code.claude.com/docs/en/overview",
                                              VERSION: "2.1.316",
                                              FEEDBACK_CHANNEL:
                                                "https://github.com/anthropics/claude-code/issues",
                                              BUILD_TIME: "2026-10-30T23:28:13Z",
                                              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                                              HOOKS_WORKER_URL:
                                                import.meta.dir +
                                                "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                                              DD_SOURCEMAP_GROUP: "default",
                                            }.VERSION,
                                          }
                                        : {
                                            kind: "switch",
                                          },
                                    ),
                                  );
                                },
                              })
                            : Be === "Notifications"
                              ? jsxProd_default(ColorStep, {
                                  channel: de.preferredNotifChannel,
                                  showInputNeededRow: bs && isKairosInputNeededPushEnabled(),
                                  showDoneRow: bs,
                                  inputNeededEnabled: de.inputNeededNotifEnabled ?? false,
                                  doneEnabled: de.agentPushNotifEnabled ?? false,
                                  onChangeChannel: (current_23) => {
                                    bo("notifChannel", current_23, (prev_25) => {
                                      let found = NOTIFICATION_CHANNELS.find((style) => style === prev_25);
                                      if (found === undefined)
                                        return {
                                          error:
                                            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                                              `Notifications channel doesn't accept "${sanitizeHookText(String(prev_25))}".`,
                                              "notification channel rewritten to a value the row does not know",
                                            ),
                                        };
                                      changeNotifChannel(found);
                                      logEvent("tengu_config_changed", {
                                        setting: lit("notifChannel"),
                                        value: fromEnum(found),
                                      });
                                    });
                                  },
                                  onChangeInputNeeded: (language) => {
                                    bo("inputNeededNotifEnabled", language, (channel) => {
                                      let se = channel === true;
                                      changeInputNeededNotif(se);
                                      logEvent("tengu_config_changed", {
                                        setting: lit("inputNeededNotifEnabled"),
                                        value: se,
                                      });
                                    });
                                  },
                                  onChangeDone: (current_24) => {
                                    bo("agentPushNotifEnabled", current_24, (prev_26) => {
                                      let se = prev_26 === true;
                                      changeAgentPushNotif(se);
                                      logEvent("tengu_config_changed", {
                                        setting: lit("agentPushNotifEnabled"),
                                        value: se,
                                      });
                                    });
                                  },
                                  onClose: () => {
                                    Ln.current += 1;
                                    Fe(null);
                                    setTabsHidden(false);
                                  },
                                })
                              : jsxProd_default_2(Box, {
                                  flexDirection: "column",
                                  gap: 1,
                                  marginY: insideModal || isScreenReaderEnabled ? undefined : 1,
                                  children: [
                                    !isScreenReaderEnabled &&
                                      jsxProd_default_2(Box, {
                                        flexDirection: "column",
                                        children: [
                                          jsxProd_default(SearchBox, {
                                            query: ws,
                                            isFocused: Xe && !headerFocused,
                                            isTerminalFocused,
                                            cursorOffset,
                                            placeholder: "Search settings\u2026",
                                            isSearchLineUnpadded: false,
                                            onFocus: () => {
                                              if (headerFocused) blurHeader();
                                              tt(true);
                                            },
                                          }),
                                          hn !== null &&
                                            jsxProd_default(Text, {
                                              dimColor: true,
                                              wrap: "wrap-trim",
                                              children: hn,
                                            }),
                                        ],
                                      }),
                                    jsxProd_default(merged_2, {
                                      visibleCount: Un > 0 ? maxVisible - Un - 1 : maxVisible,
                                      defaultFocusIndex: Math.max(
                                        0,
                                        bt.findIndex((choice) => choice.id === Ne),
                                      ),
                                      isDisabled: !Ts,
                                      keybindingContext: "Settings",
                                      onUpFromFirstItem: () => {
                                        ho(false);
                                        tt(true);
                                      },
                                      onDisabledRowClick: la,
                                      onFocus: (prev_27) => {
                                        let id = bt[prev_27]?.id;
                                        if (id !== "thinking") ho(false);
                                        at(id);
                                        st(Ds);
                                      },
                                      resetKey: Ds,
                                      emptyMessage: `No settings match "${ws}"`,
                                      children,
                                    }),
                                    Un > 0 &&
                                      jsxProd_default(Box, {
                                        height: Un,
                                        flexShrink: 0,
                                        children: jsxProd_default(Text, {
                                          dimColor: true,
                                          wrap: "wrap-trim",
                                          children: Ts && cellText(lock?.reason),
                                        }),
                                      }),
                                    jsxProd_default(Box, {
                                      ref: _n,
                                      flexDirection: "column",
                                      flexShrink: 0,
                                      children: isScreenReaderEnabled
                                        ? jsxProd_default(Text, {
                                            children: jsxProd_default(ConfigurableShortcutHint, {
                                              action: "confirm:no",
                                              context: "Settings",
                                              fallback: "Esc",
                                              description: "save and close",
                                            }),
                                          })
                                        : headerFocused
                                          ? jsxProd_default(Text, {
                                              dimColor: true,
                                              italic: false,
                                              children: jsxProd_default_2(Byline, {
                                                children: [
                                                  jsxProd_default(KeyboardShortcutHint, {
                                                    chord: ["left", "right", "tab"],
                                                    action: "switch",
                                                    format: {
                                                      keyCase: "lower",
                                                    },
                                                    terse: F.terse,
                                                  }),
                                                  jsxProd_default(KeyboardShortcutHint, {
                                                    chord: "down",
                                                    action: "return",
                                                    ...F,
                                                  }),
                                                  jsxProd_default(ConfigurableShortcutHint, {
                                                    action: "confirm:no",
                                                    context: "Settings",
                                                    fallback: "Esc",
                                                    description: "close",
                                                    ...F,
                                                  }),
                                                ],
                                              }),
                                            })
                                          : Xe
                                            ? jsxProd_default(Text, {
                                                dimColor: true,
                                                italic: false,
                                                children: jsxProd_default_2(Byline, {
                                                  children: [
                                                    jsxProd_default(Text, {
                                                      children: "Type to filter",
                                                    }),
                                                    jsxProd_default(KeyboardShortcutHint, {
                                                      chord: ["enter", "down"],
                                                      action: "select",
                                                      ...F,
                                                    }),
                                                    jsxProd_default(KeyboardShortcutHint, {
                                                      chord: "up",
                                                      action: "tabs",
                                                      ...F,
                                                    }),
                                                    jsxProd_default(ConfigurableShortcutHint, {
                                                      action: "confirm:no",
                                                      context: "Settings",
                                                      fallback: "Esc",
                                                      description: "clear",
                                                      ...F,
                                                    }),
                                                  ],
                                                }),
                                              })
                                            : jsxProd_default(Text, {
                                                dimColor: true,
                                                italic: false,
                                                children: jsxProd_default_2(Byline, {
                                                  children: [
                                                    lock === undefined
                                                      ? jsxProd_default(KeyboardShortcutHint, {
                                                          chord: ["enter", "space"],
                                                          action: "change",
                                                          ...F,
                                                        })
                                                      : lock?.source === "policy" &&
                                                        jsxProd_default(KeyboardShortcutHint, {
                                                          chord: ["enter", "space"],
                                                          action: "retry",
                                                          ...F,
                                                        }),
                                                    jsxProd_default(ConfigurableShortcutHint, {
                                                      action: "settings:search",
                                                      context: "Settings",
                                                      fallback: "/",
                                                      description: "search",
                                                      ...F,
                                                    }),
                                                    jsxProd_default(ConfigurableShortcutHint, {
                                                      action: "confirm:no",
                                                      context: "Settings",
                                                      fallback: "Esc",
                                                      description: "close",
                                                      ...F,
                                                    }),
                                                  ],
                                                }),
                                              }),
                                    }),
                                  ],
                                }),
  });
}
//@ chunk-9h8dr0qb.js:41746-42307 fingerprint = THEME_LABELS (0.713)
/**
 * /config 里设置值的显示文案：thinking 中途切换警告、主题选项名、通知渠道名。
 */
var SWITCH_MODEL_LABELS = {};
var THINKING_CHANGE_WARNING =
  "Changing thinking mode mid-conversation will increase latency and may reduce quality.";
var THEME_LABELS = {
  auto: "Auto (match terminal)",
  dark: "Dark mode",
  light: "Light mode",
  "dark-daltonized": "Dark mode (colorblind-friendly)",
  "light-daltonized": "Light mode (colorblind-friendly)",
  "dark-ansi": "Dark mode (ANSI colors only)",
  "light-ansi": "Light mode (ANSI colors only)",
};
var NOTIF_CHANNEL_LABELS = {
  auto: "Auto",
  iterm2: "iTerm2 (OSC 9)",
  terminal_bell: "Terminal Bell (\\a)",
  kitty: "Kitty (OSC 99)",
  ghostty: "Ghostty (OSC 777)",
  iterm2_with_bell: "iTerm2 w/ Bell",
  notifications_disabled: "Disabled",
};
//@ chunk-9h8dr0qb.js:42307-42590 sole-consumer
function formatSettingValue(o, u, p, h) {
  if (h && o.id === "switchModelsOnFlag") return SWITCH_MODEL_LABELS[u] ?? u;
  if (o.id === "theme") return THEME_LABELS[u] ?? u;
  if (o.id === "permissionMode") return permissionModeTitle(u);
  if (o.id === "workflowSizeGuideline")
    return workflowSizeDisplay(u, (o.isDefaultValue ?? false) && u === o.value);
  if (o.id === "notifChannel" && !p) return NOTIF_CHANNEL_LABELS[u] ?? u;
  return u;
}
//@ chunk-6f92z7de.js:265-326 placement
/**
 * 函数 markCustomSetting（未知键标 custom）；位于「/config 设置页（Config 标签）：可切换的全部设置项（主题、编辑器模式、通知、自动压缩、verbose、模型、输出样式、语言等），远程会话下说明作用范围」模块。
 */
function markCustomSetting(t) {
  return Object.hasOwn(OUTPUT_STYLE_CONFIG, t) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(t) : lit("custom");
}
export { markCustomSetting, renderMobileNotice, Config };
