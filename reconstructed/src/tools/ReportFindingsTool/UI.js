/**
 * tools/ReportFindingsTool/UI.tsx
 *
 * 2.1.316 新增：按文件分组显示审查发现；一条审查发现等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (16)
 * attribution: placement 16
 */
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";
import { usePrefersReducedMotion, SPINNER_FLAG_PRIORITY } from "../../components/Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { ShimmerChar } from "../../components/PromptInput/ShimmeredInput.js";
import { truncateToWidthNoEllipsis } from "../../utils/format.js";

//@ chunk-ah34pb7m.js:25831-25860 placement
/**
 * 恒返回 null：该工具没有工具调用展示。
 */
function noFindingToolUseMessage(input, progressMessages) {
  return null;
}
//@ chunk-ah34pb7m.js:25860-25886 placement
/**
 * 恒返回 null：该工具没有进度展示。
 */
function noFindingProgressMessage() {
  return null;
}
//@ chunk-ah34pb7m.js:25886-25915 placement
/**
 * 恒返回 null：该工具没有错误展示。
 */
function noFindingError(result, progressMessages) {
  return null;
}
//@ chunk-ah34pb7m.js:25915-25980 placement
/**
 * 计算行号列的显示宽度。
 */
function lineNumberWidth(finding) {
  return finding.line === undefined ? 0 : String(finding.line).length;
}
//@ chunk-ah34pb7m.js:25980-26040 placement
/**
 * 计算类别标签 “[类别]” 的显示宽度。
 */
function categoryTagWidth(finding) {
  return finding.category ? bunStringWidth(`[${finding.category}]`) : 0;
}
//@ chunk-ah34pb7m.js:26040-26093 placement
/**
 * 结论到颜色的映射（CONFIRMED→error、PLAUSIBLE→warning）。
 */
var VERDICT_COLORS = {
  CONFIRMED: "error",
  PLAUSIBLE: "warning",
};
var MIN_VERDICT_ROW_WIDTH = 16;
//@ chunk-ah34pb7m.js:26093-26208 placement
function renderFindingsResult(result, progressMessages, { verbose }) {
  let findings = result?.findings ?? [];
  if (findings.length === 0) return null;
  return jsxProd_default(FindingsList, {
    findings,
    verbose,
  });
}
//@ chunk-ah34pb7m.js:26208-27947 placement
/**
 * 按文件分组显示审查发现。
 */
function FindingsList(props) {
  let $ = useMemoCache(23);
  let { findings, verbose } = props;
  let { columns } = useTerminalSize();
  let Container;
  let MessageWrapper;
  let flexDirection;
  let children;
  if ($[0] !== columns || $[1] !== findings || $[2] !== verbose) {
    let byFile = new Map();
    for (const finding of findings) {
      let fileFindings = byFile.get(finding.file) ?? [];
      fileFindings.push(finding);
      byFile.set(finding.file, fileFindings);
    }
    let lineWidth;
    if ($[7] !== findings) {
      lineWidth = Math.max(0, ...findings.map(lineNumberWidth));
      $[7] = findings;
      $[8] = lineWidth;
    } else lineWidth = $[8];
    let lineNumberWidth_2 = lineWidth;
    let tagWidth;
    if ($[9] !== findings) {
      tagWidth = Math.max(0, ...findings.map(categoryTagWidth));
      $[9] = findings;
      $[10] = tagWidth;
    } else tagWidth = $[10];
    let min = Math.min(24, tagWidth);
    let verdictWidth =
      columns - 14 - (lineNumberWidth_2 > 0 ? lineNumberWidth_2 + 1 : 0) - (min > 0 ? min + 1 : 0);
    let fitsOneRow = verdictWidth >= MIN_VERDICT_ROW_WIDTH;
    MessageWrapper = MessageResponse;
    Container = Box;
    flexDirection = "column";
    const fileEntries = [...byFile.entries()];
    let renderFileGroup;
    if ($[11] !== fitsOneRow || $[12] !== min || $[13] !== lineNumberWidth_2 || $[14] !== verbose) {
      renderFileGroup = (fileEntry) => {
        let [fileName, fileFindings] = fileEntry;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                color: "suggestion",
                children: fileName,
              }),
              fileFindings.map((finding, findingIndex) =>
                jsxProd_default_2(
                  Box,
                  {
                    flexDirection: "column",
                    children: [
                      fitsOneRow
                        ? jsxProd_default_2(Box, {
                            columnGap: 1,
                            paddingLeft: 2,
                            children: [
                              jsxProd_default(Box, {
                                flexShrink: 0,
                                children: jsxProd_default(FindingStatusIcon, {
                                  finding,
                                }),
                              }),
                              lineNumberWidth_2 > 0
                                ? jsxProd_default(Box, {
                                    flexShrink: 0,
                                    width: lineNumberWidth_2,
                                    justifyContent: "flex-end",
                                    children: jsxProd_default(Text, {
                                      color: "suggestion",
                                      children: finding.line,
                                    }),
                                  })
                                : null,
                              min > 0
                                ? jsxProd_default(Box, {
                                    flexShrink: 0,
                                    width: min,
                                    children: jsxProd_default(Text, {
                                      dimColor: true,
                                      children: finding.category ? `[${finding.category}]` : "",
                                    }),
                                  })
                                : null,
                              jsxProd_default(Box, {
                                flexGrow: 1,
                                children: jsxProd_default(FindingRow, {
                                  finding,
                                }),
                              }),
                            ],
                          })
                        : jsxProd_default(Box, {
                            paddingLeft: 2,
                            children: jsxProd_default_2(Text, {
                              wrap: "wrap",
                              children: [
                                jsxProd_default(FindingStatusIcon, {
                                  finding,
                                }),
                                finding.line === undefined
                                  ? null
                                  : jsxProd_default_2(Text, {
                                      color: "suggestion",
                                      children: [" ", finding.line],
                                    }),
                                finding.category
                                  ? jsxProd_default_2(Text, {
                                      dimColor: true,
                                      children: [" [", finding.category, "]"],
                                    })
                                  : null,
                                " ",
                                jsxProd_default(FindingRow, {
                                  finding,
                                }),
                              ],
                            }),
                          }),
                      verbose &&
                        jsxProd_default(Box, {
                          paddingLeft: 4,
                          children: jsxProd_default(Text, {
                            dimColor: true,
                            wrap: "wrap",
                            children: finding.failure_scenario,
                          }),
                        }),
                    ],
                  },
                  findingIndex,
                ),
              ),
            ],
          },
          fileName,
        );
      };
      $[11] = fitsOneRow;
      $[12] = min;
      $[13] = lineNumberWidth_2;
      $[14] = verbose;
      $[15] = renderFileGroup;
    } else renderFileGroup = $[15];
    children = fileEntries.map(renderFileGroup);
    $[0] = columns;
    $[1] = findings;
    $[2] = verbose;
    $[3] = Container;
    $[4] = MessageWrapper;
    $[5] = flexDirection;
    $[6] = children;
  } else {
    Container = $[3];
    MessageWrapper = $[4];
    flexDirection = $[5];
    children = $[6];
  }
  let children_2;
  if ($[16] !== Container || $[17] !== flexDirection || $[18] !== children) {
    children_2 = jsxProd_default(Container, {
      flexDirection,
      children,
    });
    $[16] = Container;
    $[17] = flexDirection;
    $[18] = children;
    $[19] = children_2;
  } else children_2 = $[19];
  let wrapped;
  if ($[20] !== MessageWrapper || $[21] !== children_2) {
    wrapped = jsxProd_default(MessageWrapper, {
      children: children_2,
    });
    $[20] = MessageWrapper;
    $[21] = children_2;
    $[22] = wrapped;
  } else wrapped = $[22];
  return wrapped;
}
//@ chunk-ah34pb7m.js:27947-28194 placement
function FindingStatusIcon(props) {
  let $ = useMemoCache(3);
  let { finding } = props;
  const color =
    finding.outcome === "fixed" ? "success" : finding.verdict ? VERDICT_COLORS[finding.verdict] : undefined;
  const children = finding.outcome === "fixed" ? "\u2713" : "\u25CF";
  let icon;
  if ($[0] !== color || $[1] !== children) {
    icon = jsxProd_default(Text, {
      color,
      children,
    });
    $[0] = color;
    $[1] = children;
    $[2] = icon;
  } else icon = $[2];
  return icon;
}
//@ chunk-ah34pb7m.js:28194-28548 placement
/**
 * 一条审查发现。
 */
function FindingRow(props) {
  let $ = useMemoCache(5);
  let { finding } = props;
  let outcomeNote;
  if ($[0] !== finding.outcome) {
    outcomeNote =
      finding.outcome && finding.outcome !== "fixed"
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [" [", finding.outcome === "skipped" ? "skipped" : "no change needed", "]"],
          })
        : null;
    $[0] = finding.outcome;
    $[1] = outcomeNote;
  } else outcomeNote = $[1];
  let row;
  if ($[2] !== finding.summary || $[3] !== outcomeNote) {
    row = jsxProd_default_2(Text, {
      wrap: "wrap",
      children: [finding.summary, outcomeNote],
    });
    $[2] = finding.summary;
    $[3] = outcomeNote;
    $[4] = row;
  } else row = $[4];
  return row;
}
//@ chunk-ah34pb7m.js:28548-28558 placement
/**
 * 微光动画的边缘留白（10）。
 */
var SHIMMER_MARGIN = 10;
//@ chunk-ah34pb7m.js:28558-28744 placement
function useShimmerOffset(textWidth) {
  let $ = useMemoCache(3);
  let prefersReducedMotion = usePrefersReducedMotion();
  let shouldAnimate = textWidth > 0 && !prefersReducedMotion;
  let [frame, elapsedMs] = useAnimationFrame(shouldAnimate ? 50 : null);
  let cycleWidth = textWidth + SHIMMER_MARGIN * 2;
  const glimmerIndex = shouldAnimate
    ? (Math.floor(elapsedMs / 50) % cycleWidth) - SHIMMER_MARGIN
    : SPINNER_FLAG_PRIORITY;
  let result;
  if ($[0] !== frame || $[1] !== glimmerIndex) {
    result = [frame, glimmerIndex];
    $[0] = frame;
    $[1] = glimmerIndex;
    $[2] = result;
  } else result = $[2];
  return result;
}
//@ chunk-ah34pb7m.js:28744-29075 placement = ShimmerChar (0.914)
/**
 * 闪烁文字。
 */
function ShimmerText(props) {
  let $ = useMemoCache(7);
  let { text, color, shimmerColor, glimmerIndex } = props;
  let chars;
  if ($[0] !== text) {
    chars = [...text];
    $[0] = text;
    $[1] = chars;
  } else chars = $[1];
  let element;
  if ($[2] !== color || $[3] !== glimmerIndex || $[4] !== shimmerColor || $[5] !== chars) {
    element = jsxProd_default(Text, {
      children: chars.map((char, charIndex) =>
        jsxProd_default(
          ShimmerChar,
          {
            char,
            index: charIndex,
            glimmerIndex,
            messageColor: color,
            shimmerColor,
          },
          charIndex,
        ),
      ),
    });
    $[2] = color;
    $[3] = glimmerIndex;
    $[4] = shimmerColor;
    $[5] = chars;
    $[6] = element;
  } else element = $[6];
  return element;
}
//@ chunk-ah34pb7m.js:29075-29102 placement
/**
 * 恒返回 null：该工具没有结果展示。
 */
function noFindingResultMessage(input) {
  return null;
}
//@ chunk-ah34pb7m.js:29102-29118 placement
/**
 * 摘要最多显示的行数（2）。
 */
var MAX_SUMMARY_LINES = 2;
var MAX_SUMMARY_DISPLAY_COLS = 160;
//@ chunk-ah34pb7m.js:29118-29236 placement
function truncateFindingSummary(rawCommand) {
  let lines = rawCommand.split(`
`);
  let summary = rawCommand;
  if (lines.length > MAX_SUMMARY_LINES)
    summary = lines.slice(0, MAX_SUMMARY_LINES).join(`
`);
  if (bunStringWidth(summary) > MAX_SUMMARY_DISPLAY_COLS)
    summary = truncateToWidthNoEllipsis(summary, MAX_SUMMARY_DISPLAY_COLS);
  return summary.trim();
}
export {
  truncateFindingSummary,
  useShimmerOffset,
  ShimmerText,
  renderFindingsResult,
  noFindingError,
  noFindingToolUseMessage,
  noFindingProgressMessage,
  noFindingResultMessage,
};
