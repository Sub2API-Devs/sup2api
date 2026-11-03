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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { API_ERROR_TEXT } from "./spinnerStatus.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-3mec1atf.js:12033-12139 callgraph-fingerprint = THINKING_INACTIVE (0.647)
var SEPARATOR_WIDTH = bunStringWidth(" \xB7 ");
var THINKING_TEXT_WIDTH = bunStringWidth("thinking");
var SHOW_DETAILS_AFTER_MS = 16000;
var SHIMMER_DIM_RGB = {
  r: 153,
  g: 153,
  b: 153,
};
var SHIMMER_BRIGHT_RGB = {
  r: 185,
  g: 185,
  b: 185,
};
var SHIMMER_START_DELAY_MS = 3000;
var SHIMMER_PERIOD_SECONDS = 2;
//@ chunk-3mec1atf.js:12139-12268 layout
function computeShimmerColor(time, thinkingIntensity, u) {
  let o = (time - SHIMMER_START_DELAY_MS) / 1000;
  let m = time < SHIMMER_START_DELAY_MS ? 0 : (Math.sin((o * Math.PI * 2) / SHIMMER_PERIOD_SECONDS) + 1) / 2;
  let h = parseRGB(SHIMMER_DIM_RGB, SHIMMER_BRIGHT_RGB, roundToStep(m));
  return toRGBColor(u && thinkingIntensity > 0 ? parseRGB(h, u, roundToStep(thinkingIntensity)) : h);
}
//@ chunk-3mec1atf.js:12268-14823 fingerprint = SpinnerAnimationRow (0.604)
function SpinnerAnimationRow({
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
  columns,
  thinkingStatus,
  effortSuffix,
  isCompacting = false,
  compactingStartTime = null,
  isResponseHeld = false,
  showToolCallTimer = false,
  retryStatus = null,
  outputLimitRecovery = null,
  agentId,
}) {
  let turnStartRef = SpinnerTimer316({
    mode,
    reducedMotion,
    hasActiveTools,
    toolWindowStartedAt,
    responseLength: responseLengthRef.current,
    message,
    overrideColor,
    loadingStartTime: loadingStartTimeRef.current,
    totalPausedMs: totalPausedMsRef.current,
    pauseStartTime: pauseStartTimeRef.current,
    thinkingStatus,
    effortSuffix,
    isCompacting,
    compactingStartTime,
    isResponseHeld,
    showToolCallTimer,
    outputLimitRecovery,
    agentId,
  });
  let resolvedTheme = useResolvedTheme();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let tokenCounterRef = shouldShowNotice(verbose);
  let {
    viewportRef,
    time,
    elapsedMs,
    frame,
    glimmerIndex,
    flashOpacity,
    stalledIntensity,
    thinkingIntensity,
    statusText,
    progressiveThinkingBase,
    timerText,
    timerWidth,
    totalTokens,
    tokenCount,
    tokensWidth,
    glimmerMessageWidth,
  } = turnStartRef;
  let { thinkingText, thinkingWidth: thinkingWidthValue } = turnStartRef;
  let ct = glimmerMessageWidth + 2;
  let sep = SEPARATOR_WIDTH;
  let Y = thinkingText !== null;
  let wantsTimerAndTokens =
    verbose ||
    Y ||
    isCompacting ||
    totalTokens > 0 ||
    elapsedMs > SHOW_DETAILS_AFTER_MS ||
    Boolean(spinnerSuffix);
  let availableSpace = columns - ct - 5;
  let gt = Y && availableSpace > thinkingWidthValue;
  if (
    !gt &&
    Y &&
    statusText.kind === "thinking" &&
    (effortSuffix || progressiveThinkingBase !== "thinking")
  ) {
    if (availableSpace > THINKING_TEXT_WIDTH) {
      thinkingText = "thinking";
      thinkingWidthValue = THINKING_TEXT_WIDTH;
      gt = true;
    }
  }
  let usedAfterThinking = gt ? thinkingWidthValue + sep : 0;
  let showTimer = wantsTimerAndTokens && availableSpace > usedAfterThinking + timerWidth;
  let usedAfterTimer = usedAfterThinking + (showTimer ? timerWidth + sep : 0);
  let Wt = wantsTimerAndTokens && totalTokens > 0 && availableSpace > usedAfterTimer + tokensWidth;
  let It = gt && statusText.kind === "thinking" && !spinnerSuffix && !showTimer && !Wt;
  let Bt = thinkingIntensity > 0 ? interpolateColor(resolvedTheme.warning) : null;
  let shimmerColor_2 = computeShimmerColor(time, thinkingIntensity, Bt);
  let Ot = !Bt && thinkingIntensity > 0.5 ? "warning" : undefined;
  let I = thinkingIntensity > 0 ? "warning" : undefined;
  let parts = [
    ...(spinnerSuffix
      ? [
          jsxProd_default(
            Text,
            {
              dimColor: true,
              children: spinnerSuffix,
            },
            "suffix",
          ),
        ]
      : []),
    ...(!isScreenReaderEnabled && showTimer
      ? [
          jsxProd_default(
            Text,
            {
              dimColor: true,
              children: timerText,
            },
            "elapsedTime",
          ),
        ]
      : []),
    ...(!isScreenReaderEnabled && Wt
      ? [
          jsxProd_default_2(
            Box,
            {
              flexDirection: "row",
              children: [
                jsxProd_default(SpinnerModeGlyph, {
                  mode,
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [tokenCount, " tokens"],
                }),
              ],
            },
            "tokens",
          ),
        ]
      : []),
    ...(!isScreenReaderEnabled && gt && thinkingText
      ? [
          statusText.kind === "thinking" && !reducedMotion
            ? jsxProd_default(
                Text,
                {
                  color: Ot ?? shimmerColor_2,
                  children: It ? `(${thinkingText})` : thinkingText,
                },
                "thinking",
              )
            : jsxProd_default(
                Text,
                {
                  dimColor: !I,
                  color: I,
                  children: thinkingText,
                },
                "thinking",
              ),
        ]
      : []),
  ];
  let status =
    parts.length > 0
      ? It
        ? jsxProd_default(Byline, {
            children: parts,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "(",
              }),
              jsxProd_default(Byline, {
                children: parts,
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: ")",
              }),
            ],
          })
      : null;
  if (isCompacting && retryStatus === null && tokenCounterRef)
    return jsxProd_default(Box, {
      ref: viewportRef,
      flexDirection: "column",
      marginTop: 1,
      width: "100%",
      children: jsxProd_default(SpinnerColumn, {
        tone: "dim",
        text: stripSuffix(message, "\u2026"),
      }),
    });
  return jsxProd_default(Box, {
    ref: viewportRef,
    flexDirection: "column",
    width: "100%",
    children: jsxProd_default(Box, {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 1,
      width: "100%",
      children: retryStatus
        ? jsxProd_default(RetryStatusRow, {
            status: retryStatus,
            columns,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(SpinnerGlyph, {
                frame,
                messageColor,
                stalledIntensity: overrideColor ? 0 : stalledIntensity,
                thinkingIntensity: overrideColor ? 0 : thinkingIntensity,
                reducedMotion,
                time,
              }),
              jsxProd_default(GlimmerMessage, {
                message,
                mode,
                messageColor,
                glimmerIndex,
                flashOpacity,
                shimmerColor,
                stalledIntensity: overrideColor ? 0 : stalledIntensity,
                thinkingIntensity: overrideColor ? 0 : thinkingIntensity,
              }),
              status,
            ],
          }),
    }),
  });
}
//@ chunk-3mec1atf.js:14823-18871 layout
/**
 * 显示 API 重试状态行：stalled 时"Waiting for API response · will retry in …"，low_priority_waiting 时显示状态栏 waitBanner 与下次重试倒计时、尝试次数，以及其他重试种类的提示。
 */
function RetryStatusRow(props) {
  let $ = w(57);
  let { status, columns } = props;
  let o = Math.max(0, Math.ceil((status.deadline - Date.now()) / 1000)) * 1000;
  let h;
  if ($[0] !== status.kind) {
    h = status.kind === "low_priority_waiting" ? statusLineShouldDisplay().waitBanner : null;
    $[0] = status.kind;
    $[1] = h;
  } else h = $[1];
  let T = h;
  const mostSignificantOnly = o >= 300000;
  let C;
  if ($[2] !== o || $[3] !== mostSignificantOnly) {
    C = formatDuration(o, {
      mostSignificantOnly,
    });
    $[2] = o;
    $[3] = mostSignificantOnly;
    $[4] = C;
  } else C = $[4];
  let M = C;
  let E;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    E = jsxProd_default(Box, {
      "aria-hidden": true,
      flexWrap: "wrap",
      height: 1,
      width: 2,
      children: jsxProd_default(Text, {
        color: "error",
        children: TEARDROP_ASTERISK,
      }),
    });
    $[5] = E;
  } else E = $[5];
  let N = E;
  if (status.kind === "stalled") {
    let f;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      f = jsxProd_default(Text, {
        color: "error",
        children: "Waiting for API response",
      });
      $[6] = f;
    } else f = $[6];
    let b;
    if ($[7] !== M) {
      b = jsxProd_default_2(Fragment, {
        children: [
          N,
          jsxProd_default_2(Box, {
            flexShrink: 1,
            children: [
              f,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" \xB7 will retry in ", M, " \xB7 check your network"],
              }),
            ],
          }),
        ],
      });
      $[7] = M;
      $[8] = b;
    } else b = $[8];
    return b;
  }
  if (status.kind === "low_priority_waiting") {
    let W = ` \xB7 next try in ${M} \xB7 attempt ${status.attempt} \xB7 esc to interrupt`;
    let max = Math.max(10, columns - 2 - bunStringWidth(W) - 2);
    let f;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      f = jsxProd_default(Box, {
        "aria-hidden": true,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: jsxProd_default(Text, {
          color: "warning",
          children: TEARDROP_ASTERISK,
        }),
      });
      $[9] = f;
    } else f = $[9];
    const b = T ?? "";
    let children;
    if ($[10] !== max || $[11] !== b) {
      children = truncateToWidth(b, max);
      $[10] = max;
      $[11] = b;
      $[12] = children;
    } else children = $[12];
    let k;
    if ($[13] !== children) {
      k = jsxProd_default(Text, {
        color: "warning",
        children,
      });
      $[13] = children;
      $[14] = k;
    } else k = $[14];
    let L;
    if ($[15] !== W) {
      L = jsxProd_default(Text, {
        dimColor: true,
        children: W,
      });
      $[15] = W;
      $[16] = L;
    } else L = $[16];
    let O;
    if ($[17] !== k || $[18] !== L) {
      O = jsxProd_default_2(Fragment, {
        children: [
          f,
          jsxProd_default_2(Box, {
            flexShrink: 1,
            children: [k, L],
          }),
        ],
      });
      $[17] = k;
      $[18] = L;
      $[19] = O;
    } else O = $[19];
    return O;
  }
  if (status.kind === "auto_mode_unavailable") {
    let f;
    if ($[20] === MEMO_CACHE_SENTINEL) {
      f = jsxProd_default(Text, {
        color: "error",
        children: "Auto mode check unavailable",
      });
      $[20] = f;
    } else f = $[20];
    const b = ` \xB7 next try in ${M} \xB7 attempt ${status.attempt}/${status.maxRetries} \xB7 `;
    let B;
    if ($[21] === MEMO_CACHE_SENTINEL) {
      B = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "interrupt",
        format: {
          keyCase: "lower",
        },
      });
      $[21] = B;
    } else B = $[21];
    let k;
    if ($[22] !== b) {
      k = jsxProd_default_2(Fragment, {
        children: [
          N,
          jsxProd_default_2(Box, {
            flexShrink: 1,
            children: [
              f,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [b, B],
              }),
            ],
          }),
        ],
      });
      $[22] = b;
      $[23] = k;
    } else k = $[23];
    return k;
  }
  let noResponse = status.error.noResponse;
  if (noResponse) {
    let J = status.attempt >= status.maxRetries;
    let f;
    if ($[24] !== noResponse.retryWaitMs) {
      f = formatDurationCoarse(noResponse.retryWaitMs);
      $[24] = noResponse.retryWaitMs;
      $[25] = f;
    } else f = $[25];
    let at = f;
    let D = J
      ? ` \xB7 retrying once, waiting up to ${at}`
      : ` \xB7 retrying, waiting up to ${at} \xB7 attempt ${status.attempt}/${status.maxRetries}`;
    let max = Math.max(10, columns - 2 - bunStringWidth(D) - 2);
    let b;
    if ($[26] !== noResponse.waitedMs) {
      b = formatDurationCoarse(noResponse.waitedMs);
      $[26] = noResponse.waitedMs;
      $[27] = b;
    } else b = $[27];
    const B = `No response from the API after ${b}`;
    let children;
    if ($[28] !== max || $[29] !== B) {
      children = truncateToWidth(B, max);
      $[28] = max;
      $[29] = B;
      $[30] = children;
    } else children = $[30];
    let L;
    if ($[31] !== children) {
      L = jsxProd_default(Text, {
        color: "error",
        children,
      });
      $[31] = children;
      $[32] = L;
    } else L = $[32];
    let O;
    if ($[33] !== D) {
      O = jsxProd_default(Text, {
        dimColor: true,
        children: D,
      });
      $[33] = D;
      $[34] = O;
    } else O = $[34];
    let d;
    if ($[35] !== O || $[36] !== L) {
      d = jsxProd_default_2(Box, {
        children: [L, O],
      });
      $[35] = O;
      $[36] = L;
      $[37] = d;
    } else d = $[37];
    let x;
    if ($[38] === MEMO_CACHE_SENTINEL) {
      x = jsxProd_default(Text, {
        dimColor: true,
        children:
          "A proxy or gateway that buffers streaming responses can cause this \xB7 set CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS to change the first wait",
      });
      $[38] = x;
    } else x = $[38];
    let tt;
    if ($[39] !== d) {
      tt = jsxProd_default_2(Fragment, {
        children: [
          N,
          jsxProd_default_2(Box, {
            flexBasis: 0,
            flexDirection: "column",
            flexGrow: 1,
            flexShrink: 1,
            children: [d, x],
          }),
        ],
      });
      $[39] = d;
      $[40] = tt;
    } else tt = $[40];
    return tt;
  }
  let rateLimits = status.error.rateLimits;
  let f;
  if ($[41] !== rateLimits) {
    f = rateLimits?.resetsAt ? ` (${formatResetTime(rateLimits.resetsAt)})` : "";
    $[41] = rateLimits;
    $[42] = f;
  } else f = $[42];
  let ht = ` \xB7 Retrying in ${M}${f} \xB7 attempt ${status.attempt}/${status.maxRetries}`;
  let wt =
    status.attempt >= Math.min(3, status.maxRetries) ||
    status.error.isNetworkDown ||
    status.error.connection?.isSSLError ||
    rateLimits;
  let b;
  if ($[43] !== rateLimits || $[44] !== wt || $[45] !== status.error.formatted) {
    let rt = rateLimits?.rateLimitType ? getRateLimitDisplayName(rateLimits.rateLimitType) : "usage limit";
    b = !wt
      ? API_ERROR_TEXT
      : rateLimits
        ? `${rt[0]?.toUpperCase()}${rt.slice(1)} reached`
        : status.error.formatted;
    $[43] = rateLimits;
    $[44] = wt;
    $[45] = status.error.formatted;
    $[46] = b;
  } else b = $[46];
  let V = b;
  let max = Math.max(10, columns - 2 - bunStringWidth(ht) - 2);
  let B;
  if ($[47] !== max || $[48] !== V) {
    B = truncateToWidth(V, max);
    $[47] = max;
    $[48] = V;
    $[49] = B;
  } else B = $[49];
  let children = B;
  let k;
  if ($[50] !== children) {
    k = jsxProd_default(Text, {
      color: "error",
      children,
    });
    $[50] = children;
    $[51] = k;
  } else k = $[51];
  let L;
  if ($[52] !== ht) {
    L = jsxProd_default(Text, {
      dimColor: true,
      children: ht,
    });
    $[52] = ht;
    $[53] = L;
  } else L = $[53];
  let O;
  if ($[54] !== k || $[55] !== L) {
    O = jsxProd_default_2(Fragment, {
      children: [
        N,
        jsxProd_default_2(Box, {
          flexShrink: 1,
          children: [k, L],
        }),
      ],
    });
    $[54] = k;
    $[55] = L;
    $[56] = O;
  } else O = $[56];
  return O;
}
//@ chunk-3mec1atf.js:18871-19261 fingerprint = SpinnerModeGlyph (0.804)
function SpinnerModeGlyph(props) {
  let $ = w(2);
  let { mode } = props;
  switch (mode) {
    case "tool-input":
    case "tool-use":
    case "responding":
    case "thinking": {
      let t1;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        t1 = jsxProd_default(Box, {
          width: 2,
          children: jsxProd_default(Text, {
            "aria-hidden": true,
            dimColor: true,
            children: figures_default.arrowDown,
          }),
        });
        $[0] = t1;
      } else t1 = $[0];
      return t1;
    }
    case "requesting": {
      let t1;
      if ($[1] === MEMO_CACHE_SENTINEL) {
        t1 = jsxProd_default(Box, {
          width: 2,
          children: jsxProd_default(Text, {
            "aria-hidden": true,
            dimColor: true,
            children: figures_default.arrowUp,
          }),
        });
        $[1] = t1;
      } else t1 = $[1];
      return t1;
    }
  }
}
//@ chunk-18hwfzwa.js:435231-435268 fingerprint = SEP_WIDTH (1)
var SPINNER_PADDING = 2;
var SPINNER_INDENT = "  ";
var SPINNER_SEPARATOR = " \xB7 ";
var SPINNER_MAX_LINES = 8;
//@ chunk-e6aww6q8.js:2582458-2582541 fingerprint = THINKING_BARE_WIDTH (1)
function THINKING_BARE_WIDTH(e, n) {
  try {
    return e.type === "thinking" ? n : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
export {
  SPINNER_PADDING,
  SPINNER_MAX_LINES,
  SPINNER_INDENT,
  SPINNER_SEPARATOR,
  RetryStatusRow,
  THINKING_BARE_WIDTH,
  SpinnerAnimationRow,
};
