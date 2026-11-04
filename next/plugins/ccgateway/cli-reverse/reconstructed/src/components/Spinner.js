/**
 * components/Spinner.tsx
 *
 * 主 Spinner：动词 + 计时 + token 计数 + 任务进度（SpinnerWithVerb），brief 模式的连接状态 Spinner，以及流式 thinking 进度。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner.tsx
 * pieces: chunk-3mec1atf.js (21)
 * attribution: placement 8, sole-consumer 3, affinity 1, callgraph-witnessed 1, fingerprint 5, layout 3
 */
import { cosineEase, getDefaultCharacters, roundToStep, spinnerFramesForTerminal } from "./Spinner/utils.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { useRef, useMemo, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import {
  createToolWindowTimingState,
  advanceToolWindowTiming,
  toolWindowPhase,
  thinkingBurstIntensity,
} from "./Spinner/useToolWindowTiming.js";
import { useStalledAnimation } from "./Spinner/useStalledAnimation.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { formatDuration, formatNumber, truncateToRemainingWidth, truncateToWidth } from "../utils/format.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useSpinnerStatus, sampleAlias } from "./Spinner/spinnerStatus.js";
import { useAppState, useAppStateSlice } from "../state/AppState.js";
import { env } from "../utils/env.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";
import { getUserMsgOptIn, mainAgentId } from "../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useSettingsState } from "../hooks/useSettings.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { isReducedMotion } from "./Spinner/spinnerFlags.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { shouldShowNotice, SlashCommandLink } from "./SlashCommandLink.js";
import { SPINNER_COLUMN_MIN_WIDTH } from "./Spinner/SpinnerColumn.js";
import { useTaskListSnapshot } from "../hooks/useTasksV2.js";
import { getSpinnerVerbs } from "../constants/spinnerVerbs.js";
import { TRAILING_ELLIPSIS_RE } from "../utils/stringUtils.js";
import { activityManager } from "../utils/activityManager.js";
import { useQueuedMessageText } from "../context/QueuedMessageContext.js";
import { getEffortSuffix } from "../utils/effort.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { getGlobalConfig } from "../utils/config.js";
import { excludesDefaultTips } from "../services/tips/spinnerTipsOverride.js";
import {
  FOCUS_ON_TIP,
  FOCUS_OFF_TIP,
  TEACH_TIP_TEXT,
  TEACH_TIP_TITLE,
  CONFIG,
  TEACH_TIP_SETTING,
} from "../services/tips/focusTips.js";
import { getStatusPageHint } from "../services/api/errors.js";
import { Box, Text } from "../ink/components/Text.js";
import { SpinnerAnimationRow } from "./Spinner/SpinnerAnimationRow.js";
import { MessageResponse } from "./MessageResponse.js";
import { TaskListV2 } from "./TaskListV2.js";
import { count } from "../utils/collections.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import {
  computeGlimmerIndex,
  BRIDGE_STATUS_MAX_WIDTH,
  computeShimmerSegments,
} from "../bridge/bridgeStatusUtil.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-3mec1atf.js:7948-8037 placement
var THINKING_ESCALATION_MS = [1e4, 45000, 300000];
var SPINNER_MIN_VISIBLE_MS = 2000;
var SPINNER_FRAME_MS = 2000;
var SPINNER_TICK_MS = 200;
var SPINNER_FRAME_COUNT = 10;
var STALL_HINT_MS = 1e4;
var LONG_WAIT_MS = 20000;
var VERY_LONG_WAIT_MS = 30000;
var ABANDON_HINT_MS = 45000;
//@ chunk-3mec1atf.js:8037-8106 placement
function frameIndexFor(elapsedMs) {
  let eased = cosineEase(elapsedMs, SPINNER_FRAME_MS);
  return Math.round(eased * (getDefaultCharacters().length - 1));
}
//@ chunk-3mec1atf.js:8106-8176 placement
function thoughtDurationText(thoughtMs) {
  return `thought for ${Math.max(1, Math.round(thoughtMs / 1000))}s`;
}
//@ chunk-3mec1atf.js:8176-8295 placement
function formatThoughtRecoveryLabel({ attempt, limit }) {
  return attempt > 1 ? `picking the thought back up (${attempt} of ${limit})` : "picking the thought back up";
}
//@ chunk-3mec1atf.js:8295-8459 placement
function thinkingDurationLabel(thinkingMs) {
  if (thinkingMs >= ABANDON_HINT_MS) return "deep in thought";
  if (thinkingMs >= VERY_LONG_WAIT_MS) return "thinking some more";
  if (thinkingMs >= LONG_WAIT_MS) return "thinking more";
  if (thinkingMs >= STALL_HINT_MS) return "still thinking";
  return "thinking";
}
//@ chunk-3mec1atf.js:8459-8516 placement
function shimmerLevel(elapsedMs) {
  return roundToStep((Math.sin((elapsedMs / 1000) * Math.PI) + 1) / 2);
}
//@ chunk-3mec1atf.js:8516-11576 placement
function SpinnerTimer316({
  mode,
  reducedMotion,
  hasActiveTools,
  toolWindowStartedAt,
  responseLength,
  message,
  overrideColor,
  loadingStartTime,
  totalPausedMs,
  pauseStartTime,
  thinkingStatus,
  effortSuffix,
  isCompacting,
  compactingStartTime,
  isResponseHeld = false,
  showToolCallTimer,
  outputLimitRecovery = null,
  agentId,
  glimmerParked = false,
}) {
  let [viewportRef, elapsedMs] = useAnimationFrame(
    reducedMotion ? null : mode === "requesting" && !glimmerParked ? 50 : 100,
  );
  let now = Date.now();
  let elapsedMs_2 =
    isCompacting && compactingStartTime !== null
      ? Math.max(0, now - compactingStartTime)
      : pauseStartTime !== null
        ? pauseStartTime - loadingStartTime - totalPausedMs
        : now - loadingStartTime - totalPausedMs;
  let toolWindowTimingStateRef = useRef(createToolWindowTimingState());
  let timingInput = {
    now,
    isThinking: mode === "thinking",
    hasActiveTools,
    toolWindowStartedAt:
      toolWindowStartedAt !== null && toolWindowStartedAt >= loadingStartTime ? toolWindowStartedAt : null,
    thinkingStatus,
    showToolCallTimer,
    outputLimitRecovery,
  };
  toolWindowTimingStateRef.current = advanceToolWindowTiming(toolWindowTimingStateRef.current, timingInput);
  let status = toolWindowPhase(toolWindowTimingStateRef.current, timingInput);
  let burstIntensity = thinkingBurstIntensity(toolWindowTimingStateRef.current, timingInput);
  let currentResponseLength = responseLength;
  let hasActiveTools_2 =
    hasActiveTools ||
    mode === "thinking" ||
    (isCompacting && mode !== "responding") ||
    isResponseHeld ||
    pauseStartTime !== null;
  let { isStalled, stalledIntensity, timeSinceLastToken } = useStalledAnimation(
    elapsedMs,
    currentResponseLength,
    hasActiveTools_2,
    reducedMotion,
    agentId,
  );
  let thresholdsFired = useRef(new Set());
  let timeSinceLastTokenRef = useRef(0);
  let agentIdRef = useRef(agentId);
  if (agentIdRef.current !== agentId) {
    agentIdRef.current = agentId;
    thresholdsFired.current = new Set();
    timeSinceLastTokenRef.current = 0;
  }
  if (timeSinceLastToken === 0) {
    if (thresholdsFired.current.size > 0) {
      logEvent("tengu_spinner_stall_cleared", {
        max_stall_ms: Math.round(timeSinceLastTokenRef.current),
        mode: fromEnum(mode),
        override_color: overrideColor != null,
        response_length: currentResponseLength,
        thresholds_fired: thresholdsFired.current.size,
      });
      thresholdsFired.current = new Set();
      timeSinceLastTokenRef.current = 0;
    }
  } else {
    if (timeSinceLastToken > timeSinceLastTokenRef.current)
      timeSinceLastTokenRef.current = timeSinceLastToken;
    for (let thresholdMs of THINKING_ESCALATION_MS)
      if (timeSinceLastToken >= thresholdMs && !thresholdsFired.current.has(thresholdMs)) {
        thresholdsFired.current.add(thresholdMs);
        logEvent("tengu_spinner_stalled_ui", {
          threshold_ms: thresholdMs,
          mode: fromEnum(mode),
          override_color: overrideColor != null,
          time_since_last_token_ms: Math.round(timeSinceLastToken),
          response_length: currentResponseLength,
          render_loop_dark: timeSinceLastToken - thresholdMs > 5000,
        });
      }
  }
  let frame = reducedMotion ? 0 : frameIndexFor(elapsedMs);
  let tickMs = mode === "requesting" ? 50 : SPINNER_TICK_MS;
  let messageWidth = useMemo(() => bunStringWidth(message), [message]);
  let glimmerSpan = messageWidth + 2 * SPINNER_FRAME_COUNT;
  let floored = Math.floor(elapsedMs / tickMs);
  let glimmerIndex = reducedMotion
    ? -100
    : isStalled
      ? -100
      : mode === "requesting"
        ? (floored % glimmerSpan) - SPINNER_FRAME_COUNT
        : messageWidth + SPINNER_FRAME_COUNT - (floored % glimmerSpan);
  let flashOpacity = reducedMotion ? 0 : mode === "tool-use" ? shimmerLevel(elapsedMs) : 0;
  let shownLength = useRef(currentResponseLength);
  let animClock = useRef(elapsedMs);
  let agentIdRef_2 = useRef(agentId);
  if (
    agentIdRef_2.current !== agentId ||
    Math.abs(currentResponseLength - shownLength.current) > SPINNER_MIN_VISIBLE_MS
  ) {
    agentIdRef_2.current = agentId;
    shownLength.current = currentResponseLength;
    animClock.current = elapsedMs;
  }
  if (reducedMotion) {
    shownLength.current = currentResponseLength;
    animClock.current = elapsedMs;
  } else {
    let floored = Math.floor((elapsedMs - animClock.current) / 50);
    if (floored > 0) {
      animClock.current += floored * 50;
      for (let idx = 0; idx < floored; idx++) {
        let delta = currentResponseLength - shownLength.current;
        if (delta === 0) break;
        let absDelta = Math.abs(delta);
        let step;
        if (absDelta < 70) step = 3;
        else if (absDelta < 200) step = Math.max(8, Math.ceil(absDelta * 0.15));
        else step = 50;
        shownLength.current =
          delta > 0
            ? Math.min(shownLength.current + step, currentResponseLength)
            : Math.max(shownLength.current - step, currentResponseLength);
      }
    }
  }
  let displayedLength = shownLength.current;
  let rounded = Math.round(displayedLength / 4);
  let shownIntensity = useRef(0);
  let intensityClock = useRef(elapsedMs);
  if (mode !== "thinking" || hasActiveTools) {
    shownIntensity.current = 0;
    intensityClock.current = elapsedMs;
  } else if (!reducedMotion && (burstIntensity > 0 || shownIntensity.current > 0)) {
    let elapsed = elapsedMs - intensityClock.current;
    if (elapsed >= 50) {
      let floored = Math.floor(elapsed / 50);
      let currentIntensity = shownIntensity.current;
      for (let idx = 0; idx < floored; idx++) {
        let deltaIntensity = burstIntensity - currentIntensity;
        if (Math.abs(deltaIntensity) < 0.01) {
          currentIntensity = burstIntensity;
          break;
        }
        currentIntensity += deltaIntensity * 0.1;
      }
      shownIntensity.current = currentIntensity;
      intensityClock.current = elapsedMs;
    }
  } else {
    shownIntensity.current = burstIntensity;
    intensityClock.current = elapsedMs;
  }
  let thinkingIntensity = reducedMotion ? burstIntensity : shownIntensity.current;
  let timerText = formatDuration(elapsedMs_2);
  let timerWidth = bunStringWidth(timerText);
  let totalTokens = rounded;
  let tokenCountText = formatNumber(totalTokens);
  let tokensText = `${figures_default.arrowDown} ${tokenCountText} tokens`;
  let tokensWidth = bunStringWidth(tokensText);
  let thinkingBase = status.kind === "thinking" ? thinkingDurationLabel(status.thinkingMs) : "thinking";
  let thinkingText;
  switch (status.kind) {
    case "tool-running":
      thinkingText = `running tool for ${formatDuration(status.toolMs)}`;
      break;
    case "tool-done":
      thinkingText = `ran tool for ${formatDuration(status.toolMs)}`;
      break;
    case "recovering":
      thinkingText = formatThoughtRecoveryLabel(status.recovery);
      break;
    case "thinking":
      thinkingText = `${thinkingBase}${effortSuffix}`;
      break;
    case "thought-for":
      thinkingText = thoughtDurationText(status.thoughtMs);
      break;
    case "none":
      thinkingText = null;
      break;
  }
  let thinkingWidth = thinkingText ? bunStringWidth(thinkingText) : 0;
  return {
    viewportRef,
    time: elapsedMs,
    elapsedMs: elapsedMs_2,
    frame,
    glimmerIndex,
    flashOpacity,
    stalledIntensity,
    thinkingIntensity,
    statusText: status,
    progressiveThinkingBase: thinkingBase,
    thinkingText,
    thinkingWidth,
    timerText,
    timerWidth,
    totalTokens,
    tokenCount: tokenCountText,
    tokensWidth,
    glimmerMessageWidth: messageWidth,
  };
}
//@ chunk-3mec1atf.js:11576-12033 placement
/**
 * 跟踪 thinking 段落：进入 thinking 时返回 "thinking"，结束后至少显示 2 秒再在 2 秒后清空，返回 thinking 持续毫秒数或 null。
 */
function useThinkingStatusTimer(mode) {
  let [elapsedMs, setElapsedMs] = useState(null);
  let startedAtRef = useRef(null);
  let pendingTimersRef = useRef([]);
  let clock = useClock();
  useEffect(() => {
    if (mode === "thinking") {
      if (startedAtRef.current === null) {
        for (let clearTimer of pendingTimersRef.current) clearTimer();
        pendingTimersRef.current = [];
        startedAtRef.current = Date.now();
        setElapsedMs("thinking");
      }
    } else if (startedAtRef.current !== null) {
      let thinkingDuration = Date.now() - startedAtRef.current;
      let max = Math.max(0, 2000 - thinkingDuration);
      startedAtRef.current = null;
      let settleElapsed = () => {
        setElapsedMs(thinkingDuration);
        pendingTimersRef.current.push(clock.setTimeout(() => setElapsedMs(null), 2000));
      };
      if (max > 0) pendingTimersRef.current.push(clock.setTimeout(settleElapsed, max));
      else settleElapsed();
    }
  }, [mode, clock]);
  useEffect(
    () => () => {
      for (let clearTimer of pendingTimersRef.current) clearTimer();
      pendingTimersRef.current = [];
    },
    [],
  );
  return elapsedMs;
}
//@ chunk-3mec1atf.js:19261-19297 sole-consumer
function selectIsBriefOnly(state) {
  return state.isBriefOnly;
}
//@ chunk-3mec1atf.js:19297-19342 sole-consumer (2.1.88 match: _temp2, 1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-3mec1atf.js:19342-19396 sole-consumer
function selectPrefersReducedMotion(state) {
  return state.settings.prefersReducedMotion;
}
//@ chunk-3mec1atf.js:19396-19412 affinity
var ELLIPSIS = "\u2026";
//@ chunk-3mec1atf.js:19412-20766 callgraph-witnessed (2.1.88 match: SpinnerWithVerb, 0.269)
function SpinnerWithVerb(props) {
  let $ = useMemoCache(24);
  let {
    mode,
    overrideMessage,
    overrideColor,
    overrideShimmerColor,
    isCompacting,
    isResponseHeld,
    compactingHintText,
    compactingStartTime,
    turnEffort,
    turnModel,
    sentEffort,
    retryStatus,
    outputLimitRecovery,
    defaultVerb,
  } = useSpinnerStatus(props.agentId);
  let isBriefOnly = useAppState(selectIsBriefOnly);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId);
  let CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF;
  let buildInput;
  let inputDeps;
  if ($[0] !== defaultVerb || $[1] !== mode || $[2] !== overrideMessage || $[3] !== props.agentId) {
    buildInput = () => ({
      requestId: props.agentId ?? "main",
      props: {
        word: defaultVerb,
        message: overrideMessage,
        suffix: ELLIPSIS,
        mode,
      },
    });
    inputDeps = [props.agentId, defaultVerb, overrideMessage, mode];
    $[0] = defaultVerb;
    $[1] = mode;
    $[2] = overrideMessage;
    $[3] = props.agentId;
    $[4] = buildInput;
    $[5] = inputDeps;
  } else {
    buildInput = $[4];
    inputDeps = $[5];
  }
  let renderInput = actionKeysNamespace.useRenderInput("Spinner", buildInput, inputDeps);
  let isBrief;
  if ($[6] !== isBriefOnly || $[7] !== viewingAgentTaskId) {
    isBrief =
      getUserMsgOptIn() &&
      (CLAUDE_CODE_BRIEF || getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief", false)) &&
      isBriefOnly &&
      !viewingAgentTaskId;
    $[6] = isBriefOnly;
    $[7] = viewingAgentTaskId;
    $[8] = isBrief;
  } else isBrief = $[8];
  let useBriefSpinner = isBrief;
  let renderSpinner;
  if (
    $[9] !== useBriefSpinner ||
    $[10] !== compactingHintText ||
    $[11] !== compactingStartTime ||
    $[12] !== isCompacting ||
    $[13] !== isResponseHeld ||
    $[14] !== mode ||
    $[15] !== outputLimitRecovery ||
    $[16] !== overrideColor ||
    $[17] !== overrideShimmerColor ||
    $[18] !== props ||
    $[19] !== retryStatus ||
    $[20] !== sentEffort ||
    $[21] !== turnEffort ||
    $[22] !== turnModel
  ) {
    renderSpinner = (s_0) =>
      useBriefSpinner
        ? jsxProd_default(BriefSpinner, {
            mode,
            overrideMessage: s_0.props.message,
          })
        : jsxProd_default(SpinnerWithVerbInner, {
            ...props,
            mode,
            overrideMessage: s_0.props.message,
            overrideColor,
            overrideShimmerColor,
            isCompacting,
            isResponseHeld,
            compactingHintText,
            compactingStartTime,
            turnEffort,
            turnModel,
            sentEffort,
            retryStatus,
            outputLimitRecovery,
            defaultVerb: s_0.props.word,
            suffix: s_0.props.suffix ?? ELLIPSIS,
          });
    $[9] = useBriefSpinner;
    $[10] = compactingHintText;
    $[11] = compactingStartTime;
    $[12] = isCompacting;
    $[13] = isResponseHeld;
    $[14] = mode;
    $[15] = outputLimitRecovery;
    $[16] = overrideColor;
    $[17] = overrideShimmerColor;
    $[18] = props;
    $[19] = retryStatus;
    $[20] = sentEffort;
    $[21] = turnEffort;
    $[22] = turnModel;
    $[23] = renderSpinner;
  } else renderSpinner = $[23];
  return actionKeysNamespace.useRenderHook(renderInput, renderSpinner);
}
//@ chunk-3mec1atf.js:20766-23768 fingerprint (2.1.88 match: SpinnerWithVerbInner, 0.639)
function SpinnerWithVerbInner({
  mode,
  loadingStartTimeRef,
  totalPausedMsRef,
  pauseStartTimeRef,
  responseLengthRef,
  overrideColor,
  overrideShimmerColor,
  overrideMessage,
  isCompacting,
  isResponseHeld,
  compactingHintText,
  compactingStartTime,
  spinnerSuffix,
  verbose,
  hasActiveTools = false,
  toolWindowStartedAt = null,
  turnEffort,
  turnModel,
  sentEffort,
  retryStatus,
  outputLimitRecovery,
  defaultVerb,
  suffix,
  agentId,
}) {
  let settings = useSettingsState();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let reducedMotion = isReducedMotion(settings.prefersReducedMotion) || isScreenReaderEnabled;
  let spinnerTip = useAppState((s_0) => s_0.spinnerTip);
  let spinnerTipLabel = useAppState((s_1) => s_1.spinnerTipLabel);
  let briefTranscript = useAppState((s_2) => s_2.briefTranscript);
  let isTasksView = useAppState((s_3) => s_3.expandedView) === "tasks";
  let terminalSize = useTerminalSize();
  let noticeWidth = shouldShowNotice(verbose) ? SPINNER_COLUMN_MIN_WIDTH : 0;
  let max = Math.max(1, terminalSize.columns - noticeWidth);
  let tasksV2 = useTaskListSnapshot();
  let thinkingStartRef = useThinkingStatusTimer(mode);
  let isMainAgent = agentId === undefined || agentId === mainAgentId();
  let activeTask = isMainAgent
    ? tasksV2?.find((task) => task.status !== "pending" && task.status !== "completed")
    : undefined;
  let nextPendingTask = isMainAgent ? findNextPendingTask(tasksV2) : undefined;
  let [defaultVerbText] = useState(() => sampleAlias(getSpinnerVerbs()) ?? "Working");
  let taskLabel = activeTask
    ? [activeTask.activeForm, activeTask.subject]
        .map((candidate) => candidate?.replace(/\s+/g, " ").trim())
        .find(Boolean)
    : undefined;
  let baseMessage =
    overrideMessage ??
    (taskLabel === undefined ? undefined : truncateToRemainingWidth(taskLabel, max)) ??
    (defaultVerb || defaultVerbText);
  let message =
    suffix === ELLIPSIS && TRAILING_ELLIPSIS_RE.test(baseMessage) ? baseMessage : baseMessage + suffix;
  useEffect(() => {
    let operationId = "spinner-" + mode;
    activityManager.startCLIActivity(operationId);
    return () => {
      activityManager.endCLIActivity(operationId);
    };
  }, [mode]);
  let effortValue = useQueuedMessageText();
  let effortSuffix = getEffortSuffix(
    turnModel ?? getMainLoopModel(),
    effortValue,
    turnEffort ?? undefined,
    sentEffort ?? undefined,
  );
  let pauseElapsed =
    pauseStartTimeRef.current !== null
      ? pauseStartTimeRef.current - loadingStartTimeRef.current - totalPausedMsRef.current
      : Date.now() - loadingStartTimeRef.current - totalPausedMsRef.current;
  let defaultColor = "claude";
  let defaultShimmerColor = "claudeShimmer";
  let messageColor = overrideColor ?? defaultColor;
  let shimmerColor = overrideShimmerColor ?? defaultShimmerColor;
  let showToolCallTimer = getFeatureValue_CACHED_MAY_BE_STALE("tengu_shining_fractals", false);
  let forceSpinnerTip = false;
  let tipsEnabled = settings.spinnerTipsEnabled !== false;
  let showClearTip = tipsEnabled && pauseElapsed > 1800000;
  let showBtwTip = tipsEnabled && pauseElapsed > 30000 && !getGlobalConfig().btwUseCount;
  let currentTip = forceSpinnerTip
    ? spinnerTip
    : excludesDefaultTips()
      ? spinnerTip
      : showClearTip && !nextPendingTask
        ? "Use /clear to start fresh when switching topics and free up context"
        : showBtwTip && !nextPendingTask
          ? "Use /btw to ask a quick side question without interrupting Claude's current work"
          : spinnerTip;
  let tipLabel = currentTip === spinnerTip && spinnerTipLabel ? spinnerTipLabel : "Tip";
  let tipText = nextPendingTask
    ? `Next: ${nextPendingTask.subject.replace(/\s+/g, " ").trim()}`
    : spinnerTip === FOCUS_ON_TIP && briefTranscript
      ? FOCUS_OFF_TIP
      : currentTip
        ? `${tipLabel}: ${currentTip}`
        : undefined;
  let statusHint;
  if (retryStatus?.kind === "retrying") {
    let isOverloaded =
      retryStatus.error.status === 529 || retryStatus.error.formatted.toLowerCase().includes("overload");
    let retriesExhausted = retryStatus.attempt >= Math.min(3, retryStatus.maxRetries);
    if (isOverloaded && retriesExhausted) statusHint = getStatusPageHint().trim();
  }
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    width: "100%",
    alignItems: "flex-start",
    paddingLeft: noticeWidth,
    children: [
      jsxProd_default(SpinnerAnimationRow, {
        mode,
        reducedMotion,
        hasActiveTools,
        toolWindowStartedAt,
        responseLengthRef,
        message,
        messageColor,
        shimmerColor,
        overrideColor,
        loadingStartTimeRef,
        totalPausedMsRef,
        pauseStartTimeRef,
        spinnerSuffix,
        verbose,
        columns: max,
        thinkingStatus: thinkingStartRef,
        effortSuffix,
        isCompacting,
        compactingStartTime,
        isResponseHeld,
        showToolCallTimer,
        retryStatus,
        outputLimitRecovery,
        agentId,
      }),
      isMainAgent && isTasksView && tasksV2 && tasksV2.length > 0
        ? jsxProd_default(Box, {
            width: "100%",
            flexDirection: "column",
            children: jsxProd_default(MessageResponse, {
              children: jsxProd_default(TaskListV2, {
                tasks: tasksV2,
              }),
            }),
          })
        : isCompacting && compactingHintText
          ? jsxProd_default(Box, {
              width: "100%",
              flexDirection: "column",
              children: jsxProd_default(MessageResponse, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: compactingHintText,
                }),
              }),
            })
          : retryStatus
            ? statusHint
              ? jsxProd_default(Box, {
                  width: "100%",
                  flexDirection: "column",
                  children: jsxProd_default(MessageResponse, {
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: statusHint,
                    }),
                  }),
                })
              : null
            : tipText
              ? jsxProd_default(Box, {
                  width: "100%",
                  flexDirection: "column",
                  children: jsxProd_default(MessageResponse, {
                    children:
                      !nextPendingTask && currentTip === TEACH_TIP_TEXT
                        ? jsxProd_default_2(Box, {
                            flexDirection: "row",
                            flexWrap: "wrap",
                            children: [
                              jsxProd_default_2(Text, {
                                dimColor: true,
                                children: [tipLabel, ": ", TEACH_TIP_TITLE, " \xB7", " "],
                              }),
                              jsxProd_default(Box, {
                                flexShrink: 0,
                                children: jsxProd_default(SlashCommandLink, {
                                  command: CONFIG,
                                  args: TEACH_TIP_SETTING,
                                  color: "suggestion",
                                }),
                              }),
                            ],
                          })
                        : jsxProd_default(Text, {
                            dimColor: true,
                            wrap: nextPendingTask ? "truncate-end" : "wrap",
                            children: tipText,
                          }),
                  }),
                })
              : null,
    ],
  });
}
//@ chunk-3mec1atf.js:23768-23793 layout
var SPINNER_COLUMN_GAP = 2;
var SPINNER_LABEL_GAP = 3;
var SPINNER_MAX_TEXT = 12;
var SPINNER_MIN_COLUMNS = 1;
//@ chunk-3mec1atf.js:23793-23961 layout
function computeSpinnerLabelBudget(columns, backgroundCount, extra) {
  let backgroundText = backgroundCount > 0 ? `${backgroundCount} in background` : "";
  let labelWidth = columns - SPINNER_COLUMN_GAP - SPINNER_LABEL_GAP;
  let labelBudget = labelWidth - (backgroundText ? 1 + bunStringWidth(backgroundText) : 0);
  if (backgroundText && labelBudget < (extra ? SPINNER_MAX_TEXT : SPINNER_MIN_COLUMNS))
    return {
      labelBudget: labelWidth,
      rightText: "",
    };
  return {
    labelBudget,
    rightText: backgroundText,
  };
}
//@ chunk-3mec1atf.js:23961-25052 fingerprint (2.1.88 match: BriefSpinner, 0.824)
function BriefSpinner({ mode, overrideMessage }) {
  let settingsState = useSettingsState();
  let settings = useIsScreenReaderEnabled();
  let isStaticSpinner = isReducedMotion(settingsState.prefersReducedMotion) || settings;
  let [spinnerVerb] = useState(() => sampleAlias(getSpinnerVerbs()) ?? "Working");
  let remoteConnectionStatus = useAppState((state) => state.remoteConnectionStatus);
  useEffect(() => {
    let activityId = "spinner-" + mode;
    activityManager.startCLIActivity(activityId);
    return () => {
      activityManager.endCLIActivity(activityId);
    };
  }, [mode]);
  let [, frameTick] = useAnimationFrame(isStaticSpinner ? null : 120);
  let runningCount = useAppState(
    (appState) =>
      count(Object.values(appState.tasks), waitForTaskCompletion) + appState.remoteBackgroundTasks.length,
  );
  let isRemoteOffline =
    remoteConnectionStatus === "reconnecting" || remoteConnectionStatus === "disconnected";
  let { columns } = useTerminalSize();
  let { labelBudget, rightText } = computeSpinnerLabelBudget(columns, runningCount, isRemoteOffline);
  let text = truncateToWidth(overrideMessage ?? spinnerVerb, labelBudget);
  let remoteStatusText = truncateToWidth(
    remoteConnectionStatus === "reconnecting" ? "Reconnecting" : "Disconnected",
    labelBudget,
  );
  let displayLabel = isRemoteOffline ? remoteStatusText : text;
  let dotPhase = Math.floor(frameTick / 300) % 3;
  let trailingEllipsis = isStaticSpinner
    ? TRAILING_ELLIPSIS_RE.test(displayLabel)
      ? "   "
      : "\u2026  "
    : ".".repeat(dotPhase + 1).padEnd(3);
  let messageWidth = useMemo(() => bunStringWidth(text), [text]);
  let glimmerIndex =
    isStaticSpinner || isRemoteOffline
      ? -100
      : computeGlimmerIndex(Math.floor(frameTick / BRIDGE_STATUS_MAX_WIDTH), messageWidth);
  let { before, shimmer, after } = computeShimmerSegments(text, glimmerIndex);
  let labelWidth = (isRemoteOffline ? bunStringWidth(remoteStatusText) : messageWidth) + SPINNER_LABEL_GAP;
  let pad = Math.max(1, columns - SPINNER_COLUMN_GAP - labelWidth - bunStringWidth(rightText));
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    width: "100%",
    marginTop: 1,
    paddingLeft: SPINNER_COLUMN_GAP,
    children: [
      isRemoteOffline
        ? jsxProd_default(Text, {
            color: "error",
            children: remoteStatusText + trailingEllipsis,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              before
                ? jsxProd_default(Text, {
                    dimColor: true,
                    children: before,
                  })
                : null,
              shimmer
                ? jsxProd_default(Text, {
                    children: shimmer,
                  })
                : null,
              after
                ? jsxProd_default(Text, {
                    dimColor: true,
                    children: after,
                  })
                : null,
              jsxProd_default(Text, {
                dimColor: true,
                children: trailingEllipsis,
              }),
            ],
          }),
      rightText
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                children: " ".repeat(pad),
              }),
              jsxProd_default(Text, {
                color: "subtle",
                children: rightText,
              }),
            ],
          })
        : null,
    ],
  });
}
//@ chunk-3mec1atf.js:25052-25685 fingerprint (2.1.88 match: BriefIdleStatus, 0.584)
function BriefIdleStatus() {
  let remoteConnectionStatus = useAppState((state) => state.remoteConnectionStatus);
  let connStatus = useAppState(
    (state) => count(Object.values(state.tasks), waitForTaskCompletion) + state.remoteBackgroundTasks.length,
  );
  let { columns } = useTerminalSize();
  let showConnWarning =
    remoteConnectionStatus === "reconnecting" || remoteConnectionStatus === "disconnected";
  let { labelBudget, rightText } = computeSpinnerLabelBudget(columns, connStatus, showConnWarning);
  let statusWidth = remoteConnectionStatus === "reconnecting" ? 1 : 0;
  let statusLabel = truncateToWidth(
    remoteConnectionStatus === "reconnecting" ? "Reconnecting" : "Disconnected",
    labelBudget + SPINNER_LABEL_GAP - statusWidth,
  );
  let labelWidthBudget = !showConnWarning
    ? ""
    : remoteConnectionStatus === "reconnecting" && !statusLabel.endsWith("\u2026")
      ? statusLabel + "\u2026"
      : statusLabel;
  if (!labelWidthBudget && !rightText)
    return jsxProd_default(Box, {
      height: 2,
    });
  let pad = Math.max(
    1,
    columns - SPINNER_COLUMN_GAP - bunStringWidth(labelWidthBudget) - bunStringWidth(rightText),
  );
  return jsxProd_default(Box, {
    marginTop: 1,
    paddingLeft: SPINNER_COLUMN_GAP,
    children: jsxProd_default_2(Text, {
      children: [
        labelWidthBudget
          ? jsxProd_default(Text, {
              color: "error",
              children: labelWidthBudget,
            })
          : null,
        rightText
          ? jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(Text, {
                  children: " ".repeat(pad),
                }),
                jsxProd_default(Text, {
                  color: "subtle",
                  children: rightText,
                }),
              ],
            })
          : null,
      ],
    }),
  });
}
//@ chunk-3mec1atf.js:25685-26284 fingerprint (2.1.88 match: Spinner, 0.535)
function Spinner() {
  let $ = useMemoCache(9);
  let settings = useIsScreenReaderEnabled();
  let reducedMotion = isReducedMotion(useAppStateSlice(selectPrefersReducedMotion)) || settings;
  let [ref, time] = useAnimationFrame(reducedMotion ? null : 120);
  if (reducedMotion) {
    let children;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        color: "text",
        children: "\u25CF",
      });
      $[0] = children;
    } else children = $[0];
    let t1;
    if ($[1] !== ref) {
      t1 = jsxProd_default(Box, {
        ref,
        "aria-hidden": true,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children,
      });
      $[1] = ref;
      $[2] = t1;
    } else t1 = $[2];
    return t1;
  }
  let frames;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    frames = spinnerFramesForTerminal();
    $[3] = frames;
  } else frames = $[3];
  let frameText = frames;
  let frame = Math.floor(time / 120) % frameText.length;
  const children = frameText[frame];
  let children_2;
  if ($[4] !== children) {
    children_2 = jsxProd_default(Text, {
      color: "text",
      children,
    });
    $[4] = children;
    $[5] = children_2;
  } else children_2 = $[5];
  let t2;
  if ($[6] !== ref || $[7] !== children_2) {
    t2 = jsxProd_default(Box, {
      ref,
      "aria-hidden": true,
      flexWrap: "wrap",
      height: 1,
      width: 2,
      children: children_2,
    });
    $[6] = ref;
    $[7] = children_2;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
}
//@ chunk-3mec1atf.js:26284-27537 layout
/**
 * 处理一个流式响应进度事件：start 新建条目（记录 ttft、基线长度），content_block_start/thinking_progress/thinking_signature 更新 thinking token 估算（约 4 字符/token），输出 token 事件写入 outputTokens；返回更新后的估算响应长度。
 */
function applyStreamTokenEvent({ entries, responseLength, event }) {
  if (event.type === "start") {
    entries.push({
      id: event.id,
      ttftMs: event.ttftMs,
      firstTokenTime: Date.now(),
      lastTokenTime: Date.now(),
      responseLengthBaseline: responseLength,
      endResponseLength: responseLength,
    });
    return responseLength;
  }
  let entry =
    event.id != null
      ? entries.find((entry) => entry.id === event.id)
      : entries.findLast((entry) => entry.id == null);
  if (!entry) return responseLength;
  if (event.type === "content_block_start") {
    entry.thinkingTokenEstimate = 0;
    entry.thinkingBlockBaseline = responseLength;
    entry.sawEstimatedTokensThisBlock = false;
    return responseLength;
  }
  if (event.type === "thinking_progress") {
    entry.sawEstimatedTokensThisBlock = true;
    entry.thinkingTokenEstimate = (entry.thinkingTokenEstimate ?? 0) + event.estimatedTokensDelta;
    if (entry.outputTokens == null && event.id == null) {
      let baseline = entry.thinkingBlockBaseline ?? entry.responseLengthBaseline;
      return Math.max(responseLength, baseline + entry.thinkingTokenEstimate * 4);
    }
    return responseLength;
  }
  if (event.type === "thinking_signature") {
    if (event.chars > 0 && entry.outputTokens == null) {
      entry.lastTokenTime = Date.now();
      if (entry.sawEstimatedTokensThisBlock) {
        entry.thinkingTokenEstimate = Math.max(entry.thinkingTokenEstimate ?? 0, Math.ceil(event.chars / 4));
        let baseline = entry.thinkingBlockBaseline ?? entry.responseLengthBaseline;
        let max = Math.max(responseLength, baseline + entry.thinkingTokenEstimate * 4);
        entry.endResponseLength = max;
        return max;
      }
      let baseline = responseLength + event.chars;
      entry.endResponseLength = baseline;
      return baseline;
    }
    return responseLength;
  }
  entry.outputTokens = event.outputTokens;
  entry.lastTokenTime = Date.now();
  if (event.id == null)
    return Math.max(responseLength, entry.responseLengthBaseline + event.outputTokens * 4);
  return responseLength;
}
//@ chunk-3mec1atf.js:27537-27757 fingerprint (2.1.88 match: findNextPendingTask, 1)
function findNextPendingTask(tasks) {
  if (!tasks) return;
  let pendingTasks = tasks.filter((t) => t.status === "pending");
  if (pendingTasks.length === 0) return;
  let unresolvedIds = new Set(tasks.filter((t) => t.status !== "completed").map((t) => t.id));
  return pendingTasks.find((t) => !t.blockedBy.some((id) => unresolvedIds.has(id))) ?? pendingTasks[0];
}
export { Spinner, SpinnerTimer316, SpinnerWithVerb, BriefIdleStatus, applyStreamTokenEvent };
