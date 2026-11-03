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
import { qWe, getDefaultCharacters, roundToStep, VWe } from "./Spinner/utils.js";
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
import { formatDuration, formatNumber, ISr, truncateToWidth } from "../utils/format.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { useClock } from "../ink/components/ClockContext.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { A0t, wz } from "./Spinner/spinnerStatus.js";
import { useAppState, rs } from "../state/AppState.js";
import { env } from "../utils/env.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";
import { getUserMsgOptIn, mainAgentId } from "../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { qd } from "../hooks/useSettings.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { isReducedMotion } from "./Spinner/spinnerFlags.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { shouldShowNotice, SlashCommandLink } from "./SlashCommandLink.js";
import { lTe } from "./Spinner/SpinnerColumn.js";
import { gye } from "../hooks/useTasksV2.js";
import { getSpinnerVerbs } from "../constants/spinnerVerbs.js";
import { Eft } from "../utils/stringUtils.js";
import { activityManager } from "../utils/activityManager.js";
import { dg } from "../context/QueuedMessageContext.js";
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
var Wn = [1e4, 45000, 300000],
  Dn = 2000,
  Gn = 2000,
  Hn = 200,
  me = 10,
  $n = 1e4,
  jn = 20000,
  Vn = 30000,
  Kn = 45000;
//@ chunk-3mec1atf.js:8037-8106 placement
function Un(l) {
  let t = qWe(l, Gn);
  return Math.round(t * (getDefaultCharacters().length - 1));
}
//@ chunk-3mec1atf.js:8106-8176 placement
function Fn(l) {
  return `thought for ${Math.max(1, Math.round(l / 1000))}s`;
}
//@ chunk-3mec1atf.js:8176-8295 placement
function formatThoughtRecoveryLabel({ attempt: attempt, limit: limit }) {
  return attempt > 1 ? `picking the thought back up (${attempt} of ${limit})` : "picking the thought back up";
}
//@ chunk-3mec1atf.js:8295-8459 placement
function thinkingDurationLabel(l) {
  if (l >= Kn) return "deep in thought";
  if (l >= Vn) return "thinking some more";
  if (l >= jn) return "thinking more";
  if (l >= $n) return "still thinking";
  return "thinking";
}
//@ chunk-3mec1atf.js:8459-8516 placement
function Xn(l) {
  return roundToStep((Math.sin((l / 1000) * Math.PI) + 1) / 2);
}
//@ chunk-3mec1atf.js:8516-11576 placement
function SpinnerTimer316({
  mode: mode,
  reducedMotion: reducedMotion,
  hasActiveTools: hasActiveTools,
  toolWindowStartedAt: toolWindowStartedAt,
  responseLength: responseLength,
  message: message,
  overrideColor: overrideColor,
  loadingStartTime: loadingStartTime,
  totalPausedMs: totalPausedMs,
  pauseStartTime: pauseStartTime,
  thinkingStatus: thinkingStatus,
  effortSuffix: effortSuffix,
  isCompacting: isCompacting,
  compactingStartTime: compactingStartTime,
  isResponseHeld: isResponseHeld = !1,
  showToolCallTimer: showToolCallTimer,
  outputLimitRecovery: outputLimitRecovery = null,
  agentId: agentId,
  glimmerParked: glimmerParked = !1,
}) {
  let [O, g] = useAnimationFrame(reducedMotion ? null : mode === "requesting" && !glimmerParked ? 50 : 100),
    now = Date.now(),
    D =
      isCompacting && compactingStartTime !== null
        ? Math.max(0, now - compactingStartTime)
        : pauseStartTime !== null
          ? pauseStartTime - loadingStartTime - totalPausedMs
          : now - loadingStartTime - totalPausedMs,
    p = R(createToolWindowTimingState()),
    d = {
      now: now,
      isThinking: mode === "thinking",
      hasActiveTools: hasActiveTools,
      toolWindowStartedAt:
        toolWindowStartedAt !== null && toolWindowStartedAt >= loadingStartTime ? toolWindowStartedAt : null,
      thinkingStatus: thinkingStatus,
      showToolCallTimer: showToolCallTimer,
      outputLimitRecovery: outputLimitRecovery,
    };
  p.current = advanceToolWindowTiming(p.current, d);
  let x = toolWindowPhase(p.current, d),
    tt = thinkingBurstIntensity(p.current, d),
    A = responseLength,
    Rt =
      hasActiveTools ||
      mode === "thinking" ||
      (isCompacting && mode !== "responding") ||
      isResponseHeld ||
      pauseStartTime !== null,
    {
      isStalled: isStalled,
      stalledIntensity: stalledIntensity,
      timeSinceLastToken: timeSinceLastToken,
    } = useStalledAnimation(g, A, Rt, reducedMotion, agentId),
    V = R(new Set()),
    X = R(0),
    K = R(agentId);
  if (K.current !== agentId) ((K.current = agentId), (V.current = new Set()), (X.current = 0));
  if (timeSinceLastToken === 0) {
    if (V.current.size > 0)
      (logEvent("tengu_spinner_stall_cleared", {
        max_stall_ms: Math.round(X.current),
        mode: fromEnum(mode),
        override_color: overrideColor != null,
        response_length: A,
        thresholds_fired: V.current.size,
      }),
        (V.current = new Set()),
        (X.current = 0));
  } else {
    if (timeSinceLastToken > X.current) X.current = timeSinceLastToken;
    for (let I of Wn)
      if (timeSinceLastToken >= I && !V.current.has(I))
        (V.current.add(I),
          logEvent("tengu_spinner_stalled_ui", {
            threshold_ms: I,
            mode: fromEnum(mode),
            override_color: overrideColor != null,
            time_since_last_token_ms: Math.round(timeSinceLastToken),
            response_length: A,
            render_loop_dark: timeSinceLastToken - I > 5000,
          }));
  }
  let mt = reducedMotion ? 0 : Un(g),
    Tt = mode === "requesting" ? 50 : Hn,
    it = Q(() => bunStringWidth(message), [message]),
    Mt = it + 2 * me,
    floored = Math.floor(g / Tt),
    At = reducedMotion
      ? -100
      : isStalled
        ? -100
        : mode === "requesting"
          ? (floored % Mt) - me
          : it + me - (floored % Mt),
    Lt = reducedMotion ? 0 : mode === "tool-use" ? Xn(g) : 0,
    st = R(A),
    z = R(g),
    kt = R(agentId);
  if (kt.current !== agentId || Math.abs(A - st.current) > Dn)
    ((kt.current = agentId), (st.current = A), (z.current = g));
  if (reducedMotion) ((st.current = A), (z.current = g));
  else {
    let floored = Math.floor((g - z.current) / 50);
    if (floored > 0) {
      z.current += floored * 50;
      for (let xt = 0; xt < floored; xt++) {
        let yt = A - st.current;
        if (yt === 0) break;
        let abs = Math.abs(yt),
          vt;
        if (abs < 70) vt = 3;
        else if (abs < 200) vt = Math.max(8, Math.ceil(abs * 0.15));
        else vt = 50;
        st.current = yt > 0 ? Math.min(st.current + vt, A) : Math.max(st.current - vt, A);
      }
    }
  }
  let ct = st.current,
    rounded = Math.round(ct / 4),
    Y = R(0),
    dt = R(g);
  if (mode !== "thinking" || hasActiveTools) ((Y.current = 0), (dt.current = g));
  else if (!reducedMotion && (tt > 0 || Y.current > 0)) {
    let I = g - dt.current;
    if (I >= 50) {
      let floored = Math.floor(I / 50),
        yt = Y.current;
      for (let Dt = 0; Dt < floored; Dt++) {
        let vt = tt - yt;
        if (Math.abs(vt) < 0.01) {
          yt = tt;
          break;
        }
        yt += vt * 0.1;
      }
      ((Y.current = yt), (dt.current = g));
    }
  } else ((Y.current = tt), (dt.current = g));
  let St = reducedMotion ? tt : Y.current,
    gt = formatDuration(D),
    Et = bunStringWidth(gt),
    Ct = rounded,
    Pt = formatNumber(Ct),
    Wt = `${re.arrowDown} ${Pt} tokens`,
    It = bunStringWidth(Wt),
    Bt = x.kind === "thinking" ? thinkingDurationLabel(x.thinkingMs) : "thinking",
    lt;
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
      lt = Fn(x.thoughtMs);
      break;
    case "none":
      lt = null;
      break;
  }
  let Ot = lt ? bunStringWidth(lt) : 0;
  return {
    viewportRef: O,
    time: g,
    elapsedMs: D,
    frame: mt,
    glimmerIndex: At,
    flashOpacity: Lt,
    stalledIntensity: stalledIntensity,
    thinkingIntensity: St,
    statusText: x,
    progressiveThinkingBase: Bt,
    thinkingText: lt,
    thinkingWidth: Ot,
    timerText: gt,
    timerWidth: Et,
    totalTokens: Ct,
    tokenCount: Pt,
    tokensWidth: It,
    glimmerMessageWidth: it,
  };
}
/**
 * 跟踪 thinking 段落：进入 thinking 时返回 "thinking"，结束后至少显示 2 秒再在 2 秒后清空，返回 thinking 持续毫秒数或 null。
 */
//@ chunk-3mec1atf.js:11576-12033 placement
function useThinkingStatusTimer(l) {
  let [t, u] = y(null),
    o = R(null),
    m = R([]),
    h = useClock();
  return (
    P(() => {
      if (l === "thinking") {
        if (o.current === null) {
          for (let T of m.current) T();
          ((m.current = []), (o.current = Date.now()), u("thinking"));
        }
      } else if (o.current !== null) {
        let T = Date.now() - o.current,
          max = Math.max(0, 2000 - T);
        o.current = null;
        let C = () => {
          (u(T), m.current.push(h.setTimeout(() => u(null), 2000)));
        };
        if (max > 0) m.current.push(h.setTimeout(C, max));
        else C();
      }
    }, [l, h]),
    P(
      () => () => {
        for (let T of m.current) T();
        m.current = [];
      },
      [],
    ),
    t
  );
}
//@ chunk-3mec1atf.js:19261-19297 sole-consumer
function er(x) {
  return x.isBriefOnly;
}
//@ chunk-3mec1atf.js:19297-19342 sole-consumer = _temp2 (1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-3mec1atf.js:19342-19396 sole-consumer
function or(N) {
  return N.settings.prefersReducedMotion;
}
//@ chunk-3mec1atf.js:19396-19412 affinity
var Vt = "\u2026";
//@ chunk-3mec1atf.js:19412-20766 callgraph-witnessed = SpinnerWithVerb (0.269)
function SpinnerWithVerb(props) {
  let $ = w(24),
    {
      mode: mode,
      overrideMessage: overrideMessage,
      overrideColor: overrideColor,
      overrideShimmerColor: overrideShimmerColor,
      isCompacting: isCompacting,
      isResponseHeld: isResponseHeld,
      compactingHintText: compactingHintText,
      compactingStartTime: compactingStartTime,
      turnEffort: turnEffort,
      turnModel: turnModel,
      sentEffort: sentEffort,
      retryStatus: retryStatus,
      outputLimitRecovery: outputLimitRecovery,
      defaultVerb: defaultVerb,
    } = A0t(props.agentId),
    isBriefOnly = useAppState(er),
    viewingAgentTaskId = useAppState(selectViewingAgentTaskId),
    CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF,
    O,
    g;
  if ($[0] !== defaultVerb || $[1] !== mode || $[2] !== overrideMessage || $[3] !== props.agentId)
    ((O = () => ({
      requestId: props.agentId ?? "main",
      props: { word: defaultVerb, message: overrideMessage, suffix: Vt, mode: mode },
    })),
      (g = [props.agentId, defaultVerb, overrideMessage, mode]),
      ($[0] = defaultVerb),
      ($[1] = mode),
      ($[2] = overrideMessage),
      ($[3] = props.agentId),
      ($[4] = O),
      ($[5] = g));
  else ((O = $[4]), (g = $[5]));
  let useRenderInput = actionKeysNamespace.useRenderInput("Spinner", O, g),
    at;
  if ($[6] !== isBriefOnly || $[7] !== viewingAgentTaskId)
    ((at =
      getUserMsgOptIn() &&
      (CLAUDE_CODE_BRIEF || getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief", !1)) &&
      isBriefOnly &&
      !viewingAgentTaskId),
      ($[6] = isBriefOnly),
      ($[7] = viewingAgentTaskId),
      ($[8] = at));
  else at = $[8];
  let D = at,
    p;
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
  )
    ((p = (s_0) =>
      D
        ? e(BriefSpinner, { mode: mode, overrideMessage: s_0.props.message })
        : e(SpinnerWithVerbInner, {
            ...props,
            mode: mode,
            overrideMessage: s_0.props.message,
            overrideColor: overrideColor,
            overrideShimmerColor: overrideShimmerColor,
            isCompacting: isCompacting,
            isResponseHeld: isResponseHeld,
            compactingHintText: compactingHintText,
            compactingStartTime: compactingStartTime,
            turnEffort: turnEffort,
            turnModel: turnModel,
            sentEffort: sentEffort,
            retryStatus: retryStatus,
            outputLimitRecovery: outputLimitRecovery,
            defaultVerb: s_0.props.word,
            suffix: s_0.props.suffix ?? Vt,
          })),
      ($[9] = D),
      ($[10] = compactingHintText),
      ($[11] = compactingStartTime),
      ($[12] = isCompacting),
      ($[13] = isResponseHeld),
      ($[14] = mode),
      ($[15] = outputLimitRecovery),
      ($[16] = overrideColor),
      ($[17] = overrideShimmerColor),
      ($[18] = props),
      ($[19] = retryStatus),
      ($[20] = sentEffort),
      ($[21] = turnEffort),
      ($[22] = turnModel),
      ($[23] = p));
  else p = $[23];
  return actionKeysNamespace.useRenderHook(useRenderInput, p);
}
//@ chunk-3mec1atf.js:20766-23768 fingerprint = SpinnerWithVerbInner (0.639)
function SpinnerWithVerbInner({
  mode: mode,
  loadingStartTimeRef: loadingStartTimeRef,
  totalPausedMsRef: totalPausedMsRef,
  pauseStartTimeRef: pauseStartTimeRef,
  responseLengthRef: responseLengthRef,
  overrideColor: overrideColor,
  overrideShimmerColor: overrideShimmerColor,
  overrideMessage: overrideMessage,
  isCompacting: isCompacting,
  isResponseHeld: isResponseHeld,
  compactingHintText: compactingHintText,
  compactingStartTime: compactingStartTime,
  spinnerSuffix: spinnerSuffix,
  verbose: verbose,
  hasActiveTools: hasActiveTools = !1,
  toolWindowStartedAt: toolWindowStartedAt = null,
  turnEffort: turnEffort,
  turnModel: turnModel,
  sentEffort: sentEffort,
  retryStatus: retryStatus,
  outputLimitRecovery: outputLimitRecovery,
  defaultVerb: defaultVerb,
  suffix: suffix,
  agentId: agentId,
}) {
  let settings = qd(),
    d = useIsScreenReaderEnabled(),
    x = isReducedMotion(settings.prefersReducedMotion) || d,
    spinnerTip = useAppState((I) => I.spinnerTip),
    spinnerTipLabel = useAppState((s_0) => s_0.spinnerTipLabel),
    briefTranscript = useAppState((s_1) => s_1.briefTranscript),
    ht = useAppState((s_2) => s_2.expandedView) === "tasks",
    wt = useTerminalSize(),
    rt = shouldShowNotice(verbose) ? lTe : 0,
    max = Math.max(1, wt.columns - rt),
    tasksV2 = gye(),
    thinkingStartRef = useThinkingStatusTimer(mode),
    mt = agentId === void 0 || agentId === mainAgentId(),
    Tt = mt ? tasksV2?.find((s_4) => s_4.status !== "pending" && s_4.status !== "completed") : void 0,
    it = mt ? findNextPendingTask(tasksV2) : void 0,
    [Mt] = y(() => wz(getSpinnerVerbs()) ?? "Working"),
    _t = Tt ? [Tt.activeForm, Tt.subject].map((I) => I?.replace(/\s+/g, " ").trim()).find(Boolean) : void 0,
    At = overrideMessage ?? (_t === void 0 ? void 0 : ISr(_t, max)) ?? (defaultVerb || Mt),
    st = suffix === Vt && Eft.test(At) ? At : At + suffix;
  P(() => {
    let I = "spinner-" + mode;
    return (
      activityManager.startCLIActivity(I),
      () => {
        activityManager.endCLIActivity(I);
      }
    );
  }, [mode]);
  let z = dg(),
    kt = getEffortSuffix(turnModel ?? getMainLoopModel(), z, turnEffort ?? void 0, sentEffort ?? void 0),
    ct =
      pauseStartTimeRef.current !== null
        ? pauseStartTimeRef.current - loadingStartTimeRef.current - totalPausedMsRef.current
        : Date.now() - loadingStartTimeRef.current - totalPausedMsRef.current,
    defaultColor = "claude",
    defaultShimmerColor = "claudeShimmer",
    dt = overrideColor ?? defaultColor,
    St = overrideShimmerColor ?? defaultShimmerColor,
    gt = getFeatureValue_CACHED_MAY_BE_STALE("tengu_shining_fractals", !1),
    Et = !1,
    Ct = settings.spinnerTipsEnabled !== !1,
    Pt = Ct && ct > 1800000,
    Wt = Ct && ct > 30000 && !getGlobalConfig().btwUseCount,
    It = Et
      ? spinnerTip
      : excludesDefaultTips()
        ? spinnerTip
        : Pt && !it
          ? "Use /clear to start fresh when switching topics and free up context"
          : Wt && !it
            ? "Use /btw to ask a quick side question without interrupting Claude's current work"
            : spinnerTip,
    Bt = It === spinnerTip && spinnerTipLabel ? spinnerTipLabel : "Tip",
    lt = it
      ? `Next: ${it.subject.replace(/\s+/g, " ").trim()}`
      : spinnerTip === FOCUS_ON_TIP && briefTranscript
        ? FOCUS_OFF_TIP
        : It
          ? `${Bt}: ${It}`
          : void 0,
    Ot;
  if (retryStatus?.kind === "retrying") {
    let I =
        retryStatus.error.status === 529 || retryStatus.error.formatted.toLowerCase().includes("overload"),
      xt = retryStatus.attempt >= Math.min(3, retryStatus.maxRetries);
    if (I && xt) Ot = getStatusPageHint().trim();
  }
  return r(Box, {
    flexDirection: "column",
    width: "100%",
    alignItems: "flex-start",
    paddingLeft: rt,
    children: [
      e(SpinnerAnimationRow, {
        mode: mode,
        reducedMotion: x,
        hasActiveTools: hasActiveTools,
        toolWindowStartedAt: toolWindowStartedAt,
        responseLengthRef: responseLengthRef,
        message: st,
        messageColor: dt,
        shimmerColor: St,
        overrideColor: overrideColor,
        loadingStartTimeRef: loadingStartTimeRef,
        totalPausedMsRef: totalPausedMsRef,
        pauseStartTimeRef: pauseStartTimeRef,
        spinnerSuffix: spinnerSuffix,
        verbose: verbose,
        columns: max,
        thinkingStatus: thinkingStartRef,
        effortSuffix: kt,
        isCompacting: isCompacting,
        compactingStartTime: compactingStartTime,
        isResponseHeld: isResponseHeld,
        showToolCallTimer: gt,
        retryStatus: retryStatus,
        outputLimitRecovery: outputLimitRecovery,
        agentId: agentId,
      }),
      mt && ht && tasksV2 && tasksV2.length > 0
        ? e(Box, {
            width: "100%",
            flexDirection: "column",
            children: e(MessageResponse, { children: e(TaskListV2, { tasks: tasksV2 }) }),
          })
        : isCompacting && compactingHintText
          ? e(Box, {
              width: "100%",
              flexDirection: "column",
              children: e(MessageResponse, {
                children: e(Text, { dimColor: !0, children: compactingHintText }),
              }),
            })
          : retryStatus
            ? Ot
              ? e(Box, {
                  width: "100%",
                  flexDirection: "column",
                  children: e(MessageResponse, { children: e(Text, { dimColor: !0, children: Ot }) }),
                })
              : null
            : lt
              ? e(Box, {
                  width: "100%",
                  flexDirection: "column",
                  children: e(MessageResponse, {
                    children:
                      !it && It === TEACH_TIP_TEXT
                        ? r(Box, {
                            flexDirection: "row",
                            flexWrap: "wrap",
                            children: [
                              r(Text, { dimColor: !0, children: [Bt, ": ", TEACH_TIP_TITLE, " \xB7", " "] }),
                              e(Box, {
                                flexShrink: 0,
                                children: e(SlashCommandLink, {
                                  command: CONFIG,
                                  args: TEACH_TIP_SETTING,
                                  color: "suggestion",
                                }),
                              }),
                            ],
                          })
                        : e(Text, { dimColor: !0, wrap: it ? "truncate-end" : "wrap", children: lt }),
                  }),
                })
              : null,
    ],
  });
}
//@ chunk-3mec1atf.js:23768-23793 layout
var Nt = 2,
  Kt = 3,
  qo = 12,
  Xo = 1;
//@ chunk-3mec1atf.js:23793-23961 layout
function computeSpinnerLabelBudget(l, t, u) {
  let o = t > 0 ? `${t} in background` : "",
    m = l - Nt - Kt,
    h = m - (o ? 1 + bunStringWidth(o) : 0);
  if (o && h < (u ? qo : Xo)) return { labelBudget: m, rightText: "" };
  return { labelBudget: h, rightText: o };
}
//@ chunk-3mec1atf.js:23961-25052 fingerprint = BriefSpinner (0.824)
function BriefSpinner({ mode: mode, overrideMessage: overrideMessage }) {
  let u = qd(),
    settings = useIsScreenReaderEnabled(),
    m = isReducedMotion(u.prefersReducedMotion) || settings,
    [h] = y(() => wz(getSpinnerVerbs()) ?? "Working"),
    remoteConnectionStatus = useAppState((d) => d.remoteConnectionStatus);
  P(() => {
    let d = "spinner-" + mode;
    return (
      activityManager.startCLIActivity(d),
      () => {
        activityManager.endCLIActivity(d);
      }
    );
  }, [mode]);
  let [, _] = useAnimationFrame(m ? null : 120),
    runningCount = useAppState(
      (d) => count(Object.values(d.tasks), waitForTaskCompletion) + d.remoteBackgroundTasks.length,
    ),
    M = remoteConnectionStatus === "reconnecting" || remoteConnectionStatus === "disconnected",
    { columns: columns } = useTerminalSize(),
    { labelBudget: labelBudget, rightText: rightText } = computeSpinnerLabelBudget(columns, runningCount, M),
    b = truncateToWidth(overrideMessage ?? h, labelBudget),
    W = truncateToWidth(
      remoteConnectionStatus === "reconnecting" ? "Reconnecting" : "Disconnected",
      labelBudget,
    ),
    U = M ? W : b,
    B = Math.floor(_ / 300) % 3,
    k = m ? (Eft.test(U) ? "   " : "\u2026  ") : ".".repeat(B + 1).padEnd(3),
    L = Q(() => bunStringWidth(b), [b]),
    O = m || M ? -100 : computeGlimmerIndex(Math.floor(_ / BRIDGE_STATUS_MAX_WIDTH), L),
    { before: before, shimmer: shimmer, after: after } = computeShimmerSegments(b, O),
    D = (M ? bunStringWidth(W) : L) + Kt,
    pad = Math.max(1, columns - Nt - D - bunStringWidth(rightText));
  return r(Box, {
    flexDirection: "row",
    width: "100%",
    marginTop: 1,
    paddingLeft: Nt,
    children: [
      M
        ? e(Text, { color: "error", children: W + k })
        : r(Fragment, {
            children: [
              before ? e(Text, { dimColor: !0, children: before }) : null,
              shimmer ? e(Text, { children: shimmer }) : null,
              after ? e(Text, { dimColor: !0, children: after }) : null,
              e(Text, { dimColor: !0, children: k }),
            ],
          }),
      rightText
        ? r(Fragment, {
            children: [
              e(Text, { children: " ".repeat(pad) }),
              e(Text, { color: "subtle", children: rightText }),
            ],
          })
        : null,
    ],
  });
}
//@ chunk-3mec1atf.js:25052-25685 fingerprint = BriefIdleStatus (0.584)
function BriefIdleStatus() {
  let remoteConnectionStatus = useAppState((E) => E.remoteConnectionStatus),
    connStatus = useAppState(
      (E) => count(Object.values(E.tasks), waitForTaskCompletion) + E.remoteBackgroundTasks.length,
    ),
    { columns: columns } = useTerminalSize(),
    showConnWarning = remoteConnectionStatus === "reconnecting" || remoteConnectionStatus === "disconnected",
    { labelBudget: labelBudget, rightText: rightText } = computeSpinnerLabelBudget(
      columns,
      connStatus,
      showConnWarning,
    ),
    T = remoteConnectionStatus === "reconnecting" ? 1 : 0,
    _ = truncateToWidth(
      remoteConnectionStatus === "reconnecting" ? "Reconnecting" : "Disconnected",
      labelBudget + Kt - T,
    ),
    C = !showConnWarning
      ? ""
      : remoteConnectionStatus === "reconnecting" && !_.endsWith("\u2026")
        ? _ + "\u2026"
        : _;
  if (!C && !rightText) return e(Box, { height: 2 });
  let pad = Math.max(1, columns - Nt - bunStringWidth(C) - bunStringWidth(rightText));
  return e(Box, {
    marginTop: 1,
    paddingLeft: Nt,
    children: r(Text, {
      children: [
        C ? e(Text, { color: "error", children: C }) : null,
        rightText
          ? r(Fragment, {
              children: [
                e(Text, { children: " ".repeat(pad) }),
                e(Text, { color: "subtle", children: rightText }),
              ],
            })
          : null,
      ],
    }),
  });
}
//@ chunk-3mec1atf.js:25685-26284 fingerprint = Spinner (0.535)
function Spinner() {
  let $ = w(9),
    settings = useIsScreenReaderEnabled(),
    reducedMotion = isReducedMotion(rs(or)) || settings,
    [u, o] = useAnimationFrame(reducedMotion ? null : 120);
  if (reducedMotion) {
    let h;
    if ($[0] === MEMO_CACHE_SENTINEL) ((h = e(Text, { color: "text", children: "\u25CF" })), ($[0] = h));
    else h = $[0];
    let T;
    if ($[1] !== u)
      ((T = e(Box, { ref: u, "aria-hidden": !0, flexWrap: "wrap", height: 1, width: 2, children: h })),
        ($[1] = u),
        ($[2] = T));
    else T = $[2];
    return T;
  }
  let h;
  if ($[3] === MEMO_CACHE_SENTINEL) ((h = VWe()), ($[3] = h));
  else h = $[3];
  let _ = h,
    frame = Math.floor(o / 120) % _.length;
  const t0 = _[frame];
  let M;
  if ($[4] !== t0) ((M = e(Text, { color: "text", children: t0 })), ($[4] = t0), ($[5] = M));
  else M = $[5];
  let E;
  if ($[6] !== u || $[7] !== M)
    ((E = e(Box, { ref: u, "aria-hidden": !0, flexWrap: "wrap", height: 1, width: 2, children: M })),
      ($[6] = u),
      ($[7] = M),
      ($[8] = E));
  else E = $[8];
  return E;
}
/**
 * 处理一个流式响应进度事件：start 新建条目（记录 ttft、基线长度），content_block_start/thinking_progress/thinking_signature 更新 thinking token 估算（约 4 字符/token），输出 token 事件写入 outputTokens；返回更新后的估算响应长度。
 */
//@ chunk-3mec1atf.js:26284-27537 layout
function applyStreamTokenEvent({ entries: entries, responseLength: responseLength, event: event }) {
  if (event.type === "start")
    return (
      entries.push({
        id: event.id,
        ttftMs: event.ttftMs,
        firstTokenTime: Date.now(),
        lastTokenTime: Date.now(),
        responseLengthBaseline: responseLength,
        endResponseLength: responseLength,
      }),
      responseLength
    );
  let entry =
    event.id != null ? entries.find((m) => m.id === event.id) : entries.findLast((m) => m.id == null);
  if (!entry) return responseLength;
  if (event.type === "content_block_start")
    return (
      (entry.thinkingTokenEstimate = 0),
      (entry.thinkingBlockBaseline = responseLength),
      (entry.sawEstimatedTokensThisBlock = !1),
      responseLength
    );
  if (event.type === "thinking_progress") {
    if (
      ((entry.sawEstimatedTokensThisBlock = !0),
      (entry.thinkingTokenEstimate = (entry.thinkingTokenEstimate ?? 0) + event.estimatedTokensDelta),
      entry.outputTokens == null && event.id == null)
    ) {
      let m = entry.thinkingBlockBaseline ?? entry.responseLengthBaseline;
      return Math.max(responseLength, m + entry.thinkingTokenEstimate * 4);
    }
    return responseLength;
  }
  if (event.type === "thinking_signature") {
    if (event.chars > 0 && entry.outputTokens == null) {
      if (((entry.lastTokenTime = Date.now()), entry.sawEstimatedTokensThisBlock)) {
        entry.thinkingTokenEstimate = Math.max(entry.thinkingTokenEstimate ?? 0, Math.ceil(event.chars / 4));
        let h = entry.thinkingBlockBaseline ?? entry.responseLengthBaseline,
          max = Math.max(responseLength, h + entry.thinkingTokenEstimate * 4);
        return ((entry.endResponseLength = max), max);
      }
      let m = responseLength + event.chars;
      return ((entry.endResponseLength = m), m);
    }
    return responseLength;
  }
  if (((entry.outputTokens = event.outputTokens), (entry.lastTokenTime = Date.now()), event.id == null))
    return Math.max(responseLength, entry.responseLengthBaseline + event.outputTokens * 4);
  return responseLength;
}
//@ chunk-3mec1atf.js:27537-27757 fingerprint = findNextPendingTask (1)
function findNextPendingTask(tasks) {
  if (!tasks) return;
  let pendingTasks = tasks.filter((o) => o.status === "pending");
  if (pendingTasks.length === 0) return;
  let unresolvedIds = new Set(tasks.filter((o) => o.status !== "completed").map((o) => o.id));
  return pendingTasks.find((o) => !o.blockedBy.some((id) => unresolvedIds.has(id))) ?? pendingTasks[0];
}

export { Spinner, SpinnerTimer316, SpinnerWithVerb, BriefIdleStatus, applyStreamTokenEvent };
