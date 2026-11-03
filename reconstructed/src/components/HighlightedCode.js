/**
 * components/HighlightedCode.tsx
 *
 * 语法高亮代码块（带行号、宽度裁剪、"… from line N" 截断），高亮结果按内容缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HighlightedCode.tsx
 * pieces: chunk-ag5x7vhf.js (1), chunk-yqj79cx2.js (4)
 * attribution: fingerprint 2, placement 3
 */
import { Rh, R, y, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-yqj79cx2.js:3215-5545 fingerprint = HighlightedCode (0.345)
/**
 * 语法高亮代码：{code, filePath, width, dim, startLine, lineNumbers}；按扩展名选语言，结果缓存，超长截断为 "… from line N"。
 */
var HIGHLIGHT_MAX_WIDTH = 80;
var HighlightedCode = Rh(function (props) {
  let $ = w(40);
  let { code, filePath, width, dim, startLine, lineNumbers } = props;
  let h = dim === undefined ? false : dim;
  let c = startLine === undefined ? 1 : startLine;
  let p = lineNumbers === undefined ? true : lineNumbers;
  let ref = R(null);
  let [measuredWidth, setMeasuredWidth] = y(HIGHLIGHT_MAX_WIDTH);
  let pt = width || measuredWidth;
  let [x] = useTheme();
  let syntaxHighlightingDisabled = useSettingsState().syntaxHighlightingDisabled ?? false;
  let v;
  if ($[0] !== code || $[1] !== filePath || $[2] !== syntaxHighlightingDisabled) {
    _e: {
      if (syntaxHighlightingDisabled) {
        v = null;
        break _e;
      }
      let colorFile = getColorFile();
      if (!colorFile) {
        v = null;
        break _e;
      }
      v = new colorFile(convertLeadingTabsToSpaces(code), filePath);
    }
    $[0] = code;
    $[1] = filePath;
    $[2] = syntaxHighlightingDisabled;
    $[3] = v;
  } else v = $[3];
  let I = v;
  let Qt;
  let Vt;
  if ($[4] !== width) {
    Qt = () => {
      if (!width && ref.current) {
        let { width: elementWidth } = measureElement(ref.current);
        if (elementWidth > 0) setMeasuredWidth(elementWidth - 2);
      }
    };
    Vt = [width];
    $[4] = width;
    $[5] = Qt;
    $[6] = Vt;
  } else {
    Qt = $[5];
    Vt = $[6];
  }
  P(Qt, Vt);
  let Zt;
  if ($[7] !== code) {
    Zt = countLines(code);
    $[7] = code;
    $[8] = Zt;
  } else Zt = $[8];
  let Ae = String(Zt).length + 2;
  let bt;
  Ci: {
    if (!p || c === 1) {
      bt = null;
      break Ci;
    }
    let te = countLines(code);
    let et = String(c + te - 1).length;
    const extraCols = Math.max(0, et - String(te).length);
    let b;
    if ($[9] !== et || $[10] !== extraCols) {
      b = {
        digits: et,
        extraCols,
      };
      $[9] = et;
      $[10] = extraCols;
      $[11] = b;
    } else b = $[11];
    bt = b;
  }
  let yt = bt;
  let $e = useIsFullscreen() || c !== 1;
  let M;
  Gi: {
    if (I === null) {
      M = null;
      break Gi;
    }
    let B = pt - (yt?.extraCols ?? 0) + (p ? 0 : Ae);
    if (p && !$e) {
      let lines;
      if ($[12] !== I || $[13] !== B || $[14] !== h || $[15] !== x) {
        lines = I.render(x, B, h) ?? [];
        $[12] = I;
        $[13] = B;
        $[14] = h;
        $[15] = x;
        $[16] = lines;
      } else lines = $[16];
      let N;
      if ($[17] !== lines) {
        N = {
          split: false,
          lines,
        };
        $[17] = lines;
        $[18] = N;
      } else N = $[18];
      M = N;
      break Gi;
    }
    let b;
    if ($[19] !== I || $[20] !== B || $[21] !== h || $[22] !== x) {
      b = I.renderSplit(x, B, h);
      $[19] = I;
      $[20] = B;
      $[21] = h;
      $[22] = x;
      $[23] = b;
    } else b = $[23];
    let { gutters, contents } = b;
    let N;
    if ($[24] !== contents || $[25] !== gutters) {
      N = {
        split: true,
        gutters,
        contents,
      };
      $[24] = contents;
      $[25] = gutters;
      $[26] = N;
    } else N = $[26];
    M = N;
  }
  let k = M;
  let b;
  Ni: {
    if (yt === null || k === null || !k.split) {
      b = null;
      break Ni;
    }
    let { digits } = yt;
    let N;
    if ($[27] !== digits || $[28] !== k.gutters || $[29] !== c) {
      let kt = c;
      N = k.gutters.map((gutter) => {
        if (stripAnsi(gutter).trim() === "") {
          return " ".repeat(digits + 2);
        }
        let ve = kt;
        kt = kt + 1;
        return ` ${String(ve).padStart(digits)} `;
      });
      $[27] = digits;
      $[28] = k.gutters;
      $[29] = c;
      $[30] = N;
    } else N = $[30];
    b = N;
  }
  let Ct = b;
  let N;
  if (
    $[31] !== code ||
    $[32] !== h ||
    $[33] !== Ct ||
    $[34] !== filePath ||
    $[35] !== p ||
    $[36] !== k ||
    $[37] !== c ||
    $[38] !== syntaxHighlightingDisabled
  ) {
    N = jsxProd_default(Box, {
      ref,
      children: k
        ? jsxProd_default(Box, {
            flexDirection: "column",
            children: k.split
              ? k.contents.map((content, rt) =>
                  !p
                    ? jsxProd_default(
                        Text,
                        {
                          children: jsxProd_default(Ansi, {
                            children: content,
                          }),
                        },
                        rt,
                      )
                    : jsxProd_default(
                        CodeLineRow,
                        {
                          gutter: k.gutters[rt],
                          content,
                          displayGutter: Ct?.[rt],
                        },
                        rt,
                      ),
                )
              : k.lines.map(renderFallbackText),
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              p &&
                c !== 1 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["\u2026 from line ", c],
                }),
              jsxProd_default(HighlightedCodeFallback, {
                code,
                filePath,
                dim: h,
                skipColoring: syntaxHighlightingDisabled,
              }),
            ],
          }),
    });
    $[31] = code;
    $[32] = h;
    $[33] = Ct;
    $[34] = filePath;
    $[35] = p;
    $[36] = k;
    $[37] = c;
    $[38] = syntaxHighlightingDisabled;
    $[39] = N;
  } else N = $[39];
  return N;
});
//@ chunk-yqj79cx2.js:5545-6164 placement
/**
 * 计算代码每个逻辑行折行后占用的屏幕行数：无高亮器或禁用高亮时按纯文本折行估算，否则用高亮器 renderSplit 的 gutter 位置差得出。
 */
function useHighlightedLineHeights(o, filePath, i) {
  let m = w(8);
  let [g] = useTheme();
  let syntaxHighlightingDisabled = useSettingsState().syntaxHighlightingDisabled ?? false;
  let d;
  if (m[0] !== o || m[1] !== filePath || m[2] !== syntaxHighlightingDisabled || m[3] !== g || m[4] !== i) {
    W: {
      let h = syntaxHighlightingDisabled ? null : getColorFile();
      if (h === null) {
        let { text, markers } = protectLongLines(convertLeadingTabsToSpaces(o));
        let D = squashTextOf([restoreLongLines(text, markers)]);
        let lines = D.split(`
`);
        if (lines.length > 1 && lines.at(-1) === "") lines.pop();
        if (measureTextAlias(D, i).width <= i) {
          d = lines.map(fallbackLineCount);
          break W;
        }
        let pt;
        if (m[6] !== i) {
          pt = (x) =>
            Math.max(
              1,
              countCharInString(
                wrapText(x.replace(/\r$/, ""), i, "wrap"),
                `
`,
              ) + 1,
            );
          m[6] = i;
          m[7] = pt;
        } else pt = m[7];
        d = lines.map(pt);
        break W;
      }
      let { gutters } = new h(convertLeadingTabsToSpaces(o), filePath).renderSplit(g, i, false);
      let flattened = gutters.flatMap(visibleLineIndexes);
      d = flattened.map((v, G) => (flattened[G + 1] ?? gutters.length) - v);
    }
    m[0] = o;
    m[1] = filePath;
    m[2] = syntaxHighlightingDisabled;
    m[3] = g;
    m[4] = i;
    m[5] = d;
  } else d = m[5];
  return d;
}
//@ chunk-yqj79cx2.js:6164-6225 placement
function countLines(code) {
  let a =
    countCharInString(
      code,
      `
`,
    ) + 1;
  return code.endsWith(`
`)
    ? a - 1
    : a;
}
//@ chunk-yqj79cx2.js:6225-6653 placement
/**
 * 渲染代码的一行：不可选中的行号槽位加内容。
 */
function CodeLineRow(props) {
  let u = w(8);
  let { gutter, content, displayGutter } = props;
  let l;
  if (u[0] !== displayGutter || u[1] !== gutter) {
    l = jsxProd_default(NoSelect, {
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
    u[0] = displayGutter;
    u[1] = gutter;
    u[2] = l;
  } else l = u[2];
  let d;
  if (u[3] !== content) {
    d = jsxProd_default(Text, {
      children: jsxProd_default(Ansi, {
        children: content,
      }),
    });
    u[3] = content;
    u[4] = d;
  } else d = u[4];
  let m;
  if (u[5] !== l || u[6] !== d) {
    m = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [l, d],
    });
    u[5] = l;
    u[6] = d;
    u[7] = m;
  } else m = u[7];
  return m;
}
//@ chunk-ag5x7vhf.js:150071-150628 fingerprint = CodeLine (0.514)
function CodeLine(props) {
  let $ = w(13);
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
  let A;
  if ($[3] !== gutterWidth) {
    A = jsxProd_default(NoSelect, {
      fromLeftEdge: true,
      minWidth: gutterWidth,
    });
    $[3] = gutterWidth;
    $[4] = A;
  } else A = $[4];
  let L;
  if ($[5] !== children) {
    L = jsxProd_default(Box, {
      flexGrow: 1,
      flexDirection: "column",
      children,
    });
    $[5] = children;
    $[6] = L;
  } else L = $[6];
  let children_2;
  if ($[7] !== A || $[8] !== L) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [A, L],
    });
    $[7] = A;
    $[8] = L;
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
export { HighlightedCode, CodeLine, useHighlightedLineHeights };
