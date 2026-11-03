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
import { yKn, hKn, ijs } from "../../services/notifications/notificationPreferences.js";
import { pu, ColorStep } from "../agents/new-agent-creation/wizard-steps/ColorStep.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { Gg, LEFT_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
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
import { nd } from "../../utils/stableEmptyObject.js";
import { useStatusLineSuppressed } from "../StatusLine.js";
import { Me, useTheme, useThemeSetting } from "../design-system/ThemeProvider.js";
import { useSession } from "../../context/session.js";
import { Cr, useAppStateSession, useAppState, useSetAppState } from "../../state/AppState.js";
import { useNotifications } from "../../context/notifications.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { Tl } from "../ScrollViewportContext.js";
import {
  getEffectiveConfigValues,
  remoteForwardedSettings,
  sjs,
  buildConfigRows,
  FORWARD_SETTINGS_ERRORS,
  CONFIG_SAVE_FAILED,
} from "../../commands/config/configSettings.js";
import { getInitialSettings_2, updateSettingsForSource } from "../../utils/settings/settings.js";
import { Kan } from "../../services/feedbackDrafts.js";
import {
  isAutoContinueEnabled,
  isAutoContinueUserSetting,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { DEFAULT as DEFAULT_2, OUTPUT_STYLE_CONFIG } from "../../constants/outputStyles.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { wt, Jn } from "../../remote/remoteMode.js";
import { useMainLoopModelSetting } from "../../hooks/useMainLoopModel.js";
import { isFastModeEnabled, supportsFastMode, isFastModeAvailable } from "../../utils/fastMode.js";
import { sDe } from "../../hooks/usePromptSuggestion.js";
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
import { Myt } from "./configGates.js";
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
import { Nf } from "../../commands/model/modelSwitch.js";
import { logEvent } from "../../services/analytics/index.js";
import { isSettingsMovedToConfig } from "../../commands/createMovedToConfigCommand.js";
import { l5, zR, PANE_PADDING } from "../design-system/Pane.js";
import { gn } from "../../utils/shortHash.js";
import { sequential } from "../../utils/sequential.js";
import { isAntBuild, getSafeModeExitHint, getClaudeConfigDir } from "../../utils/envUtils.js";
import { nge } from "../../utils/auth/lockHolderLiveness.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { stripPrefix } from "../../utils/stringUtils.js";
import { ensurePolicyLimitsLoadedForDiagnostic } from "../../bridge/bridgeGates.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  recordExternalIncludesDecision,
  ClaudeMdExternalIncludesDialog,
} from "../ClaudeMdExternalIncludesDialog.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { aze } from "../../utils/backgroundHandoff.js";
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
import { hBe } from "../../services/analytics/metadata.js";
import { Dialog } from "../design-system/Dialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { AgentsList } from "../agents/AgentsList.js";
import { ChannelDowngradeDialog } from "../ChannelDowngradeDialog.js";
import { Jnr } from "../../tools/PushNotificationTool/prompt.js";
import { SearchBox } from "../SearchBox.js";
import { cellText } from "../CustomSelect/selectTable.js";
import { permissionModeTitle } from "../../utils/permissions/PermissionMode.js";
import { Ahi } from "../../utils/workflows/workflowGates.js";

//@ chunk-9h8dr0qb.js:12815-13132 placement
function renderMobileNotice() {
  let u = w(1);
  if (yt(yKn, hKn, pu)?.has_active_channel !== !1) {
    return null;
  }
  let p;
  if (u[0] === MEMO_CACHE_SENTINEL)
    ((p = r(Text, {
      color: "warning",
      wrap: "truncate-end",
      children: [
        "  ",
        Gg,
        " No mobile registered \xB7",
        " ",
        e(Link, { url: "https://claude.com/download#mobile", children: "get the app" }),
        " and turn on notif",
      ],
    })),
      (u[0] = p));
  else p = u[0];
  return p;
}
/**
 * 设置页分组标题（外观、模型与输出、显示、输入与控制、连接、插件、高级、实验、内部）。
 */
//@ chunk-9h8dr0qb.js:13132-13703 placement
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
  ],
  Ro = [
    {
      id: "autoUpdatesChannel",
      isSet: ({ settingsData: settingsData }) => settingsData?.autoUpdatesChannel !== void 0,
    },
    {
      id: "worktreeBaseRef",
      isSet: ({ settingsData: settingsData }) => settingsData?.worktree?.baseRef !== void 0,
    },
    {
      id: "gitignore",
      isSet: ({ globalConfig: globalConfig }) =>
        globalConfig.respectGitignore !== DEFAULT_GLOBAL_CONFIG.respectGitignore,
    },
    {
      id: "copyFullResponse",
      isSet: ({ globalConfig: globalConfig }) =>
        globalConfig.copyFullResponse !== DEFAULT_GLOBAL_CONFIG.copyFullResponse,
    },
    { id: "recap", isSet: ({ settingsData: settingsData }) => settingsData?.awaySummaryEnabled !== void 0 },
  ],
  gu = new Set(Ro.map((o) => o.id));
//@ chunk-9h8dr0qb.js:13703-13735 placement
function hu(o) {
  return gu.has(o);
}
//@ chunk-9h8dr0qb.js:13735-13830 placement
function Ta(o, u) {
  return o === "Advanced" && hu(u) ? { name: o, note: "moving to settings.json" } : { name: o };
}
/**
 * 各分组包含的设置键。
 */
//@ chunk-9h8dr0qb.js:13830-15061 placement
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
    Advanced: Ro.map((o) => o.id),
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
  },
  yu = new Map(CONFIG_SECTION_TITLES.flatMap((o) => CONFIG_SECTION_KEYS[o].map((u) => [u, o]))),
  Su = new Map(
    CONFIG_SECTION_TITLES.flatMap((o, u) => CONFIG_SECTION_KEYS[o].map((p, h) => [p, u * 1000 + h])),
  );
//@ chunk-9h8dr0qb.js:15061-15099 placement
function xa(o) {
  return o.includes(".");
}
//@ chunk-9h8dr0qb.js:15099-15161 placement
function Ps(o) {
  return yu.get(o) ?? (xa(o) ? "Plugins" : "Advanced");
}
//@ chunk-9h8dr0qb.js:15161-15230 placement
var bu = CONFIG_SECTION_TITLES.indexOf("Plugins") * 1000,
  Cu = CONFIG_SECTION_TITLES.indexOf("Advanced") * 1000 + 999;
//@ chunk-9h8dr0qb.js:15230-15277 placement
function ka(o) {
  return Su.get(o) ?? (xa(o) ? bu : Cu);
}
//@ chunk-9h8dr0qb.js:15277-15419 placement
function sortSettingsByOrder(o) {
  return o
    .map((u, p) => ({ item: u, i: p }))
    .sort((u, p) => {
      let h = ka(u.item.id) - ka(p.item.id);
      return h !== 0 ? h : u.i - p.i;
    })
    .map(({ item: item }) => item);
}
//@ chunk-9h8dr0qb.js:15419-15563 placement
var SETTING_ID_RE = /^[a-z][A-Za-z0-9]{0,63}$/,
  SETTING_VALUE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/,
  FIXED_VALUE_LABELS = new Set(["Allowed", "Not allowed", "Switch automatically", "Ask each time", ...[]]);
//@ chunk-9h8dr0qb.js:15563-15621 placement
function Os(o) {
  return SETTING_ID_RE.test(o) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(o) : lit("nonconforming");
}
//@ chunk-9h8dr0qb.js:15621-15690 placement
function Ra(o) {
  return SETTING_VALUE_ID_RE.test(o) || FIXED_VALUE_LABELS.has(o)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(o)
    : lit("nonconforming");
}
//@ chunk-9h8dr0qb.js:15690-15898 placement
function truncateToWidth(o, u) {
  if (bunStringWidth(o) <= u) return o;
  let max = Math.max(1, u - 1),
    h = 0,
    D = 0;
  while (D < o.length) {
    let code = o.charCodeAt(D),
      T = code >= 55296 && code <= 56319 ? 2 : 1,
      A = bunStringWidth(o.slice(D, D + T));
    if (h + A > max) break;
    ((h += A), (D += T));
  }
  return o.slice(0, D) + "\u2026";
}
//@ chunk-9h8dr0qb.js:15898-15950 layout
function Ls(o) {
  return o.map((u) => u.id).join("\x00");
}
//@ chunk-9h8dr0qb.js:15950-16100 layout
function sameSettingLabels(o, u) {
  if (o.size !== u.size) return !1;
  for (let [p, h] of o) {
    let D = u.get(p);
    if (D === void 0 || D.label !== h.label || D.hidden !== h.hidden) return !1;
  }
  return !0;
}
//@ chunk-9h8dr0qb.js:16100-16144 layout
function Ea(o) {
  o.stopImmediatePropagation();
}
/**
 * /config 主体：可搜索的设置列表，布尔项回车切换、枚举项左右切换（主题、编辑器模式 normal/vim、通知方式、自动压缩、显示回合耗时、自动复制、减少动画、输出样式、模型、语言等），修改写入对应 settings 并记录事件。
 */
//@ chunk-9h8dr0qb.js:16144-41746 fingerprint = Config (0.475)
function Config({
  onClose: onClose,
  mcpClients: mcpClients,
  messages: messages,
  setTabsHidden: setTabsHidden,
  onIsSearchModeChange: onIsSearchModeChange,
  unclaimedPaneClick: unclaimedPaneClick,
  contentHeight: contentHeight,
}) {
  let A = useIsFullscreen(),
    v = !1,
    F = nd(!1),
    U = useStatusLineSuppressed(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    B = useSession(),
    H = Cr(),
    K = useAppStateSession(),
    { addNotification: addNotification } = useNotifications(),
    ne = R(0),
    V = R(0),
    { headerFocused: headerFocused, focusHeader: focusHeader, blurHeader: blurHeader } = useTabHeaderFocus(),
    insideModal = Tl(),
    [, fe] = useTheme(),
    themeSetting = useThemeSetting(),
    [de, ve] = y(getEffectiveConfigValues),
    pe = R(de),
    [Ce, He] = y(() => ({
      ...getInitialSettings_2(),
      ...remoteForwardedSettings(),
      feedbackDrafts: Kan(),
      autoContinueAtUsageLimit: isAutoContinueEnabled(),
    })),
    xe = R(getInitialSettings_2()),
    [Oe, Ve] = y(Ce?.outputStyle || DEFAULT_2),
    ke = R(Oe),
    [Ue, Ie] = y(() => getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved === !0),
    [ye, We] = y(Ce?.language),
    _e = R(ye),
    [Ne, at] = y(void 0),
    [ot, st] = y(void 0),
    [et, Ge] = y(0),
    [, Qe] = y(0),
    ze = R(null),
    rt = R(""),
    kt = R(null),
    Ze = useIsScreenReaderEnabled();
  useFocusOnMount(kt, Ze ? !1 : !headerFocused);
  let [Xe, tt] = y(!Ze),
    isTerminalFocused = useTerminalFocus(),
    { rows: rows, columns: columns } = useTerminalSize(),
    _n = R(null),
    [Qt, ps] = y(1),
    In = contentHeight ?? Math.min(Math.floor(rows * 0.8), 30),
    hn = !wt()
      ? null
      : Jn()?.sessionId !== void 0
        ? "Changes here update this machine's settings and future cloud sessions, not the running one."
        : "Changes here update this machine's settings, not the running remote session.",
    zi = hn === null ? 0 : Math.ceil((hn.length + 2) / Math.max(1, columns - 4)),
    maxVisible = Math.max(5, In - 8 - Qt - zi),
    mainLoopModel = useAppState((k) => k.mainLoopModel),
    mainLoopModelForSession = useAppState((s_0) => s_0.mainLoopModelForSession),
    gs = useMainLoopModelSetting() ?? mainLoopModel,
    verbose = useAppState((s_1) => s_1.verbose),
    thinkingEnabled = useAppState((s_2) => s_2.thinkingEnabled),
    promptSuggestionEnabled = useAppState((s_3) => (isFastModeEnabled() ? s_3.fastMode : !1)),
    Ul = sDe(promptSuggestionEnabled, gs),
    promptSuggestionEnabled_2 = useAppState((k) => k.promptSuggestionEnabled),
    awaySummaryEnabled = useAppState((k) => k.awaySummaryEnabled),
    isBriefEntitled = require("./chunk-cv3kgbt2.js").isBriefEntitled(),
    setAppState = useSetAppState(),
    [Yi, hs] = y(() => new Map()),
    Hl = Q(
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
            return (se.delete(k), se);
          }),
        toggle: (k, oe) =>
          hs((se) => {
            let ge = new Map(se);
            return ge.delete(k) ? ge : ge.set(k, oe);
          }),
      }),
      [],
    ),
    Vl = R(thinkingEnabled);
  P(() => ijs(() => ve(getEffectiveConfigValues())), []);
  let [zl, ho] = y(!1),
    [qi, On] = y(null),
    [Be, Fe] = y(null),
    Ln = R(0),
    [Qi, Xi] = y(null),
    [Ji, Zi] = y(null),
    [Ss, ta] = y(""),
    enabled = useAppState((k) => k.plugins.enabled),
    [Gl, Yl] = y(() => new Map()),
    [ql, Ql] = y(() => new Map()),
    Xl = yt(CONFIG_ROWS_VERSION.subscribe, CONFIG_ROWS_VERSION.get);
  zt(() => {
    if (!_n.current) return;
    let height = measureElement(_n.current).height;
    if (height !== Qt) ps(height);
  }, [headerFocused, Xe, columns, rows, Qt, Be]);
  let {
      query: searchQuery,
      setQuery: setSearchQuery,
      cursorOffset: searchCursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput({
      isActive: Xe && Be === null && !headerFocused,
      onExit: () => tt(!1),
      onExitUp: focusHeader,
      passthroughCtrlKeys: ["c", "d"],
    }),
    oa = !headerFocused;
  P(() => {
    onIsSearchModeChange(oa);
  }, [oa, onIsSearchModeChange]);
  let ec = hasAccessToIDEExtensionDiffFeature(mcpClients),
    tc = !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING,
    sa = resolveSetting("disableWorkflows", !1),
    ia = resolveSetting("enableWorkflows", !1),
    nc =
      isEligibleForOverageCreditGrant() &&
      (sa.value !== !0 || sa.source === "userSettings") &&
      (ia.source === "default" || ia.source === "userSettings"),
    oc = !hasWorkflowSizeSetting(),
    sc = isAutoContinueUserSetting(),
    ic = isArtifactConfigToggleable(),
    [ac] = y(isRemoteToolServingOnForSettings),
    rc = sjs(),
    lc = Q(() => null, [rc]),
    isConnectedToIde = Qr(getMemoryFilesCached(B, !0, storageV5, credentials)),
    shouldShowExternalIncludesToggle = hasExternalClaudeMdIncludes(isConnectedToIde),
    autoUpdaterDisabledReason = getAutoUpdaterDisabledReason(),
    bs = Myt(),
    {
      settings: settings,
      dialogFieldRows: dialogFieldRows,
      helpers: {
        onChangeMainModelConfig: mc,
        changeNotifChannel: fc,
        changeInputNeededNotif: pc,
        changeAgentPushNotif: gc,
      },
    } = buildConfigRows({
      globalConfig: de,
      settingsData: Ce,
      themeSetting: themeSetting,
      currentOutputStyle: Oe,
      currentLanguage: ye,
      externalIncludesApproved: Ue,
      thinkingEnabled: thinkingEnabled,
      verbose: verbose,
      mainLoopModel: mainLoopModel,
      currentModel: gs,
      isFastMode: promptSuggestionEnabled,
      promptSuggestionEnabled: promptSuggestionEnabled_2,
      awaySummaryEnabled: awaySummaryEnabled,
      showDefaultViewPicker: isBriefEntitled,
      pushTogglesVisible: bs,
      crossSessionInboxRowVisible: isCrossSessionMessagingEnabled(),
      isConnectedToIde: ec,
      inAppSelection: A,
      tabsStandIn: U,
      isFileCheckpointingAvailable: tc,
      workflowsToggleable: nc,
      workflowSizeGuidelineToggleable: oc,
      autoContinueAtUsageLimitToggleable: sc,
      artifactToggleable: ic,
      remoteToolServingOn: ac,
      launchDirectoryKeys: lc,
      shouldShowExternalIncludesToggle: shouldShowExternalIncludesToggle,
      autoUpdaterDisabledReason: autoUpdaterDisabledReason,
      storageV5: storageV5,
      promptSuggestionRun: B.promptSuggestion,
      mayBeAuthoredByNonOwner: !1,
      modelSwitchHooks: { session: K, readState: H.getState, latestPick: ne, latestFastPick: V },
      setAppState: setAppState,
      setTheme: fe,
      setGlobalConfig: ve,
      setSettingsData: He,
      setPlanAutoModeOffAtLaunch: setPlanAutoModeOffAtLaunch,
      changeLog: Hl,
    }),
    Nn = [
      ...settings,
      ...pluginConfigSettings(enabled, {
        storageV5: storageV5,
        shown: Gl,
        onShown: (k, oe) => Yl((value) => new Map(value).set(k, oe)),
      }),
    ],
    hc = Ls(Nn);
  P(() => {
    let k = !0;
    return (
      describedSettings(Nn)
        .then((prev) => {
          if (k) Ql((prev_0) => (sameSettingLabels(prev_0, prev) ? prev_0 : prev));
        })
        .catch((value_0) => {
          logError(toError(value_0));
        }),
      () => {
        k = !1;
      }
    );
  }, [hc, Xl]);
  let flattened = Nn.flatMap((current) => {
      let oe = ql.get(current.id);
      if (oe?.hidden) return [];
      let se =
        oe === void 0 || oe.label === current.label
          ? current
          : "labelBoldSuffix" in current
            ? { ...current, label: oe.label, labelBoldSuffix: "" }
            : { ...current, label: oe.label };
      return [throughConfigSet(se)];
    }),
    Sn = ce(
      (k, oe) => {
        Promise.resolve(k)
          .then((prev_1) => {
            if (prev_1 && "error" in prev_1 && prev_1.error)
              (oe?.(),
                addNotification({
                  key: "config-change-refused",
                  kind: "warning",
                  text: prev_1.error.message,
                  color: "warning",
                  priority: "immediate",
                }));
          })
          .catch((prev_2) => {
            logError(toError(prev_2));
          });
      },
      [addNotification],
    ),
    So = (current_0) => {
      let found = Nn.find((prev_3) => prev_3.id === current_0);
      return found === void 0 ? void 0 : throughConfigSet(found);
    },
    Cs = (k, oe, se, ge) => {
      let be = dialogFieldRows.find((prev_4) => prev_4.id === k) ?? Nn.find((prev_5) => prev_5.id === k);
      Sn(commitThroughConfigSet(be, oe, se), ge);
    },
    bo = (k, oe, se) => {
      let ge = Ln.current;
      Cs(k, oe, se, () => {
        if (Ln.current === ge) ((Ln.current += 1), Fe(null), setTabsHidden(!1));
      });
    },
    Co = ce(
      (k, oe) => {
        if (k !== "latest" && k !== "stable")
          return {
            error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Auto-update channel doesn't accept "${Nf(String(k))}".`,
              "auto-update channel rewritten to a value the row does not know",
            ),
          };
        if (oe.kind === "enable") {
          (saveGlobalConfig((prev_6) => ({ ...prev_6, autoUpdates: !0 }), storageV5),
            ve((prev_7) => ({ ...prev_7, autoUpdates: !0 })),
            updateSettingsForSource(
              "userSettings",
              { autoUpdatesChannel: k, minimumVersion: void 0 },
              void 0,
              storageV5,
            ),
            He((prev_8) => ({ ...prev_8, autoUpdatesChannel: k, minimumVersion: void 0 })),
            logEvent("tengu_autoupdate_enabled", { channel: fromEnum(k) }));
          return;
        }
        let se =
          k === "latest"
            ? { autoUpdatesChannel: void 0, minimumVersion: void 0 }
            : oe.minimumVersion === void 0
              ? { autoUpdatesChannel: k }
              : { autoUpdatesChannel: k, minimumVersion: oe.minimumVersion };
        (updateSettingsForSource("userSettings", se, void 0, storageV5),
          He((prev_9) => ({ ...prev_9, ...se })),
          logEvent("tengu_autoupdate_channel_changed", {
            channel: fromEnum(k),
            ...(k === "stable" && { minimum_version_set: oe.minimumVersion !== void 0 }),
          }));
      },
      [storageV5],
    ),
    en = isSettingsMovedToConfig(),
    bt = Q(() => {
      let k = en ? sortSettingsByOrder(flattened) : flattened;
      if (!searchQuery) return k;
      let lower = searchQuery.toLowerCase();
      return k.filter((prev_10) => {
        if (prev_10.id.toLowerCase().includes(lower)) return !0;
        if (
          (("searchText" in prev_10 ? prev_10.searchText : void 0) ?? prev_10.label)
            .toLowerCase()
            .includes(lower)
        )
          return !0;
        if (prev_10.type === "enum")
          return prev_10.options.some((prev_11) => prev_11.toLowerCase().includes(lower));
        return !1;
      });
    }, [flattened, searchQuery, en]);
  P(() => {
    if (Ze || ze.current === null) return;
    if (Xe || Ne !== ze.current) ze.current = null;
  }, [Ze, Ne, Xe]);
  let yc = yt(yKn, hKn, () => {
      return;
    }),
    max = Math.max(1, columns - 2 * (insideModal ? l5 + zR : PANE_PADDING)),
    max_2 = Math.max(1, max - 7),
    ws = truncateToWidth(searchQuery, max_2),
    min = Math.min(searchCursorOffset, ws.length),
    wc = ce(() => {
      if (Be !== null) return;
      let mapped = [...Yi].map(([be, mt]) => {
          let Wn = fromEnum(be);
          return (
            logEvent("tengu_config_changed", { key: Wn, setting: Wn, value: gn(String(mt)) }),
            `Set ${be} to ${sequential.bold(mt)}`
          );
        }),
        oe = isAntBuild() ? void 0 : env.ANTHROPIC_API_KEY,
        se = Boolean(oe && customApiKeyResponsesOf(pe.current).approved.includes(nge(oe))),
        ge = Boolean(oe && customApiKeyResponsesOf(de).approved.includes(nge(oe)));
      if (se !== ge)
        (mapped.push(`${ge ? "Enabled" : "Disabled"} custom API key`),
          logEvent("tengu_config_changed", {
            key: lit("env.ANTHROPIC_API_KEY"),
            setting: lit("env.ANTHROPIC_API_KEY"),
            value: ge,
          }));
      if (de.theme !== pe.current.theme) mapped.push(`Set theme to ${sequential.bold(de.theme)}`);
      if (de.preferredNotifChannel !== pe.current.preferredNotifChannel)
        mapped.push(`Set notifications to ${sequential.bold(de.preferredNotifChannel)}`);
      if (Oe !== ke.current) mapped.push(`Set output style to ${sequential.bold(Oe)}`);
      if (ye !== _e.current)
        mapped.push(`Set response language to ${sequential.bold(ye ?? "Default (English)")}`);
      if (de.editorMode !== pe.current.editorMode)
        mapped.push(`Set editor mode to ${sequential.bold(de.editorMode || "emacs")}`);
      if (de.diffTool !== pe.current.diffTool)
        mapped.push(`Set diff tool to ${sequential.bold(de.diffTool)}`);
      if (de.autoConnectIde !== pe.current.autoConnectIde)
        mapped.push(`${de.autoConnectIde ? "Enabled" : "Disabled"} auto-connect to IDE`);
      if (de.autoInstallIdeExtension !== pe.current.autoInstallIdeExtension)
        mapped.push(`${de.autoInstallIdeExtension ? "Enabled" : "Disabled"} auto-install IDE extension`);
      if (de.autoCompactEnabled !== pe.current.autoCompactEnabled)
        mapped.push(`${de.autoCompactEnabled ? "Enabled" : "Disabled"} auto-compact`);
      if (de.autoScrollEnabled !== pe.current.autoScrollEnabled)
        mapped.push(`${de.autoScrollEnabled ? "Enabled" : "Disabled"} auto-scroll`);
      if (de.respectGitignore !== pe.current.respectGitignore)
        mapped.push(`${de.respectGitignore ? "Enabled" : "Disabled"} respect .gitignore in file picker`);
      if (de.copyFullResponse !== pe.current.copyFullResponse)
        mapped.push(`${de.copyFullResponse ? "Enabled" : "Disabled"} always copy full response`);
      if (de.copyOnSelect !== pe.current.copyOnSelect)
        mapped.push(`${de.copyOnSelect ? "Enabled" : "Disabled"} copy on select`);
      if (de.leftArrowOpensAgents !== pe.current.leftArrowOpensAgents)
        mapped.push(`${(de.leftArrowOpensAgents ?? !0) ? "Enabled" : "Disabled"} ${LEFT_ARROW} opens agents`);
      if (de.defaultToAgentsView !== pe.current.defaultToAgentsView)
        mapped.push(`${de.defaultToAgentsView ? "Enabled" : "Disabled"} open agents view by default`);
      if (de.terminalProgressBarEnabled !== pe.current.terminalProgressBarEnabled)
        mapped.push(`${de.terminalProgressBarEnabled ? "Enabled" : "Disabled"} terminal progress bar`);
      if (de.showStatusInTerminalTab !== pe.current.showStatusInTerminalTab)
        mapped.push(`${de.showStatusInTerminalTab ? "Enabled" : "Disabled"} terminal tab status`);
      if (de.showTurnDuration !== pe.current.showTurnDuration)
        mapped.push(`${de.showTurnDuration ? "Enabled" : "Disabled"} turn duration`);
      if (de.showMessageTimestamps !== pe.current.showMessageTimestamps)
        mapped.push(`${de.showMessageTimestamps ? "Enabled" : "Disabled"} message timestamps`);
      if (de.remoteControlAtStartup !== pe.current.remoteControlAtStartup) {
        let be =
          de.remoteControlAtStartup === void 0
            ? "Reset Remote Control to default"
            : `${de.remoteControlAtStartup ? "Enabled" : "Disabled"} Remote Control for all sessions`;
        mapped.push(be);
      }
      if (Ce?.autoUpdatesChannel !== xe.current?.autoUpdatesChannel)
        mapped.push(
          `Set auto-update channel to ${sequential.bold(Ce?.autoUpdatesChannel === "rc" ? "slow" : (Ce?.autoUpdatesChannel ?? "latest"))}`,
        );
      if (mapped.length > 0)
        onClose(
          mapped.join(`
`),
        );
      else onClose("Config dialog dismissed", { display: "system" });
    }, [
      Be,
      Yi,
      de,
      mainLoopModel,
      Oe,
      ye,
      Ce?.autoUpdatesChannel,
      isFastModeEnabled() ? Ce?.fastMode : void 0,
      onClose,
    ]);
  useKeybinding("confirm:no", wc, { context: "Settings", isActive: Be === null && !Xe && !headerFocused });
  let ks = ce(
      (current_1) =>
        en && current_1.type === "managedEnum" && current_1.id === "showExternalIncludesDialog" && Ue,
      [en, Ue],
    ),
    kc = ce(
      (current_2) =>
        Ro.find((current_3) => current_3.id === current_2)?.isSet({ settingsData: Ce, globalConfig: de }) ??
        !1,
      [Ce, de],
    ),
    wo = ce(
      (k, oe) => {
        let onChange = k.onChange(oe),
          ge = (current_4) => {
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
              setting: Os(k.id),
              value: k.provided === void 0 ? Ra(oe) : lit("plugin_field"),
            });
          };
        if (onChange instanceof Promise) {
          onChange.then(ge);
          return;
        }
        ge(onChange);
      },
      [addNotification],
    ),
    Tt = Q(() => {
      let found = flattened.find((current_5) => current_5.id === Qi);
      return found && found.type === "enum" ? found : void 0;
    }, [flattened, Qi]),
    tn = ce(() => {
      (Xi(null), Fe(null), setTabsHidden(!1));
    }, [setTabsHidden]),
    Dt = Q(() => {
      let found = flattened.find((oe) => oe.id === Ji);
      return found && found.type === "managedEnum" ? found : void 0;
    }, [flattened, Ji]),
    bn = ce(() => {
      (Zi(null), Fe(null), setTabsHidden(!1));
    }, [setTabsHidden]);
  (zt(() => {
    if (Be === "TextEdit" && Dt === void 0) bn();
    else if (Be === "EnumPicker" && Tt === void 0) tn();
  }, [Be, Dt, Tt, bn, tn]),
    P(
      () =>
        unclaimedPaneClick.subscribe(() => {
          if (Be === "EnumPicker") tn();
          else if (Be === "TextEdit") bn();
        }),
      [unclaimedPaneClick, Be, tn, bn],
    ));
  let Fn = ce(
    (k, oe) => {
      if (ze.current !== null && ze.current !== k.id) {
        let parsedMode = Ls(bt);
        if (Ze && parsedMode !== rt.current) {
          ((ze.current = null), (rt.current = parsedMode));
          return;
        }
        ze.current = null;
      }
      if (k.lock !== void 0) {
        if (k.lock.source === "managed") return;
        ((ze.current = k.id),
          (rt.current = Ls(bt)),
          ensurePolicyLimitsLoadedForDiagnostic()
            .catch(() => {})
            .finally(() => Qe((se) => se + 1)));
        return;
      }
      if (ze.current === k.id) {
        ((ze.current = null), Qe((se) => se + 1));
        return;
      }
      if (k.id === "remoteHomeSettings" && k.value === !1) {
        if (k.grantBlocker !== void 0)
          (logFeatureBad("remote_home_settings_mode", k.grantBlocker),
            On(FORWARD_SETTINGS_ERRORS[k.grantBlocker]));
        else (Fe("RemoteHomeSettings"), setTabsHidden(!0));
        return;
      }
      if (k.type === "boolean") {
        let se = typeof oe === "boolean" ? oe : !k.value,
          onChange = k.onChange(se);
        if (k.id === "remoteHomeSettings")
          (On(null),
            Promise.resolve(onChange).then((prev_12) => {
              if (prev_12?.error) On(prev_12.error.message);
              else if (prev_12?.messageSuffix) On(`Saved${prev_12.messageSuffix}`);
            }));
        if (
          (Promise.resolve(onChange)
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
              (logError(toError(prev_14)),
                addNotification({
                  key: "config-change-refused",
                  kind: "warning",
                  text: `Setting change failed: ${Nf(errorMessage(prev_14))}`,
                  color: "warning",
                  priority: "immediate",
                }));
            }),
          logEvent("tengu_config_changed", { setting: Os(k.id), value: se }),
          k.id === "thinking")
        ) {
          if (se === Vl.current) ho(!1);
          else if (messages.some((prev_15) => prev_15.type === "assistant")) ho(!0);
        }
        return;
      }
      if (ks(k)) {
        (recordExternalIncludesDecision(!1, "config_toggle", storageV5), Ie(!1));
        return;
      }
      if (k.id === "agentsView") {
        (Fe("AgentsView"), setTabsHidden(!0));
        return;
      }
      if (k.id === "notifChannel" && k.type === "managedEnum") {
        (Fe("Notifications"), setTabsHidden(!0));
        return;
      }
      if (k.provided !== void 0 && k.type === "managedEnum") {
        (Zi(k.id), ta(shownSettingValue(k)), Fe("TextEdit"), setTabsHidden(!0));
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
            (Fe("Theme"), setTabsHidden(!0));
            return;
          case "model":
            (Fe("Model"), setTabsHidden(!0));
            return;
          case "showExternalIncludesDialog":
            (Fe("ExternalIncludes"), setTabsHidden(!0));
            return;
          case "outputStyle":
            (Fe("OutputStyle"), setTabsHidden(!0));
            return;
          case "language":
            (Fe("Language"), setTabsHidden(!0));
            return;
        }
      if (k.id === "autoUpdatesChannel") {
        if (autoUpdaterDisabledReason) {
          (Fe("EnableAutoUpdates"), setTabsHidden(!0));
          return;
        }
        if ((Ce?.autoUpdatesChannel ?? "latest") === "latest") (Fe("ChannelDowngrade"), setTabsHidden(!0));
        else Sn(commitThroughConfigSet(k, "latest", (prev_16) => Co(prev_16, { kind: "switch" })));
        return;
      }
      if (k.type === "enum" && k.pickToCommit) {
        (Xi(k.id), Fe("EnumPicker"), setTabsHidden(!0));
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
      Ze,
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
        (tt(!0), setSearchQuery(""));
      },
    },
    { context: "Settings", isActive: Be === null && !Xe && !headerFocused && !Ze },
  );
  let ra = Q(
      () => [
        ...(aze()
          ? [
              {
                id: "leftArrowOpensAgents",
                label: `${LEFT_ARROW} opens agents`,
                value: de.leftArrowOpensAgents ?? !0,
              },
            ]
          : []),
        ...(isAgentsFleetEnabled()
          ? [{ id: "defaultToAgentsView", label: "Start in agent view", value: de.defaultToAgentsView ?? !1 }]
          : []),
      ],
      [de.leftArrowOpensAgents, de.defaultToAgentsView],
    ),
    Tc = ce(
      (k, oe) => {
        if (k === "leftArrowOpensAgents")
          (saveGlobalConfig((current_6) => ({ ...current_6, leftArrowOpensAgents: oe }), storageV5),
            ve((current_7) => ({ ...current_7, leftArrowOpensAgents: oe })));
        else
          (saveGlobalConfig((current_8) => ({ ...current_8, defaultToAgentsView: oe }), storageV5),
            ve((current_9) => ({ ...current_9, defaultToAgentsView: oe })));
        logEvent("tengu_config_changed", { setting: fromEnum(k), value: oe });
      },
      [storageV5],
    ),
    Dc = ce(
      (current_10) => {
        if (Be !== null) return;
        if (headerFocused) return;
        if (Xe) {
          if ((current_10.key === "return" || current_10.key === "down") && bt.length === 0) {
            current_10.preventDefault();
            return;
          }
          if ((handleKeyDown(current_10), current_10.key === "escape")) {
            if ((current_10.preventDefault(), searchQuery.length > 0)) setSearchQuery("");
            else tt(!1);
            return;
          }
          if (current_10.key === "return" || current_10.key === "down")
            (current_10.preventDefault(), tt(!1), Ge((current_11) => current_11 + 1));
          return;
        }
        if (current_10.defaultPrevented) return;
        if (current_10.key === "tab" || current_10.key === "left" || current_10.key === "right") {
          current_10.preventDefault();
          return;
        }
        if (current_10.ctrl || current_10.meta) return;
        if (current_10.key.length === 1 && current_10.key !== " ")
          (current_10.preventDefault(), tt(!0), setSearchQuery(current_10.key === "/" ? "" : current_10.key));
      },
      [Be, headerFocused, Xe, searchQuery, setSearchQuery, handleKeyDown, bt.length],
    ),
    Ts = !headerFocused && !Xe,
    la = () => {
      if (headerFocused) blurHeader();
      tt(!1);
    },
    Ds = `${et} ${searchQuery}`,
    vs = (ot === Ds ? bt.find((current_12) => current_12.id === Ne) : bt[0])?.lock,
    ca = 0,
    Un = maxVisible - ca - 1 >= 5 ? ca : 0,
    vc = Un > 0,
    flattened_2 = bt.flatMap((k, oe) => {
      let se = en ? Ps(k.id) : void 0,
        ge = se !== void 0 && (oe === 0 || Ps(bt[oe - 1]?.id ?? "") !== se),
        be =
          k.id === "autoUpdatesChannel" && autoUpdaterDisabledReason
            ? `disabled (${formatAutoUpdaterDisabledReason(autoUpdaterDisabledReason)})`
            : formatSettingValue(k, shownSettingValue(k), en, !1),
        mt = ge ? Ta(se, k.id) : void 0,
        Wn = k.lock !== void 0,
        Mc =
          ks(k) ||
          (k.type === "enum" && !k.pickToCommit) ||
          (k.id === "autoUpdatesChannel" &&
            autoUpdaterDisabledReason === null &&
            (Ce?.autoUpdatesChannel ?? "latest") !== "latest");
      return [
        ...(ge && oe > 0 ? [e(merged.Heading, {}, `${se} gap`)] : []),
        ...(mt
          ? [
              e(
                merged.Heading,
                {
                  children: r(Text, {
                    wrap: "truncate-end",
                    children: [
                      e(Text, { bold: !0, children: mt.name }),
                      mt.note !== void 0 && r(Text, { dimColor: !0, children: ["  ", mt.note] }),
                    ],
                  }),
                },
                se,
              ),
            ]
          : []),
        e(
          merged_2.Field,
          {
            label: [
              "labelBoldSuffix" in k ? k.label + k.labelBoldSuffix : k.label,
              ...(k.provided === void 0 ? [] : [k.provided.plugin]),
            ].join(" \xB7 "),
            description:
              [
                zl && k.id === "thinking" ? `${Gg} ${THINKING_CHANGE_WARNING}` : void 0,
                k.id === "remoteHomeSettings" && qi !== null ? `${Gg} ${qi}` : void 0,
                k.notice === void 0 ? void 0 : `${Gg} ${k.notice}`,
                vc ? void 0 : k.lock?.reason,
                se === "Advanced" && kc(k.id) ? "\u2192 settings.json" : void 0,
              ]
                .filter((prev_18) => prev_18 !== void 0)
                .join(" ") || void 0,
            ink: void 0,
            children:
              k.lock?.source === "policy"
                ? e(merged_2.Button, { onPress: () => Fn(k), children: be })
                : k.type === "boolean"
                  ? e(merged_2.Toggle, {
                      value: k.value,
                      onChange: (prev_19) => Fn(k, prev_19),
                      disabled: Wn,
                    })
                  : Wn
                    ? e(merged_2.Button, { onPress: () => {}, disabled: !0, children: be })
                    : k.type === "enum" && !k.pickToCommit && k.options.includes(k.value)
                      ? e(merged_2.Select, {
                          value: k.value,
                          options: k.options.map((current_13) => ({
                            value: current_13,
                            label: formatSettingValue(
                              k,
                              shownSettingValue({ ...k, value: current_13 }),
                              en,
                              !1,
                            ),
                          })),
                          onChange: (current_14) => Fn(k, current_14),
                        })
                      : Mc
                        ? e(merged_2.Button, { onPress: () => Fn(k), children: be })
                        : e(merged_2.Link, { onOpen: () => Fn(k), children: be }),
          },
          k.id,
        ),
        ...((k.id === "inputNeededNotifEnabled" || k.id === "agentPushNotifEnabled") &&
        yc?.has_active_channel === !1
          ? [e(renderMobileNotice, {}, `${k.id} warning`)]
          : []),
      ];
    });
  return e(Box, {
    ref: kt,
    flexDirection: "column",
    width: "100%",
    ...(Ze
      ? {}
      : {
          tabIndex: 0,
          autoFocus: !headerFocused,
          onKeyDown: Dc,
          onPaste: handlePaste,
          onWheel: Be === null && !Ts && bt.length > 0 ? la : void 0,
        }),
    children:
      Be === "Theme"
        ? r(Fragment, {
            children: [
              e(ThemePicker, {
                onThemeSelect: (current_15) => {
                  let oe = commitThroughConfigSet(So("theme"), current_15, themeWriter(fe));
                  return (Sn(oe), Fe(null), setTabsHidden(!1), oe);
                },
                onCancel: () => {
                  (Fe(null), setTabsHidden(!1));
                },
                helpText: isCustomizationDisabled("themes")
                  ? `Custom themes are disabled in safe mode \u2014 ${getSafeModeExitHint()} to load them${parseCustomThemeRef(themeSetting) ? `. Your saved theme "${parseCustomThemeRef(themeSetting)}" is a custom theme; selecting a preset here replaces it` : ""}`
                  : "",
                hideEscToCancel: !0,
                skipExitHandling: !0,
              }),
              e(Box, {
                children: e(Text, {
                  dimColor: !0,
                  italic: !0,
                  children: r(Byline, {
                    children: [
                      e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
                      e(ConfigurableShortcutHint, {
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
          ? r(Fragment, {
              children: [
                e(ModelPicker, {
                  initial: mainLoopModel,
                  sessionModel: mainLoopModelForSession,
                  onSelect: (k, oe) => {
                    (Promise.resolve(
                      commitThroughConfigSet(So("model"), k ?? "default", (current_16) =>
                        mc(current_16 === "default" ? null : String(current_16), oe),
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
                        (logError(toError(current_18)),
                          addNotification({
                            key: "model-switch-blocked",
                            kind: "warning",
                            text: `Model switch failed: ${Nf(errorMessage(current_18))}`,
                            color: "warning",
                            priority: "immediate",
                          }));
                      }),
                      Fe(null),
                      setTabsHidden(!1));
                  },
                  onCancel: () => {
                    (Fe(null), setTabsHidden(!1));
                  },
                  showFastModeNotice: isFastModeEnabled()
                    ? Ul && supportsFastMode(gs) && isFastModeAvailable()
                    : !1,
                }),
                e(Text, {
                  dimColor: !0,
                  italic: !1,
                  children: r(Byline, {
                    children: [
                      e(KeyboardShortcutHint, { chord: "enter", action: "confirm", ...F }),
                      e(ConfigurableShortcutHint, {
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
            ? e(RemoteHomeSettingsDialog, {
                configHome: getClaudeConfigDir(),
                storageV5: storageV5,
                origin: "config_panel",
                onDone: (current_19) => {
                  if (
                    (On(
                      current_19 === "not_saved"
                        ? FORWARD_SETTINGS_ERRORS.flag_off
                        : current_19 === "not_stored"
                          ? CONFIG_SAVE_FAILED
                          : null,
                    ),
                    current_19 === "forward")
                  )
                    logEvent("tengu_config_changed", { setting: lit("remoteHomeSettings"), value: !0 });
                  if (current_19 === "forward" || current_19 === "keep_local")
                    ve((current_20) => ({
                      ...current_20,
                      remoteHomeSettingsMode: getGlobalConfig().remoteHomeSettingsMode,
                    }));
                  (Fe(null), setTabsHidden(!1));
                },
              })
            : Be === "ExternalIncludes"
              ? r(Fragment, {
                  children: [
                    e(ClaudeMdExternalIncludesDialog, {
                      onDone: () => {
                        (Ie(getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved === !0),
                          Fe(null),
                          setTabsHidden(!1));
                      },
                      externalIncludes: getExternalClaudeMdIncludes(isConnectedToIde),
                    }),
                    e(Text, {
                      dimColor: !0,
                      children: r(Byline, {
                        children: [
                          e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
                          e(ConfigurableShortcutHint, {
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
                ? r(Fragment, {
                    children: [
                      e(OutputStylePicker, {
                        initialStyle: Oe,
                        visibleCount: Math.max(3, In - 7),
                        onComplete: (current_21) => {
                          (Fe(null), setTabsHidden(!1));
                          let oe = (prev_20) => {
                            let truncatedKey = String(prev_20);
                            (Ve(truncatedKey || DEFAULT_2),
                              noteSystemPromptSectionInvalidation("output_style"),
                              updateSettingsForSource(
                                "localSettings",
                                { outputStyle: truncatedKey || void 0 },
                                void 0,
                                storageV5,
                              ),
                              logEvent("tengu_output_style_changed", {
                                style: pKn(truncatedKey || DEFAULT_2),
                                source: lit("config_panel"),
                                settings_source: lit("localSettings"),
                              }));
                          };
                          Sn(commitThroughConfigSet(So("outputStyle"), current_21 ?? "", oe));
                        },
                        onCancel: () => {
                          (Fe(null), setTabsHidden(!1));
                        },
                      }),
                      e(Text, {
                        dimColor: !0,
                        italic: !1,
                        children: r(Byline, {
                          children: [
                            e(KeyboardShortcutHint, { chord: "enter", action: "confirm", ...F }),
                            e(ConfigurableShortcutHint, {
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
                  ? r(Fragment, {
                      children: [
                        e(LanguagePicker, {
                          initialLanguage: ye,
                          onComplete: (k) => {
                            (Fe(null), setTabsHidden(!1));
                            let oe = (k_0) => {
                              let ge = String(k_0) || void 0;
                              (We(ge),
                                updateSettingsForSource("userSettings", { language: ge }, void 0, storageV5));
                              let be = normalizeLanguageForSTT(ge);
                              logEvent("tengu_language_changed", {
                                language: !ge
                                  ? lit("default")
                                  : be.fellBackFrom === void 0
                                    ? hBe(be.code)
                                    : lit("custom"),
                                source: lit("config_panel"),
                              });
                            };
                            Sn(commitThroughConfigSet(So("language"), k ?? "", oe));
                          },
                          onCancel: () => {
                            (Fe(null), setTabsHidden(!1));
                          },
                        }),
                        e(Text, {
                          dimColor: !0,
                          children: r(Byline, {
                            children: [
                              e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
                              e(ConfigurableShortcutHint, {
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
                    ? r(Dialog, {
                        title: "Agents view",
                        onCancel: () => {
                          ((Ln.current += 1), Fe(null), setTabsHidden(!1));
                        },
                        hideBorder: !0,
                        hideInputGuide: !0,
                        children: [
                          e(merged_2, {
                            visibleCount: ra.length * 2,
                            children: ra.map((k_1) =>
                              e(
                                merged_2.Field,
                                {
                                  label: k_1.label,
                                  children: e(merged_2.Toggle, {
                                    value: k_1.value,
                                    onChange: (k_2) =>
                                      bo(k_1.id, k_2, (setting) => Tc(k_1.id, setting === !0)),
                                  }),
                                },
                                k_1.id,
                              ),
                            ),
                          }),
                          e(Text, {
                            dimColor: !0,
                            children: r(Byline, {
                              children: [
                                !Ze &&
                                  e(KeyboardShortcutHint, { chord: ["enter", "space"], action: "toggle" }),
                                e(ConfigurableShortcutHint, {
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
                      ? r(Box, {
                          flexDirection: "column",
                          onClick: Ea,
                          children: [
                            e(Dialog, {
                              title: Tt.label,
                              subtitle:
                                Tt.provided === void 0
                                  ? void 0
                                  : `${Tt.provided.description} \xB7 ${Tt.provided.plugin}`,
                              onCancel: tn,
                              hideBorder: !0,
                              hideInputGuide: !0,
                              children: e(ModelSelector, {
                                options: Tt.options.map((prev_21) => ({ label: prev_21, value: prev_21 })),
                                defaultValue: String(Tt.value),
                                defaultFocusValue: String(Tt.value),
                                onChange: (newIndex_0) => {
                                  (tn(), wo(Tt, newIndex_0));
                                },
                                onCancel: tn,
                              }),
                            }),
                            e(Text, {
                              dimColor: !0,
                              children: r(Byline, {
                                children: [
                                  e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
                                  e(ConfigurableShortcutHint, {
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
                        ? e(Box, {
                            flexDirection: "column",
                            onClick: Ea,
                            children: e(AgentsList, {
                              title: Dt.label,
                              subtitle:
                                Dt.provided === void 0
                                  ? void 0
                                  : `${Dt.provided.description} \xB7 ${Dt.provided.plugin}`,
                              fields: [
                                {
                                  type: "text",
                                  key: "value",
                                  label: Dt.label,
                                  validate: (prev_22) =>
                                    Dt.coerce?.(prev_22) === void 0
                                      ? (Dt.optionsHint ?? "Not a value it takes")
                                      : null,
                                },
                              ],
                              values: { value: Ss },
                              onChange: (k, oe) => ta(oe),
                              onSubmit: () => {
                                let k = Dt,
                                  oe = k.coerce?.(Ss) ?? Ss;
                                if ((bn(), oe !== shownSettingValue(k))) wo(k, oe);
                              },
                              onCancel: bn,
                            }),
                          })
                        : Be === "EnableAutoUpdates"
                          ? e(Dialog, {
                              title: "Enable Auto-Updates",
                              onCancel: () => {
                                (Fe(null), setTabsHidden(!1));
                              },
                              hideBorder: !0,
                              hideInputGuide: !0,
                              children:
                                autoUpdaterDisabledReason?.type !== "config"
                                  ? r(Fragment, {
                                      children: [
                                        e(Text, {
                                          children:
                                            autoUpdaterDisabledReason?.type === "env"
                                              ? "Auto-updates are controlled by an environment variable and cannot be changed here."
                                              : "Auto-updates are disabled in development builds.",
                                        }),
                                        autoUpdaterDisabledReason?.type === "env" &&
                                          r(Text, {
                                            dimColor: !0,
                                            children: [
                                              "Unset ",
                                              autoUpdaterDisabledReason.envVar,
                                              " to re-enable auto-updates.",
                                            ],
                                          }),
                                      ],
                                    })
                                  : e(ModelSelector, {
                                      options: [
                                        { label: "Enable with latest channel", value: "latest" },
                                        { label: "Enable with stable channel", value: "stable" },
                                      ],
                                      onChange: (prev_24) => {
                                        (Fe(null),
                                          setTabsHidden(!1),
                                          Cs("autoUpdatesChannel", prev_24, (delta) =>
                                            Co(delta, { kind: "enable" }),
                                          ));
                                      },
                                    }),
                            })
                          : Be === "ChannelDowngrade"
                            ? e(ChannelDowngradeDialog, {
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
                                  if ((Fe(null), setTabsHidden(!1), k === "cancel")) return;
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
                                        : { kind: "switch" },
                                    ),
                                  );
                                },
                              })
                            : Be === "Notifications"
                              ? e(ColorStep, {
                                  channel: de.preferredNotifChannel,
                                  showInputNeededRow: bs && Jnr(),
                                  showDoneRow: bs,
                                  inputNeededEnabled: de.inputNeededNotifEnabled ?? !1,
                                  doneEnabled: de.agentPushNotifEnabled ?? !1,
                                  onChangeChannel: (current_23) => {
                                    bo("notifChannel", current_23, (prev_25) => {
                                      let found = NOTIFICATION_CHANNELS.find((style) => style === prev_25);
                                      if (found === void 0)
                                        return {
                                          error:
                                            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                                              `Notifications channel doesn't accept "${Nf(String(prev_25))}".`,
                                              "notification channel rewritten to a value the row does not know",
                                            ),
                                        };
                                      (fc(found),
                                        logEvent("tengu_config_changed", {
                                          setting: lit("notifChannel"),
                                          value: fromEnum(found),
                                        }));
                                    });
                                  },
                                  onChangeInputNeeded: (language) => {
                                    bo("inputNeededNotifEnabled", language, (channel) => {
                                      let se = channel === !0;
                                      (pc(se),
                                        logEvent("tengu_config_changed", {
                                          setting: lit("inputNeededNotifEnabled"),
                                          value: se,
                                        }));
                                    });
                                  },
                                  onChangeDone: (current_24) => {
                                    bo("agentPushNotifEnabled", current_24, (prev_26) => {
                                      let se = prev_26 === !0;
                                      (gc(se),
                                        logEvent("tengu_config_changed", {
                                          setting: lit("agentPushNotifEnabled"),
                                          value: se,
                                        }));
                                    });
                                  },
                                  onClose: () => {
                                    ((Ln.current += 1), Fe(null), setTabsHidden(!1));
                                  },
                                })
                              : r(Box, {
                                  flexDirection: "column",
                                  gap: 1,
                                  marginY: insideModal || Ze ? void 0 : 1,
                                  children: [
                                    !Ze &&
                                      r(Box, {
                                        flexDirection: "column",
                                        children: [
                                          e(SearchBox, {
                                            query: ws,
                                            isFocused: Xe && !headerFocused,
                                            isTerminalFocused: isTerminalFocused,
                                            cursorOffset: min,
                                            placeholder: "Search settings\u2026",
                                            isSearchLineUnpadded: !1,
                                            onFocus: () => {
                                              if (headerFocused) blurHeader();
                                              tt(!0);
                                            },
                                          }),
                                          hn !== null &&
                                            e(Text, { dimColor: !0, wrap: "wrap-trim", children: hn }),
                                        ],
                                      }),
                                    e(merged_2, {
                                      visibleCount: Un > 0 ? maxVisible - Un - 1 : maxVisible,
                                      defaultFocusIndex: Math.max(
                                        0,
                                        bt.findIndex((choice) => choice.id === Ne),
                                      ),
                                      isDisabled: !Ts,
                                      keybindingContext: "Settings",
                                      onUpFromFirstItem: () => {
                                        (ho(!1), tt(!0));
                                      },
                                      onDisabledRowClick: la,
                                      onFocus: (prev_27) => {
                                        let oe = bt[prev_27]?.id;
                                        if (oe !== "thinking") ho(!1);
                                        (at(oe), st(Ds));
                                      },
                                      resetKey: Ds,
                                      emptyMessage: `No settings match "${ws}"`,
                                      children: flattened_2,
                                    }),
                                    Un > 0 &&
                                      e(Box, {
                                        height: Un,
                                        flexShrink: 0,
                                        children: e(Text, {
                                          dimColor: !0,
                                          wrap: "wrap-trim",
                                          children: Ts && cellText(vs?.reason),
                                        }),
                                      }),
                                    e(Box, {
                                      ref: _n,
                                      flexDirection: "column",
                                      flexShrink: 0,
                                      children: Ze
                                        ? e(Text, {
                                            children: e(ConfigurableShortcutHint, {
                                              action: "confirm:no",
                                              context: "Settings",
                                              fallback: "Esc",
                                              description: "save and close",
                                            }),
                                          })
                                        : headerFocused
                                          ? e(Text, {
                                              dimColor: !0,
                                              italic: !1,
                                              children: r(Byline, {
                                                children: [
                                                  e(KeyboardShortcutHint, {
                                                    chord: ["left", "right", "tab"],
                                                    action: "switch",
                                                    format: { keyCase: "lower" },
                                                    terse: F.terse,
                                                  }),
                                                  e(KeyboardShortcutHint, {
                                                    chord: "down",
                                                    action: "return",
                                                    ...F,
                                                  }),
                                                  e(ConfigurableShortcutHint, {
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
                                            ? e(Text, {
                                                dimColor: !0,
                                                italic: !1,
                                                children: r(Byline, {
                                                  children: [
                                                    e(Text, { children: "Type to filter" }),
                                                    e(KeyboardShortcutHint, {
                                                      chord: ["enter", "down"],
                                                      action: "select",
                                                      ...F,
                                                    }),
                                                    e(KeyboardShortcutHint, {
                                                      chord: "up",
                                                      action: "tabs",
                                                      ...F,
                                                    }),
                                                    e(ConfigurableShortcutHint, {
                                                      action: "confirm:no",
                                                      context: "Settings",
                                                      fallback: "Esc",
                                                      description: "clear",
                                                      ...F,
                                                    }),
                                                  ],
                                                }),
                                              })
                                            : e(Text, {
                                                dimColor: !0,
                                                italic: !1,
                                                children: r(Byline, {
                                                  children: [
                                                    vs === void 0
                                                      ? e(KeyboardShortcutHint, {
                                                          chord: ["enter", "space"],
                                                          action: "change",
                                                          ...F,
                                                        })
                                                      : vs?.source === "policy" &&
                                                        e(KeyboardShortcutHint, {
                                                          chord: ["enter", "space"],
                                                          action: "retry",
                                                          ...F,
                                                        }),
                                                    e(ConfigurableShortcutHint, {
                                                      action: "settings:search",
                                                      context: "Settings",
                                                      fallback: "/",
                                                      description: "search",
                                                      ...F,
                                                    }),
                                                    e(ConfigurableShortcutHint, {
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
/**
 * /config 里设置值的显示文案：thinking 中途切换警告、主题选项名、通知渠道名。
 */
//@ chunk-9h8dr0qb.js:41746-42307 fingerprint = THEME_LABELS (0.713)
var SWITCH_MODEL_LABELS = {},
  THINKING_CHANGE_WARNING =
    "Changing thinking mode mid-conversation will increase latency and may reduce quality.",
  THEME_LABELS = {
    auto: "Auto (match terminal)",
    dark: "Dark mode",
    light: "Light mode",
    "dark-daltonized": "Dark mode (colorblind-friendly)",
    "light-daltonized": "Light mode (colorblind-friendly)",
    "dark-ansi": "Dark mode (ANSI colors only)",
    "light-ansi": "Light mode (ANSI colors only)",
  },
  NOTIF_CHANNEL_LABELS = {
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
  if (o.id === "workflowSizeGuideline") return Ahi(u, (o.isDefaultValue ?? !1) && u === o.value);
  if (o.id === "notifChannel" && !p) return NOTIF_CHANNEL_LABELS[u] ?? u;
  return u;
}
//@ chunk-6f92z7de.js:265-326 placement
function pKn(t) {
  return Object.hasOwn(OUTPUT_STYLE_CONFIG, t) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(t) : lit("custom");
}

export { pKn, renderMobileNotice, Config };
