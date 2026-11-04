/**
 * components/permissions/AskUserQuestionPermissionRequest/PreviewBox.tsx
 *
 * 问题选项预览框（等宽边框绘制，超出行数显示 "N lines hidden"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/PreviewBox.tsx
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: placement 8, fingerprint 2
 */
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../../ink/components/Text.js";
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { squashSingleText } from "../../../ink/layout/node.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { renderMarkdownToAnsi } from "../../../utils/markdown.js";
import { wrapAnsi } from "../../../ink/wrapAnsi.js";
import { repeatString } from "../../../utils/stringUtils.js";
import { truncate as truncate_2 } from "../../../ink/wrap-text.js";
import { ELLIPSIS } from "../../../ink/styles.js";
import { Ansi } from "../../../ink/components/AnsiText.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1270669-1271136 placement
function PreviewBox(props) {
  let $ = useMemoCache(7);
  let settings = useIsScreenReaderEnabled();
  let children;
  if ($[0] !== settings || $[1] !== props.runs) {
    let renderRun;
    if ($[3] !== settings) {
      renderRun = (run, key) => {
        switch (run.kind) {
          case "text": {
            return jsxProd_default(
              Text,
              {
                children: run.text,
              },
              key,
            );
          }
          case "fileLink": {
            return settings
              ? jsxProd_default(
                  Text,
                  {
                    children: run.label,
                  },
                  key,
                )
              : jsxProd_default(
                  Link,
                  {
                    url: run.url,
                    fallback: `${run.label} (${run.path})`,
                    children: run.label,
                  },
                  key,
                );
          }
        }
      };
      $[3] = settings;
      $[4] = renderRun;
    } else renderRun = $[4];
    children = props.runs.map(renderRun);
    $[0] = settings;
    $[1] = props.runs;
    $[2] = children;
  } else children = $[2];
  let previewText;
  if ($[5] !== children) {
    previewText = jsxProd_default(Text, {
      color: "inactive",
      children,
    });
    $[5] = children;
    $[6] = previewText;
  } else previewText = $[6];
  return previewText;
}
//@ chunk-18hwfzwa.js:1271136-1271140 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1271136", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1271140-1271251 placement
/**
 * 问题预览框的最大长度，以及预览无法完整显示时的提示文本。
 */
var MAX_PREVIEW_LENGTH = 2000;
var PREVIEW_WITHHELD_TEXT =
  "(preview cannot be shown in full \u2014 compare the option labels and descriptions instead)";
//@ chunk-18hwfzwa.js:1271251-1271255 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1271251", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1271255-1271287 placement
function layoutNode(node) {
  return squashSingleText(node);
}
//@ chunk-18hwfzwa.js:1271287-1271318 placement
function nodeWidth(text) {
  return bunStringWidth(text);
}
//@ chunk-18hwfzwa.js:1271318-1271476 fingerprint = BOX_CHARS (1)
var BOX_CHARS = {
  topLeft: "\u250C",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  vertical: "\u2502",
  teeLeft: "\u251C",
  teeRight: "\u2524",
};
//@ chunk-18hwfzwa.js:1271755-1274144 fingerprint = PreviewBoxBody (0.928)
function PreviewBoxBody(props) {
  let $ = useMemoCache(37);
  let { content, maxLines, minHeight, minWidth, maxWidth, highlight } = props;
  let minWidth_2 = minWidth === undefined ? 40 : minWidth;
  let { columns: terminalWidth } = useTerminalSize();
  let [theme] = useTheme();
  let effectiveMaxWidth = maxWidth ?? terminalWidth - 4;
  let effectiveMaxLines = maxLines ?? 20;
  let t2;
  if ($[0] !== content || $[1] !== highlight || $[2] !== theme) {
    t2 = renderMarkdownToAnsi(content, theme, highlight);
    $[0] = content;
    $[1] = highlight;
    $[2] = theme;
    $[3] = t2;
  } else t2 = $[3];
  let rendered = t2;
  let max = Math.max(1, effectiveMaxWidth - 4);
  let containerComponent;
  let bottomBorder;
  let flexDirection;
  let topBorderElement;
  let t5;
  let truncationBar;
  if (
    $[4] !== effectiveMaxLines ||
    $[5] !== effectiveMaxWidth ||
    $[6] !== minHeight ||
    $[7] !== minWidth_2 ||
    $[8] !== rendered ||
    $[9] !== max
  ) {
    const mapped = rendered
      .split(
        `
`,
      )
      .map(layoutNode);
    let wrapLine;
    if ($[16] !== max) {
      wrapLine = (line) =>
        bunStringWidth(line) > max
          ? wrapAnsi(line, max, {
              hard: true,
              trim: false,
            }).split(`
`)
          : line;
      $[16] = max;
      $[17] = wrapLine;
    } else wrapLine = $[17];
    let contentLines = mapped.flatMap(wrapLine);
    let isTruncated = contentLines.length > effectiveMaxLines;
    let truncatedLines = isTruncated ? contentLines.slice(0, effectiveMaxLines) : contentLines;
    let effectiveMinHeight = Math.min(minHeight ?? 0, effectiveMaxLines);
    let paddingNeeded = Math.max(0, effectiveMinHeight - truncatedLines.length - (isTruncated ? 1 : 0));
    let lines = paddingNeeded > 0 ? [...truncatedLines, ...Array(paddingNeeded).fill("")] : truncatedLines;
    let contentWidth = Math.max(minWidth_2, ...lines.map(nodeWidth));
    let max_2 = Math.max(4, Math.min(contentWidth + 4, effectiveMaxWidth));
    let innerWidth = max_2 - 4;
    const topBorderWidth = max_2 - 2;
    let topBorderFill;
    if ($[18] !== topBorderWidth) {
      topBorderFill = repeatString(BOX_CHARS.horizontal, topBorderWidth);
      $[18] = topBorderWidth;
      $[19] = topBorderFill;
    } else topBorderFill = $[19];
    let topBorder = `${BOX_CHARS.topLeft}${topBorderFill}${BOX_CHARS.topRight}`;
    const bottomBorderWidth = max_2 - 2;
    let bottomBorderFill;
    if ($[20] !== bottomBorderWidth) {
      bottomBorderFill = repeatString(BOX_CHARS.horizontal, bottomBorderWidth);
      $[20] = bottomBorderWidth;
      $[21] = bottomBorderFill;
    } else bottomBorderFill = $[21];
    bottomBorder = `${BOX_CHARS.bottomLeft}${bottomBorderFill}${BOX_CHARS.bottomRight}`;
    truncationBar = isTruncated
      ? (() => {
          let hiddenCount = contentLines.length - effectiveMaxLines;
          let label = `${BOX_CHARS.horizontal.repeat(3)} \u2702 ${BOX_CHARS.horizontal.repeat(3)} ${hiddenCount} lines hidden `;
          let labelWidth = bunStringWidth(label);
          let fillWidth = Math.max(0, max_2 - 2 - labelWidth);
          return `${BOX_CHARS.teeLeft}${label}${BOX_CHARS.horizontal.repeat(fillWidth)}${BOX_CHARS.teeRight}`;
        })()
      : null;
    containerComponent = Box;
    flexDirection = "column";
    if ($[22] !== topBorder) {
      topBorderElement = jsxProd_default(Text, {
        dimColor: true,
        children: topBorder,
      });
      $[22] = topBorder;
      $[23] = topBorderElement;
    } else topBorderElement = $[23];
    let t8;
    if ($[24] !== innerWidth) {
      t8 = (line, index) => {
        let truncatedLine = innerWidth > 0 ? truncate_2(line, innerWidth, "end") : null;
        let displayLine = innerWidth < 1 ? "" : truncatedLine ? truncatedLine.head + ELLIPSIS : line;
        let padding = " ".repeat(Math.max(0, innerWidth - bunStringWidth(displayLine)));
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "row",
            children: [
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [BOX_CHARS.vertical, " "],
              }),
              jsxProd_default(Ansi, {
                children: displayLine,
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [padding, " ", BOX_CHARS.vertical],
              }),
            ],
          },
          index,
        );
      };
      $[24] = innerWidth;
      $[25] = t8;
    } else t8 = $[25];
    t5 = lines.map(t8);
    $[4] = effectiveMaxLines;
    $[5] = effectiveMaxWidth;
    $[6] = minHeight;
    $[7] = minWidth_2;
    $[8] = rendered;
    $[9] = max;
    $[10] = containerComponent;
    $[11] = bottomBorder;
    $[12] = flexDirection;
    $[13] = topBorderElement;
    $[14] = t5;
    $[15] = truncationBar;
  } else {
    containerComponent = $[10];
    bottomBorder = $[11];
    flexDirection = $[12];
    topBorderElement = $[13];
    t5 = $[14];
    truncationBar = $[15];
  }
  let t6;
  if ($[26] !== truncationBar) {
    t6 =
      truncationBar &&
      jsxProd_default(Text, {
        color: "warning",
        children: truncationBar,
      });
    $[26] = truncationBar;
    $[27] = t6;
  } else t6 = $[27];
  let t7;
  if ($[28] !== bottomBorder) {
    t7 = jsxProd_default(Text, {
      dimColor: true,
      children: bottomBorder,
    });
    $[28] = bottomBorder;
    $[29] = t7;
  } else t7 = $[29];
  let t8;
  if (
    $[30] !== containerComponent ||
    $[31] !== flexDirection ||
    $[32] !== topBorderElement ||
    $[33] !== t5 ||
    $[34] !== t6 ||
    $[35] !== t7
  ) {
    t8 = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [topBorderElement, t5, t6, t7],
    });
    $[30] = containerComponent;
    $[31] = flexDirection;
    $[32] = topBorderElement;
    $[33] = t5;
    $[34] = t6;
    $[35] = t7;
    $[36] = t8;
  } else t8 = $[36];
  return t8;
}
//@ chunk-18hwfzwa.js:1274144-1274148 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1274144", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1274148-1274152 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1274148", () => {
  init_react_production();
});
export { PreviewBoxBody, PREVIEW_WITHHELD_TEXT, PreviewBox, MAX_PREVIEW_LENGTH };
