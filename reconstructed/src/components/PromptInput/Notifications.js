/**
 * components/PromptInput/Notifications.tsx
 *
 * 输入框右下的通知区：显示通知队列当前项（语音录制/处理、IDE、apiKeyHelper 慢、用量额度等），超时自动消失。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/Notifications.tsx
 * pieces: chunk-18hwfzwa.js (30), chunk-8jypjjdf.js (6)
 * attribution: placement 25, sole-consumer 7, affinity 1, fingerprint 3
 */
import { init_react_production, y, R, P, Q, Rh, Se, qt } from "../../../vendor/react/cjs/react.production.js";
import { useAppState, useAppState_2 } from "../../state/AppState.js";
import {
  getRiskColor,
  EXPLANATION_NOTICE_TIMEOUT_MS,
  MAX_EXPLANATION_CHARS,
} from "../permissions/PermissionExplanation.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2, useResolvedTheme } from "../design-system/ThemeProvider.js";
import {
  useNotifications,
  useHeaderGauge,
  isHeldNotice,
  isGaugeSurface,
  holdsToasts,
  gaugeOf,
} from "../../context/notifications.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import {
  selectNumber,
  identity_2,
  acknowledgeClosedIssues,
  selectNumber2,
  readClosedIssuesCache,
  unacknowledgedClosedIssues,
  fetchMyClosedIssues,
} from "../../services/closedIssues.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { sequential } from "../../utils/sequential.js";
import { interpolateColor, roundToStep, toRGBColor, parseRGB } from "../Spinner/utils.js";
import { isXtermJs } from "../../ink/terminal.js";
import { useAnimationTimer, useInterval } from "../../ink/components/Input.js";
import {
  ASTERISK_TICK_MS,
  ASTERISK_RAY_COUNT,
  ASTERISK_FADE_FLOOR,
  SETTLED_GREY_RGB,
} from "../LogoV2/AnimatedAsterisk.js";
import { formatDuration } from "../../utils/format.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { BULLSEYE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { setEnvHookNotifier } from "../../utils/hooks/fileChangedWatcher.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { getContextTokenCount } from "../../utils/tokens.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { calculateTokenWarningState } from "../../services/compact/autoCompact.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { useMicroCompactFlag, getSubscriptionTypeWithRefresh, useNowTicker } from "../StatusNotices.js";
import { isNoForceUpdateRenders } from "../../utils/Cursor.js";
import { useRateLimitState } from "../rateLimit/quotaAutoResume.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { useVoiceAvailable } from "../../hooks/useVoiceIntegration.js";
import { VoiceIndicatorImpl, VoiceStateIndicator } from "./VoiceIndicator.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { resolveEditorCommand } from "../../utils/editor.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { toIDEDisplayName } from "../../utils/ide.js";
import { TokenWarning } from "../TokenWarning.js";
import { AutoUpdaterWrapper } from "../AutoUpdaterWrapper.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { SentryErrorBoundary } from "../SentryErrorBoundary.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getLastApiCompletionTimestamp } from "../../bootstrap/state.js";
import { getConfiguredApiKeyHelper, getApiKeyHelperElapsedMs } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { isWithheldGatewayBgSession, noGatewayNotice } from "../../services/api/errors.js";
import { MemoryUsageIndicator } from "../MemoryUsageIndicator.js";
import { SandboxPromptFooterHint } from "./SandboxPromptFooterHint.js";
import { CACHE_TTL_1H_MS } from "../../services/api/promptCacheBreakDetection.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { FooterSlot } from "../FullscreenLayout.js";
import { mergeClients } from "../../hooks/useMergedClients.js";
import { showSwarmFooterGate } from "./footerGates.js";

//@ chunk-18hwfzwa.js:643509-643513 placement
init_react_production();
//@ chunk-18hwfzwa.js:643547-643551 placement
init_react_production();
//@ chunk-18hwfzwa.js:643551-643569 placement
function selectPinnedBridgeNotice(Be) {}
//@ chunk-18hwfzwa.js:643569-643741 placement
/**
 * 订阅 bridge 提示并锁存最后一次出现的值（置顶提示时在消失后仍保留）。
 */
function useLatchedBridgeNotice(props) {
  let { saysWhatToDo, isPinnedNotice } = props;
  if (saysWhatToDo === undefined) false;
  else saysWhatToDo;
  let L = isPinnedNotice === undefined ? false : isPinnedNotice;
  let appState = useAppState(selectPinnedBridgeNotice);
  let [ke, Re] = y(appState);
  if (appState !== undefined && appState !== ke) Re(appState);
  if (L) appState ?? ke;
  else appState;
  return null;
}
//@ chunk-18hwfzwa.js:781742-782121 placement
/**
 * 生成 "你的 issue 已关闭" 通知的分段文本（单个或多个 issue 编号）。
 */
function formatClosedIssuesNotice(h) {
  if (h.length === 1)
    return [
      {
        text: "\u2713 Your issue ",
        color: "success",
      },
      getRiskColor(h[0].number),
      {
        text: " has been closed. Thanks for reporting!",
        color: "success",
      },
    ];
  return [
    {
      text: `\u2713 ${h.length} of your issues have been closed (`,
      color: "success",
    },
    ...h.flatMap((x, D) => [
      ...(D > 0
        ? [
            {
              text: ", ",
              color: "success",
            },
          ]
        : []),
      getRiskColor(x.number),
    ]),
    {
      text: "). Thanks for reporting!",
      color: "success",
    },
  ];
}
//@ chunk-18hwfzwa.js:782121-782955 sole-consumer
/**
 * 一方提供商下挂载时检查"我提交的 issue 已关闭"：先读缓存再拉取，新增未确认的关闭 issue 时弹出低优先级通知并标记已提示，记 tengu_closed_issue_notice_shown。
 */
function ClosedIssueNotifier() {
  let L = w(4);
  let { storageV5 } = useTheme_2();
  let { addNotification } = useNotifications();
  let startedRef = R(false);
  let effect;
  let deps;
  if (L[0] !== addNotification || L[1] !== storageV5) {
    effect = () => {
      if (startedRef.current) {
        return;
      }
      startedRef.current = true;
      if (isFirstPartyProvider()) {
        let Xe = function (Re) {
          let He = new Set(Be.map(selectNumber));
          let filtered = Re.filter((We) => !He.has(We.number));
          if (filtered.length === 0) {
            return;
          }
          Be.push(...filtered);
          logEvent("tengu_closed_issue_notice_shown", {
            newClosedIssueCount: filtered.length,
            totalClosedIssueCount: Be.length,
          });
          addNotification({
            key: "closed-issue-notice",
            kind: "event",
            segments: formatClosedIssuesNotice(Be),
            priority: "low",
            timeoutMs: EXPLANATION_NOTICE_TIMEOUT_MS,
            fold: identity_2,
          });
          acknowledgeClosedIssues(filtered.map(selectNumber2), storageV5);
        };
        let rt = false;
        let Be = [];
        let Et = async function Et() {
          let closedIssuesCache = await readClosedIssuesCache(storageV5);
          let At = unacknowledgedClosedIssues(closedIssuesCache);
          if (!rt && At.length > 0) Xe(At);
          let myClosedIssues = await fetchMyClosedIssues(storageV5);
          if (rt || myClosedIssues === null || myClosedIssues > MAX_EXPLANATION_CHARS) {
            return;
          }
          let Ot = unacknowledgedClosedIssues(await readClosedIssuesCache(storageV5));
          if (!rt && Ot.length > 0) Xe(Ot);
        };
        Et().catch(logError);
        return () => {
          rt = true;
        };
      }
    };
    deps = [addNotification, storageV5];
    L[0] = addNotification;
    L[1] = storageV5;
    L[2] = effect;
    L[3] = deps;
  } else {
    effect = L[2];
    deps = L[3];
  }
  P(effect, deps);
  return null;
}
//@ chunk-18hwfzwa.js:782955-782959 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:782959-782963 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:785667-785671 placement
init_react_production();
//@ chunk-18hwfzwa.js:785728-786605 placement
/**
 * 页脚"/goal active"指示：显示目标设定以来的耗时（1 分钟内每秒刷新，之后每分钟），真彩终端下按权限色做呼吸动画。
 */
function GoalActiveIndicator({ withSeparator }) {
  let goalSetAt = useAppState((At) => At.activeGoal?.setAt);
  let hasGoal = goalSetAt !== undefined;
  let [L, ee] = y(0);
  let clock = useClock();
  let startRef = R(null);
  if (goalSetAt !== undefined && startRef.current?.setAt !== goalSetAt)
    startRef.current = {
      setAt: goalSetAt,
      clockStart: clock.now() - (Date.now() - goalSetAt),
    };
  let Be = startRef.current;
  P(() => {
    if (goalSetAt === undefined || startRef.current === null) return;
    let At = clock.now() - startRef.current.clockStart;
    let It = At < 60000 ? 1000 : 60000;
    let Ot = It - (At % It);
    return clock.setTimeout(() => ee((Et) => Et + 1), Ot);
  }, [goalSetAt, L, clock]);
  let theme = useResolvedTheme();
  let pulseColors = Q(() => {
    if (sequential.level < 3) return null;
    let At = interpolateColor(theme.permission);
    return At ? goalPulseColors(At, isXtermJs()) : null;
  }, [theme.permission, sequential.level]);
  let animationTimer = useAnimationTimer(hasGoal && pulseColors ? ASTERISK_TICK_MS : null);
  let Xe = Math.floor(animationTimer / ASTERISK_TICK_MS) % ASTERISK_RAY_COUNT;
  if (!hasGoal || Be === null) return null;
  let elapsedMs = clock.now() - Be.clockStart;
  let elapsedText =
    elapsedMs < 1000
      ? ""
      : ` (${formatDuration(elapsedMs, {
          mostSignificantOnly: true,
        })})`;
  return jsxProd_default_2(Box, {
    flexShrink: 0,
    children: [
      withSeparator
        ? jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 ",
          })
        : null,
      jsxProd_default_2(Text, {
        color: pulseColors?.[Xe] ?? "permission",
        children: [
          jsxProd_default_2(Text, {
            "aria-hidden": true,
            children: [BULLSEYE, " "],
          }),
          "/goal active",
          elapsedText,
        ],
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:786605-786748 placement
function goalPulseColors(h, x) {
  return Array.from(
    {
      length: ASTERISK_RAY_COUNT,
    },
    (D, L) => {
      let ee = 0.5 - 0.5 * Math.cos((2 * Math.PI * L) / ASTERISK_RAY_COUNT);
      let ke = ASTERISK_FADE_FLOOR * (x ? roundToStep(ee) : ee);
      return toRGBColor(parseRGB(h, SETTLED_GREY_RGB, ke));
    },
  );
}
//@ chunk-18hwfzwa.js:786748-786752 placement
init_react_production();
//@ chunk-18hwfzwa.js:787614-787659 placement
function selectAutoCompactWindow_2(wr) {
  return wr.autoCompactWindow;
}
//@ chunk-18hwfzwa.js:787659-787709 placement
function selectRemoteAutocompactState_2(zr) {
  return zr.remoteAutocompactState;
}
//@ chunk-18hwfzwa.js:787709-787748 placement
function selectIsBriefOnly_2(_r) {
  return _r.isBriefOnly;
}
//@ chunk-18hwfzwa.js:787830-787884 sole-consumer
function hasActiveGoal($r) {
  return $r.activeGoal?.setAt !== undefined;
}
//@ chunk-18hwfzwa.js:787884-787916 sole-consumer
function clearEnvHookNotifier() {
  return setEnvHookNotifier(null);
}
//@ chunk-18hwfzwa.js:787916-787946 sole-consumer
function foldKeepLatest(Yr, Er) {
  return Er;
}
//@ chunk-18hwfzwa.js:787946-787984 sole-consumer
function selectVoiceState(kn) {
  return kn.voiceState;
}
//@ chunk-18hwfzwa.js:787984-788022 affinity
function selectVoiceError(Fn) {
  return Fn.voiceError;
}
//@ chunk-18hwfzwa.js:788022-791970 fingerprint = Notifications (0.62)
var NOTIFICATION_TIMEOUT_MS = 5000;
var Notifications = Rh(function (props) {
  let $ = w(59);
  let {
    apiKeyVerification,
    hideLoginNotice,
    isAutoUpdating,
    verbose,
    transcript,
    onChangeIsUpdating,
    isInputWrapped,
    hasStash,
    row1HintId,
  } = props;
  let isInputWrapped_2 = isInputWrapped === undefined ? false : isInputWrapped;
  let rt = hasStash === undefined ? false : hasStash;
  let kt = row1HintId === "timed";
  let At = row1HintId === "voice";
  let storeSelector = useStoreSelector(apiKeyVerification);
  let Ot = storeSelector === "invalid" || storeSelector === "missing";
  let Et = !hideLoginNotice && Ot;
  let Dt = verbose && !Ot;
  let storeSelector_2 = useStoreSelector(transcript, getContextTokenCount);
  let mainLoopModel = useMainLoopModel_3();
  let autoCompactWindow = useAppState(selectAutoCompactWindow_2);
  let remoteAutocompactState = useAppState(selectRemoteAutocompactState_2);
  let po;
  if (
    $[0] !== autoCompactWindow ||
    $[1] !== mainLoopModel ||
    $[2] !== remoteAutocompactState ||
    $[3] !== storeSelector_2
  ) {
    po = calculateTokenWarningState(
      storeSelector_2,
      getModelContextInfo(mainLoopModel),
      autoCompactWindow,
      remoteAutocompactState,
    );
    $[0] = autoCompactWindow;
    $[1] = mainLoopModel;
    $[2] = remoteAutocompactState;
    $[3] = storeSelector_2;
    $[4] = po;
  } else po = $[4];
  let ao = po.level !== "ok";
  let microCompactFlag = useMicroCompactFlag();
  let bo = isNoForceUpdateRenders();
  let isBriefOnly = useAppState(selectIsBriefOnly_2);
  let headerGauge = useHeaderGauge();
  let Ro;
  if ($[5] !== headerGauge || $[6] !== kt) {
    Ro = (Ho) =>
      isHeldNotice(Ho.notifications.current, holdsToasts(Ho)) &&
      !kt &&
      !isGaugeSurface(Ho.notifications.current, headerGauge);
    $[5] = headerGauge;
    $[6] = kt;
    $[7] = Ro;
  } else Ro = $[7];
  let appState = useAppState(Ro);
  let { addNotification, removeNotification } = useNotifications();
  let rateLimitState = useRateLimitState();
  let isFullscreen = useIsFullscreen();
  let voiceAvailable = useVoiceAvailable();
  let appState_2 = useAppState_2(VoiceIndicatorImpl);
  let appState_3 = useAppState(hasActiveGoal);
  let [Fn, bn] = y(false);
  let Go;
  let hn;
  if ($[8] !== addNotification) {
    Go = () => {
      setEnvHookNotifier((text, isError) => {
        addNotification({
          key: "env-hook",
          kind: "event",
          text,
          color: isError ? "error" : undefined,
          priority: isError ? "medium" : "low",
          timeoutMs: isError ? 8000 : 5000,
        });
      });
      return clearEnvHookNotifier;
    };
    hn = [addNotification];
    $[8] = addNotification;
    $[9] = Go;
    $[10] = hn;
  } else {
    Go = $[9];
    hn = $[10];
  }
  P(Go, hn);
  let isUsingOverage = rateLimitState.isUsingOverage;
  let subscriptionTypeWithRefresh = getSubscriptionTypeWithRefresh();
  let on = subscriptionTypeWithRefresh === "team" || subscriptionTypeWithRefresh === "enterprise";
  let _o;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    _o = resolveEditorCommand();
    $[11] = _o;
  } else _o = $[11];
  let editor = _o;
  let Dn =
    isInputWrapped_2 &&
    !ao &&
    storeSelector !== "invalid" &&
    storeSelector !== "missing" &&
    editor !== undefined;
  let wn;
  let mr;
  if ($[12] !== addNotification || $[13] !== removeNotification || $[14] !== Dn) {
    wn = () => {
      if (Dn && editor) {
        logEvent("tengu_external_editor_hint_shown", {});
        addNotification({
          key: "external-editor-hint",
          kind: "hint",
          jsx: jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default(ConfigurableShortcutHint, {
              action: "chat:externalEditor",
              context: "Chat",
              fallback: "ctrl+g",
              description: `edit in ${toIDEDisplayName(editor)}`,
            }),
          }),
          priority: "immediate",
          timeoutMs: 5000,
        });
      } else removeNotification("external-editor-hint");
    };
    mr = [Dn, editor, addNotification, removeNotification];
    $[12] = addNotification;
    $[13] = removeNotification;
    $[14] = Dn;
    $[15] = wn;
    $[16] = mr;
  } else {
    wn = $[15];
    mr = $[16];
  }
  P(wn, mr);
  let Kn;
  let Wn;
  if (
    $[17] !== addNotification ||
    $[18] !== isBriefOnly ||
    $[19] !== ao ||
    $[20] !== mainLoopModel ||
    $[21] !== removeNotification ||
    $[22] !== microCompactFlag ||
    $[23] !== storeSelector_2
  ) {
    Kn = () => {
      if (ao && !microCompactFlag && !isBriefOnly)
        addNotification({
          key: "token-warning",
          jsx: jsxProd_default(TokenWarning, {
            tokenUsage: storeSelector_2,
            model: mainLoopModel,
          }),
          priority: "medium",
          timeoutMs: 18000000,
          fold: foldKeepLatest,
          exemptFromDiffPanelHold: true,
        });
      else removeNotification("token-warning");
    };
    Wn = [
      ao,
      microCompactFlag,
      isBriefOnly,
      storeSelector_2,
      mainLoopModel,
      addNotification,
      removeNotification,
    ];
    $[17] = addNotification;
    $[18] = isBriefOnly;
    $[19] = ao;
    $[20] = mainLoopModel;
    $[21] = removeNotification;
    $[22] = microCompactFlag;
    $[23] = storeSelector_2;
    $[24] = Kn;
    $[25] = Wn;
  } else {
    Kn = $[24];
    Wn = $[25];
  }
  P(Kn, Wn);
  let Fr = Boolean(appState || (isUsingOverage && !on) || Et || Dt || (!isFullscreen && isAutoUpdating));
  let Zn = Fr || rt || appState_3;
  const showSuccessMessage = bo && !ao;
  const withSeparator = isFullscreen ? Zn : undefined;
  let or;
  if (
    $[26] !== isAutoUpdating ||
    $[27] !== onChangeIsUpdating ||
    $[28] !== showSuccessMessage ||
    $[29] !== withSeparator ||
    $[30] !== verbose
  ) {
    or = jsxProd_default(AutoUpdaterWrapper, {
      verbose,
      isUpdating: isAutoUpdating,
      onChangeIsUpdating,
      showSuccessMessage,
      withSeparator,
      atPrompt: true,
    });
    $[26] = isAutoUpdating;
    $[27] = onChangeIsUpdating;
    $[28] = showSuccessMessage;
    $[29] = withSeparator;
    $[30] = verbose;
    $[31] = or;
  } else or = $[31];
  let pr = or;
  const isInOverageMode = isUsingOverage ?? false;
  const autoUpdater = isFullscreen ? null : pr;
  let Ir;
  if (
    $[32] !== on ||
    $[33] !== Et ||
    $[34] !== Dt ||
    $[35] !== isInOverageMode ||
    $[36] !== autoUpdater ||
    $[37] !== kt ||
    $[38] !== storeSelector_2 ||
    $[39] !== At
  ) {
    Ir = jsxProd_default(Box, {
      flexDirection: "column",
      alignItems: "flex-end",
      flexShrink: 1,
      overflowX: "hidden",
      children: jsxProd_default(NotificationContent, {
        isInOverageMode,
        isTeamOrEnterprise: on,
        showLoginNotice: Et,
        showVerboseTokens: Dt,
        tokenUsage: storeSelector_2,
        autoUpdater,
        onCriticalMemoryShowingChange: bn,
        toastOnRow1: kt,
        voiceOnRow1: At,
      }),
    });
    $[32] = on;
    $[33] = Et;
    $[34] = Dt;
    $[35] = isInOverageMode;
    $[36] = autoUpdater;
    $[37] = kt;
    $[38] = storeSelector_2;
    $[39] = At;
    $[40] = Ir;
  } else Ir = $[40];
  let Pr;
  if ($[41] !== Fr || $[42] !== rt) {
    Pr =
      rt &&
      jsxProd_default_2(Box, {
        flexShrink: 0,
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: Fr ? " \xB7 " : " ",
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [figures_default.pointerSmall, " stashed"],
          }),
        ],
      });
    $[41] = Fr;
    $[42] = rt;
    $[43] = Pr;
  } else Pr = $[43];
  const withSeparator_2 = Fr || rt;
  let Gn;
  if ($[44] !== withSeparator_2) {
    Gn = jsxProd_default(GoalActiveIndicator, {
      withSeparator: withSeparator_2,
    });
    $[44] = withSeparator_2;
    $[45] = Gn;
  } else Gn = $[45];
  let Ur;
  if (
    $[46] !== pr ||
    $[47] !== Zn ||
    $[48] !== Fn ||
    $[49] !== isFullscreen ||
    $[50] !== appState_2 ||
    $[51] !== voiceAvailable ||
    $[52] !== At
  ) {
    Ur =
      isFullscreen &&
      jsxProd_default(Box, {
        flexShrink: 0,
        maxWidth: Zn ? "60%" : undefined,
        display: (voiceAvailable && appState_2 && !At) || Fn ? "none" : "flex",
        children: pr,
      });
    $[46] = pr;
    $[47] = Zn;
    $[48] = Fn;
    $[49] = isFullscreen;
    $[50] = appState_2;
    $[51] = voiceAvailable;
    $[52] = At;
    $[53] = Ur;
  } else Ur = $[53];
  let Zr;
  if ($[54] !== Ir || $[55] !== Pr || $[56] !== Gn || $[57] !== Ur) {
    Zr = jsxProd_default(SentryErrorBoundary, {
      children: jsxProd_default_2(Box, {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        flexShrink: 0,
        overflowX: "hidden",
        children: [Ir, Pr, Gn, Ur],
      }),
    });
    $[54] = Ir;
    $[55] = Pr;
    $[56] = Gn;
    $[57] = Ur;
    $[58] = Zr;
  } else Zr = $[58];
  return Zr;
});
//@ chunk-18hwfzwa.js:791970-794488 fingerprint = NotificationContent (0.431)
/**
 * 通知内容：语音 recording/processing、apiKeyHelper 慢、"Now using usage credits"、IDE 状态等按类型渲染；无通知时显示其他状态。
 */
function NotificationContent(props) {
  let $ = w(41);
  let {
    isInOverageMode,
    isTeamOrEnterprise,
    showLoginNotice,
    showVerboseTokens,
    tokenUsage,
    autoUpdater,
    onCriticalMemoryShowingChange,
    toastOnRow1,
    voiceOnRow1,
  } = props;
  let subscriptionTypeWithRefresh = getSubscriptionTypeWithRefresh();
  let rt;
  if ($[0] !== subscriptionTypeWithRefresh) {
    rt = !isRemoteSessionAvailable() && subscriptionTypeWithRefresh === "pro";
    $[0] = subscriptionTypeWithRefresh;
    $[1] = rt;
  } else rt = $[1];
  let kt = rt;
  let nowTicker = useNowTicker(kt ? 30000 : null);
  let It;
  if ($[2] !== nowTicker || $[3] !== kt || $[4] !== tokenUsage) {
    It = kt ? uncachedContextHint(tokenUsage, getLastApiCompletionTimestamp(), nowTicker) : null;
    $[2] = nowTicker;
    $[3] = kt;
    $[4] = tokenUsage;
    $[5] = It;
  } else It = $[5];
  let Ot = It;
  let [Et, Dt] = y(null);
  let Lt = !isRemoteSessionAvailable() && Boolean(getConfiguredApiKeyHelper());
  let oo;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    oo = () => {
      let ms = getApiKeyHelperElapsedMs();
      let next = ms >= 1e4 ? formatDuration(ms) : null;
      Dt((prev) => (next === prev ? prev : next));
    };
    $[6] = oo;
  } else oo = $[6];
  useInterval(oo, Lt ? 1000 : null);
  let appState = useAppState_2(selectVoiceState);
  let voiceAvailable = useVoiceAvailable();
  let appState_2 = useAppState_2(selectVoiceError);
  if (!voiceOnRow1 && voiceAvailable && (appState === "recording" || appState === "processing")) {
    let bo;
    if ($[7] !== appState) {
      bo = jsxProd_default(VoiceStateIndicator, {
        voiceState: appState,
      });
      $[7] = appState;
      $[8] = bo;
    } else bo = $[8];
    return bo;
  }
  let bo;
  if ($[9] !== isInOverageMode || $[10] !== isTeamOrEnterprise) {
    bo =
      isInOverageMode &&
      !isTeamOrEnterprise &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate",
          children: "Now using usage credits",
        }),
      });
    $[9] = isInOverageMode;
    $[10] = isTeamOrEnterprise;
    $[11] = bo;
  } else bo = $[11];
  let Ao;
  if ($[12] !== Et) {
    Ao =
      Et &&
      jsxProd_default_2(Box, {
        children: [
          jsxProd_default_2(Text, {
            color: "warning",
            wrap: "truncate",
            children: ["apiKeyHelper is taking a while", " "],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "truncate",
            children: ["(", Et, ")"],
          }),
        ],
      });
    $[12] = Et;
    $[13] = Ao;
  } else Ao = $[13];
  let Bo;
  if ($[14] !== showLoginNotice) {
    Bo =
      showLoginNotice &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          color: "error",
          wrap: "truncate",
          children: env.CLAUDE_CODE_REMOTE
            ? "Authentication error \xB7 Try again"
            : isWithheldGatewayBgSession()
              ? noGatewayNotice()
              : "Not logged in \xB7 Run /login",
        }),
      });
    $[14] = showLoginNotice;
    $[15] = Bo;
  } else Bo = $[15];
  let Ro;
  if ($[16] !== showVerboseTokens || $[17] !== tokenUsage) {
    Ro =
      showVerboseTokens &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "truncate",
          children: [tokenUsage, " tokens"],
        }),
      });
    $[16] = showVerboseTokens;
    $[17] = tokenUsage;
    $[18] = Ro;
  } else Ro = $[18];
  let Ho;
  if ($[19] !== Ot) {
    Ho =
      Ot &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate",
          children: Ot,
        }),
      });
    $[19] = Ot;
    $[20] = Ho;
  } else Ho = $[20];
  let Io;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    Io = jsxProd_default(ClosedIssueNotifier, {});
    $[21] = Io;
  } else Io = $[21];
  let Wo;
  if ($[22] !== voiceAvailable || $[23] !== appState_2) {
    Wo =
      voiceAvailable &&
      appState_2 &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          color: "error",
          wrap: "truncate",
          children: appState_2,
        }),
      });
    $[22] = voiceAvailable;
    $[23] = appState_2;
    $[24] = Wo;
  } else Wo = $[24];
  let mn;
  let Cn;
  if ($[25] === MEMO_CACHE_SENTINEL) {
    mn = jsxProd_default(MemoryUsageIndicator, {
      tier: "high",
    });
    Cn = !isRemoteSessionAvailable() && jsxProd_default(SandboxPromptFooterHint, {});
    $[25] = mn;
    $[26] = Cn;
  } else {
    mn = $[25];
    Cn = $[26];
  }
  let No;
  if ($[27] !== toastOnRow1) {
    No = jsxProd_default(PromptToast, {
      drawnOnRow1: toastOnRow1,
    });
    $[27] = toastOnRow1;
    $[28] = No;
  } else No = $[28];
  let vo;
  if ($[29] !== onCriticalMemoryShowingChange) {
    vo = jsxProd_default(MemoryUsageIndicator, {
      tier: "critical",
      onShowingChange: onCriticalMemoryShowingChange,
    });
    $[29] = onCriticalMemoryShowingChange;
    $[30] = vo;
  } else vo = $[30];
  let Yo;
  if (
    $[31] !== autoUpdater ||
    $[32] !== Wo ||
    $[33] !== No ||
    $[34] !== vo ||
    $[35] !== bo ||
    $[36] !== Ao ||
    $[37] !== Bo ||
    $[38] !== Ro ||
    $[39] !== Ho
  ) {
    Yo = jsxProd_default_2(Fragment, {
      children: [bo, Ao, Bo, Ro, Ho, autoUpdater, Io, Wo, mn, Cn, No, vo],
    });
    $[31] = autoUpdater;
    $[32] = Wo;
    $[33] = No;
    $[34] = vo;
    $[35] = bo;
    $[36] = Ao;
    $[37] = Bo;
    $[38] = Ro;
    $[39] = Ho;
    $[40] = Yo;
  } else Yo = $[40];
  return Yo;
}
//@ chunk-18hwfzwa.js:794488-794502 placement
var UNCACHED_CONTEXT_HINT_TOKENS = 50000;
//@ chunk-18hwfzwa.js:794502-794658 placement
function uncachedContextHint(tokenUsage, lastApiCompletionTimestamp, nowTicker) {
  if (lastApiCompletionTimestamp === null) return null;
  if (tokenUsage < UNCACHED_CONTEXT_HINT_TOKENS) return null;
  if (nowTicker - lastApiCompletionTimestamp <= CACHE_TTL_1H_MS) return null;
  return `~${Math.round(tokenUsage / 1000)}k uncached \xB7 /clear to start fresh`;
}
//@ chunk-18hwfzwa.js:794658-794662 placement
init_react_production();
//@ chunk-18hwfzwa.js:794662-795108 placement
/**
 * 通知区的绝对定位容器：宽度扣掉右侧占用列数，底部对齐、超出隐藏。
 */
function NotificationOverlay(h) {
  let $ = w(5);
  let { columns } = useTerminalSize();
  let D = Se(FooterSlot);
  const { marginTop, height } = h;
  const width = D > 0 ? Math.max(0, columns - D) : "100%";
  let Be;
  if ($[0] !== h.children || $[1] !== h.height || $[2] !== h.marginTop || $[3] !== width) {
    Be = jsxProd_default(Box, {
      position: "absolute",
      marginTop,
      height,
      width,
      paddingX: 2,
      flexDirection: "column",
      justifyContent: "flex-end",
      overflow: "hidden",
      children: h.children,
    });
    $[0] = h.children;
    $[1] = h.height;
    $[2] = h.marginTop;
    $[3] = width;
    $[4] = Be;
  } else Be = $[4];
  return Be;
}
//@ chunk-18hwfzwa.js:795108-795112 placement
init_react_production();
//@ chunk-18hwfzwa.js:795112-795116 placement
init_react_production();
//@ chunk-18hwfzwa.js:795116-795120 placement
init_react_production();
//@ chunk-18hwfzwa.js:795120-795165 placement
function useMergedClients(initialClients, mcpClients) {
  return Q(() => mergeClients(initialClients, mcpClients), [initialClients, mcpClients]);
}
//@ chunk-8jypjjdf.js:20372-20520 placement = _temp2 (0.843)
function ToastText(props) {
  let $ = w(2);
  let { text } = props;
  let l;
  if ($[0] !== text) {
    l = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      wrap: "truncate-end",
      children: text,
    });
    $[0] = text;
    $[1] = l;
  } else l = $[1];
  return l;
}
//@ chunk-8jypjjdf.js:20520-20697 placement = StyledText (0.767)
/**
 * 渲染通知的分段文本（颜色、加粗、可点链接）。
 */
function SegmentedText({ segments }) {
  return segments.map((segment, t) => {
    let l = jsxProd_default(
      Text,
      {
        color: segment.color,
        dimColor: segment.dim,
        bold: segment.bold,
        children: segment.text,
      },
      t,
    );
    return segment.url === undefined
      ? l
      : jsxProd_default(
          Link,
          {
            url: segment.url,
            children: l,
          },
          t,
        );
  });
}
//@ chunk-8jypjjdf.js:20697-20743 fingerprint = _temp (1)
function selectNotificationsCurrent(s) {
  return s.notifications.current;
}
//@ chunk-8jypjjdf.js:20743-21713 placement
/**
 * 输入框上方的 toast 通知行（第一行绘制时隐藏）。
 */
function PromptToast(props) {
  let d = w(18);
  let { drawnOnRow1 } = props;
  let t = drawnOnRow1 === undefined ? false : drawnOnRow1;
  let appState = useAppState(selectNotificationsCurrent);
  let appState_2 = useAppState(holdsToasts);
  let m = showSwarmFooterGate();
  let headerGauge = useHeaderGauge();
  if (!appState || !isHeldNotice(appState, appState_2) || (m && isGaugeSurface(appState, headerGauge))) {
    return null;
  }
  if (t) {
    return null;
  }
  let f;
  if (d[0] !== appState || d[1] !== m) {
    f = m ? gaugeOf(appState) : undefined;
    d[0] = appState;
    d[1] = m;
    d[2] = f;
  } else f = d[2];
  let h = f;
  if (h?.surface === "toast") {
    let u;
    if (d[3] !== appState.key || d[4] !== h.text) {
      u = jsxProd_default(
        ToastText,
        {
          text: h.text,
        },
        appState.key,
      );
      d[3] = appState.key;
      d[4] = h.text;
      d[5] = u;
    } else u = d[5];
    return u;
  }
  if ("jsx" in appState) {
    let u;
    if (d[6] !== appState.jsx || d[7] !== appState.key) {
      u = jsxProd_default(
        Text,
        {
          wrap: "truncate",
          children: appState.jsx,
        },
        appState.key,
      );
      d[6] = appState.jsx;
      d[7] = appState.key;
      d[8] = u;
    } else u = d[8];
    return u;
  }
  if ("segments" in appState) {
    let children;
    if (d[9] !== appState.segments) {
      children = jsxProd_default(SegmentedText, {
        segments: appState.segments,
      });
      d[9] = appState.segments;
      d[10] = children;
    } else children = d[10];
    let b;
    if (d[11] !== appState.key || d[12] !== children) {
      b = jsxProd_default(
        Text,
        {
          wrap: "truncate",
          children,
        },
        appState.key,
      );
      d[11] = appState.key;
      d[12] = children;
      d[13] = b;
    } else b = d[13];
    return b;
  }
  const dimColor = !appState.color;
  let b;
  if (d[14] !== appState.color || d[15] !== appState.text || d[16] !== dimColor) {
    b = jsxProd_default(Text, {
      color: appState.color,
      dimColor,
      wrap: "truncate",
      children: appState.text,
    });
    d[14] = appState.color;
    d[15] = appState.text;
    d[16] = dimColor;
    d[17] = b;
  } else b = d[17];
  return b;
}
//@ chunk-8jypjjdf.js:21713-21717 placement
init_react_production();
//@ chunk-8jypjjdf.js:21717-21747 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_NOTICE_LINES（2：通知行数）；NOTICE_WIDTH_LIMIT（15：通知宽度）；noticeDialogSlot（通知对话框槽）；位于「输入框右下的通知区：显示通知队列当前项（语音录制/处理、IDE、apiKeyHelper 慢、用量额度等），超时自动消失」模块。
 */
var MAX_NOTICE_LINES = 2;
var NOTICE_WIDTH_LIMIT = 15;
var noticeDialogSlot = qt(null);
export {
  useMergedClients,
  NOTIFICATION_TIMEOUT_MS,
  NotificationOverlay,
  Notifications,
  SegmentedText,
  useLatchedBridgeNotice,
  noticeDialogSlot,
  NOTICE_WIDTH_LIMIT,
  PromptToast,
  MAX_NOTICE_LINES,
};
