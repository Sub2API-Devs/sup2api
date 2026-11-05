/**
 * components/HighlightedCode.tsx
 *
 * 语法高亮代码块（带行号、宽度裁剪、"… from line N" 截断），高亮结果按内容缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HighlightedCode.tsx
 * pieces: chunk-abjyap5m.js (4), chunk-hnxhr3bs.js (1)
 * attribution: fingerprint 2, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { memo, useRef, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme } from "./design-system/ThemeProvider.js";
import { useSettingsState } from "../hooks/useSettings.js";
import { getColorFile } from "../native-ts/color-diff/index.js";
import { convertLeadingTabsToSpaces } from "../utils/file.js";
import { measureElement } from "../ink/hooks/useTerminalHooks.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Ansi } from "../ink/components/AnsiText.js";
import {
  renderFallbackText,
  HighlightedCodeFallback,
  protectLongLines,
  restoreLongLines,
  fallbackLineCount,
  visibleLineIndexes,
} from "./HighlightedCode/Fallback.js";
import { squashTextOf } from "../ink/layout/node.js";
import { measureTextAlias } from "../ink/squash-text-nodes.js";
import { countCharInString } from "../utils/stringUtils.js";
import { wrapText } from "../ink/wrap-text.js";
import { NoSelect } from "../ink/components/Input.js";
import { shouldShowNotice } from "./SlashCommandLink.js";
import { SPINNER_COLUMN_MIN_WIDTH } from "./Spinner/SpinnerColumn.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { shrinkTerminalSize } from "./Messages.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-abjyap5m.js:3215-5545 fingerprint (2.1.88 match: HighlightedCode, 0.346)
/**
 * 语法高亮代码：{code, filePath, width, dim, startLine, lineNumbers}；按扩展名选语言，结果缓存，超长截断为 "… from line N"。
 */
var HIGHLIGHT_MAX_WIDTH; // deferred: uses useTheme (./design-system/ThemeProvider.js) of its import cycle while loading; runs once the cycle is complete
var HighlightedCode;
deferInit("chunk-abjyap5m.js:3215", () => {
  HIGHLIGHT_MAX_WIDTH = 80;
  HighlightedCode = memo(function (props) {
    let $ = useMemoCache(40);
    let { code, filePath, width, dim, startLine, lineNumbers } = props;
    let isDim = dim === undefined ? false : dim;
    let firstLine = startLine === undefined ? 1 : startLine;
    let showLineNumbers = lineNumbers === undefined ? true : lineNumbers;
    let ref = useRef(null);
    let [measuredWidth, setMeasuredWidth] = useState(HIGHLIGHT_MAX_WIDTH);
    let effectiveWidth = width || measuredWidth;
    let [theme] = useTheme();
    let syntaxHighlightingDisabled = useSettingsState().syntaxHighlightingDisabled ?? false;
    let colorFile;
    if ($[0] !== code || $[1] !== filePath || $[2] !== syntaxHighlightingDisabled) {
      _e: {
        if (syntaxHighlightingDisabled) {
          colorFile = null;
          break _e;
        }
        let colorFile_2 = getColorFile();
        if (!colorFile_2) {
          colorFile = null;
          break _e;
        }
        colorFile = new colorFile_2(convertLeadingTabsToSpaces(code), filePath);
      }
      $[0] = code;
      $[1] = filePath;
      $[2] = syntaxHighlightingDisabled;
      $[3] = colorFile;
    } else colorFile = $[3];
    let highlighter = colorFile;
    let measureEffect;
    let measureDeps;
    if ($[4] !== width) {
      measureEffect = () => {
        if (!width && ref.current) {
          let { width: elementWidth } = measureElement(ref.current);
          if (elementWidth > 0) setMeasuredWidth(elementWidth - 2);
        }
      };
      measureDeps = [width];
      $[4] = width;
      $[5] = measureEffect;
      $[6] = measureDeps;
    } else {
      measureEffect = $[5];
      measureDeps = $[6];
    }
    useEffect(measureEffect, measureDeps);
    let lineCount;
    if ($[7] !== code) {
      lineCount = countLines(code);
      $[7] = code;
      $[8] = lineCount;
    } else lineCount = $[8];
    let gutterWidth = String(lineCount).length + 2;
    let numbering;
    Ci: {
      if (!showLineNumbers || firstLine === 1) {
        numbering = null;
        break Ci;
      }
      let count = countLines(code);
      let digits = String(firstLine + count - 1).length;
      const extraCols = Math.max(0, digits - String(count).length);
      let digitsInfo;
      if ($[9] !== digits || $[10] !== extraCols) {
        digitsInfo = {
          digits,
          extraCols,
        };
        $[9] = digits;
        $[10] = extraCols;
        $[11] = digitsInfo;
      } else digitsInfo = $[11];
      numbering = digitsInfo;
    }
    let digitsInfo = numbering;
    let showFromLine = useIsFullscreen() || firstLine !== 1;
    let highlighted;
    Gi: {
      if (highlighter === null) {
        highlighted = null;
        break Gi;
      }
      let renderWidth = effectiveWidth - (digitsInfo?.extraCols ?? 0) + (showLineNumbers ? 0 : gutterWidth);
      if (showLineNumbers && !showFromLine) {
        let lines;
        if ($[12] !== highlighter || $[13] !== renderWidth || $[14] !== isDim || $[15] !== theme) {
          lines = highlighter.render(theme, renderWidth, isDim) ?? [];
          $[12] = highlighter;
          $[13] = renderWidth;
          $[14] = isDim;
          $[15] = theme;
          $[16] = lines;
        } else lines = $[16];
        let unsplit;
        if ($[17] !== lines) {
          unsplit = {
            split: false,
            lines,
          };
          $[17] = lines;
          $[18] = unsplit;
        } else unsplit = $[18];
        highlighted = unsplit;
        break Gi;
      }
      let splitResult;
      if ($[19] !== highlighter || $[20] !== renderWidth || $[21] !== isDim || $[22] !== theme) {
        splitResult = highlighter.renderSplit(theme, renderWidth, isDim);
        $[19] = highlighter;
        $[20] = renderWidth;
        $[21] = isDim;
        $[22] = theme;
        $[23] = splitResult;
      } else splitResult = $[23];
      let { gutters, contents } = splitResult;
      let splitHighlight;
      if ($[24] !== contents || $[25] !== gutters) {
        splitHighlight = {
          split: true,
          gutters,
          contents,
        };
        $[24] = contents;
        $[25] = gutters;
        $[26] = splitHighlight;
      } else splitHighlight = $[26];
      highlighted = splitHighlight;
    }
    let rendered = highlighted;
    let displayGutters;
    Ni: {
      if (digitsInfo === null || rendered === null || !rendered.split) {
        displayGutters = null;
        break Ni;
      }
      let { digits } = digitsInfo;
      let gutters;
      if ($[27] !== digits || $[28] !== rendered.gutters || $[29] !== firstLine) {
        let lineNumber = firstLine;
        gutters = rendered.gutters.map((gutter) => {
          if (stripAnsi(gutter).trim() === "") {
            return " ".repeat(digits + 2);
          }
          let currentLine = lineNumber;
          lineNumber = lineNumber + 1;
          return ` ${String(currentLine).padStart(digits)} `;
        });
        $[27] = digits;
        $[28] = rendered.gutters;
        $[29] = firstLine;
        $[30] = gutters;
      } else gutters = $[30];
      displayGutters = gutters;
    }
    let displayGutters_2 = displayGutters;
    let element;
    if (
      $[31] !== code ||
      $[32] !== isDim ||
      $[33] !== displayGutters_2 ||
      $[34] !== filePath ||
      $[35] !== showLineNumbers ||
      $[36] !== rendered ||
      $[37] !== firstLine ||
      $[38] !== syntaxHighlightingDisabled
    ) {
      element = jsxProd_default(Box, {
        ref,
        children: rendered
          ? jsxProd_default(Box, {
              flexDirection: "column",
              children: rendered.split
                ? rendered.contents.map((content, lineIndex) =>
                    !showLineNumbers
                      ? jsxProd_default(
                          Text,
                          {
                            children: jsxProd_default(Ansi, {
                              children: content,
                            }),
                          },
                          lineIndex,
                        )
                      : jsxProd_default(
                          CodeLineRow,
                          {
                            gutter: rendered.gutters[lineIndex],
                            content,
                            displayGutter: displayGutters_2?.[lineIndex],
                          },
                          lineIndex,
                        ),
                  )
                : rendered.lines.map(renderFallbackText),
            })
          : jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                showLineNumbers &&
                  firstLine !== 1 &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["\u2026 from line ", firstLine],
                  }),
                jsxProd_default(HighlightedCodeFallback, {
                  code,
                  filePath,
                  dim: isDim,
                  skipColoring: syntaxHighlightingDisabled,
                }),
              ],
            }),
      });
      $[31] = code;
      $[32] = isDim;
      $[33] = displayGutters_2;
      $[34] = filePath;
      $[35] = showLineNumbers;
      $[36] = rendered;
      $[37] = firstLine;
      $[38] = syntaxHighlightingDisabled;
      $[39] = element;
    } else element = $[39];
    return element;
  });
});
//@ chunk-abjyap5m.js:5545-6164 placement
/**
 * 计算代码每个逻辑行折行后占用的屏幕行数：无高亮器或禁用高亮时按纯文本折行估算，否则用高亮器 renderSplit 的 gutter 位置差得出。
 */
function useHighlightedLineHeights(code, filePath, width) {
  let $ = useMemoCache(8);
  let [theme] = useTheme();
  let syntaxHighlightingDisabled = useSettingsState().syntaxHighlightingDisabled ?? false;
  let heights;
  if (
    $[0] !== code ||
    $[1] !== filePath ||
    $[2] !== syntaxHighlightingDisabled ||
    $[3] !== theme ||
    $[4] !== width
  ) {
    W: {
      let colorFile = syntaxHighlightingDisabled ? null : getColorFile();
      if (colorFile === null) {
        let { text, markers } = protectLongLines(convertLeadingTabsToSpaces(code));
        let joined = squashTextOf([restoreLongLines(text, markers)]);
        let lines = joined.split(`
`);
        if (lines.length > 1 && lines.at(-1) === "") lines.pop();
        if (measureTextAlias(joined, width).width <= width) {
          heights = lines.map(fallbackLineCount);
          break W;
        }
        let countLineHeight;
        if ($[6] !== width) {
          countLineHeight = (line) =>
            Math.max(
              1,
              countCharInString(
                wrapText(line.replace(/\r$/, ""), width, "wrap"),
                `
`,
              ) + 1,
            );
          $[6] = width;
          $[7] = countLineHeight;
        } else countLineHeight = $[7];
        heights = lines.map(countLineHeight);
        break W;
      }
      let { gutters } = new colorFile(convertLeadingTabsToSpaces(code), filePath).renderSplit(
        theme,
        width,
        false,
      );
      let flattened = gutters.flatMap(visibleLineIndexes);
      heights = flattened.map(
        (lineIndex, heightIndex) => (flattened[heightIndex + 1] ?? gutters.length) - lineIndex,
      );
    }
    $[0] = code;
    $[1] = filePath;
    $[2] = syntaxHighlightingDisabled;
    $[3] = theme;
    $[4] = width;
    $[5] = heights;
  } else heights = $[5];
  return heights;
}
//@ chunk-abjyap5m.js:6164-6225 placement
function countLines(code) {
  let count =
    countCharInString(
      code,
      `
`,
    ) + 1;
  return code.endsWith(`
`)
    ? count - 1
    : count;
}
//@ chunk-abjyap5m.js:6225-6653 placement
/**
 * 渲染代码的一行：不可选中的行号槽位加内容。
 */
function CodeLineRow(props) {
  let $ = useMemoCache(8);
  let { gutter, content, displayGutter } = props;
  let gutterText;
  if ($[0] !== displayGutter || $[1] !== gutter) {
    gutterText = jsxProd_default(NoSelect, {
      fromLeftEdge: true,
      children:
        displayGutter === undefined
          ? jsxProd_default(Text, {
              children: jsxProd_default(Ansi, {
                children: gutter,
              }),
            })
          : jsxProd_default(Text, {
              dimColor: true,
              children: displayGutter,
            }),
    });
    $[0] = displayGutter;
    $[1] = gutter;
    $[2] = gutterText;
  } else gutterText = $[2];
  let contentText;
  if ($[3] !== content) {
    contentText = jsxProd_default(Text, {
      children: jsxProd_default(Ansi, {
        children: content,
      }),
    });
    $[3] = content;
    $[4] = contentText;
  } else contentText = $[4];
  let row;
  if ($[5] !== gutterText || $[6] !== contentText) {
    row = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [gutterText, contentText],
    });
    $[5] = gutterText;
    $[6] = contentText;
    $[7] = row;
  } else row = $[7];
  return row;
}
//@ chunk-hnxhr3bs.js:154391-154948 fingerprint (2.1.88 match: CodeLine, 0.514)
function CodeLine(props) {
  let $ = useMemoCache(13);
  let { verbose, children } = props;
  let gutterWidth = shouldShowNotice(verbose) ? SPINNER_COLUMN_MIN_WIDTH : 0;
  let line = useTerminalSize();
  let t1;
  if ($[0] !== gutterWidth || $[1] !== line) {
    t1 = shrinkTerminalSize(line, gutterWidth);
    $[0] = gutterWidth;
    $[1] = line;
    $[2] = t1;
  } else t1 = $[2];
  let value = t1;
  if (gutterWidth === 0) {
    return children;
  }
  let gutter;
  if ($[3] !== gutterWidth) {
    gutter = jsxProd_default(NoSelect, {
      fromLeftEdge: true,
      minWidth: gutterWidth,
    });
    $[3] = gutterWidth;
    $[4] = gutter;
  } else gutter = $[4];
  let contentBox;
  if ($[5] !== children) {
    contentBox = jsxProd_default(Box, {
      flexGrow: 1,
      flexDirection: "column",
      children,
    });
    $[5] = children;
    $[6] = contentBox;
  } else contentBox = $[6];
  let children_2;
  if ($[7] !== gutter || $[8] !== contentBox) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [gutter, contentBox],
    });
    $[7] = gutter;
    $[8] = contentBox;
    $[9] = children_2;
  } else children_2 = $[9];
  let t5;
  if ($[10] !== value || $[11] !== children_2) {
    t5 = jsxProd_default(TerminalSizeContext, {
      value,
      children: children_2,
    });
    $[10] = value;
    $[11] = children_2;
    $[12] = t5;
  } else t5 = $[12];
  return t5;
}
export { useHighlightedLineHeights, HighlightedCode, CodeLine };
