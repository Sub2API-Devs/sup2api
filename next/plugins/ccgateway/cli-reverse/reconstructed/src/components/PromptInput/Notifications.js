/**
 * components/PromptInput/Notifications.tsx
 *
 * 输入框右下的通知区：显示通知队列当前项（语音录制/处理、IDE、apiKeyHelper 慢、用量额度等），超时自动消失。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/Notifications.tsx
 * pieces: chunk-czq1j3j2.js (32), chunk-tvbhy3tn.js (6)
 * attribution: placement 26, sole-consumer 5, affinity 3, layout 1, fingerprint 3
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { useAppState, useAppState_2 } from "../../state/AppState.js";
import {
  holdsToasts,
  useHeaderGauge,
  isHeldNotice,
  isGaugeSurface,
  gaugeOf,
  useNotifications,
} from "../../context/notifications.js";
import { showSwarmFooterGate } from "./footerGates.js";
import {
  init_react_production,
  createContext,
  useState,
  useRef,
  useEffect,
  useMemo,
  memo,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { useTheme_2, useResolvedTheme } from "../design-system/ThemeProvider.js";
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
import { parseRGB, roundToStep, toRGBColor, interpolateColor } from "../Spinner/utils.js";
import { isXtermJs } from "../../ink/terminal.js";
import { useAnimationTimer, useInterval } from "../../ink/components/Input.js";
import { formatDuration } from "../../utils/format.js";
import { BULLSEYE } from "../../constants/figures.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tvbhy3tn.js:20374-20522 placement (2.1.88 match: _temp2, 0.843)
function ToastText(props) {
  let $ = useMemoCache(2);
  let { text } = props;
  let textElement;
  if ($[0] !== text) {
    textElement = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      wrap: "truncate-end",
      children: text,
    });
    $[0] = text;
    $[1] = textElement;
  } else textElement = $[1];
  return textElement;
}
//@ chunk-tvbhy3tn.js:20522-20699 placement (2.1.88 match: StyledText, 0.767)
/**
 * 渲染通知的分段文本（颜色、加粗、可点链接）。
 */
function SegmentedText({ segments }) {
  return segments.map((segment, index) => {
    let segmentElement = jsxProd_default(
      Text,
      {
        color: segment.color,
        dimColor: segment.dim,
        bold: segment.bold,
        children: segment.text,
      },
      index,
    );
    return segment.url === undefined
      ? segmentElement
      : jsxProd_default(
          Link,
          {
            url: segment.url,
            children: segmentElement,
          },
          index,
        );
  });
}
//@ chunk-tvbhy3tn.js:20699-20745 fingerprint (2.1.88 match: _temp, 1)
function selectNotificationsCurrent(s) {
  return s.notifications.current;
}
//@ chunk-tvbhy3tn.js:20745-21715 placement
/**
 * 输入框上方的 toast 通知行（第一行绘制时隐藏）。
 */
function PromptToast(props) {
  let $ = useMemoCache(18);
  let { drawnOnRow1 } = props;
  let drawnOnFirstRow = drawnOnRow1 === undefined ? false : drawnOnRow1;
  let appState = useAppState(selectNotificationsCurrent);
  let appState_2 = useAppState(holdsToasts);
  let swarmFooterVisible = showSwarmFooterGate();
  let headerGauge = useHeaderGauge();
  if (
    !appState ||
    !isHeldNotice(appState, appState_2) ||
    (swarmFooterVisible && isGaugeSurface(appState, headerGauge))
  ) {
    return null;
  }
  if (drawnOnFirstRow) {
    return null;
  }
  let gauge;
  if ($[0] !== appState || $[1] !== swarmFooterVisible) {
    gauge = swarmFooterVisible ? gaugeOf(appState) : undefined;
    $[0] = appState;
    $[1] = swarmFooterVisible;
    $[2] = gauge;
  } else gauge = $[2];
  let gaugeState = gauge;
  if (gaugeState?.surface === "toast") {
    let toastTextElement;
    if ($[3] !== appState.key || $[4] !== gaugeState.text) {
      toastTextElement = jsxProd_default(
        ToastText,
        {
          text: gaugeState.text,
        },
        appState.key,
      );
      $[3] = appState.key;
      $[4] = gaugeState.text;
      $[5] = toastTextElement;
    } else toastTextElement = $[5];
    return toastTextElement;
  }
  if ("jsx" in appState) {
    let gaugeText;
    if ($[6] !== appState.jsx || $[7] !== appState.key) {
      gaugeText = jsxProd_default(
        Text,
        {
          wrap: "truncate",
          children: appState.jsx,
        },
        appState.key,
      );
      $[6] = appState.jsx;
      $[7] = appState.key;
      $[8] = gaugeText;
    } else gaugeText = $[8];
    return gaugeText;
  }
  if ("segments" in appState) {
    let children;
    if ($[9] !== appState.segments) {
      children = jsxProd_default(SegmentedText, {
        segments: appState.segments,
      });
      $[9] = appState.segments;
      $[10] = children;
    } else children = $[10];
    let toastElement;
    if ($[11] !== appState.key || $[12] !== children) {
      toastElement = jsxProd_default(
        Text,
        {
          wrap: "truncate",
          children,
        },
        appState.key,
      );
      $[11] = appState.key;
      $[12] = children;
      $[13] = toastElement;
    } else toastElement = $[13];
    return toastElement;
  }
  const dimColor = !appState.color;
  let toastText;
  if ($[14] !== appState.color || $[15] !== appState.text || $[16] !== dimColor) {
    toastText = jsxProd_default(Text, {
      color: appState.color,
      dimColor,
      wrap: "truncate",
      children: appState.text,
    });
    $[14] = appState.color;
    $[15] = appState.text;
    $[16] = dimColor;
    $[17] = toastText;
  } else toastText = $[17];
  return toastText;
}
//@ chunk-tvbhy3tn.js:21715-21719 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tvbhy3tn.js:21715", () => {
  init_react_production();
});
//@ chunk-tvbhy3tn.js:21719-21749 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_NOTICE_LINES（2：通知行数）；NOTICE_WIDTH_LIMIT（15：通知宽度）；noticeDialogSlot（通知对话框槽）；位于「输入框右下的通知区：显示通知队列当前项（语音录制/处理、IDE、apiKeyHelper 慢、用量额度等），超时自动消失」模块。
 */
var MAX_NOTICE_LINES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NOTICE_WIDTH_LIMIT;
var noticeDialogSlot;
deferInit("chunk-tvbhy3tn.js:21719", () => {
  MAX_NOTICE_LINES = 2;
  NOTICE_WIDTH_LIMIT = 15;
  noticeDialogSlot = createContext(null);
});
//@ chunk-czq1j3j2.js:559534-559538 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:559534", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:559584-559588 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:559584", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:664232-664250 placement
function selectPinnedBridgeNotice(state) {}
//@ chunk-czq1j3j2.js:664250-664422 placement
/**
 * 订阅 bridge 提示并锁存最后一次出现的值（置顶提示时在消失后仍保留）。
 */
function useLatchedBridgeNotice(props) {
  let { saysWhatToDo, isPinnedNotice } = props;
  if (saysWhatToDo === undefined) false;
  else saysWhatToDo;
  let isPinned = isPinnedNotice === undefined ? false : isPinnedNotice;
  let appState = useAppState(selectPinnedBridgeNotice);
  let [lastNotice, setLastNotice] = useState(appState);
  if (appState !== undefined && appState !== lastNotice) setLastNotice(appState);
  if (isPinned) appState ?? lastNotice;
  else appState;
  return null;
}
//@ chunk-czq1j3j2.js:809750-809754 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:809750", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:809754-809758 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:809754", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:811250-811254 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:811250", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:811286-811290 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:811286", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:811323-811327 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:811323", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:814214-814291 sole-consumer
var MAX_EXPLANATION_CHARS = 4000;
var EXPLANATION_NOTICE_TIMEOUT_MS = 1e4;
var ISSUE_URL_PREFIX = "https://github.com/anthropics/claude-code/issues/";
//@ chunk-czq1j3j2.js:814291-814361 affinity (2.1.88 match: getRiskColor, 1)
function getRiskColor(riskLevel) {
  return {
    text: `#${riskLevel}`,
    color: "success",
    url: `${ISSUE_URL_PREFIX}${riskLevel}`,
  };
}
//@ chunk-czq1j3j2.js:814361-814740 placement
/**
 * 生成 "你的 issue 已关闭" 通知的分段文本（单个或多个 issue 编号）。
 */
function formatClosedIssuesNotice(issues) {
  if (issues.length === 1)
    return [
      {
        text: "\u2713 Your issue ",
        color: "success",
      },
      getRiskColor(issues[0].number),
      {
        text: " has been closed. Thanks for reporting!",
        color: "success",
      },
    ];
  return [
    {
      text: `\u2713 ${issues.length} of your issues have been closed (`,
      color: "success",
    },
    ...issues.flatMap((issue, index) => [
      ...(index > 0
        ? [
            {
              text: ", ",
              color: "success",
            },
          ]
        : []),
      getRiskColor(issue.number),
    ]),
    {
      text: "). Thanks for reporting!",
      color: "success",
    },
  ];
}
//@ chunk-czq1j3j2.js:814740-815574 layout
/**
 * 一方提供商下挂载时检查"我提交的 issue 已关闭"：先读缓存再拉取，新增未确认的关闭 issue 时弹出低优先级通知并标记已提示，记 tengu_closed_issue_notice_shown。
 */
function ClosedIssueNotifier() {
  let $ = useMemoCache(4);
  let { storageV5 } = useTheme_2();
  let { addNotification } = useNotifications();
  let startedRef = useRef(false);
  let effect;
  let deps;
  if ($[0] !== addNotification || $[1] !== storageV5) {
    effect = () => {
      if (startedRef.current) {
        return;
      }
      startedRef.current = true;
      if (isFirstPartyProvider()) {
        let showClosedIssues = function (issues) {
          let knownNumbers = new Set(shownIssues.map(selectNumber));
          let filtered = issues.filter((issue) => !knownNumbers.has(issue.number));
          if (filtered.length === 0) {
            return;
          }
          shownIssues.push(...filtered);
          logEvent("tengu_closed_issue_notice_shown", {
            newClosedIssueCount: filtered.length,
            totalClosedIssueCount: shownIssues.length,
          });
          addNotification({
            key: "closed-issue-notice",
            kind: "event",
            segments: formatClosedIssuesNotice(shownIssues),
            priority: "low",
            timeoutMs: EXPLANATION_NOTICE_TIMEOUT_MS,
            fold: identity_2,
          });
          acknowledgeClosedIssues(filtered.map(selectNumber2), storageV5);
        };
        let isCancelled = false;
        let shownIssues = [];
        let loadIssues = async function loadIssues() {
          let inner = await readClosedIssuesCache(storageV5);
          let cachedIssues = unacknowledgedClosedIssues(inner);
          if (!isCancelled && cachedIssues.length > 0) showClosedIssues(cachedIssues);
          let myClosedIssues = await fetchMyClosedIssues(storageV5);
          if (isCancelled || myClosedIssues === null || myClosedIssues > MAX_EXPLANATION_CHARS) {
            return;
          }
          let freshIssues = unacknowledgedClosedIssues(await readClosedIssuesCache(storageV5));
          if (!isCancelled && freshIssues.length > 0) showClosedIssues(freshIssues);
        };
        loadIssues().catch(logError);
        return () => {
          isCancelled = true;
        };
      }
    };
    deps = [addNotification, storageV5];
    $[0] = addNotification;
    $[1] = storageV5;
    $[2] = effect;
    $[3] = deps;
  } else {
    effect = $[2];
    deps = $[3];
  }
  useEffect(effect, deps);
  return null;
}
//@ chunk-czq1j3j2.js:815574-815578 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:815574", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:815578-815582 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:815578", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:818290-818347 affinity (2.1.88 match: SETTLED_GREY, 1)
var ASTERISK_RAY_COUNT = 20;
var ASTERISK_SPIN_PERIOD_MS = 4000;
var ASTERISK_TICK_MS = ASTERISK_SPIN_PERIOD_MS / ASTERISK_RAY_COUNT;
var ASTERISK_FADE_FLOOR = 0.18;
var SETTLED_GREY_RGB = {
  r: 0,
  g: 0,
  b: 0,
};
//@ chunk-czq1j3j2.js:818347-819224 placement
/**
 * 页脚"/goal active"指示：显示目标设定以来的耗时（1 分钟内每秒刷新，之后每分钟），真彩终端下按权限色做呼吸动画。
 */
function GoalActiveIndicator({ withSeparator }) {
  let goalSetAt = useAppState((state) => state.activeGoal?.setAt);
  let hasGoal = goalSetAt !== undefined;
  let [tick, setTick] = useState(0);
  let clock = useClock();
  let startRef = useRef(null);
  if (goalSetAt !== undefined && startRef.current?.setAt !== goalSetAt)
    startRef.current = {
      setAt: goalSetAt,
      clockStart: clock.now() - (Date.now() - goalSetAt),
    };
  let startInfo = startRef.current;
  useEffect(() => {
    if (goalSetAt === undefined || startRef.current === null) return;
    let elapsedMs = clock.now() - startRef.current.clockStart;
    let intervalMs = elapsedMs < 60000 ? 1000 : 60000;
    let nextDelayMs = intervalMs - (elapsedMs % intervalMs);
    return clock.setTimeout(() => setTick((previous) => previous + 1), nextDelayMs);
  }, [goalSetAt, tick, clock]);
  let theme = useResolvedTheme();
  let pulseColors = useMemo(() => {
    if (sequential.level < 3) return null;
    let pulseBaseColor = parseRGB(theme.permission);
    return pulseBaseColor ? goalPulseColors(pulseBaseColor, isXtermJs()) : null;
  }, [theme.permission, sequential.level]);
  let animationTimer = useAnimationTimer(hasGoal && pulseColors ? ASTERISK_TICK_MS : null);
  let rayIndex = Math.floor(animationTimer / ASTERISK_TICK_MS) % ASTERISK_RAY_COUNT;
  if (!hasGoal || startInfo === null) return null;
  let elapsedMs = clock.now() - startInfo.clockStart;
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
        color: pulseColors?.[rayIndex] ?? "permission",
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
//@ chunk-czq1j3j2.js:819224-819367 placement
function goalPulseColors(baseColor, stepped) {
  return Array.from(
    {
      length: ASTERISK_RAY_COUNT,
    },
    (unused, rayIndex) => {
      let wave = 0.5 - 0.5 * Math.cos((2 * Math.PI * rayIndex) / ASTERISK_RAY_COUNT);
      let fade = ASTERISK_FADE_FLOOR * (stepped ? roundToStep(wave) : wave);
      return toRGBColor(interpolateColor(baseColor, SETTLED_GREY_RGB, fade));
    },
  );
}
//@ chunk-czq1j3j2.js:820233-820278 placement
function selectAutoCompactWindow_2(state) {
  return state.autoCompactWindow;
}
//@ chunk-czq1j3j2.js:820278-820328 placement
function selectRemoteAutocompactState_2(state) {
  return state.remoteAutocompactState;
}
//@ chunk-czq1j3j2.js:820328-820367 placement
function selectIsBriefOnly_2(state) {
  return state.isBriefOnly;
}
//@ chunk-czq1j3j2.js:820449-820503 sole-consumer
function hasActiveGoal(state) {
  return state.activeGoal?.setAt !== undefined;
}
//@ chunk-czq1j3j2.js:820503-820535 sole-consumer
function clearEnvHookNotifier() {
  return setEnvHookNotifier(null);
}
//@ chunk-czq1j3j2.js:820535-820565 sole-consumer
function foldKeepLatest(previous, next) {
  return next;
}
//@ chunk-czq1j3j2.js:820565-820603 sole-consumer
function selectVoiceState(state) {
  return state.voiceState;
}
//@ chunk-czq1j3j2.js:820603-820641 affinity
function selectVoiceError(state) {
  return state.voiceError;
}
//@ chunk-czq1j3j2.js:820641-824588 fingerprint (2.1.88 match: Notifications, 0.621)
var NOTIFICATION_TIMEOUT_MS; // deferred: uses getContextTokenCount (../../utils/tokens.js) of its import cycle while loading; runs once the cycle is complete
var Notifications;
deferInit("chunk-czq1j3j2.js:820641", () => {
  NOTIFICATION_TIMEOUT_MS = 5000;
  Notifications = memo(function (props) {
    let $ = useMemoCache(59);
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
    let hasStashValue = hasStash === undefined ? false : hasStash;
    let toastOnRow1 = row1HintId === "timed";
    let voiceOnRow1 = row1HintId === "voice";
    let storeSelector = useStoreSelector(apiKeyVerification);
    let isInvalidKey = storeSelector === "invalid" || storeSelector === "missing";
    let showLoginNotice = !hideLoginNotice && isInvalidKey;
    let showVerboseTokens = verbose && !isInvalidKey;
    let storeSelector_2 = useStoreSelector(transcript, getContextTokenCount);
    let mainLoopModel = useMainLoopModel_3();
    let autoCompactWindow = useAppState(selectAutoCompactWindow_2);
    let remoteAutocompactState = useAppState(selectRemoteAutocompactState_2);
    let tokenWarning;
    if (
      $[0] !== autoCompactWindow ||
      $[1] !== mainLoopModel ||
      $[2] !== remoteAutocompactState ||
      $[3] !== storeSelector_2
    ) {
      tokenWarning = calculateTokenWarningState(
        storeSelector_2,
        getModelContextInfo(mainLoopModel),
        autoCompactWindow,
        remoteAutocompactState,
      );
      $[0] = autoCompactWindow;
      $[1] = mainLoopModel;
      $[2] = remoteAutocompactState;
      $[3] = storeSelector_2;
      $[4] = tokenWarning;
    } else tokenWarning = $[4];
    let hasTokenWarning = tokenWarning.level !== "ok";
    let microCompactFlag = useMicroCompactFlag();
    let canShowSuccess = isNoForceUpdateRenders();
    let isBriefOnly = useAppState(selectIsBriefOnly_2);
    let headerGauge = useHeaderGauge();
    let heldSelector;
    if ($[5] !== headerGauge || $[6] !== toastOnRow1) {
      heldSelector = (appState) =>
        isHeldNotice(appState.notifications.current, holdsToasts(appState)) &&
        !toastOnRow1 &&
        !isGaugeSurface(appState.notifications.current, headerGauge);
      $[5] = headerGauge;
      $[6] = toastOnRow1;
      $[7] = heldSelector;
    } else heldSelector = $[7];
    let appState = useAppState(heldSelector);
    let { addNotification, removeNotification } = useNotifications();
    let rateLimitState = useRateLimitState();
    let isFullscreen = useIsFullscreen();
    let voiceAvailable = useVoiceAvailable();
    let appState_2 = useAppState_2(VoiceIndicatorImpl);
    let appState_3 = useAppState(hasActiveGoal);
    let [isMemoryShowing, setMemoryShowing] = useState(false);
    let envHookEffect;
    let envHookDeps;
    if ($[8] !== addNotification) {
      envHookEffect = () => {
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
      envHookDeps = [addNotification];
      $[8] = addNotification;
      $[9] = envHookEffect;
      $[10] = envHookDeps;
    } else {
      envHookEffect = $[9];
      envHookDeps = $[10];
    }
    useEffect(envHookEffect, envHookDeps);
    let isUsingOverage = rateLimitState.isUsingOverage;
    let subscriptionTypeWithRefresh = getSubscriptionTypeWithRefresh();
    let isTeamOrEnterprise =
      subscriptionTypeWithRefresh === "team" || subscriptionTypeWithRefresh === "enterprise";
    let editor;
    if ($[11] === MEMO_CACHE_SENTINEL) {
      editor = resolveEditorCommand();
      $[11] = editor;
    } else editor = $[11];
    let editor_2 = editor;
    let shouldOfferEditorHint =
      isInputWrapped_2 &&
      !hasTokenWarning &&
      storeSelector !== "invalid" &&
      storeSelector !== "missing" &&
      editor_2 !== undefined;
    let editorHintEffect;
    let editorHintDeps;
    if ($[12] !== addNotification || $[13] !== removeNotification || $[14] !== shouldOfferEditorHint) {
      editorHintEffect = () => {
        if (shouldOfferEditorHint && editor_2) {
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
                description: `edit in ${toIDEDisplayName(editor_2)}`,
              }),
            }),
            priority: "immediate",
            timeoutMs: 5000,
          });
        } else removeNotification("external-editor-hint");
      };
      editorHintDeps = [shouldOfferEditorHint, editor_2, addNotification, removeNotification];
      $[12] = addNotification;
      $[13] = removeNotification;
      $[14] = shouldOfferEditorHint;
      $[15] = editorHintEffect;
      $[16] = editorHintDeps;
    } else {
      editorHintEffect = $[15];
      editorHintDeps = $[16];
    }
    useEffect(editorHintEffect, editorHintDeps);
    let tokenWarningEffect;
    let tokenWarningDeps;
    if (
      $[17] !== addNotification ||
      $[18] !== isBriefOnly ||
      $[19] !== hasTokenWarning ||
      $[20] !== mainLoopModel ||
      $[21] !== removeNotification ||
      $[22] !== microCompactFlag ||
      $[23] !== storeSelector_2
    ) {
      tokenWarningEffect = () => {
        if (hasTokenWarning && !microCompactFlag && !isBriefOnly)
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
      tokenWarningDeps = [
        hasTokenWarning,
        microCompactFlag,
        isBriefOnly,
        storeSelector_2,
        mainLoopModel,
        addNotification,
        removeNotification,
      ];
      $[17] = addNotification;
      $[18] = isBriefOnly;
      $[19] = hasTokenWarning;
      $[20] = mainLoopModel;
      $[21] = removeNotification;
      $[22] = microCompactFlag;
      $[23] = storeSelector_2;
      $[24] = tokenWarningEffect;
      $[25] = tokenWarningDeps;
    } else {
      tokenWarningEffect = $[24];
      tokenWarningDeps = $[25];
    }
    useEffect(tokenWarningEffect, tokenWarningDeps);
    let hasContent = Boolean(
      appState ||
      (isUsingOverage && !isTeamOrEnterprise) ||
      showLoginNotice ||
      showVerboseTokens ||
      (!isFullscreen && isAutoUpdating),
    );
    let hasContentOrStash = hasContent || hasStashValue || appState_3;
    const showSuccessMessage = canShowSuccess && !hasTokenWarning;
    const withSeparator = isFullscreen ? hasContentOrStash : undefined;
    let autoUpdaterElement;
    if (
      $[26] !== isAutoUpdating ||
      $[27] !== onChangeIsUpdating ||
      $[28] !== showSuccessMessage ||
      $[29] !== withSeparator ||
      $[30] !== verbose
    ) {
      autoUpdaterElement = jsxProd_default(AutoUpdaterWrapper, {
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
      $[31] = autoUpdaterElement;
    } else autoUpdaterElement = $[31];
    let autoUpdaterElement_2 = autoUpdaterElement;
    const isInOverageMode = isUsingOverage ?? false;
    const autoUpdater = isFullscreen ? null : autoUpdaterElement_2;
    let notificationContent;
    if (
      $[32] !== isTeamOrEnterprise ||
      $[33] !== showLoginNotice ||
      $[34] !== showVerboseTokens ||
      $[35] !== isInOverageMode ||
      $[36] !== autoUpdater ||
      $[37] !== toastOnRow1 ||
      $[38] !== storeSelector_2 ||
      $[39] !== voiceOnRow1
    ) {
      notificationContent = jsxProd_default(Box, {
        flexDirection: "column",
        alignItems: "flex-end",
        flexShrink: 1,
        overflowX: "hidden",
        children: jsxProd_default(NotificationContent, {
          isInOverageMode,
          isTeamOrEnterprise,
          showLoginNotice,
          showVerboseTokens,
          tokenUsage: storeSelector_2,
          autoUpdater,
          onCriticalMemoryShowingChange: setMemoryShowing,
          toastOnRow1,
          voiceOnRow1,
        }),
      });
      $[32] = isTeamOrEnterprise;
      $[33] = showLoginNotice;
      $[34] = showVerboseTokens;
      $[35] = isInOverageMode;
      $[36] = autoUpdater;
      $[37] = toastOnRow1;
      $[38] = storeSelector_2;
      $[39] = voiceOnRow1;
      $[40] = notificationContent;
    } else notificationContent = $[40];
    let stashIndicator;
    if ($[41] !== hasContent || $[42] !== hasStashValue) {
      stashIndicator =
        hasStashValue &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: hasContent ? " \xB7 " : " ",
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [figures_default.pointerSmall, " stashed"],
            }),
          ],
        });
      $[41] = hasContent;
      $[42] = hasStashValue;
      $[43] = stashIndicator;
    } else stashIndicator = $[43];
    const withSeparator_2 = hasContent || hasStashValue;
    let goalIndicator;
    if ($[44] !== withSeparator_2) {
      goalIndicator = jsxProd_default(GoalActiveIndicator, {
        withSeparator: withSeparator_2,
      });
      $[44] = withSeparator_2;
      $[45] = goalIndicator;
    } else goalIndicator = $[45];
    let autoUpdaterBox;
    if (
      $[46] !== autoUpdaterElement_2 ||
      $[47] !== hasContentOrStash ||
      $[48] !== isMemoryShowing ||
      $[49] !== isFullscreen ||
      $[50] !== appState_2 ||
      $[51] !== voiceAvailable ||
      $[52] !== voiceOnRow1
    ) {
      autoUpdaterBox =
        isFullscreen &&
        jsxProd_default(Box, {
          flexShrink: 0,
          maxWidth: hasContentOrStash ? "60%" : undefined,
          display: (voiceAvailable && appState_2 && !voiceOnRow1) || isMemoryShowing ? "none" : "flex",
          children: autoUpdaterElement_2,
        });
      $[46] = autoUpdaterElement_2;
      $[47] = hasContentOrStash;
      $[48] = isMemoryShowing;
      $[49] = isFullscreen;
      $[50] = appState_2;
      $[51] = voiceAvailable;
      $[52] = voiceOnRow1;
      $[53] = autoUpdaterBox;
    } else autoUpdaterBox = $[53];
    let footer;
    if (
      $[54] !== notificationContent ||
      $[55] !== stashIndicator ||
      $[56] !== goalIndicator ||
      $[57] !== autoUpdaterBox
    ) {
      footer = jsxProd_default(SentryErrorBoundary, {
        children: jsxProd_default_2(Box, {
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "flex-end",
          flexShrink: 0,
          overflowX: "hidden",
          children: [notificationContent, stashIndicator, goalIndicator, autoUpdaterBox],
        }),
      });
      $[54] = notificationContent;
      $[55] = stashIndicator;
      $[56] = goalIndicator;
      $[57] = autoUpdaterBox;
      $[58] = footer;
    } else footer = $[58];
    return footer;
  });
});
//@ chunk-czq1j3j2.js:824588-827107 fingerprint (2.1.88 match: NotificationContent, 0.431)
/**
 * 通知内容：语音 recording/processing、apiKeyHelper 慢、"Now using usage credits"、IDE 状态等按类型渲染；无通知时显示其他状态。
 */
function NotificationContent(props) {
  let $ = useMemoCache(41);
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
  let isProPlan;
  if ($[0] !== subscriptionTypeWithRefresh) {
    isProPlan = !isRemoteSessionAvailable() && subscriptionTypeWithRefresh === "pro";
    $[0] = subscriptionTypeWithRefresh;
    $[1] = isProPlan;
  } else isProPlan = $[1];
  let showContextHint = isProPlan;
  let nowTicker = useNowTicker(showContextHint ? 30000 : null);
  let contextHint;
  if ($[2] !== nowTicker || $[3] !== showContextHint || $[4] !== tokenUsage) {
    contextHint = showContextHint
      ? uncachedContextHint(tokenUsage, getLastApiCompletionTimestamp(), nowTicker)
      : null;
    $[2] = nowTicker;
    $[3] = showContextHint;
    $[4] = tokenUsage;
    $[5] = contextHint;
  } else contextHint = $[5];
  let contextHint_2 = contextHint;
  let [helperElapsed, setHelperElapsed] = useState(null);
  let hasApiKeyHelper = !isRemoteSessionAvailable() && Boolean(getConfiguredApiKeyHelper());
  let helperTick;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    helperTick = () => {
      let ms = getApiKeyHelperElapsedMs();
      let next = ms >= 1e4 ? formatDuration(ms) : null;
      setHelperElapsed((prev) => (next === prev ? prev : next));
    };
    $[6] = helperTick;
  } else helperTick = $[6];
  useInterval(helperTick, hasApiKeyHelper ? 1000 : null);
  let appState = useAppState_2(selectVoiceState);
  let voiceAvailable = useVoiceAvailable();
  let appState_2 = useAppState_2(selectVoiceError);
  if (!voiceOnRow1 && voiceAvailable && (appState === "recording" || appState === "processing")) {
    let voiceIndicator;
    if ($[7] !== appState) {
      voiceIndicator = jsxProd_default(VoiceStateIndicator, {
        voiceState: appState,
      });
      $[7] = appState;
      $[8] = voiceIndicator;
    } else voiceIndicator = $[8];
    return voiceIndicator;
  }
  let overageNotice;
  if ($[9] !== isInOverageMode || $[10] !== isTeamOrEnterprise) {
    overageNotice =
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
    $[11] = overageNotice;
  } else overageNotice = $[11];
  let helperWarning;
  if ($[12] !== helperElapsed) {
    helperWarning =
      helperElapsed &&
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
            children: ["(", helperElapsed, ")"],
          }),
        ],
      });
    $[12] = helperElapsed;
    $[13] = helperWarning;
  } else helperWarning = $[13];
  let loginNotice;
  if ($[14] !== showLoginNotice) {
    loginNotice =
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
    $[15] = loginNotice;
  } else loginNotice = $[15];
  let tokenCount;
  if ($[16] !== showVerboseTokens || $[17] !== tokenUsage) {
    tokenCount =
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
    $[18] = tokenCount;
  } else tokenCount = $[18];
  let contextWarning;
  if ($[19] !== contextHint_2) {
    contextWarning =
      contextHint_2 &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate",
          children: contextHint_2,
        }),
      });
    $[19] = contextHint_2;
    $[20] = contextWarning;
  } else contextWarning = $[20];
  let closedIssueNotifier;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    closedIssueNotifier = jsxProd_default(ClosedIssueNotifier, {});
    $[21] = closedIssueNotifier;
  } else closedIssueNotifier = $[21];
  let voiceErrorText;
  if ($[22] !== voiceAvailable || $[23] !== appState_2) {
    voiceErrorText =
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
    $[24] = voiceErrorText;
  } else voiceErrorText = $[24];
  let highMemory;
  let sandboxHint;
  if ($[25] === MEMO_CACHE_SENTINEL) {
    highMemory = jsxProd_default(MemoryUsageIndicator, {
      tier: "high",
    });
    sandboxHint = !isRemoteSessionAvailable() && jsxProd_default(SandboxPromptFooterHint, {});
    $[25] = highMemory;
    $[26] = sandboxHint;
  } else {
    highMemory = $[25];
    sandboxHint = $[26];
  }
  let promptToast;
  if ($[27] !== toastOnRow1) {
    promptToast = jsxProd_default(PromptToast, {
      drawnOnRow1: toastOnRow1,
    });
    $[27] = toastOnRow1;
    $[28] = promptToast;
  } else promptToast = $[28];
  let criticalMemory;
  if ($[29] !== onCriticalMemoryShowingChange) {
    criticalMemory = jsxProd_default(MemoryUsageIndicator, {
      tier: "critical",
      onShowingChange: onCriticalMemoryShowingChange,
    });
    $[29] = onCriticalMemoryShowingChange;
    $[30] = criticalMemory;
  } else criticalMemory = $[30];
  let content;
  if (
    $[31] !== autoUpdater ||
    $[32] !== voiceErrorText ||
    $[33] !== promptToast ||
    $[34] !== criticalMemory ||
    $[35] !== overageNotice ||
    $[36] !== helperWarning ||
    $[37] !== loginNotice ||
    $[38] !== tokenCount ||
    $[39] !== contextWarning
  ) {
    content = jsxProd_default_2(Fragment, {
      children: [
        overageNotice,
        helperWarning,
        loginNotice,
        tokenCount,
        contextWarning,
        autoUpdater,
        closedIssueNotifier,
        voiceErrorText,
        highMemory,
        sandboxHint,
        promptToast,
        criticalMemory,
      ],
    });
    $[31] = autoUpdater;
    $[32] = voiceErrorText;
    $[33] = promptToast;
    $[34] = criticalMemory;
    $[35] = overageNotice;
    $[36] = helperWarning;
    $[37] = loginNotice;
    $[38] = tokenCount;
    $[39] = contextWarning;
    $[40] = content;
  } else content = $[40];
  return content;
}
//@ chunk-czq1j3j2.js:827107-827121 placement
var UNCACHED_CONTEXT_HINT_TOKENS = 50000;
//@ chunk-czq1j3j2.js:827121-827277 placement
function uncachedContextHint(tokenUsage, lastApiCompletionTimestamp, nowTicker) {
  if (lastApiCompletionTimestamp === null) return null;
  if (tokenUsage < UNCACHED_CONTEXT_HINT_TOKENS) return null;
  if (nowTicker - lastApiCompletionTimestamp <= CACHE_TTL_1H_MS) return null;
  return `~${Math.round(tokenUsage / 1000)}k uncached \xB7 /clear to start fresh`;
}
//@ chunk-czq1j3j2.js:827281-827727 placement
/**
 * 通知区的绝对定位容器：宽度扣掉右侧占用列数，底部对齐、超出隐藏。
 */
function NotificationOverlay(props) {
  let $ = useMemoCache(5);
  let { columns } = useTerminalSize();
  let footerInset = useContext(FooterSlot);
  const { marginTop, height } = props;
  const width = footerInset > 0 ? Math.max(0, columns - footerInset) : "100%";
  let overlayElement;
  if ($[0] !== props.children || $[1] !== props.height || $[2] !== props.marginTop || $[3] !== width) {
    overlayElement = jsxProd_default(Box, {
      position: "absolute",
      marginTop,
      height,
      width,
      paddingX: 2,
      flexDirection: "column",
      justifyContent: "flex-end",
      overflow: "hidden",
      children: props.children,
    });
    $[0] = props.children;
    $[1] = props.height;
    $[2] = props.marginTop;
    $[3] = width;
    $[4] = overlayElement;
  } else overlayElement = $[4];
  return overlayElement;
}
//@ chunk-czq1j3j2.js:827739-827784 placement
function useMergedClients(initialClients, mcpClients) {
  return useMemo(() => mergeClients(initialClients, mcpClients), [initialClients, mcpClients]);
}
export {
  useLatchedBridgeNotice,
  noticeDialogSlot,
  NOTICE_WIDTH_LIMIT,
  PromptToast,
  useMergedClients,
  NOTIFICATION_TIMEOUT_MS,
  NotificationOverlay,
  Notifications,
  SegmentedText,
  MAX_NOTICE_LINES,
};
