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
import { OUTPUT_STYLE_CONFIG, DEFAULT as DEFAULT_2 } from "../../constants/outputStyles.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  useSyncExternalStore,
  useRef,
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  use,
  useCallback,
} from "../../../vendor/react/cjs/react.production.js";
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
import { WARNING_GLYPH, LEFT_ARROW } from "../../constants/figures.js";
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
import { deferInit, runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-6f92z7de.js:265-326 placement
/**
 * 函数 markCustomSetting（未知键标 custom）；位于「/config 设置页（Config 标签）：可切换的全部设置项（主题、编辑器模式、通知、自动压缩、verbose、模型、输出样式、语言等），远程会话下说明作用范围」模块。
 */
function markCustomSetting(value) {
  return Object.hasOwn(OUTPUT_STYLE_CONFIG, value)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(value)
    : lit("custom");
}
//@ chunk-9h8dr0qb.js:12815-13132 placement
function renderMobileNotice() {
  let $ = useMemoCache(1);
  if (useSyncExternalStore(onReachabilityChange, getReachability, noop_4)?.has_active_channel !== false) {
    return null;
  }
  let textElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default_2(Text, {
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
    $[0] = textElement;
  } else textElement = $[0];
  return textElement;
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
var MOVED_TO_SETTINGS_IDS = new Set(MOVED_TO_SETTINGS_FIELDS.map((fieldDefs) => fieldDefs.id));
//@ chunk-9h8dr0qb.js:13703-13735 placement
function isMovedToSettings(settingId) {
  return MOVED_TO_SETTINGS_IDS.has(settingId);
}
//@ chunk-9h8dr0qb.js:13735-13830 placement
function sectionTitleWithNote(title, settingId) {
  return title === "Advanced" && isMovedToSettings(settingId)
    ? {
        name: title,
        note: "moving to settings.json",
      }
    : {
        name: title,
      };
}
//@ chunk-9h8dr0qb.js:13830-15061 placement
/**
 * 各分组包含的设置键。
 */
var CONFIG_SECTION_KEYS; // deferred: uses CONFIG_SECTION_TITLES of its import cycle while loading; runs once the cycle is complete
var settingToSectionMap;
var settingOrderMap;
deferInit("chunk-9h8dr0qb.js:13830", () => {
  CONFIG_SECTION_KEYS = {
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
    Advanced: MOVED_TO_SETTINGS_FIELDS.map((state) => state.id),
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
  settingToSectionMap = new Map(
    CONFIG_SECTION_TITLES.flatMap((title) => CONFIG_SECTION_KEYS[title].map((key) => [key, title])),
  );
  settingOrderMap = new Map(
    CONFIG_SECTION_TITLES.flatMap((title, index) =>
      CONFIG_SECTION_KEYS[title].map((key, columnIndex) => [key, index * 1000 + columnIndex]),
    ),
  );
});
//@ chunk-9h8dr0qb.js:15061-15099 placement
function isNestedSettingKey(key) {
  return key.includes(".");
}
//@ chunk-9h8dr0qb.js:15099-15161 placement
function sectionForSetting(key) {
  return settingToSectionMap.get(key) ?? (isNestedSettingKey(key) ? "Plugins" : "Advanced");
}
//@ chunk-9h8dr0qb.js:15161-15230 placement
var PLUGINS_SECTION_ORDER; // deferred: uses CONFIG_SECTION_TITLES of its import cycle while loading; runs once the cycle is complete
var ADVANCED_SECTION_ORDER;
deferInit("chunk-9h8dr0qb.js:15161", () => {
  PLUGINS_SECTION_ORDER = CONFIG_SECTION_TITLES.indexOf("Plugins") * 1000;
  ADVANCED_SECTION_ORDER = CONFIG_SECTION_TITLES.indexOf("Advanced") * 1000 + 999;
});
//@ chunk-9h8dr0qb.js:15230-15277 placement
function settingSortKey(key) {
  return (
    settingOrderMap.get(key) ?? (isNestedSettingKey(key) ? PLUGINS_SECTION_ORDER : ADVANCED_SECTION_ORDER)
  );
}
//@ chunk-9h8dr0qb.js:15277-15419 placement
function sortSettingsByOrder(items) {
  return items
    .map((item, index) => ({
      item,
      i: index,
    }))
    .sort((a, b) => {
      let byOrder = settingSortKey(a.item.id) - settingSortKey(b.item.id);
      return byOrder !== 0 ? byOrder : a.i - b.i;
    })
    .map(({ item }) => item);
}
//@ chunk-9h8dr0qb.js:15419-15563 placement
var SETTING_ID_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SETTING_VALUE_ID_RE;
var FIXED_VALUE_LABELS;
deferInit("chunk-9h8dr0qb.js:15419", () => {
  SETTING_ID_RE = /^[a-z][A-Za-z0-9]{0,63}$/;
  SETTING_VALUE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  FIXED_VALUE_LABELS = new Set(["Allowed", "Not allowed", "Switch automatically", "Ask each time", ...[]]);
});
//@ chunk-9h8dr0qb.js:15563-15621 placement
function markSettingIdSafe(id) {
  return SETTING_ID_RE.test(id) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(id) : lit("nonconforming");
}
//@ chunk-9h8dr0qb.js:15621-15690 placement
function markSettingValueSafe(value) {
  return SETTING_VALUE_ID_RE.test(value) || FIXED_VALUE_LABELS.has(value)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(value)
    : lit("nonconforming");
}
//@ chunk-9h8dr0qb.js:15690-15898 placement
function truncateToWidth(searchQuery, maxWidth) {
  if (bunStringWidth(searchQuery) <= maxWidth) return searchQuery;
  let max = Math.max(1, maxWidth - 1);
  let width = 0;
  let index = 0;
  while (index < searchQuery.length) {
    let code = searchQuery.charCodeAt(index);
    let codePointLength = code >= 55296 && code <= 56319 ? 2 : 1;
    let charWidth = bunStringWidth(searchQuery.slice(index, index + codePointLength));
    if (width + charWidth > max) break;
    width += charWidth;
    index += codePointLength;
  }
  return searchQuery.slice(0, index) + "\u2026";
}
//@ chunk-9h8dr0qb.js:15898-15950 layout
function settingIdsKey(items) {
  return items.map((item) => item.id).join("\x00");
}
//@ chunk-9h8dr0qb.js:15950-16100 layout
function sameSettingLabels(current, prev) {
  if (current.size !== prev.size) return false;
  for (let [id, labelInfo] of current) {
    let previousLabel = prev.get(id);
    if (
      previousLabel === undefined ||
      previousLabel.label !== labelInfo.label ||
      previousLabel.hidden !== labelInfo.hidden
    )
      return false;
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
  let initialValue = false;
  let hintFormat = stableEmptyObject(false);
  let tabsStandIn = useStatusLineSuppressed();
  let { storageV5, credentials } = useTheme_2();
  let session = useSession();
  let appStoreDirect = useAppStoreDirect();
  let session_2 = useAppStateSession();
  let { addNotification } = useNotifications();
  let latestPick = useRef(0);
  let latestFastPick = useRef(0);
  let { headerFocused, focusHeader, blurHeader } = useTabHeaderFocus();
  let insideModal = useHasScrollViewport();
  let [, setTheme] = useTheme();
  let themeSetting = useThemeSetting();
  let [globalConfig, setGlobalConfig] = useState(getEffectiveConfigValues);
  let globalConfigRef = useRef(globalConfig);
  let [settingsData, setSettingsData] = useState(() => ({
    ...getInitialSettings_2(),
    ...remoteForwardedSettings(),
    feedbackDrafts: getFeedbackDraftsSetting(),
    autoContinueAtUsageLimit: isAutoContinueEnabled(),
  }));
  let initialSettingsRef = useRef(getInitialSettings_2());
  let [outputStyle, setOutputStyle] = useState(settingsData?.outputStyle || DEFAULT_2);
  let outputStyleRef = useRef(outputStyle);
  let [externalIncludesApproved, setExternalIncludesApproved] = useState(
    () => getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved === true,
  );
  let [language, setLanguage] = useState(settingsData?.language);
  let languageRef = useRef(language);
  let [focusedSettingId, setFocusedSettingId] = useState(undefined);
  let [resetKeyValue, setResetKeyValue] = useState(undefined);
  let [resetNonce, bumpResetNonce] = useState(0);
  let [, bumpLockRetry] = useState(0);
  let idRef = useRef(null);
  let parsedModeRef = useRef("");
  let containerRef = useRef(null);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  useFocusOnMount(containerRef, isScreenReaderEnabled ? false : !headerFocused);
  let [isSearchMode, setSearchMode] = useState(!isScreenReaderEnabled);
  let isTerminalFocused = useTerminalFocus();
  let { rows, columns } = useTerminalSize();
  let footerRef = useRef(null);
  let [headerHeight, setHeaderHeight] = useState(1);
  let panelHeight = contentHeight ?? Math.min(Math.floor(rows * 0.8), 30);
  let remoteNotice = !isRemoteSessionAvailable()
    ? null
    : getRemoteCaps()?.sessionId !== undefined
      ? "Changes here update this machine's settings and future cloud sessions, not the running one."
      : "Changes here update this machine's settings, not the running remote session.";
  let noticeRows =
    remoteNotice === null ? 0 : Math.ceil((remoteNotice.length + 2) / Math.max(1, columns - 4));
  let maxVisible = Math.max(5, panelHeight - 8 - headerHeight - noticeRows);
  let mainLoopModel = useAppState((appState) => appState.mainLoopModel);
  let mainLoopModelForSession = useAppState((s_0) => s_0.mainLoopModelForSession);
  let modelSetting = useMainLoopModelSetting() ?? mainLoopModel;
  let verbose = useAppState((s_1) => s_1.verbose);
  let thinkingEnabled = useAppState((s_2) => s_2.thinkingEnabled);
  let promptSuggestionEnabled = useAppState((s_3) => (isFastModeEnabled() ? s_3.fastMode : false));
  let fastModeOnForModel = useFastModeOnForModel(promptSuggestionEnabled, modelSetting);
  let promptSuggestionEnabled_2 = useAppState((appState) => appState.promptSuggestionEnabled);
  let awaySummaryEnabled = useAppState((appState) => appState.awaySummaryEnabled);
  let showDefaultViewPicker = require("../../tools/BriefTool/BriefTool.js").isBriefEntitled();
  let setAppState = useSetAppState();
  let [changes, setChanges] = useState(() => new Map());
  let changeLog = useMemo(
    () => ({
      record: (key, value, options) =>
        setChanges((prev) => {
          let next = new Map(prev);
          if (options?.moveToEnd) next.delete(key);
          return next.set(key, value);
        }),
      clear: (key) =>
        setChanges((prev) => {
          let next = new Map(prev);
          next.delete(key);
          return next;
        }),
      toggle: (key, value) =>
        setChanges((prev) => {
          let next = new Map(prev);
          return next.delete(key) ? next : next.set(key, value);
        }),
    }),
    [],
  );
  let thinkingEnabledRef = useRef(thinkingEnabled);
  useEffect(() => onHydrated(() => setGlobalConfig(getEffectiveConfigValues())), []);
  let [showThinkingWarning, setShowThinkingWarning] = useState(false);
  let [remoteHomeError, setRemoteHomeError] = useState(null);
  let [activeDialog, setActiveDialog] = useState(null);
  let savedCountRef = useRef(0);
  let [enumPickerId, setEnumPickerId] = useState(null);
  let [textEditId, setTextEditId] = useState(null);
  let [textEditValue, setTextEditValue] = useState("");
  let enabled = useAppState((appState) => appState.plugins.enabled);
  let [shownPluginSettings, setShownPluginSettings] = useState(() => new Map());
  let [settingLabels, setSettingLabels] = useState(() => new Map());
  let configRowsVersion = useSyncExternalStore(CONFIG_ROWS_VERSION.subscribe, CONFIG_ROWS_VERSION.get);
  useLayoutEffect(() => {
    if (!footerRef.current) return;
    let height = measureElement(footerRef.current).height;
    if (height !== headerHeight) setHeaderHeight(height);
  }, [headerFocused, isSearchMode, columns, rows, headerHeight, activeDialog]);
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: isSearchMode && activeDialog === null && !headerFocused,
    onExit: () => setSearchMode(false),
    onExitUp: focusHeader,
    passthroughCtrlKeys: ["c", "d"],
  });
  let isSearchModeActive = !headerFocused;
  useEffect(() => {
    onIsSearchModeChange(isSearchModeActive);
  }, [isSearchModeActive, onIsSearchModeChange]);
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
  let [remoteToolServing] = useState(isRemoteToolServingOnForSettings);
  let neverNull = alwaysFalse();
  let launchDirectoryKeys = useMemo(() => null, [neverNull]);
  let isConnectedToIde_2 = use(getMemoryFilesCached(session, true, storageV5, credentials));
  let shouldShowExternalIncludesToggle = hasExternalClaudeMdIncludes(isConnectedToIde_2);
  let autoUpdaterDisabledReason = getAutoUpdaterDisabledReason();
  let pushTogglesVisible = shouldShowConfigGate();
  let {
    settings,
    dialogFieldRows,
    helpers: { onChangeMainModelConfig, changeNotifChannel, changeInputNeededNotif, changeAgentPushNotif },
  } = buildConfigRows({
    globalConfig,
    settingsData,
    themeSetting,
    currentOutputStyle: outputStyle,
    currentLanguage: language,
    externalIncludesApproved,
    thinkingEnabled,
    verbose,
    mainLoopModel,
    currentModel: modelSetting,
    isFastMode: promptSuggestionEnabled,
    promptSuggestionEnabled: promptSuggestionEnabled_2,
    awaySummaryEnabled,
    showDefaultViewPicker,
    pushTogglesVisible,
    crossSessionInboxRowVisible: isCrossSessionMessagingEnabled(),
    isConnectedToIde,
    inAppSelection,
    tabsStandIn,
    isFileCheckpointingAvailable,
    workflowsToggleable,
    workflowSizeGuidelineToggleable,
    autoContinueAtUsageLimitToggleable,
    artifactToggleable,
    remoteToolServingOn: remoteToolServing,
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
    setTheme,
    setGlobalConfig,
    setSettingsData,
    setPlanAutoModeOffAtLaunch,
    changeLog,
  });
  let allSettings = [
    ...settings,
    ...pluginConfigSettings(enabled, {
      storageV5,
      shown: shownPluginSettings,
      onShown: (key, value) => setShownPluginSettings((value_2) => new Map(value_2).set(key, value)),
    }),
  ];
  let settingsKey = settingIdsKey(allSettings);
  useEffect(() => {
    let isMounted = true;
    describedSettings(allSettings)
      .then((prev) => {
        if (isMounted) setSettingLabels((prev_0) => (sameSettingLabels(prev_0, prev) ? prev_0 : prev));
      })
      .catch((value_0) => {
        logError(toError(value_0));
      });
    return () => {
      isMounted = false;
    };
  }, [settingsKey, configRowsVersion]);
  let flattened = allSettings.flatMap((current) => {
    let labelOverride = settingLabels.get(current.id);
    if (labelOverride?.hidden) return [];
    let mergedSetting =
      labelOverride === undefined || labelOverride.label === current.label
        ? current
        : "labelBoldSuffix" in current
          ? {
              ...current,
              label: labelOverride.label,
              labelBoldSuffix: "",
            }
          : {
              ...current,
              label: labelOverride.label,
            };
    return [throughConfigSet(mergedSetting)];
  });
  let commitAndReport = useCallback(
    (promise, onDone) => {
      Promise.resolve(promise)
        .then((prev_1) => {
          if (prev_1 && "error" in prev_1 && prev_1.error) {
            onDone?.();
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
  let findSetting = (current_0) => {
    let context = allSettings.find((prev_3) => prev_3.id === current_0);
    return context === undefined ? undefined : throughConfigSet(context);
  };
  let commitSetting = (id, value, updater, onDone) => {
    let setting =
      dialogFieldRows.find((prev_4) => prev_4.id === id) ?? allSettings.find((prev_5) => prev_5.id === id);
    commitAndReport(commitThroughConfigSet(setting, value, updater), onDone);
  };
  let commitViaRow = (id, value, updater) => {
    let savedCount = savedCountRef.current;
    commitSetting(id, value, updater, () => {
      if (savedCountRef.current === savedCount) {
        savedCountRef.current += 1;
        setActiveDialog(null);
        setTabsHidden(false);
      }
    });
  };
  let commitAutoUpdateChannel = useCallback(
    (channel, options) => {
      if (channel !== "latest" && channel !== "stable")
        return {
          error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Auto-update channel doesn't accept "${sanitizeHookText(String(channel))}".`,
            "auto-update channel rewritten to a value the row does not know",
          ),
        };
      if (options.kind === "enable") {
        saveGlobalConfig(
          (prev_6) => ({
            ...prev_6,
            autoUpdates: true,
          }),
          storageV5,
        );
        setGlobalConfig((prev_7) => ({
          ...prev_7,
          autoUpdates: true,
        }));
        updateSettingsForSource(
          "userSettings",
          {
            autoUpdatesChannel: channel,
            minimumVersion: undefined,
          },
          undefined,
          storageV5,
        );
        setSettingsData((prev_8) => ({
          ...prev_8,
          autoUpdatesChannel: channel,
          minimumVersion: undefined,
        }));
        logEvent("tengu_autoupdate_enabled", {
          channel: fromEnum(channel),
        });
        return;
      }
      let settingsPatch =
        channel === "latest"
          ? {
              autoUpdatesChannel: undefined,
              minimumVersion: undefined,
            }
          : options.minimumVersion === undefined
            ? {
                autoUpdatesChannel: channel,
              }
            : {
                autoUpdatesChannel: channel,
                minimumVersion: options.minimumVersion,
              };
      updateSettingsForSource("userSettings", settingsPatch, undefined, storageV5);
      setSettingsData((prev_9) => ({
        ...prev_9,
        ...settingsPatch,
      }));
      logEvent("tengu_autoupdate_channel_changed", {
        channel: fromEnum(channel),
        ...(channel === "stable" && {
          minimum_version_set: options.minimumVersion !== undefined,
        }),
      });
    },
    [storageV5],
  );
  let isSettingsMoved = isSettingsMovedToConfig();
  let visibleSettings = useMemo(() => {
    let settingsItems = isSettingsMoved ? sortSettingsByOrder(flattened) : flattened;
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
  }, [flattened, searchQuery, isSettingsMoved]);
  useEffect(() => {
    if (isScreenReaderEnabled || idRef.current === null) return;
    if (isSearchMode || focusedSettingId !== idRef.current) idRef.current = null;
  }, [isScreenReaderEnabled, focusedSettingId, isSearchMode]);
  let reachability = useSyncExternalStore(onReachabilityChange, getReachability, () => {
    return;
  });
  let max = Math.max(1, columns - 2 * (insideModal ? PANE_WIDTH_RESERVE + PANE_PADDING_X : PANE_PADDING));
  let max_2 = Math.max(1, max - 7);
  let truncatedQuery = truncateToWidth(searchQuery, max_2);
  let cursorOffset = Math.min(searchCursorOffset, truncatedQuery.length);
  let closeHandler = useCallback(() => {
    if (activeDialog !== null) return;
    let formattedChanges = [...changes].map(([key, value]) => {
      let keyName = fromEnum(key);
      logEvent("tengu_config_changed", {
        key: keyName,
        setting: keyName,
        value: shortHash(String(value)),
      });
      return `Set ${key} to ${sequential.bold(value)}`;
    });
    let effectiveApiKey = isAntBuild() ? undefined : env.ANTHROPIC_API_KEY;
    let initialUsingCustomKey = Boolean(
      effectiveApiKey &&
      customApiKeyResponsesOf(globalConfigRef.current).approved.includes(tailOfId(effectiveApiKey)),
    );
    let currentUsingCustomKey = Boolean(
      effectiveApiKey && customApiKeyResponsesOf(globalConfig).approved.includes(tailOfId(effectiveApiKey)),
    );
    if (initialUsingCustomKey !== currentUsingCustomKey) {
      formattedChanges.push(`${currentUsingCustomKey ? "Enabled" : "Disabled"} custom API key`);
      logEvent("tengu_config_changed", {
        key: lit("env.ANTHROPIC_API_KEY"),
        setting: lit("env.ANTHROPIC_API_KEY"),
        value: currentUsingCustomKey,
      });
    }
    if (globalConfig.theme !== globalConfigRef.current.theme)
      formattedChanges.push(`Set theme to ${sequential.bold(globalConfig.theme)}`);
    if (globalConfig.preferredNotifChannel !== globalConfigRef.current.preferredNotifChannel)
      formattedChanges.push(`Set notifications to ${sequential.bold(globalConfig.preferredNotifChannel)}`);
    if (outputStyle !== outputStyleRef.current)
      formattedChanges.push(`Set output style to ${sequential.bold(outputStyle)}`);
    if (language !== languageRef.current)
      formattedChanges.push(`Set response language to ${sequential.bold(language ?? "Default (English)")}`);
    if (globalConfig.editorMode !== globalConfigRef.current.editorMode)
      formattedChanges.push(`Set editor mode to ${sequential.bold(globalConfig.editorMode || "emacs")}`);
    if (globalConfig.diffTool !== globalConfigRef.current.diffTool)
      formattedChanges.push(`Set diff tool to ${sequential.bold(globalConfig.diffTool)}`);
    if (globalConfig.autoConnectIde !== globalConfigRef.current.autoConnectIde)
      formattedChanges.push(`${globalConfig.autoConnectIde ? "Enabled" : "Disabled"} auto-connect to IDE`);
    if (globalConfig.autoInstallIdeExtension !== globalConfigRef.current.autoInstallIdeExtension)
      formattedChanges.push(
        `${globalConfig.autoInstallIdeExtension ? "Enabled" : "Disabled"} auto-install IDE extension`,
      );
    if (globalConfig.autoCompactEnabled !== globalConfigRef.current.autoCompactEnabled)
      formattedChanges.push(`${globalConfig.autoCompactEnabled ? "Enabled" : "Disabled"} auto-compact`);
    if (globalConfig.autoScrollEnabled !== globalConfigRef.current.autoScrollEnabled)
      formattedChanges.push(`${globalConfig.autoScrollEnabled ? "Enabled" : "Disabled"} auto-scroll`);
    if (globalConfig.respectGitignore !== globalConfigRef.current.respectGitignore)
      formattedChanges.push(
        `${globalConfig.respectGitignore ? "Enabled" : "Disabled"} respect .gitignore in file picker`,
      );
    if (globalConfig.copyFullResponse !== globalConfigRef.current.copyFullResponse)
      formattedChanges.push(
        `${globalConfig.copyFullResponse ? "Enabled" : "Disabled"} always copy full response`,
      );
    if (globalConfig.copyOnSelect !== globalConfigRef.current.copyOnSelect)
      formattedChanges.push(`${globalConfig.copyOnSelect ? "Enabled" : "Disabled"} copy on select`);
    if (globalConfig.leftArrowOpensAgents !== globalConfigRef.current.leftArrowOpensAgents)
      formattedChanges.push(
        `${(globalConfig.leftArrowOpensAgents ?? true) ? "Enabled" : "Disabled"} ${LEFT_ARROW} opens agents`,
      );
    if (globalConfig.defaultToAgentsView !== globalConfigRef.current.defaultToAgentsView)
      formattedChanges.push(
        `${globalConfig.defaultToAgentsView ? "Enabled" : "Disabled"} open agents view by default`,
      );
    if (globalConfig.terminalProgressBarEnabled !== globalConfigRef.current.terminalProgressBarEnabled)
      formattedChanges.push(
        `${globalConfig.terminalProgressBarEnabled ? "Enabled" : "Disabled"} terminal progress bar`,
      );
    if (globalConfig.showStatusInTerminalTab !== globalConfigRef.current.showStatusInTerminalTab)
      formattedChanges.push(
        `${globalConfig.showStatusInTerminalTab ? "Enabled" : "Disabled"} terminal tab status`,
      );
    if (globalConfig.showTurnDuration !== globalConfigRef.current.showTurnDuration)
      formattedChanges.push(`${globalConfig.showTurnDuration ? "Enabled" : "Disabled"} turn duration`);
    if (globalConfig.showMessageTimestamps !== globalConfigRef.current.showMessageTimestamps)
      formattedChanges.push(
        `${globalConfig.showMessageTimestamps ? "Enabled" : "Disabled"} message timestamps`,
      );
    if (globalConfig.remoteControlAtStartup !== globalConfigRef.current.remoteControlAtStartup) {
      let remoteLabel =
        globalConfig.remoteControlAtStartup === undefined
          ? "Reset Remote Control to default"
          : `${globalConfig.remoteControlAtStartup ? "Enabled" : "Disabled"} Remote Control for all sessions`;
      formattedChanges.push(remoteLabel);
    }
    if (settingsData?.autoUpdatesChannel !== initialSettingsRef.current?.autoUpdatesChannel)
      formattedChanges.push(
        `Set auto-update channel to ${sequential.bold(settingsData?.autoUpdatesChannel === "rc" ? "slow" : (settingsData?.autoUpdatesChannel ?? "latest"))}`,
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
    activeDialog,
    changes,
    globalConfig,
    mainLoopModel,
    outputStyle,
    language,
    settingsData?.autoUpdatesChannel,
    isFastModeEnabled() ? settingsData?.fastMode : undefined,
    onClose,
  ]);
  useKeybinding("confirm:no", closeHandler, {
    context: "Settings",
    isActive: activeDialog === null && !isSearchMode && !headerFocused,
  });
  let isExternalIncludesToggle = useCallback(
    (current_1) =>
      isSettingsMoved &&
      current_1.type === "managedEnum" &&
      current_1.id === "showExternalIncludesDialog" &&
      externalIncludesApproved,
    [isSettingsMoved, externalIncludesApproved],
  );
  let movedToSettings = useCallback(
    (current_2) =>
      MOVED_TO_SETTINGS_FIELDS.find((current_3) => current_3.id === current_2)?.isSet({
        settingsData,
        globalConfig,
      }) ?? false,
    [settingsData, globalConfig],
  );
  let changeSetting = useCallback(
    (setting, value) => {
      let result = setting.onChange(value);
      let handleResult = (current_4) => {
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
          setting: markSettingIdSafe(setting.id),
          value: setting.provided === undefined ? markSettingValueSafe(value) : lit("plugin_field"),
        });
      };
      if (result instanceof Promise) {
        result.then(handleResult);
        return;
      }
      handleResult(result);
    },
    [addNotification],
  );
  let enumPickerSetting = useMemo(() => {
    let found = flattened.find((current_5) => current_5.id === enumPickerId);
    return found && found.type === "enum" ? found : undefined;
  }, [flattened, enumPickerId]);
  let closeEnumPicker = useCallback(() => {
    setEnumPickerId(null);
    setActiveDialog(null);
    setTabsHidden(false);
  }, [setTabsHidden]);
  let textEditSetting = useMemo(() => {
    let found = flattened.find((state) => state.id === textEditId);
    return found && found.type === "managedEnum" ? found : undefined;
  }, [flattened, textEditId]);
  let closeTextEdit = useCallback(() => {
    setTextEditId(null);
    setActiveDialog(null);
    setTabsHidden(false);
  }, [setTabsHidden]);
  useLayoutEffect(() => {
    if (activeDialog === "TextEdit" && textEditSetting === undefined) closeTextEdit();
    else if (activeDialog === "EnumPicker" && enumPickerSetting === undefined) closeEnumPicker();
  }, [activeDialog, textEditSetting, enumPickerSetting, closeTextEdit, closeEnumPicker]);
  useEffect(
    () =>
      unclaimedPaneClick.subscribe(() => {
        if (activeDialog === "EnumPicker") closeEnumPicker();
        else if (activeDialog === "TextEdit") closeTextEdit();
      }),
    [unclaimedPaneClick, activeDialog, closeEnumPicker, closeTextEdit],
  );
  let onRowActivate = useCallback(
    (setting, nextValue) => {
      if (idRef.current !== null && idRef.current !== setting.id) {
        let parsedMode = settingIdsKey(visibleSettings);
        if (isScreenReaderEnabled && parsedMode !== parsedModeRef.current) {
          idRef.current = null;
          parsedModeRef.current = parsedMode;
          return;
        }
        idRef.current = null;
      }
      if (setting.lock !== undefined) {
        if (setting.lock.source === "managed") return;
        idRef.current = setting.id;
        parsedModeRef.current = settingIdsKey(visibleSettings);
        ensurePolicyLimitsLoadedForDiagnostic()
          .catch(() => {})
          .finally(() => bumpLockRetry((retryCount) => retryCount + 1));
        return;
      }
      if (idRef.current === setting.id) {
        idRef.current = null;
        bumpLockRetry((retryCount) => retryCount + 1);
        return;
      }
      if (setting.id === "remoteHomeSettings" && setting.value === false) {
        if (setting.grantBlocker !== undefined) {
          logFeatureBad("remote_home_settings_mode", setting.grantBlocker);
          setRemoteHomeError(FORWARD_SETTINGS_ERRORS[setting.grantBlocker]);
        } else {
          setActiveDialog("RemoteHomeSettings");
          setTabsHidden(true);
        }
        return;
      }
      if (setting.type === "boolean") {
        let nextBool = typeof nextValue === "boolean" ? nextValue : !setting.value;
        let result = setting.onChange(nextBool);
        if (setting.id === "remoteHomeSettings") {
          setRemoteHomeError(null);
          Promise.resolve(result).then((prev_12) => {
            if (prev_12?.error) setRemoteHomeError(prev_12.error.message);
            else if (prev_12?.messageSuffix) setRemoteHomeError(`Saved${prev_12.messageSuffix}`);
          });
        }
        Promise.resolve(result)
          .then((prev_13) => {
            if (setting.id === "remoteHomeSettings") return;
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
          setting: markSettingIdSafe(setting.id),
          value: nextBool,
        });
        if (setting.id === "thinking") {
          if (nextBool === thinkingEnabledRef.current) setShowThinkingWarning(false);
          else if (messages.some((prev_15) => prev_15.type === "assistant")) setShowThinkingWarning(true);
        }
        return;
      }
      if (isExternalIncludesToggle(setting)) {
        recordExternalIncludesDecision(false, "config_toggle", storageV5);
        setExternalIncludesApproved(false);
        return;
      }
      if (setting.id === "agentsView") {
        setActiveDialog("AgentsView");
        setTabsHidden(true);
        return;
      }
      if (setting.id === "notifChannel" && setting.type === "managedEnum") {
        setActiveDialog("Notifications");
        setTabsHidden(true);
        return;
      }
      if (setting.provided !== undefined && setting.type === "managedEnum") {
        setTextEditId(setting.id);
        setTextEditValue(shownSettingValue(setting));
        setActiveDialog("TextEdit");
        setTabsHidden(true);
        return;
      }
      if (
        setting.id === "theme" ||
        setting.id === "model" ||
        setting.id === "showExternalIncludesDialog" ||
        setting.id === "outputStyle" ||
        setting.id === "language"
      )
        switch (setting.id) {
          case "theme":
            setActiveDialog("Theme");
            setTabsHidden(true);
            return;
          case "model":
            setActiveDialog("Model");
            setTabsHidden(true);
            return;
          case "showExternalIncludesDialog":
            setActiveDialog("ExternalIncludes");
            setTabsHidden(true);
            return;
          case "outputStyle":
            setActiveDialog("OutputStyle");
            setTabsHidden(true);
            return;
          case "language":
            setActiveDialog("Language");
            setTabsHidden(true);
            return;
        }
      if (setting.id === "autoUpdatesChannel") {
        if (autoUpdaterDisabledReason) {
          setActiveDialog("EnableAutoUpdates");
          setTabsHidden(true);
          return;
        }
        if ((settingsData?.autoUpdatesChannel ?? "latest") === "latest") {
          setActiveDialog("ChannelDowngrade");
          setTabsHidden(true);
        } else
          commitAndReport(
            commitThroughConfigSet(setting, "latest", (prev_16) =>
              commitAutoUpdateChannel(prev_16, {
                kind: "switch",
              }),
            ),
          );
        return;
      }
      if (setting.type === "enum" && setting.pickToCommit) {
        setEnumPickerId(setting.id);
        setActiveDialog("EnumPicker");
        setTabsHidden(true);
        return;
      }
      if (setting.type === "enum") {
        let nextIndex = (setting.options.indexOf(setting.value) + 1) % setting.options.length;
        changeSetting(
          setting,
          typeof nextValue === "string" && setting.options.includes(nextValue)
            ? nextValue
            : setting.options[nextIndex],
        );
        return;
      }
    },
    [
      addNotification,
      autoUpdaterDisabledReason,
      changeSetting,
      isExternalIncludesToggle,
      visibleSettings,
      isScreenReaderEnabled,
      commitAndReport,
      settingsData?.autoUpdatesChannel,
      setTabsHidden,
      storageV5,
      commitAutoUpdateChannel,
    ],
  );
  MessageActionsKeybindings(
    {
      "settings:search": () => {
        setSearchMode(true);
        setSearchQuery("");
      },
    },
    {
      context: "Settings",
      isActive: activeDialog === null && !isSearchMode && !headerFocused && !isScreenReaderEnabled,
    },
  );
  let agentViewRows = useMemo(
    () => [
      ...(isFleetBackgroundAllowed()
        ? [
            {
              id: "leftArrowOpensAgents",
              label: `${LEFT_ARROW} opens agents`,
              value: globalConfig.leftArrowOpensAgents ?? true,
            },
          ]
        : []),
      ...(isAgentsFleetEnabled()
        ? [
            {
              id: "defaultToAgentsView",
              label: "Start in agent view",
              value: globalConfig.defaultToAgentsView ?? false,
            },
          ]
        : []),
    ],
    [globalConfig.leftArrowOpensAgents, globalConfig.defaultToAgentsView],
  );
  let setAgentViewRow = useCallback(
    (id, value) => {
      if (id === "leftArrowOpensAgents") {
        saveGlobalConfig(
          (current_6) => ({
            ...current_6,
            leftArrowOpensAgents: value,
          }),
          storageV5,
        );
        setGlobalConfig((current_7) => ({
          ...current_7,
          leftArrowOpensAgents: value,
        }));
      } else {
        saveGlobalConfig(
          (current_8) => ({
            ...current_8,
            defaultToAgentsView: value,
          }),
          storageV5,
        );
        setGlobalConfig((current_9) => ({
          ...current_9,
          defaultToAgentsView: value,
        }));
      }
      logEvent("tengu_config_changed", {
        setting: fromEnum(id),
        value,
      });
    },
    [storageV5],
  );
  let onKeyDown = useCallback(
    (e) => {
      if (activeDialog !== null) return;
      if (headerFocused) return;
      if (isSearchMode) {
        if ((e.key === "return" || e.key === "down") && visibleSettings.length === 0) {
          e.preventDefault();
          return;
        }
        handleKeyDown(e);
        if (e.key === "escape") {
          e.preventDefault();
          if (searchQuery.length > 0) setSearchQuery("");
          else setSearchMode(false);
          return;
        }
        if (e.key === "return" || e.key === "down") {
          e.preventDefault();
          setSearchMode(false);
          bumpResetNonce((current_11) => current_11 + 1);
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
        setSearchMode(true);
        setSearchQuery(e.key === "/" ? "" : e.key);
      }
    },
    [
      activeDialog,
      headerFocused,
      isSearchMode,
      searchQuery,
      setSearchQuery,
      handleKeyDown,
      visibleSettings.length,
    ],
  );
  let canInteract = !headerFocused && !isSearchMode;
  let dismissSearch = () => {
    if (headerFocused) blurHeader();
    setSearchMode(false);
  };
  let resetKey = `${resetNonce} ${searchQuery}`;
  let lock = (
    resetKeyValue === resetKey
      ? visibleSettings.find((current_12) => current_12.id === focusedSettingId)
      : visibleSettings[0]
  )?.lock;
  let reservedRow = 0;
  let reservedRows = maxVisible - reservedRow - 1 >= 5 ? reservedRow : 0;
  let hasReservedRow = reservedRows > 0;
  let children = visibleSettings.flatMap((setting, index) => {
    let section = isSettingsMoved ? sectionForSetting(setting.id) : undefined;
    let isSectionStart =
      section !== undefined &&
      (index === 0 || sectionForSetting(visibleSettings[index - 1]?.id ?? "") !== section);
    let children =
      setting.id === "autoUpdatesChannel" && autoUpdaterDisabledReason
        ? `disabled (${formatAutoUpdaterDisabledReason(autoUpdaterDisabledReason)})`
        : formatSettingValue(setting, shownSettingValue(setting), isSettingsMoved, false);
    let sectionHeading = isSectionStart ? sectionTitleWithNote(section, setting.id) : undefined;
    let isLocked = setting.lock !== undefined;
    let isButtonStyle =
      isExternalIncludesToggle(setting) ||
      (setting.type === "enum" && !setting.pickToCommit) ||
      (setting.id === "autoUpdatesChannel" &&
        autoUpdaterDisabledReason === null &&
        (settingsData?.autoUpdatesChannel ?? "latest") !== "latest");
    return [
      ...(isSectionStart && index > 0 ? [jsxProd_default(merged.Heading, {}, `${section} gap`)] : []),
      ...(sectionHeading
        ? [
            jsxProd_default(
              merged.Heading,
              {
                children: jsxProd_default_2(Text, {
                  wrap: "truncate-end",
                  children: [
                    jsxProd_default(Text, {
                      bold: true,
                      children: sectionHeading.name,
                    }),
                    sectionHeading.note !== undefined &&
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: ["  ", sectionHeading.note],
                      }),
                  ],
                }),
              },
              section,
            ),
          ]
        : []),
      jsxProd_default(
        merged_2.Field,
        {
          label: [
            "labelBoldSuffix" in setting ? setting.label + setting.labelBoldSuffix : setting.label,
            ...(setting.provided === undefined ? [] : [setting.provided.plugin]),
          ].join(" \xB7 "),
          description:
            [
              showThinkingWarning && setting.id === "thinking"
                ? `${WARNING_GLYPH} ${THINKING_CHANGE_WARNING}`
                : undefined,
              setting.id === "remoteHomeSettings" && remoteHomeError !== null
                ? `${WARNING_GLYPH} ${remoteHomeError}`
                : undefined,
              setting.notice === undefined ? undefined : `${WARNING_GLYPH} ${setting.notice}`,
              hasReservedRow ? undefined : setting.lock?.reason,
              section === "Advanced" && movedToSettings(setting.id) ? "\u2192 settings.json" : undefined,
            ]
              .filter((prev_18) => prev_18 !== undefined)
              .join(" ") || undefined,
          ink: undefined,
          children:
            setting.lock?.source === "policy"
              ? jsxProd_default(merged_2.Button, {
                  onPress: () => onRowActivate(setting),
                  children,
                })
              : setting.type === "boolean"
                ? jsxProd_default(merged_2.Toggle, {
                    value: setting.value,
                    onChange: (prev_19) => onRowActivate(setting, prev_19),
                    disabled: isLocked,
                  })
                : isLocked
                  ? jsxProd_default(merged_2.Button, {
                      onPress: () => {},
                      disabled: true,
                      children,
                    })
                  : setting.type === "enum" &&
                      !setting.pickToCommit &&
                      setting.options.includes(setting.value)
                    ? jsxProd_default(merged_2.Select, {
                        value: setting.value,
                        options: setting.options.map((current_13) => ({
                          value: current_13,
                          label: formatSettingValue(
                            setting,
                            shownSettingValue({
                              ...setting,
                              value: current_13,
                            }),
                            isSettingsMoved,
                            false,
                          ),
                        })),
                        onChange: (current_14) => onRowActivate(setting, current_14),
                      })
                    : isButtonStyle
                      ? jsxProd_default(merged_2.Button, {
                          onPress: () => onRowActivate(setting),
                          children,
                        })
                      : jsxProd_default(merged_2.Link, {
                          onOpen: () => onRowActivate(setting),
                          children,
                        }),
        },
        setting.id,
      ),
      ...((setting.id === "inputNeededNotifEnabled" || setting.id === "agentPushNotifEnabled") &&
      reachability?.has_active_channel === false
        ? [jsxProd_default(renderMobileNotice, {}, `${setting.id} warning`)]
        : []),
    ];
  });
  return jsxProd_default(Box, {
    ref: containerRef,
    flexDirection: "column",
    width: "100%",
    ...(isScreenReaderEnabled
      ? {}
      : {
          tabIndex: 0,
          autoFocus: !headerFocused,
          onKeyDown,
          onPaste: handlePaste,
          onWheel:
            activeDialog === null && !canInteract && visibleSettings.length > 0 ? dismissSearch : undefined,
        }),
    children:
      activeDialog === "Theme"
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(ThemePicker, {
                onThemeSelect: (current_15) => {
                  let committed = commitThroughConfigSet(
                    findSetting("theme"),
                    current_15,
                    themeWriter(setTheme),
                  );
                  commitAndReport(committed);
                  setActiveDialog(null);
                  setTabsHidden(false);
                  return committed;
                },
                onCancel: () => {
                  setActiveDialog(null);
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
        : activeDialog === "Model"
          ? jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(ModelPicker, {
                  initial: mainLoopModel,
                  sessionModel: mainLoopModelForSession,
                  onSelect: (model, saveAsDefault) => {
                    Promise.resolve(
                      commitThroughConfigSet(findSetting("model"), model ?? "default", (current_16) =>
                        onChangeMainModelConfig(
                          current_16 === "default" ? null : String(current_16),
                          saveAsDefault,
                        ),
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
                    setActiveDialog(null);
                    setTabsHidden(false);
                  },
                  onCancel: () => {
                    setActiveDialog(null);
                    setTabsHidden(false);
                  },
                  showFastModeNotice: isFastModeEnabled()
                    ? fastModeOnForModel && supportsFastMode(modelSetting) && isFastModeAvailable()
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
                        ...hintFormat,
                      }),
                      jsxProd_default(ConfigurableShortcutHint, {
                        action: "confirm:no",
                        context: "Confirmation",
                        fallback: "Esc",
                        description: "cancel",
                        ...hintFormat,
                      }),
                    ],
                  }),
                }),
              ],
            })
          : activeDialog === "RemoteHomeSettings"
            ? jsxProd_default(RemoteHomeSettingsDialog, {
                configHome: getClaudeConfigDir(),
                storageV5,
                origin: "config_panel",
                onDone: (current_19) => {
                  setRemoteHomeError(
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
                    setGlobalConfig((current_20) => ({
                      ...current_20,
                      remoteHomeSettingsMode: getGlobalConfig().remoteHomeSettingsMode,
                    }));
                  setActiveDialog(null);
                  setTabsHidden(false);
                },
              })
            : activeDialog === "ExternalIncludes"
              ? jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default(ClaudeMdExternalIncludesDialog, {
                      onDone: () => {
                        setExternalIncludesApproved(
                          getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved === true,
                        );
                        setActiveDialog(null);
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
              : activeDialog === "OutputStyle"
                ? jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(OutputStylePicker, {
                        initialStyle: outputStyle,
                        visibleCount: Math.max(3, panelHeight - 7),
                        onComplete: (current_21) => {
                          setActiveDialog(null);
                          setTabsHidden(false);
                          let applyStyle = (style) => {
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
                          commitAndReport(
                            commitThroughConfigSet(findSetting("outputStyle"), current_21 ?? "", applyStyle),
                          );
                        },
                        onCancel: () => {
                          setActiveDialog(null);
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
                              ...hintFormat,
                            }),
                            jsxProd_default(ConfigurableShortcutHint, {
                              action: "confirm:no",
                              context: "Confirmation",
                              fallback: "Esc",
                              description: "cancel",
                              ...hintFormat,
                            }),
                          ],
                        }),
                      }),
                    ],
                  })
                : activeDialog === "Language"
                  ? jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(LanguagePicker, {
                          initialLanguage: language,
                          onComplete: (language) => {
                            setActiveDialog(null);
                            setTabsHidden(false);
                            let commitLanguage = (k_0) => {
                              let languageValue = String(k_0) || undefined;
                              setLanguage(languageValue);
                              updateSettingsForSource(
                                "userSettings",
                                {
                                  language: languageValue,
                                },
                                undefined,
                                storageV5,
                              );
                              let normalizedLanguage = normalizeLanguageForSTT(languageValue);
                              logEvent("tengu_language_changed", {
                                language: !languageValue
                                  ? lit("default")
                                  : normalizedLanguage.fellBackFrom === undefined
                                    ? localeOrNonconforming(normalizedLanguage.code)
                                    : lit("custom"),
                                source: lit("config_panel"),
                              });
                            };
                            commitAndReport(
                              commitThroughConfigSet(findSetting("language"), language ?? "", commitLanguage),
                            );
                          },
                          onCancel: () => {
                            setActiveDialog(null);
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
                  : activeDialog === "AgentsView"
                    ? jsxProd_default_2(Dialog, {
                        title: "Agents view",
                        onCancel: () => {
                          savedCountRef.current += 1;
                          setActiveDialog(null);
                          setTabsHidden(false);
                        },
                        hideBorder: true,
                        hideInputGuide: true,
                        children: [
                          jsxProd_default(merged_2, {
                            visibleCount: agentViewRows.length * 2,
                            children: agentViewRows.map((k_1) =>
                              jsxProd_default(
                                merged_2.Field,
                                {
                                  label: k_1.label,
                                  children: jsxProd_default(merged_2.Toggle, {
                                    value: k_1.value,
                                    onChange: (k_2) =>
                                      commitViaRow(k_1.id, k_2, (setting) =>
                                        setAgentViewRow(k_1.id, setting === true),
                                      ),
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
                    : activeDialog === "EnumPicker" && enumPickerSetting
                      ? jsxProd_default_2(Box, {
                          flexDirection: "column",
                          onClick: stopClickPropagation,
                          children: [
                            jsxProd_default(Dialog, {
                              title: enumPickerSetting.label,
                              subtitle:
                                enumPickerSetting.provided === undefined
                                  ? undefined
                                  : `${enumPickerSetting.provided.description} \xB7 ${enumPickerSetting.provided.plugin}`,
                              onCancel: closeEnumPicker,
                              hideBorder: true,
                              hideInputGuide: true,
                              children: jsxProd_default(ModelSelector, {
                                options: enumPickerSetting.options.map((prev_21) => ({
                                  label: prev_21,
                                  value: prev_21,
                                })),
                                defaultValue: String(enumPickerSetting.value),
                                defaultFocusValue: String(enumPickerSetting.value),
                                onChange: (newIndex_0) => {
                                  closeEnumPicker();
                                  changeSetting(enumPickerSetting, newIndex_0);
                                },
                                onCancel: closeEnumPicker,
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
                      : activeDialog === "TextEdit" && textEditSetting
                        ? jsxProd_default(Box, {
                            flexDirection: "column",
                            onClick: stopClickPropagation,
                            children: jsxProd_default(AgentsList, {
                              title: textEditSetting.label,
                              subtitle:
                                textEditSetting.provided === undefined
                                  ? undefined
                                  : `${textEditSetting.provided.description} \xB7 ${textEditSetting.provided.plugin}`,
                              fields: [
                                {
                                  type: "text",
                                  key: "value",
                                  label: textEditSetting.label,
                                  validate: (prev_22) =>
                                    textEditSetting.coerce?.(prev_22) === undefined
                                      ? (textEditSetting.optionsHint ?? "Not a value it takes")
                                      : null,
                                },
                              ],
                              values: {
                                value: textEditValue,
                              },
                              onChange: (field, value) => setTextEditValue(value),
                              onSubmit: () => {
                                let setting = textEditSetting;
                                let coercedValue = setting.coerce?.(textEditValue) ?? textEditValue;
                                closeTextEdit();
                                if (coercedValue !== shownSettingValue(setting))
                                  changeSetting(setting, coercedValue);
                              },
                              onCancel: closeTextEdit,
                            }),
                          })
                        : activeDialog === "EnableAutoUpdates"
                          ? jsxProd_default(Dialog, {
                              title: "Enable Auto-Updates",
                              onCancel: () => {
                                setActiveDialog(null);
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
                                        setActiveDialog(null);
                                        setTabsHidden(false);
                                        commitSetting("autoUpdatesChannel", prev_24, (delta) =>
                                          commitAutoUpdateChannel(delta, {
                                            kind: "enable",
                                          }),
                                        );
                                      },
                                    }),
                            })
                          : activeDialog === "ChannelDowngrade"
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
                                onChoice: (choice) => {
                                  setActiveDialog(null);
                                  setTabsHidden(false);
                                  if (choice === "cancel") return;
                                  commitSetting("autoUpdatesChannel", "stable", (setting_1) =>
                                    commitAutoUpdateChannel(
                                      setting_1,
                                      choice === "stay"
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
                            : activeDialog === "Notifications"
                              ? jsxProd_default(ColorStep, {
                                  channel: globalConfig.preferredNotifChannel,
                                  showInputNeededRow: pushTogglesVisible && isKairosInputNeededPushEnabled(),
                                  showDoneRow: pushTogglesVisible,
                                  inputNeededEnabled: globalConfig.inputNeededNotifEnabled ?? false,
                                  doneEnabled: globalConfig.agentPushNotifEnabled ?? false,
                                  onChangeChannel: (current_23) => {
                                    commitViaRow("notifChannel", current_23, (prev_25) => {
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
                                    commitViaRow("inputNeededNotifEnabled", language, (channel) => {
                                      let enabled = channel === true;
                                      changeInputNeededNotif(enabled);
                                      logEvent("tengu_config_changed", {
                                        setting: lit("inputNeededNotifEnabled"),
                                        value: enabled,
                                      });
                                    });
                                  },
                                  onChangeDone: (current_24) => {
                                    commitViaRow("agentPushNotifEnabled", current_24, (prev_26) => {
                                      let enabled = prev_26 === true;
                                      changeAgentPushNotif(enabled);
                                      logEvent("tengu_config_changed", {
                                        setting: lit("agentPushNotifEnabled"),
                                        value: enabled,
                                      });
                                    });
                                  },
                                  onClose: () => {
                                    savedCountRef.current += 1;
                                    setActiveDialog(null);
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
                                            query: truncatedQuery,
                                            isFocused: isSearchMode && !headerFocused,
                                            isTerminalFocused,
                                            cursorOffset,
                                            placeholder: "Search settings\u2026",
                                            isSearchLineUnpadded: false,
                                            onFocus: () => {
                                              if (headerFocused) blurHeader();
                                              setSearchMode(true);
                                            },
                                          }),
                                          remoteNotice !== null &&
                                            jsxProd_default(Text, {
                                              dimColor: true,
                                              wrap: "wrap-trim",
                                              children: remoteNotice,
                                            }),
                                        ],
                                      }),
                                    jsxProd_default(merged_2, {
                                      visibleCount:
                                        reservedRows > 0 ? maxVisible - reservedRows - 1 : maxVisible,
                                      defaultFocusIndex: Math.max(
                                        0,
                                        visibleSettings.findIndex((choice) => choice.id === focusedSettingId),
                                      ),
                                      isDisabled: !canInteract,
                                      keybindingContext: "Settings",
                                      onUpFromFirstItem: () => {
                                        setShowThinkingWarning(false);
                                        setSearchMode(true);
                                      },
                                      onDisabledRowClick: dismissSearch,
                                      onFocus: (prev_27) => {
                                        let id = visibleSettings[prev_27]?.id;
                                        if (id !== "thinking") setShowThinkingWarning(false);
                                        setFocusedSettingId(id);
                                        setResetKeyValue(resetKey);
                                      },
                                      resetKey,
                                      emptyMessage: `No settings match "${truncatedQuery}"`,
                                      children,
                                    }),
                                    reservedRows > 0 &&
                                      jsxProd_default(Box, {
                                        height: reservedRows,
                                        flexShrink: 0,
                                        children: jsxProd_default(Text, {
                                          dimColor: true,
                                          wrap: "wrap-trim",
                                          children: canInteract && cellText(lock?.reason),
                                        }),
                                      }),
                                    jsxProd_default(Box, {
                                      ref: footerRef,
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
                                                    terse: hintFormat.terse,
                                                  }),
                                                  jsxProd_default(KeyboardShortcutHint, {
                                                    chord: "down",
                                                    action: "return",
                                                    ...hintFormat,
                                                  }),
                                                  jsxProd_default(ConfigurableShortcutHint, {
                                                    action: "confirm:no",
                                                    context: "Settings",
                                                    fallback: "Esc",
                                                    description: "close",
                                                    ...hintFormat,
                                                  }),
                                                ],
                                              }),
                                            })
                                          : isSearchMode
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
                                                      ...hintFormat,
                                                    }),
                                                    jsxProd_default(KeyboardShortcutHint, {
                                                      chord: "up",
                                                      action: "tabs",
                                                      ...hintFormat,
                                                    }),
                                                    jsxProd_default(ConfigurableShortcutHint, {
                                                      action: "confirm:no",
                                                      context: "Settings",
                                                      fallback: "Esc",
                                                      description: "clear",
                                                      ...hintFormat,
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
                                                          ...hintFormat,
                                                        })
                                                      : lock?.source === "policy" &&
                                                        jsxProd_default(KeyboardShortcutHint, {
                                                          chord: ["enter", "space"],
                                                          action: "retry",
                                                          ...hintFormat,
                                                        }),
                                                    jsxProd_default(ConfigurableShortcutHint, {
                                                      action: "settings:search",
                                                      context: "Settings",
                                                      fallback: "/",
                                                      description: "search",
                                                      ...hintFormat,
                                                    }),
                                                    jsxProd_default(ConfigurableShortcutHint, {
                                                      action: "confirm:no",
                                                      context: "Settings",
                                                      fallback: "Esc",
                                                      description: "close",
                                                      ...hintFormat,
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
function formatSettingValue(setting, value, fieldDef, isColumnView) {
  if (isColumnView && setting.id === "switchModelsOnFlag") return SWITCH_MODEL_LABELS[value] ?? value;
  if (setting.id === "theme") return THEME_LABELS[value] ?? value;
  if (setting.id === "permissionMode") return permissionModeTitle(value);
  if (setting.id === "workflowSizeGuideline")
    return workflowSizeDisplay(value, (setting.isDefaultValue ?? false) && value === setting.value);
  if (setting.id === "notifChannel" && !fieldDef) return NOTIF_CHANNEL_LABELS[value] ?? value;
  return value;
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/components/Settings/Config.js");
export { markCustomSetting, renderMobileNotice, Config };
