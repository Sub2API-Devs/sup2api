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
import { R, Q, y, P } from "../../vendor/react/cjs/react.production.js";
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
import { w } from "../../vendor/react/compiler-runtime.js";
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
function frameIndexFor(l) {
  let t = cosineEase(l, SPINNER_FRAME_MS);
  return Math.round(t * (getDefaultCharacters().length - 1));
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
function shimmerLevel(l) {
  return roundToStep((Math.sin((l / 1000) * Math.PI) + 1) / 2);
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
  let [O, time] = useAnimationFrame(
    reducedMotion ? null : mode === "requesting" && !glimmerParked ? 50 : 100,
  );
  let now = Date.now();
  let D =
    isCompacting && compactingStartTime !== null
      ? Math.max(0, now - compactingStartTime)
      : pauseStartTime !== null
        ? pauseStartTime - loadingStartTime - totalPausedMs
        : now - loadingStartTime - totalPausedMs;
  let toolWindowTimingStateRef = R(createToolWindowTimingState());
  let d = {
    now,
    isThinking: mode === "thinking",
    hasActiveTools,
    toolWindowStartedAt:
      toolWindowStartedAt !== null && toolWindowStartedAt >= loadingStartTime ? toolWindowStartedAt : null,
    thinkingStatus,
    showToolCallTimer,
    outputLimitRecovery,
  };
  toolWindowTimingStateRef.current = advanceToolWindowTiming(toolWindowTimingStateRef.current, d);
  let x = toolWindowPhase(toolWindowTimingStateRef.current, d);
  let tt = thinkingBurstIntensity(toolWindowTimingStateRef.current, d);
  let currentResponseLength = responseLength;
  let hasActiveTools_2 =
    hasActiveTools ||
    mode === "thinking" ||
    (isCompacting && mode !== "responding") ||
    isResponseHeld ||
    pauseStartTime !== null;
  let { isStalled, stalledIntensity, timeSinceLastToken } = useStalledAnimation(
    time,
    currentResponseLength,
    hasActiveTools_2,
    reducedMotion,
    agentId,
  );
  let V = R(new Set());
  let timeSinceLastTokenRef = R(0);
  let agentIdRef = R(agentId);
  if (agentIdRef.current !== agentId) {
    agentIdRef.current = agentId;
    V.current = new Set();
    timeSinceLastTokenRef.current = 0;
  }
  if (timeSinceLastToken === 0) {
    if (V.current.size > 0) {
      logEvent("tengu_spinner_stall_cleared", {
        max_stall_ms: Math.round(timeSinceLastTokenRef.current),
        mode: fromEnum(mode),
        override_color: overrideColor != null,
        response_length: currentResponseLength,
        thresholds_fired: V.current.size,
      });
      V.current = new Set();
      timeSinceLastTokenRef.current = 0;
    }
  } else {
    if (timeSinceLastToken > timeSinceLastTokenRef.current)
      timeSinceLastTokenRef.current = timeSinceLastToken;
    for (let I of THINKING_ESCALATION_MS)
      if (timeSinceLastToken >= I && !V.current.has(I)) {
        V.current.add(I);
        logEvent("tengu_spinner_stalled_ui", {
          threshold_ms: I,
          mode: fromEnum(mode),
          override_color: overrideColor != null,
          time_since_last_token_ms: Math.round(timeSinceLastToken),
          response_length: currentResponseLength,
          render_loop_dark: timeSinceLastToken - I > 5000,
        });
      }
  }
  let frame = reducedMotion ? 0 : frameIndexFor(time);
  let Tt = mode === "requesting" ? 50 : SPINNER_TICK_MS;
  let it = Q(() => bunStringWidth(message), [message]);
  let Mt = it + 2 * SPINNER_FRAME_COUNT;
  let floored = Math.floor(time / Tt);
  let glimmerIndex = reducedMotion
    ? -100
    : isStalled
      ? -100
      : mode === "requesting"
        ? (floored % Mt) - SPINNER_FRAME_COUNT
        : it + SPINNER_FRAME_COUNT - (floored % Mt);
  let flashOpacity = reducedMotion ? 0 : mode === "tool-use" ? shimmerLevel(time) : 0;
  let st = R(currentResponseLength);
  let z = R(time);
  let agentIdRef_2 = R(agentId);
  if (
    agentIdRef_2.current !== agentId ||
    Math.abs(currentResponseLength - st.current) > SPINNER_MIN_VISIBLE_MS
  ) {
    agentIdRef_2.current = agentId;
    st.current = currentResponseLength;
    z.current = time;
  }
  if (reducedMotion) {
    st.current = currentResponseLength;
    z.current = time;
  } else {
    let floored = Math.floor((time - z.current) / 50);
    if (floored > 0) {
      z.current += floored * 50;
      for (let idx = 0; idx < floored; idx++) {
        let yt = currentResponseLength - st.current;
        if (yt === 0) break;
        let Dt = Math.abs(yt);
        let vt;
        if (Dt < 70) vt = 3;
        else if (Dt < 200) vt = Math.max(8, Math.ceil(Dt * 0.15));
        else vt = 50;
        st.current =
          yt > 0
            ? Math.min(st.current + vt, currentResponseLength)
            : Math.max(st.current - vt, currentResponseLength);
      }
    }
  }
  let ct = st.current;
  let rounded = Math.round(ct / 4);
  let Y = R(0);
  let dt = R(time);
  if (mode !== "thinking" || hasActiveTools) {
    Y.current = 0;
    dt.current = time;
  } else if (!reducedMotion && (tt > 0 || Y.current > 0)) {
    let I = time - dt.current;
    if (I >= 50) {
      let floored = Math.floor(I / 50);
      let yt = Y.current;
      for (let idx = 0; idx < floored; idx++) {
        let vt = tt - yt;
        if (Math.abs(vt) < 0.01) {
          yt = tt;
          break;
        }
        yt += vt * 0.1;
      }
      Y.current = yt;
      dt.current = time;
    }
  } else {
    Y.current = tt;
    dt.current = time;
  }
  let thinkingIntensity = reducedMotion ? tt : Y.current;
  let gt = formatDuration(D);
  let timerWidth = bunStringWidth(gt);
  let Ct = rounded;
  let Pt = formatNumber(Ct);
  let Wt = `${figures_default.arrowDown} ${Pt} tokens`;
  let tokensWidth = bunStringWidth(Wt);
  let Bt = x.kind === "thinking" ? thinkingDurationLabel(x.thinkingMs) : "thinking";
  let lt;
  switch (x.kind) {
    case "tool-running":
      lt = `running tool for ${formatDuration(x.toolMs)}`;
      break;
    case "tool-done":
      lt = `ran tool for ${formatDuration(x.toolMs)}`;
      break;
    case "recovering":
      lt = formatThoughtRecoveryLabel(x.recovery);
      break;
    case "thinking":
      lt = `${Bt}${effortSuffix}`;
      break;
    case "thought-for":
      lt = thoughtDurationText(x.thoughtMs);
      break;
    case "none":
      lt = null;
      break;
  }
  let thinkingWidth = lt ? bunStringWidth(lt) : 0;
  return {
    viewportRef: O,
    time,
    elapsedMs: D,
    frame,
    glimmerIndex,
    flashOpacity,
    stalledIntensity,
    thinkingIntensity,
    statusText: x,
    progressiveThinkingBase: Bt,
    thinkingText: lt,
    thinkingWidth,
    timerText: gt,
    timerWidth,
    totalTokens: Ct,
    tokenCount: Pt,
    tokensWidth,
    glimmerMessageWidth: it,
  };
}
//@ chunk-3mec1atf.js:11576-12033 placement
/**
 * 跟踪 thinking 段落：进入 thinking 时返回 "thinking"，结束后至少显示 2 秒再在 2 秒后清空，返回 thinking 持续毫秒数或 null。
 */
function useThinkingStatusTimer(mode) {
  let [t, u] = y(null);
  let o = R(null);
  let m = R([]);
  let clock = useClock();
  P(() => {
    if (mode === "thinking") {
      if (o.current === null) {
        for (let T of m.current) T();
        m.current = [];
        o.current = Date.now();
        u("thinking");
      }
    } else if (o.current !== null) {
      let T = Date.now() - o.current;
      let max = Math.max(0, 2000 - T);
      o.current = null;
      let C = () => {
        u(T);
        m.current.push(clock.setTimeout(() => u(null), 2000));
      };
      if (max > 0) m.current.push(clock.setTimeout(C, max));
      else C();
    }
  }, [mode, clock]);
  P(
    () => () => {
      for (let T of m.current) T();
      m.current = [];
    },
    [],
  );
  return t;
}
//@ chunk-3mec1atf.js:19261-19297 sole-consumer
function selectIsBriefOnly(x) {
  return x.isBriefOnly;
}
//@ chunk-3mec1atf.js:19297-19342 sole-consumer = _temp2 (1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-3mec1atf.js:19342-19396 sole-consumer
function selectPrefersReducedMotion(N) {
  return N.settings.prefersReducedMotion;
}
//@ chunk-3mec1atf.js:19396-19412 affinity
var ELLIPSIS = "\u2026";
//@ chunk-3mec1atf.js:19412-20766 callgraph-witnessed = SpinnerWithVerb (0.269)
function SpinnerWithVerb(props) {
  let $ = w(24);
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
  let O;
  let g;
  if ($[0] !== defaultVerb || $[1] !== mode || $[2] !== overrideMessage || $[3] !== props.agentId) {
    O = () => ({
      requestId: props.agentId ?? "main",
      props: {
        word: defaultVerb,
        message: overrideMessage,
        suffix: ELLIPSIS,
        mode,
      },
    });
    g = [props.agentId, defaultVerb, overrideMessage, mode];
    $[0] = defaultVerb;
    $[1] = mode;
    $[2] = overrideMessage;
    $[3] = props.agentId;
    $[4] = O;
    $[5] = g;
  } else {
    O = $[4];
    g = $[5];
  }
  let J = actionKeysNamespace.useRenderInput("Spinner", O, g);
  let at;
  if ($[6] !== isBriefOnly || $[7] !== viewingAgentTaskId) {
    at =
      getUserMsgOptIn() &&
      (CLAUDE_CODE_BRIEF || getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief", false)) &&
      isBriefOnly &&
      !viewingAgentTaskId;
    $[6] = isBriefOnly;
    $[7] = viewingAgentTaskId;
    $[8] = at;
  } else at = $[8];
  let D = at;
  let p;
  if (
    $[9] !== D ||
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
    p = (s_0) =>
      D
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
    $[9] = D;
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
    $[23] = p;
  } else p = $[23];
  return actionKeysNamespace.useRenderHook(J, p);
}
//@ chunk-3mec1atf.js:20766-23768 fingerprint = SpinnerWithVerbInner (0.639)
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
  let ht = useAppState((s_3) => s_3.expandedView) === "tasks";
  let terminalSize = useTerminalSize();
  let rt = shouldShowNotice(verbose) ? SPINNER_COLUMN_MIN_WIDTH : 0;
  let max = Math.max(1, terminalSize.columns - rt);
  let tasksV2 = useTaskListSnapshot();
  let thinkingStartRef = useThinkingStatusTimer(mode);
  let mt = agentId === undefined || agentId === mainAgentId();
  let Tt = mt ? tasksV2?.find((task) => task.status !== "pending" && task.status !== "completed") : undefined;
  let it = mt ? findNextPendingTask(tasksV2) : undefined;
  let [Mt] = y(() => sampleAlias(getSpinnerVerbs()) ?? "Working");
  let _t = Tt
    ? [Tt.activeForm, Tt.subject].map((I) => I?.replace(/\s+/g, " ").trim()).find(Boolean)
    : undefined;
  let At =
    overrideMessage ??
    (_t === undefined ? undefined : truncateToRemainingWidth(_t, max)) ??
    (defaultVerb || Mt);
  let message = suffix === ELLIPSIS && TRAILING_ELLIPSIS_RE.test(At) ? At : At + suffix;
  P(() => {
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
  let ct =
    pauseStartTimeRef.current !== null
      ? pauseStartTimeRef.current - loadingStartTimeRef.current - totalPausedMsRef.current
      : Date.now() - loadingStartTimeRef.current - totalPausedMsRef.current;
  let defaultColor = "claude";
  let defaultShimmerColor = "claudeShimmer";
  let messageColor = overrideColor ?? defaultColor;
  let shimmerColor = overrideShimmerColor ?? defaultShimmerColor;
  let showToolCallTimer = getFeatureValue_CACHED_MAY_BE_STALE("tengu_shining_fractals", false);
  let Et = false;
  let tipsEnabled = settings.spinnerTipsEnabled !== false;
  let showClearTip = tipsEnabled && ct > 1800000;
  let showBtwTip = tipsEnabled && ct > 30000 && !getGlobalConfig().btwUseCount;
  let It = Et
    ? spinnerTip
    : excludesDefaultTips()
      ? spinnerTip
      : showClearTip && !it
        ? "Use /clear to start fresh when switching topics and free up context"
        : showBtwTip && !it
          ? "Use /btw to ask a quick side question without interrupting Claude's current work"
          : spinnerTip;
  let Bt = It === spinnerTip && spinnerTipLabel ? spinnerTipLabel : "Tip";
  let lt = it
    ? `Next: ${it.subject.replace(/\s+/g, " ").trim()}`
    : spinnerTip === FOCUS_ON_TIP && briefTranscript
      ? FOCUS_OFF_TIP
      : It
        ? `${Bt}: ${It}`
        : undefined;
  let Ot;
  if (retryStatus?.kind === "retrying") {
    let I =
      retryStatus.error.status === 529 || retryStatus.error.formatted.toLowerCase().includes("overload");
    let xt = retryStatus.attempt >= Math.min(3, retryStatus.maxRetries);
    if (I && xt) Ot = getStatusPageHint().trim();
  }
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    width: "100%",
    alignItems: "flex-start",
    paddingLeft: rt,
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
      mt && ht && tasksV2 && tasksV2.length > 0
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
            ? Ot
              ? jsxProd_default(Box, {
                  width: "100%",
                  flexDirection: "column",
                  children: jsxProd_default(MessageResponse, {
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: Ot,
                    }),
                  }),
                })
              : null
            : lt
              ? jsxProd_default(Box, {
                  width: "100%",
                  flexDirection: "column",
                  children: jsxProd_default(MessageResponse, {
                    children:
                      !it && It === TEACH_TIP_TEXT
                        ? jsxProd_default_2(Box, {
                            flexDirection: "row",
                            flexWrap: "wrap",
                            children: [
                              jsxProd_default_2(Text, {
                                dimColor: true,
                                children: [Bt, ": ", TEACH_TIP_TITLE, " \xB7", " "],
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
                            wrap: it ? "truncate-end" : "wrap",
                            children: lt,
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
function computeSpinnerLabelBudget(columns, t, u) {
  let o = t > 0 ? `${t} in background` : "";
  let m = columns - SPINNER_COLUMN_GAP - SPINNER_LABEL_GAP;
  let h = m - (o ? 1 + bunStringWidth(o) : 0);
  if (o && h < (u ? SPINNER_MAX_TEXT : SPINNER_MIN_COLUMNS))
    return {
      labelBudget: m,
      rightText: "",
    };
  return {
    labelBudget: h,
    rightText: o,
  };
}
//@ chunk-3mec1atf.js:23961-25052 fingerprint = BriefSpinner (0.824)
function BriefSpinner({ mode, overrideMessage }) {
  let settingsState = useSettingsState();
  let settings = useIsScreenReaderEnabled();
  let m = isReducedMotion(settingsState.prefersReducedMotion) || settings;
  let [h] = y(() => sampleAlias(getSpinnerVerbs()) ?? "Working");
  let remoteConnectionStatus = useAppState((d) => d.remoteConnectionStatus);
  P(() => {
    let d = "spinner-" + mode;
    activityManager.startCLIActivity(d);
    return () => {
      activityManager.endCLIActivity(d);
    };
  }, [mode]);
  let [, _] = useAnimationFrame(m ? null : 120);
  let runningCount = useAppState(
    (d) => count(Object.values(d.tasks), waitForTaskCompletion) + d.remoteBackgroundTasks.length,
  );
  let M = remoteConnectionStatus === "reconnecting" || remoteConnectionStatus === "disconnected";
  let { columns } = useTerminalSize();
  let { labelBudget, rightText } = computeSpinnerLabelBudget(columns, runningCount, M);
  let text = truncateToWidth(overrideMessage ?? h, labelBudget);
  let W = truncateToWidth(
    remoteConnectionStatus === "reconnecting" ? "Reconnecting" : "Disconnected",
    labelBudget,
  );
  let U = M ? W : text;
  let B = Math.floor(_ / 300) % 3;
  let k = m ? (TRAILING_ELLIPSIS_RE.test(U) ? "   " : "\u2026  ") : ".".repeat(B + 1).padEnd(3);
  let messageWidth = Q(() => bunStringWidth(text), [text]);
  let glimmerIndex =
    m || M ? -100 : computeGlimmerIndex(Math.floor(_ / BRIDGE_STATUS_MAX_WIDTH), messageWidth);
  let { before, shimmer, after } = computeShimmerSegments(text, glimmerIndex);
  let D = (M ? bunStringWidth(W) : messageWidth) + SPINNER_LABEL_GAP;
  let pad = Math.max(1, columns - SPINNER_COLUMN_GAP - D - bunStringWidth(rightText));
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    width: "100%",
    marginTop: 1,
    paddingLeft: SPINNER_COLUMN_GAP,
    children: [
      M
        ? jsxProd_default(Text, {
            color: "error",
            children: W + k,
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
                children: k,
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
//@ chunk-3mec1atf.js:25052-25685 fingerprint = BriefIdleStatus (0.584)
function BriefIdleStatus() {
  let remoteConnectionStatus = useAppState((E) => E.remoteConnectionStatus);
  let connStatus = useAppState(
    (E) => count(Object.values(E.tasks), waitForTaskCompletion) + E.remoteBackgroundTasks.length,
  );
  let { columns } = useTerminalSize();
  let showConnWarning =
    remoteConnectionStatus === "reconnecting" || remoteConnectionStatus === "disconnected";
  let { labelBudget, rightText } = computeSpinnerLabelBudget(columns, connStatus, showConnWarning);
  let T = remoteConnectionStatus === "reconnecting" ? 1 : 0;
  let _ = truncateToWidth(
    remoteConnectionStatus === "reconnecting" ? "Reconnecting" : "Disconnected",
    labelBudget + SPINNER_LABEL_GAP - T,
  );
  let C = !showConnWarning
    ? ""
    : remoteConnectionStatus === "reconnecting" && !_.endsWith("\u2026")
      ? _ + "\u2026"
      : _;
  if (!C && !rightText)
    return jsxProd_default(Box, {
      height: 2,
    });
  let pad = Math.max(1, columns - SPINNER_COLUMN_GAP - bunStringWidth(C) - bunStringWidth(rightText));
  return jsxProd_default(Box, {
    marginTop: 1,
    paddingLeft: SPINNER_COLUMN_GAP,
    children: jsxProd_default_2(Text, {
      children: [
        C
          ? jsxProd_default(Text, {
              color: "error",
              children: C,
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
//@ chunk-3mec1atf.js:25685-26284 fingerprint = Spinner (0.535)
function Spinner() {
  let $ = w(9);
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
  let h;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    h = spinnerFramesForTerminal();
    $[3] = h;
  } else h = $[3];
  let _ = h;
  let frame = Math.floor(time / 120) % _.length;
  const children = _[frame];
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
      let m = entry.thinkingBlockBaseline ?? entry.responseLengthBaseline;
      return Math.max(responseLength, m + entry.thinkingTokenEstimate * 4);
    }
    return responseLength;
  }
  if (event.type === "thinking_signature") {
    if (event.chars > 0 && entry.outputTokens == null) {
      entry.lastTokenTime = Date.now();
      if (entry.sawEstimatedTokensThisBlock) {
        entry.thinkingTokenEstimate = Math.max(entry.thinkingTokenEstimate ?? 0, Math.ceil(event.chars / 4));
        let h = entry.thinkingBlockBaseline ?? entry.responseLengthBaseline;
        let max = Math.max(responseLength, h + entry.thinkingTokenEstimate * 4);
        entry.endResponseLength = max;
        return max;
      }
      let m = responseLength + event.chars;
      entry.endResponseLength = m;
      return m;
    }
    return responseLength;
  }
  entry.outputTokens = event.outputTokens;
  entry.lastTokenTime = Date.now();
  if (event.id == null)
    return Math.max(responseLength, entry.responseLengthBaseline + event.outputTokens * 4);
  return responseLength;
}
//@ chunk-3mec1atf.js:27537-27757 fingerprint = findNextPendingTask (1)
function findNextPendingTask(tasks) {
  if (!tasks) return;
  let pendingTasks = tasks.filter((t) => t.status === "pending");
  if (pendingTasks.length === 0) return;
  let unresolvedIds = new Set(tasks.filter((t) => t.status !== "completed").map((t) => t.id));
  return pendingTasks.find((t) => !t.blockedBy.some((id) => unresolvedIds.has(id))) ?? pendingTasks[0];
}
export { Spinner, SpinnerTimer316, SpinnerWithVerb, BriefIdleStatus, applyStreamTokenEvent };
