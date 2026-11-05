/**
 * components/Spinner/SpinnerAnimationRow.tsx
 *
 * Spinner 动画行：字形 + 文案 + 已用时间 + token 数 + 停滞（stalled）提示与宽度预算。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/SpinnerAnimationRow.tsx
 * pieces: chunk-3ne3bnw4.js (1), chunk-5xgkngpb.js (1), chunk-hzenv5c0.js (5)
 * attribution: fingerprint 4, callgraph-fingerprint 1, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { fragmentTypeExport, isValidElement_default } from "../../../vendor/react/cjs/react.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { interpolateColor, roundToStep, toRGBColor, parseRGB } from "./utils.js";
import { SpinnerTimer316 } from "../Spinner.js";
import { useResolvedTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { Byline } from "../design-system/Byline.js";
import { SpinnerColumn } from "./SpinnerColumn.js";
import { stripSuffix } from "../../utils/stringUtils.js";
import { SpinnerGlyph } from "./SpinnerGlyph.js";
import { GlimmerMessage } from "./GlimmerMessage.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { statusLineShouldDisplay } from "../StatusLine.js";
import {
  formatDuration,
  truncateToWidth,
  formatDurationCoarse,
  formatResetTime,
} from "../../utils/format.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TEARDROP_ASTERISK } from "../../constants/figures.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { getRateLimitDisplayName } from "../../services/claudeAiLimits.js";
import { API_ERROR_TEXT } from "./spinnerStatus.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2637598-2637681 fingerprint (2.1.88 match: THINKING_BARE_WIDTH, 1)
function THINKING_BARE_WIDTH(block, width) {
  try {
    return block.type === "thinking" ? width : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-3ne3bnw4.js:417-520 fingerprint (2.1.88 match: SEP_WIDTH, 1)
function renderBylineItem(item, index) {
  return jsxProd_default_2(
    fragmentTypeExport,
    {
      children: [
        index > 0 &&
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 ",
          }),
        item,
      ],
    },
    isValidElement_default(item) ? (item.key ?? index) : index,
  );
}
//@ chunk-hzenv5c0.js:12034-12140 callgraph-fingerprint (2.1.88 match: THINKING_INACTIVE, 0.646)
var SEPARATOR_WIDTH; // deferred: uses bunStringWidth (../../ink/stringWidth.js) of its import cycle while loading; runs once the cycle is complete
var THINKING_TEXT_WIDTH;
var SHOW_DETAILS_AFTER_MS;
var SHIMMER_DIM_RGB;
var SHIMMER_BRIGHT_RGB;
var SHIMMER_START_DELAY_MS;
var SHIMMER_PERIOD_SECONDS;
deferInit("chunk-hzenv5c0.js:12034", () => {
  SEPARATOR_WIDTH = bunStringWidth(" \xB7 ");
  THINKING_TEXT_WIDTH = bunStringWidth("thinking");
  SHOW_DETAILS_AFTER_MS = 16000;
  SHIMMER_DIM_RGB = {
    r: 153,
    g: 153,
    b: 153,
  };
  SHIMMER_BRIGHT_RGB = {
    r: 185,
    g: 185,
    b: 185,
  };
  SHIMMER_START_DELAY_MS = 3000;
  SHIMMER_PERIOD_SECONDS = 2;
});
//@ chunk-hzenv5c0.js:12140-12269 layout
function computeShimmerColor(time, thinkingIntensity, intensity) {
  let seconds = (time - SHIMMER_START_DELAY_MS) / 1000;
  let wave =
    time < SHIMMER_START_DELAY_MS ? 0 : (Math.sin((seconds * Math.PI * 2) / SHIMMER_PERIOD_SECONDS) + 1) / 2;
  let color = interpolateColor(SHIMMER_DIM_RGB, SHIMMER_BRIGHT_RGB, roundToStep(wave));
  return toRGBColor(
    intensity && thinkingIntensity > 0
      ? interpolateColor(color, intensity, roundToStep(thinkingIntensity))
      : color,
  );
}
//@ chunk-hzenv5c0.js:12269-14824 fingerprint (2.1.88 match: SpinnerAnimationRow, 0.604)
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
  let glimmerReserveWidth = glimmerMessageWidth + 2;
  let sep = SEPARATOR_WIDTH;
  let hasThinkingText = thinkingText !== null;
  let wantsTimerAndTokens =
    verbose ||
    hasThinkingText ||
    isCompacting ||
    totalTokens > 0 ||
    elapsedMs > SHOW_DETAILS_AFTER_MS ||
    Boolean(spinnerSuffix);
  let availableSpace = columns - glimmerReserveWidth - 5;
  let showThinking = hasThinkingText && availableSpace > thinkingWidthValue;
  if (
    !showThinking &&
    hasThinkingText &&
    statusText.kind === "thinking" &&
    (effortSuffix || progressiveThinkingBase !== "thinking")
  ) {
    if (availableSpace > THINKING_TEXT_WIDTH) {
      thinkingText = "thinking";
      thinkingWidthValue = THINKING_TEXT_WIDTH;
      showThinking = true;
    }
  }
  let usedAfterThinking = showThinking ? thinkingWidthValue + sep : 0;
  let showTimer = wantsTimerAndTokens && availableSpace > usedAfterThinking + timerWidth;
  let usedAfterTimer = usedAfterThinking + (showTimer ? timerWidth + sep : 0);
  let showTokens = wantsTimerAndTokens && totalTokens > 0 && availableSpace > usedAfterTimer + tokensWidth;
  let parenthesizeThinking =
    showThinking && statusText.kind === "thinking" && !spinnerSuffix && !showTimer && !showTokens;
  let warningColor = thinkingIntensity > 0 ? parseRGB(resolvedTheme.warning) : null;
  let shimmerColor_2 = computeShimmerColor(time, thinkingIntensity, warningColor);
  let thinkingColor = !warningColor && thinkingIntensity > 0.5 ? "warning" : undefined;
  let intensityColor = thinkingIntensity > 0 ? "warning" : undefined;
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
    ...(!isScreenReaderEnabled && showTokens
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
    ...(!isScreenReaderEnabled && showThinking && thinkingText
      ? [
          statusText.kind === "thinking" && !reducedMotion
            ? jsxProd_default(
                Text,
                {
                  color: thinkingColor ?? shimmerColor_2,
                  children: parenthesizeThinking ? `(${thinkingText})` : thinkingText,
                },
                "thinking",
              )
            : jsxProd_default(
                Text,
                {
                  dimColor: !intensityColor,
                  color: intensityColor,
                  children: thinkingText,
                },
                "thinking",
              ),
        ]
      : []),
  ];
  let status =
    parts.length > 0
      ? parenthesizeThinking
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
//@ chunk-hzenv5c0.js:14824-18872 layout
/**
 * 显示 API 重试状态行：stalled 时"Waiting for API response · will retry in …"，low_priority_waiting 时显示状态栏 waitBanner 与下次重试倒计时、尝试次数，以及其他重试种类的提示。
 */
function RetryStatusRow(props) {
  let $ = useMemoCache(57);
  let { status, columns } = props;
  let retryDelayMs = Math.max(0, Math.ceil((status.deadline - Date.now()) / 1000)) * 1000;
  let waitBanner;
  if ($[0] !== status.kind) {
    waitBanner = status.kind === "low_priority_waiting" ? statusLineShouldDisplay().waitBanner : null;
    $[0] = status.kind;
    $[1] = waitBanner;
  } else waitBanner = $[1];
  let waitBanner_2 = waitBanner;
  const mostSignificantOnly = retryDelayMs >= 300000;
  let delayText;
  if ($[2] !== retryDelayMs || $[3] !== mostSignificantOnly) {
    delayText = formatDuration(retryDelayMs, {
      mostSignificantOnly,
    });
    $[2] = retryDelayMs;
    $[3] = mostSignificantOnly;
    $[4] = delayText;
  } else delayText = $[4];
  let delayText_2 = delayText;
  let errorMarker;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    errorMarker = jsxProd_default(Box, {
      "aria-hidden": true,
      flexWrap: "wrap",
      height: 1,
      width: 2,
      children: jsxProd_default(Text, {
        color: "error",
        children: TEARDROP_ASTERISK,
      }),
    });
    $[5] = errorMarker;
  } else errorMarker = $[5];
  let errorMarker_2 = errorMarker;
  if (status.kind === "stalled") {
    let stalledText;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      stalledText = jsxProd_default(Text, {
        color: "error",
        children: "Waiting for API response",
      });
      $[6] = stalledText;
    } else stalledText = $[6];
    let stalledRow;
    if ($[7] !== delayText_2) {
      stalledRow = jsxProd_default_2(Fragment, {
        children: [
          errorMarker_2,
          jsxProd_default_2(Box, {
            flexShrink: 1,
            children: [
              stalledText,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" \xB7 will retry in ", delayText_2, " \xB7 check your network"],
              }),
            ],
          }),
        ],
      });
      $[7] = delayText_2;
      $[8] = stalledRow;
    } else stalledRow = $[8];
    return stalledRow;
  }
  if (status.kind === "low_priority_waiting") {
    let waitingSuffix = ` \xB7 next try in ${delayText_2} \xB7 attempt ${status.attempt} \xB7 esc to interrupt`;
    let max = Math.max(10, columns - 2 - bunStringWidth(waitingSuffix) - 2);
    let warningMarker;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      warningMarker = jsxProd_default(Box, {
        "aria-hidden": true,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: jsxProd_default(Text, {
          color: "warning",
          children: TEARDROP_ASTERISK,
        }),
      });
      $[9] = warningMarker;
    } else warningMarker = $[9];
    const bannerText = waitBanner_2 ?? "";
    let children;
    if ($[10] !== max || $[11] !== bannerText) {
      children = truncateToWidth(bannerText, max);
      $[10] = max;
      $[11] = bannerText;
      $[12] = children;
    } else children = $[12];
    let bannerElement;
    if ($[13] !== children) {
      bannerElement = jsxProd_default(Text, {
        color: "warning",
        children,
      });
      $[13] = children;
      $[14] = bannerElement;
    } else bannerElement = $[14];
    let suffixElement;
    if ($[15] !== waitingSuffix) {
      suffixElement = jsxProd_default(Text, {
        dimColor: true,
        children: waitingSuffix,
      });
      $[15] = waitingSuffix;
      $[16] = suffixElement;
    } else suffixElement = $[16];
    let waitingRow;
    if ($[17] !== bannerElement || $[18] !== suffixElement) {
      waitingRow = jsxProd_default_2(Fragment, {
        children: [
          warningMarker,
          jsxProd_default_2(Box, {
            flexShrink: 1,
            children: [bannerElement, suffixElement],
          }),
        ],
      });
      $[17] = bannerElement;
      $[18] = suffixElement;
      $[19] = waitingRow;
    } else waitingRow = $[19];
    return waitingRow;
  }
  if (status.kind === "auto_mode_unavailable") {
    let unavailableText;
    if ($[20] === MEMO_CACHE_SENTINEL) {
      unavailableText = jsxProd_default(Text, {
        color: "error",
        children: "Auto mode check unavailable",
      });
      $[20] = unavailableText;
    } else unavailableText = $[20];
    const retrySuffix = ` \xB7 next try in ${delayText_2} \xB7 attempt ${status.attempt}/${status.maxRetries} \xB7 `;
    let interruptHint;
    if ($[21] === MEMO_CACHE_SENTINEL) {
      interruptHint = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "interrupt",
        format: {
          keyCase: "lower",
        },
      });
      $[21] = interruptHint;
    } else interruptHint = $[21];
    let unavailableRow;
    if ($[22] !== retrySuffix) {
      unavailableRow = jsxProd_default_2(Fragment, {
        children: [
          errorMarker_2,
          jsxProd_default_2(Box, {
            flexShrink: 1,
            children: [
              unavailableText,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [retrySuffix, interruptHint],
              }),
            ],
          }),
        ],
      });
      $[22] = retrySuffix;
      $[23] = unavailableRow;
    } else unavailableRow = $[23];
    return unavailableRow;
  }
  let noResponse = status.error.noResponse;
  if (noResponse) {
    let isFinalAttempt = status.attempt >= status.maxRetries;
    let retryWaitText;
    if ($[24] !== noResponse.retryWaitMs) {
      retryWaitText = formatDurationCoarse(noResponse.retryWaitMs);
      $[24] = noResponse.retryWaitMs;
      $[25] = retryWaitText;
    } else retryWaitText = $[25];
    let retryWaitText_2 = retryWaitText;
    let retrySuffix = isFinalAttempt
      ? ` \xB7 retrying once, waiting up to ${retryWaitText_2}`
      : ` \xB7 retrying, waiting up to ${retryWaitText_2} \xB7 attempt ${status.attempt}/${status.maxRetries}`;
    let max = Math.max(10, columns - 2 - bunStringWidth(retrySuffix) - 2);
    let waitedText;
    if ($[26] !== noResponse.waitedMs) {
      waitedText = formatDurationCoarse(noResponse.waitedMs);
      $[26] = noResponse.waitedMs;
      $[27] = waitedText;
    } else waitedText = $[27];
    const noResponseText = `No response from the API after ${waitedText}`;
    let children;
    if ($[28] !== max || $[29] !== noResponseText) {
      children = truncateToWidth(noResponseText, max);
      $[28] = max;
      $[29] = noResponseText;
      $[30] = children;
    } else children = $[30];
    let headlineElement;
    if ($[31] !== children) {
      headlineElement = jsxProd_default(Text, {
        color: "error",
        children,
      });
      $[31] = children;
      $[32] = headlineElement;
    } else headlineElement = $[32];
    let suffixElement;
    if ($[33] !== retrySuffix) {
      suffixElement = jsxProd_default(Text, {
        dimColor: true,
        children: retrySuffix,
      });
      $[33] = retrySuffix;
      $[34] = suffixElement;
    } else suffixElement = $[34];
    let messageRow;
    if ($[35] !== suffixElement || $[36] !== headlineElement) {
      messageRow = jsxProd_default_2(Box, {
        children: [headlineElement, suffixElement],
      });
      $[35] = suffixElement;
      $[36] = headlineElement;
      $[37] = messageRow;
    } else messageRow = $[37];
    let proxyHint;
    if ($[38] === MEMO_CACHE_SENTINEL) {
      proxyHint = jsxProd_default(Text, {
        dimColor: true,
        children:
          "A proxy or gateway that buffers streaming responses can cause this \xB7 set CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS to change the first wait",
      });
      $[38] = proxyHint;
    } else proxyHint = $[38];
    let noResponseRow;
    if ($[39] !== messageRow) {
      noResponseRow = jsxProd_default_2(Fragment, {
        children: [
          errorMarker_2,
          jsxProd_default_2(Box, {
            flexBasis: 0,
            flexDirection: "column",
            flexGrow: 1,
            flexShrink: 1,
            children: [messageRow, proxyHint],
          }),
        ],
      });
      $[39] = messageRow;
      $[40] = noResponseRow;
    } else noResponseRow = $[40];
    return noResponseRow;
  }
  let rateLimits = status.error.rateLimits;
  let resetSuffix;
  if ($[41] !== rateLimits) {
    resetSuffix = rateLimits?.resetsAt ? ` (${formatResetTime(rateLimits.resetsAt)})` : "";
    $[41] = rateLimits;
    $[42] = resetSuffix;
  } else resetSuffix = $[42];
  let retrySuffix = ` \xB7 Retrying in ${delayText_2}${resetSuffix} \xB7 attempt ${status.attempt}/${status.maxRetries}`;
  let showDetails =
    status.attempt >= Math.min(3, status.maxRetries) ||
    status.error.isNetworkDown ||
    status.error.connection?.isSSLError ||
    rateLimits;
  let headline;
  if ($[43] !== rateLimits || $[44] !== showDetails || $[45] !== status.error.formatted) {
    let limitName = rateLimits?.rateLimitType
      ? getRateLimitDisplayName(rateLimits.rateLimitType)
      : "usage limit";
    headline = !showDetails
      ? API_ERROR_TEXT
      : rateLimits
        ? `${limitName[0]?.toUpperCase()}${limitName.slice(1)} reached`
        : status.error.formatted;
    $[43] = rateLimits;
    $[44] = showDetails;
    $[45] = status.error.formatted;
    $[46] = headline;
  } else headline = $[46];
  let headlineText = headline;
  let max = Math.max(10, columns - 2 - bunStringWidth(retrySuffix) - 2);
  let truncated;
  if ($[47] !== max || $[48] !== headlineText) {
    truncated = truncateToWidth(headlineText, max);
    $[47] = max;
    $[48] = headlineText;
    $[49] = truncated;
  } else truncated = $[49];
  let children = truncated;
  let headlineElement;
  if ($[50] !== children) {
    headlineElement = jsxProd_default(Text, {
      color: "error",
      children,
    });
    $[50] = children;
    $[51] = headlineElement;
  } else headlineElement = $[51];
  let suffixElement;
  if ($[52] !== retrySuffix) {
    suffixElement = jsxProd_default(Text, {
      dimColor: true,
      children: retrySuffix,
    });
    $[52] = retrySuffix;
    $[53] = suffixElement;
  } else suffixElement = $[53];
  let retryRow;
  if ($[54] !== headlineElement || $[55] !== suffixElement) {
    retryRow = jsxProd_default_2(Fragment, {
      children: [
        errorMarker_2,
        jsxProd_default_2(Box, {
          flexShrink: 1,
          children: [headlineElement, suffixElement],
        }),
      ],
    });
    $[54] = headlineElement;
    $[55] = suffixElement;
    $[56] = retryRow;
  } else retryRow = $[56];
  return retryRow;
}
//@ chunk-hzenv5c0.js:18872-19262 fingerprint (2.1.88 match: SpinnerModeGlyph, 0.805)
function SpinnerModeGlyph(props) {
  let $ = useMemoCache(2);
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
export { THINKING_BARE_WIDTH, renderBylineItem, RetryStatusRow, SpinnerAnimationRow };
