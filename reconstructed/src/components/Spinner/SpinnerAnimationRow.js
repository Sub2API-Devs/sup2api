/**
 * components/Spinner/SpinnerAnimationRow.tsx
 *
 * Spinner 动画行：字形 + 文案 + 已用时间 + token 数 + 停滞（stalled）提示与宽度预算。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/SpinnerAnimationRow.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-3mec1atf.js (5), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 4, callgraph-fingerprint 1, layout 2
 */
import { bunStringWidth } from "../../ink/stringWidth.js";
import { parseRGB, roundToStep, toRGBColor, interpolateColor } from "./utils.js";
import { SpinnerTimer316 } from "../Spinner.js";
import { useResolvedTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../design-system/Byline.js";
import { SpinnerColumn } from "./SpinnerColumn.js";
import { stripSuffix } from "../../utils/stringUtils.js";
import { SpinnerGlyph } from "./SpinnerGlyph.js";
import { GlimmerMessage } from "./GlimmerMessage.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { statusLineShouldDisplay } from "../StatusLine.js";
import {
  formatDuration,
  truncateToWidth,
  formatDurationCoarse,
  formatResetTime,
} from "../../utils/format.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { getRateLimitDisplayName } from "../../services/claudeAiLimits.js";
import { yUn } from "./spinnerStatus.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-3mec1atf.js:12033-12139 callgraph-fingerprint = THINKING_INACTIVE (0.647)
var SEPARATOR_WIDTH = bunStringWidth(" \xB7 "),
  THINKING_TEXT_WIDTH = bunStringWidth("thinking"),
  SHOW_DETAILS_AFTER_MS = 16000,
  SHIMMER_DIM_RGB = { r: 153, g: 153, b: 153 },
  SHIMMER_BRIGHT_RGB = { r: 185, g: 185, b: 185 },
  SHIMMER_START_DELAY_MS = 3000,
  SHIMMER_PERIOD_SECONDS = 2;
//@ chunk-3mec1atf.js:12139-12268 layout
function computeShimmerColor(l, t, u) {
  let o = (l - SHIMMER_START_DELAY_MS) / 1000,
    m = l < SHIMMER_START_DELAY_MS ? 0 : (Math.sin((o * Math.PI * 2) / SHIMMER_PERIOD_SECONDS) + 1) / 2,
    h = parseRGB(SHIMMER_DIM_RGB, SHIMMER_BRIGHT_RGB, roundToStep(m));
  return toRGBColor(u && t > 0 ? parseRGB(h, u, roundToStep(t)) : h);
}
//@ chunk-3mec1atf.js:12268-14823 fingerprint = SpinnerAnimationRow (0.604)
function SpinnerAnimationRow({
  mode: mode,
  reducedMotion: reducedMotion,
  hasActiveTools: hasActiveTools,
  toolWindowStartedAt: toolWindowStartedAt,
  responseLengthRef: responseLengthRef,
  message: message,
  messageColor: messageColor,
  shimmerColor: shimmerColor,
  overrideColor: overrideColor,
  loadingStartTimeRef: loadingStartTimeRef,
  totalPausedMsRef: totalPausedMsRef,
  pauseStartTimeRef: pauseStartTimeRef,
  spinnerSuffix: spinnerSuffix,
  verbose: verbose,
  columns: columns,
  thinkingStatus: thinkingStatus,
  effortSuffix: effortSuffix,
  isCompacting: isCompacting = !1,
  compactingStartTime: compactingStartTime = null,
  isResponseHeld: isResponseHeld = !1,
  showToolCallTimer: showToolCallTimer = !1,
  retryStatus: retryStatus = null,
  outputLimitRecovery: outputLimitRecovery = null,
  agentId: agentId,
}) {
  let turnStartRef = SpinnerTimer316({
      mode: mode,
      reducedMotion: reducedMotion,
      hasActiveTools: hasActiveTools,
      toolWindowStartedAt: toolWindowStartedAt,
      responseLength: responseLengthRef.current,
      message: message,
      overrideColor: overrideColor,
      loadingStartTime: loadingStartTimeRef.current,
      totalPausedMs: totalPausedMsRef.current,
      pauseStartTime: pauseStartTimeRef.current,
      thinkingStatus: thinkingStatus,
      effortSuffix: effortSuffix,
      isCompacting: isCompacting,
      compactingStartTime: compactingStartTime,
      isResponseHeld: isResponseHeld,
      showToolCallTimer: showToolCallTimer,
      outputLimitRecovery: outputLimitRecovery,
      agentId: agentId,
    }),
    d = useResolvedTheme(),
    x = useIsScreenReaderEnabled(),
    tokenCounterRef = shouldShowNotice(verbose),
    {
      viewportRef: viewportRef,
      time: time,
      elapsedMs: elapsedMs,
      frame: frame,
      glimmerIndex: glimmerIndex,
      flashOpacity: flashOpacity,
      stalledIntensity: stalledIntensity,
      thinkingIntensity: thinkingIntensity,
      statusText: statusText,
      progressiveThinkingBase: progressiveThinkingBase,
      timerText: timerText,
      timerWidth: timerWidth,
      totalTokens: totalTokens,
      tokenCount: tokenCount,
      tokensWidth: tokensWidth,
      glimmerMessageWidth: glimmerMessageWidth,
    } = turnStartRef,
    { thinkingText: thinkingText, thinkingWidth: thinkingWidth } = turnStartRef,
    ct = glimmerMessageWidth + 2,
    sep = SEPARATOR_WIDTH,
    Y = thinkingText !== null,
    dt =
      verbose ||
      Y ||
      isCompacting ||
      totalTokens > 0 ||
      elapsedMs > SHOW_DETAILS_AFTER_MS ||
      Boolean(spinnerSuffix),
    St = columns - ct - 5,
    gt = Y && St > thinkingWidth;
  if (
    !gt &&
    Y &&
    statusText.kind === "thinking" &&
    (effortSuffix || progressiveThinkingBase !== "thinking")
  ) {
    if (St > THINKING_TEXT_WIDTH)
      ((thinkingText = "thinking"), (thinkingWidth = THINKING_TEXT_WIDTH), (gt = !0));
  }
  let Et = gt ? thinkingWidth + sep : 0,
    Ct = dt && St > Et + timerWidth,
    Pt = Et + (Ct ? timerWidth + sep : 0),
    Wt = dt && totalTokens > 0 && St > Pt + tokensWidth,
    It = gt && statusText.kind === "thinking" && !spinnerSuffix && !Ct && !Wt,
    Bt = thinkingIntensity > 0 ? interpolateColor(d.warning) : null,
    lt = computeShimmerColor(time, thinkingIntensity, Bt),
    Ot = !Bt && thinkingIntensity > 0.5 ? "warning" : void 0,
    I = thinkingIntensity > 0 ? "warning" : void 0,
    parts = [
      ...(spinnerSuffix ? [e(Text, { dimColor: !0, children: spinnerSuffix }, "suffix")] : []),
      ...(!x && Ct ? [e(Text, { dimColor: !0, children: timerText }, "elapsedTime")] : []),
      ...(!x && Wt
        ? [
            r(
              Box,
              {
                flexDirection: "row",
                children: [
                  e(SpinnerModeGlyph, { mode: mode }),
                  r(Text, { dimColor: !0, children: [tokenCount, " tokens"] }),
                ],
              },
              "tokens",
            ),
          ]
        : []),
      ...(!x && gt && thinkingText
        ? [
            statusText.kind === "thinking" && !reducedMotion
              ? e(Text, { color: Ot ?? lt, children: It ? `(${thinkingText})` : thinkingText }, "thinking")
              : e(Text, { dimColor: !I, color: I, children: thinkingText }, "thinking"),
          ]
        : []),
    ],
    yt =
      parts.length > 0
        ? It
          ? e(Byline, { children: parts })
          : r(Fragment, {
              children: [
                e(Text, { dimColor: !0, children: "(" }),
                e(Byline, { children: parts }),
                e(Text, { dimColor: !0, children: ")" }),
              ],
            })
        : null;
  if (isCompacting && retryStatus === null && tokenCounterRef)
    return e(Box, {
      ref: viewportRef,
      flexDirection: "column",
      marginTop: 1,
      width: "100%",
      children: e(SpinnerColumn, { tone: "dim", text: stripSuffix(message, "\u2026") }),
    });
  return e(Box, {
    ref: viewportRef,
    flexDirection: "column",
    width: "100%",
    children: e(Box, {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 1,
      width: "100%",
      children: retryStatus
        ? e(RetryStatusRow, { status: retryStatus, columns: columns })
        : r(Fragment, {
            children: [
              e(SpinnerGlyph, {
                frame: frame,
                messageColor: messageColor,
                stalledIntensity: overrideColor ? 0 : stalledIntensity,
                thinkingIntensity: overrideColor ? 0 : thinkingIntensity,
                reducedMotion: reducedMotion,
                time: time,
              }),
              e(GlimmerMessage, {
                message: message,
                mode: mode,
                messageColor: messageColor,
                glimmerIndex: glimmerIndex,
                flashOpacity: flashOpacity,
                shimmerColor: shimmerColor,
                stalledIntensity: overrideColor ? 0 : stalledIntensity,
                thinkingIntensity: overrideColor ? 0 : thinkingIntensity,
              }),
              yt,
            ],
          }),
    }),
  });
}
/**
 * 显示 API 重试状态行：stalled 时"Waiting for API response · will retry in …"，low_priority_waiting 时显示状态栏 waitBanner 与下次重试倒计时、尝试次数，以及其他重试种类的提示。
 */
//@ chunk-3mec1atf.js:14823-18871 layout
function RetryStatusRow(props) {
  let $ = w(57),
    { status: status, columns: columns } = props,
    o = Math.max(0, Math.ceil((status.deadline - Date.now()) / 1000)) * 1000,
    h;
  if ($[0] !== status.kind)
    ((h = status.kind === "low_priority_waiting" ? statusLineShouldDisplay().waitBanner : null),
      ($[0] = status.kind),
      ($[1] = h));
  else h = $[1];
  let T = h;
  const _ = o >= 300000;
  let C;
  if ($[2] !== o || $[3] !== _)
    ((C = formatDuration(o, { mostSignificantOnly: _ })), ($[2] = o), ($[3] = _), ($[4] = C));
  else C = $[4];
  let M = C,
    E;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((E = e(Box, {
      "aria-hidden": !0,
      flexWrap: "wrap",
      height: 1,
      width: 2,
      children: e(Text, { color: "error", children: TEARDROP_ASTERISK }),
    })),
      ($[5] = E));
  else E = $[5];
  let N = E;
  if (status.kind === "stalled") {
    let f;
    if ($[6] === MEMO_CACHE_SENTINEL)
      ((f = e(Text, { color: "error", children: "Waiting for API response" })), ($[6] = f));
    else f = $[6];
    let b;
    if ($[7] !== M)
      ((b = r(Fragment, {
        children: [
          N,
          r(Box, {
            flexShrink: 1,
            children: [
              f,
              r(Text, { dimColor: !0, children: [" \xB7 will retry in ", M, " \xB7 check your network"] }),
            ],
          }),
        ],
      })),
        ($[7] = M),
        ($[8] = b));
    else b = $[8];
    return b;
  }
  if (status.kind === "low_priority_waiting") {
    let W = ` \xB7 next try in ${M} \xB7 attempt ${status.attempt} \xB7 esc to interrupt`;
    let max = Math.max(10, columns - 2 - bunStringWidth(W) - 2);
    let f;
    if ($[9] === MEMO_CACHE_SENTINEL)
      ((f = e(Box, {
        "aria-hidden": !0,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: e(Text, { color: "warning", children: TEARDROP_ASTERISK }),
      })),
        ($[9] = f));
    else f = $[9];
    const b = T ?? "";
    let B;
    if ($[10] !== max || $[11] !== b)
      ((B = truncateToWidth(b, max)), ($[10] = max), ($[11] = b), ($[12] = B));
    else B = $[12];
    let k;
    if ($[13] !== B) ((k = e(Text, { color: "warning", children: B })), ($[13] = B), ($[14] = k));
    else k = $[14];
    let L;
    if ($[15] !== W) ((L = e(Text, { dimColor: !0, children: W })), ($[15] = W), ($[16] = L));
    else L = $[16];
    let O;
    if ($[17] !== k || $[18] !== L)
      ((O = r(Fragment, { children: [f, r(Box, { flexShrink: 1, children: [k, L] })] })),
        ($[17] = k),
        ($[18] = L),
        ($[19] = O));
    else O = $[19];
    return O;
  }
  if (status.kind === "auto_mode_unavailable") {
    let f;
    if ($[20] === MEMO_CACHE_SENTINEL)
      ((f = e(Text, { color: "error", children: "Auto mode check unavailable" })), ($[20] = f));
    else f = $[20];
    const b = ` \xB7 next try in ${M} \xB7 attempt ${status.attempt}/${status.maxRetries} \xB7 `;
    let B;
    if ($[21] === MEMO_CACHE_SENTINEL)
      ((B = e(KeyboardShortcutHint, { chord: "escape", action: "interrupt", format: { keyCase: "lower" } })),
        ($[21] = B));
    else B = $[21];
    let k;
    if ($[22] !== b)
      ((k = r(Fragment, {
        children: [N, r(Box, { flexShrink: 1, children: [f, r(Text, { dimColor: !0, children: [b, B] })] })],
      })),
        ($[22] = b),
        ($[23] = k));
    else k = $[23];
    return k;
  }
  let noResponse = status.error.noResponse;
  if (noResponse) {
    let J = status.attempt >= status.maxRetries;
    let f;
    if ($[24] !== noResponse.retryWaitMs)
      ((f = formatDurationCoarse(noResponse.retryWaitMs)), ($[24] = noResponse.retryWaitMs), ($[25] = f));
    else f = $[25];
    let at = f;
    let D = J
      ? ` \xB7 retrying once, waiting up to ${at}`
      : ` \xB7 retrying, waiting up to ${at} \xB7 attempt ${status.attempt}/${status.maxRetries}`;
    let max = Math.max(10, columns - 2 - bunStringWidth(D) - 2);
    let b;
    if ($[26] !== noResponse.waitedMs)
      ((b = formatDurationCoarse(noResponse.waitedMs)), ($[26] = noResponse.waitedMs), ($[27] = b));
    else b = $[27];
    const B = `No response from the API after ${b}`;
    let k;
    if ($[28] !== max || $[29] !== B)
      ((k = truncateToWidth(B, max)), ($[28] = max), ($[29] = B), ($[30] = k));
    else k = $[30];
    let L;
    if ($[31] !== k) ((L = e(Text, { color: "error", children: k })), ($[31] = k), ($[32] = L));
    else L = $[32];
    let O;
    if ($[33] !== D) ((O = e(Text, { dimColor: !0, children: D })), ($[33] = D), ($[34] = O));
    else O = $[34];
    let d;
    if ($[35] !== O || $[36] !== L)
      ((d = r(Box, { children: [L, O] })), ($[35] = O), ($[36] = L), ($[37] = d));
    else d = $[37];
    let x;
    if ($[38] === MEMO_CACHE_SENTINEL)
      ((x = e(Text, {
        dimColor: !0,
        children:
          "A proxy or gateway that buffers streaming responses can cause this \xB7 set CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS to change the first wait",
      })),
        ($[38] = x));
    else x = $[38];
    let tt;
    if ($[39] !== d)
      ((tt = r(Fragment, {
        children: [
          N,
          r(Box, { flexBasis: 0, flexDirection: "column", flexGrow: 1, flexShrink: 1, children: [d, x] }),
        ],
      })),
        ($[39] = d),
        ($[40] = tt));
    else tt = $[40];
    return tt;
  }
  let rateLimits = status.error.rateLimits,
    f;
  if ($[41] !== rateLimits)
    ((f = rateLimits?.resetsAt ? ` (${formatResetTime(rateLimits.resetsAt)})` : ""),
      ($[41] = rateLimits),
      ($[42] = f));
  else f = $[42];
  let ht = ` \xB7 Retrying in ${M}${f} \xB7 attempt ${status.attempt}/${status.maxRetries}`,
    wt =
      status.attempt >= Math.min(3, status.maxRetries) ||
      status.error.isNetworkDown ||
      status.error.connection?.isSSLError ||
      rateLimits,
    b;
  if ($[43] !== rateLimits || $[44] !== wt || $[45] !== status.error.formatted) {
    let rt = rateLimits?.rateLimitType ? getRateLimitDisplayName(rateLimits.rateLimitType) : "usage limit";
    b = !wt ? yUn : rateLimits ? `${rt[0]?.toUpperCase()}${rt.slice(1)} reached` : status.error.formatted;
    (($[43] = rateLimits), ($[44] = wt), ($[45] = status.error.formatted), ($[46] = b));
  } else b = $[46];
  let V = b,
    max = Math.max(10, columns - 2 - bunStringWidth(ht) - 2),
    B;
  if ($[47] !== max || $[48] !== V) ((B = truncateToWidth(V, max)), ($[47] = max), ($[48] = V), ($[49] = B));
  else B = $[49];
  let K = B,
    k;
  if ($[50] !== K) ((k = e(Text, { color: "error", children: K })), ($[50] = K), ($[51] = k));
  else k = $[51];
  let L;
  if ($[52] !== ht) ((L = e(Text, { dimColor: !0, children: ht })), ($[52] = ht), ($[53] = L));
  else L = $[53];
  let O;
  if ($[54] !== k || $[55] !== L)
    ((O = r(Fragment, { children: [N, r(Box, { flexShrink: 1, children: [k, L] })] })),
      ($[54] = k),
      ($[55] = L),
      ($[56] = O));
  else O = $[56];
  return O;
}
//@ chunk-3mec1atf.js:18871-19261 fingerprint = SpinnerModeGlyph (0.804)
function SpinnerModeGlyph(t0) {
  let $ = w(2),
    { mode: mode } = t0;
  switch (mode) {
    case "tool-input":
    case "tool-use":
    case "responding":
    case "thinking": {
      let o;
      if ($[0] === MEMO_CACHE_SENTINEL)
        ((o = e(Box, {
          width: 2,
          children: e(Text, { "aria-hidden": !0, dimColor: !0, children: re.arrowDown }),
        })),
          ($[0] = o));
      else o = $[0];
      return o;
    }
    case "requesting": {
      let o;
      if ($[1] === MEMO_CACHE_SENTINEL)
        ((o = e(Box, {
          width: 2,
          children: e(Text, { "aria-hidden": !0, dimColor: !0, children: re.arrowUp }),
        })),
          ($[1] = o));
      else o = $[1];
      return o;
    }
  }
}
//@ chunk-18hwfzwa.js:435231-435268 fingerprint = SEP_WIDTH (1)
var kz = 2,
  ule = "  ",
  ple = " \xB7 ",
  oqe = 8;
//@ chunk-e6aww6q8.js:2582458-2582541 fingerprint = THINKING_BARE_WIDTH (1)
function THINKING_BARE_WIDTH(e, n) {
  try {
    return e.type === "thinking" ? n : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}

export { kz, oqe, ule, ple, RetryStatusRow, THINKING_BARE_WIDTH, SpinnerAnimationRow };
