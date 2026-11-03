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
import { w } from "../../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:1270669-1271136 placement
function PreviewBox(props) {
  let $ = w(7);
  let settings = useIsScreenReaderEnabled();
  let children;
  if ($[0] !== settings || $[1] !== props.runs) {
    let ee;
    if ($[3] !== settings) {
      ee = (ke, Re) => {
        switch (ke.kind) {
          case "text": {
            return jsxProd_default(
              Text,
              {
                children: ke.text,
              },
              Re,
            );
          }
          case "fileLink": {
            return settings
              ? jsxProd_default(
                  Text,
                  {
                    children: ke.label,
                  },
                  Re,
                )
              : jsxProd_default(
                  Link,
                  {
                    url: ke.url,
                    fallback: `${ke.label} (${ke.path})`,
                    children: ke.label,
                  },
                  Re,
                );
          }
        }
      };
      $[3] = settings;
      $[4] = ee;
    } else ee = $[4];
    children = props.runs.map(ee);
    $[0] = settings;
    $[1] = props.runs;
    $[2] = children;
  } else children = $[2];
  let ee;
  if ($[5] !== children) {
    ee = jsxProd_default(Text, {
      color: "inactive",
      children,
    });
    $[5] = children;
    $[6] = ee;
  } else ee = $[6];
  return ee;
}
//@ chunk-18hwfzwa.js:1271136-1271140 placement
init_react_production();
//@ chunk-18hwfzwa.js:1271140-1271251 placement
/**
 * 问题预览框的最大长度，以及预览无法完整显示时的提示文本。
 */
var MAX_PREVIEW_LENGTH = 2000;
var PREVIEW_WITHHELD_TEXT =
  "(preview cannot be shown in full \u2014 compare the option labels and descriptions instead)";
//@ chunk-18hwfzwa.js:1271251-1271255 placement
init_react_production();
//@ chunk-18hwfzwa.js:1271255-1271287 placement
function layoutNode(_o) {
  return squashSingleText(_o);
}
//@ chunk-18hwfzwa.js:1271287-1271318 placement
function nodeWidth(cn) {
  return bunStringWidth(cn);
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
  let $ = w(37);
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
  let Ot;
  let bottomBorder;
  let flexDirection;
  let Lt;
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
    let so;
    if ($[16] !== max) {
      so = (po) =>
        bunStringWidth(po) > max
          ? wrapAnsi(po, max, {
              hard: true,
              trim: false,
            }).split(`
`)
          : po;
      $[16] = max;
      $[17] = so;
    } else so = $[17];
    let contentLines = mapped.flatMap(so);
    let isTruncated = contentLines.length > effectiveMaxLines;
    let truncatedLines = isTruncated ? contentLines.slice(0, effectiveMaxLines) : contentLines;
    let effectiveMinHeight = Math.min(minHeight ?? 0, effectiveMaxLines);
    let paddingNeeded = Math.max(0, effectiveMinHeight - truncatedLines.length - (isTruncated ? 1 : 0));
    let lines = paddingNeeded > 0 ? [...truncatedLines, ...Array(paddingNeeded).fill("")] : truncatedLines;
    let contentWidth = Math.max(minWidth_2, ...lines.map(nodeWidth));
    let max_2 = Math.max(4, Math.min(contentWidth + 4, effectiveMaxWidth));
    let innerWidth = max_2 - 4;
    const mn = max_2 - 2;
    let Cn;
    if ($[18] !== mn) {
      Cn = repeatString(BOX_CHARS.horizontal, mn);
      $[18] = mn;
      $[19] = Cn;
    } else Cn = $[19];
    let topBorder = `${BOX_CHARS.topLeft}${Cn}${BOX_CHARS.topRight}`;
    const vo = max_2 - 2;
    let Yo;
    if ($[20] !== vo) {
      Yo = repeatString(BOX_CHARS.horizontal, vo);
      $[20] = vo;
      $[21] = Yo;
    } else Yo = $[21];
    bottomBorder = `${BOX_CHARS.bottomLeft}${Yo}${BOX_CHARS.bottomRight}`;
    truncationBar = isTruncated
      ? (() => {
          let hiddenCount = contentLines.length - effectiveMaxLines;
          let label = `${BOX_CHARS.horizontal.repeat(3)} \u2702 ${BOX_CHARS.horizontal.repeat(3)} ${hiddenCount} lines hidden `;
          let labelWidth = bunStringWidth(label);
          let fillWidth = Math.max(0, max_2 - 2 - labelWidth);
          return `${BOX_CHARS.teeLeft}${label}${BOX_CHARS.horizontal.repeat(fillWidth)}${BOX_CHARS.teeRight}`;
        })()
      : null;
    Ot = Box;
    flexDirection = "column";
    if ($[22] !== topBorder) {
      Lt = jsxProd_default(Text, {
        dimColor: true,
        children: topBorder,
      });
      $[22] = topBorder;
      $[23] = Lt;
    } else Lt = $[23];
    let t8;
    if ($[24] !== innerWidth) {
      t8 = (line, index) => {
        let Sn = innerWidth > 0 ? truncate_2(line, innerWidth, "end") : null;
        let displayLine = innerWidth < 1 ? "" : Sn ? Sn.head + ELLIPSIS : line;
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
    $[10] = Ot;
    $[11] = bottomBorder;
    $[12] = flexDirection;
    $[13] = Lt;
    $[14] = t5;
    $[15] = truncationBar;
  } else {
    Ot = $[10];
    bottomBorder = $[11];
    flexDirection = $[12];
    Lt = $[13];
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
    $[30] !== Ot ||
    $[31] !== flexDirection ||
    $[32] !== Lt ||
    $[33] !== t5 ||
    $[34] !== t6 ||
    $[35] !== t7
  ) {
    t8 = jsxProd_default_2(Ot, {
      flexDirection,
      children: [Lt, t5, t6, t7],
    });
    $[30] = Ot;
    $[31] = flexDirection;
    $[32] = Lt;
    $[33] = t5;
    $[34] = t6;
    $[35] = t7;
    $[36] = t8;
  } else t8 = $[36];
  return t8;
}
//@ chunk-18hwfzwa.js:1274144-1274148 placement
init_react_production();
//@ chunk-18hwfzwa.js:1274148-1274152 placement
init_react_production();
export { PreviewBoxBody, PREVIEW_WITHHELD_TEXT, PreviewBox, MAX_PREVIEW_LENGTH };
