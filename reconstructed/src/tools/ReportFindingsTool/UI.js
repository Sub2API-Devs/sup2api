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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
function noFindingToolUseMessage(m, d) {
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
function noFindingError(m, d) {
  return null;
}
//@ chunk-ah34pb7m.js:25915-25980 placement
/**
 * 计算行号列的显示宽度。
 */
function lineNumberWidth(ae) {
  return ae.line === undefined ? 0 : String(ae.line).length;
}
//@ chunk-ah34pb7m.js:25980-26040 placement
/**
 * 计算类别标签 “[类别]” 的显示宽度。
 */
function categoryTagWidth(pe) {
  return pe.category ? bunStringWidth(`[${pe.category}]`) : 0;
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
function renderFindingsResult(m, d, { verbose }) {
  let findings = m?.findings ?? [];
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
  let f = w(23);
  let { findings, verbose } = props;
  let { columns } = useTerminalSize();
  let h;
  let M;
  let flexDirection;
  let children;
  if (f[0] !== columns || f[1] !== findings || f[2] !== verbose) {
    let k = new Map();
    for (const finding of findings) {
      let E = k.get(finding.file) ?? [];
      E.push(finding);
      k.set(finding.file, E);
    }
    let B;
    if (f[7] !== findings) {
      B = Math.max(0, ...findings.map(lineNumberWidth));
      f[7] = findings;
      f[8] = B;
    } else B = f[8];
    let L = B;
    let N;
    if (f[9] !== findings) {
      N = Math.max(0, ...findings.map(categoryTagWidth));
      f[9] = findings;
      f[10] = N;
    } else N = f[10];
    let min = Math.min(24, N);
    let U = columns - 14 - (L > 0 ? L + 1 : 0) - (min > 0 ? min + 1 : 0);
    let K = U >= MIN_VERDICT_ROW_WIDTH;
    M = MessageResponse;
    h = Box;
    flexDirection = "column";
    const V = [...k.entries()];
    let Y;
    if (f[11] !== K || f[12] !== min || f[13] !== L || f[14] !== verbose) {
      Y = (X) => {
        let [z, ee] = X;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                color: "suggestion",
                children: z,
              }),
              ee.map((le, ge) =>
                jsxProd_default_2(
                  Box,
                  {
                    flexDirection: "column",
                    children: [
                      K
                        ? jsxProd_default_2(Box, {
                            columnGap: 1,
                            paddingLeft: 2,
                            children: [
                              jsxProd_default(Box, {
                                flexShrink: 0,
                                children: jsxProd_default(FindingStatusIcon, {
                                  finding: le,
                                }),
                              }),
                              L > 0
                                ? jsxProd_default(Box, {
                                    flexShrink: 0,
                                    width: L,
                                    justifyContent: "flex-end",
                                    children: jsxProd_default(Text, {
                                      color: "suggestion",
                                      children: le.line,
                                    }),
                                  })
                                : null,
                              min > 0
                                ? jsxProd_default(Box, {
                                    flexShrink: 0,
                                    width: min,
                                    children: jsxProd_default(Text, {
                                      dimColor: true,
                                      children: le.category ? `[${le.category}]` : "",
                                    }),
                                  })
                                : null,
                              jsxProd_default(Box, {
                                flexGrow: 1,
                                children: jsxProd_default(FindingRow, {
                                  finding: le,
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
                                  finding: le,
                                }),
                                le.line === undefined
                                  ? null
                                  : jsxProd_default_2(Text, {
                                      color: "suggestion",
                                      children: [" ", le.line],
                                    }),
                                le.category
                                  ? jsxProd_default_2(Text, {
                                      dimColor: true,
                                      children: [" [", le.category, "]"],
                                    })
                                  : null,
                                " ",
                                jsxProd_default(FindingRow, {
                                  finding: le,
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
                            children: le.failure_scenario,
                          }),
                        }),
                    ],
                  },
                  ge,
                ),
              ),
            ],
          },
          z,
        );
      };
      f[11] = K;
      f[12] = min;
      f[13] = L;
      f[14] = verbose;
      f[15] = Y;
    } else Y = f[15];
    children = V.map(Y);
    f[0] = columns;
    f[1] = findings;
    f[2] = verbose;
    f[3] = h;
    f[4] = M;
    f[5] = flexDirection;
    f[6] = children;
  } else {
    h = f[3];
    M = f[4];
    flexDirection = f[5];
    children = f[6];
  }
  let children_2;
  if (f[16] !== h || f[17] !== flexDirection || f[18] !== children) {
    children_2 = jsxProd_default(h, {
      flexDirection,
      children,
    });
    f[16] = h;
    f[17] = flexDirection;
    f[18] = children;
    f[19] = children_2;
  } else children_2 = f[19];
  let N;
  if (f[20] !== M || f[21] !== children_2) {
    N = jsxProd_default(M, {
      children: children_2,
    });
    f[20] = M;
    f[21] = children_2;
    f[22] = N;
  } else N = f[22];
  return N;
}
//@ chunk-ah34pb7m.js:27947-28194 placement
function FindingStatusIcon(props) {
  let f = w(3);
  let { finding } = props;
  const color =
    finding.outcome === "fixed" ? "success" : finding.verdict ? VERDICT_COLORS[finding.verdict] : undefined;
  const children = finding.outcome === "fixed" ? "\u2713" : "\u25CF";
  let h;
  if (f[0] !== color || f[1] !== children) {
    h = jsxProd_default(Text, {
      color,
      children,
    });
    f[0] = color;
    f[1] = children;
    f[2] = h;
  } else h = f[2];
  return h;
}
//@ chunk-ah34pb7m.js:28194-28548 placement
/**
 * 一条审查发现。
 */
function FindingRow(props) {
  let c = w(5);
  let { finding } = props;
  let g;
  if (c[0] !== finding.outcome) {
    g =
      finding.outcome && finding.outcome !== "fixed"
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [" [", finding.outcome === "skipped" ? "skipped" : "no change needed", "]"],
          })
        : null;
    c[0] = finding.outcome;
    c[1] = g;
  } else g = c[1];
  let f;
  if (c[2] !== finding.summary || c[3] !== g) {
    f = jsxProd_default_2(Text, {
      wrap: "wrap",
      children: [finding.summary, g],
    });
    c[2] = finding.summary;
    c[3] = g;
    c[4] = f;
  } else f = c[4];
  return f;
}
//@ chunk-ah34pb7m.js:28548-28558 placement
/**
 * 微光动画的边缘留白（10）。
 */
var SHIMMER_MARGIN = 10;
//@ chunk-ah34pb7m.js:28558-28744 placement
function useShimmerOffset(m) {
  let T = w(3);
  let prefersReducedMotion = usePrefersReducedMotion();
  let c = m > 0 && !prefersReducedMotion;
  let [g, f] = useAnimationFrame(c ? 50 : null);
  let h = m + SHIMMER_MARGIN * 2;
  const M = c ? (Math.floor(f / 50) % h) - SHIMMER_MARGIN : SPINNER_FLAG_PRIORITY;
  let x;
  if (T[0] !== g || T[1] !== M) {
    x = [g, M];
    T[0] = g;
    T[1] = M;
    T[2] = x;
  } else x = T[2];
  return x;
}
//@ chunk-ah34pb7m.js:28744-29075 placement = ShimmerChar (0.914)
/**
 * 闪烁文字。
 */
function ShimmerText(props) {
  let $ = w(7);
  let { text, color, shimmerColor, glimmerIndex } = props;
  let M;
  if ($[0] !== text) {
    M = [...text];
    $[0] = text;
    $[1] = M;
  } else M = $[1];
  let T;
  if ($[2] !== color || $[3] !== glimmerIndex || $[4] !== shimmerColor || $[5] !== M) {
    T = jsxProd_default(Text, {
      children: M.map((char, k) =>
        jsxProd_default(
          ShimmerChar,
          {
            char,
            index: k,
            glimmerIndex,
            messageColor: color,
            shimmerColor,
          },
          k,
        ),
      ),
    });
    $[2] = color;
    $[3] = glimmerIndex;
    $[4] = shimmerColor;
    $[5] = M;
    $[6] = T;
  } else T = $[6];
  return T;
}
//@ chunk-ah34pb7m.js:29075-29102 placement
/**
 * 恒返回 null：该工具没有结果展示。
 */
function noFindingResultMessage(m) {
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
  let c = rawCommand;
  if (lines.length > MAX_SUMMARY_LINES)
    c = lines.slice(0, MAX_SUMMARY_LINES).join(`
`);
  if (bunStringWidth(c) > MAX_SUMMARY_DISPLAY_COLS)
    c = truncateToWidthNoEllipsis(c, MAX_SUMMARY_DISPLAY_COLS);
  return c.trim();
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
