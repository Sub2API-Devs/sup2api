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
import { qd } from "../hooks/useSettings.js";
import { JFn } from "../native-ts/color-diff/index.js";
import { convertLeadingTabsToSpaces } from "../utils/file.js";
import { measureElement } from "../ink/hooks/useTerminalHooks.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { Yn } from "../utils/stripAnsi.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Ansi } from "../ink/components/AnsiText.js";
import {
  Me,
  HighlightedCodeFallback,
  protectLongLines,
  restoreLongLines,
  Re,
  Fe,
} from "./HighlightedCode/Fallback.js";
import { nrn } from "../ink/layout/node.js";
import { F0t } from "../ink/squash-text-nodes.js";
import { countCharInString } from "../utils/stringUtils.js";
import { wrapText } from "../ink/wrap-text.js";
import { NoSelect } from "../ink/components/Input.js";
import { shouldShowNotice } from "./SlashCommandLink.js";
import { lTe } from "./Spinner/SpinnerColumn.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { wr } from "./Messages.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";

/**
 * 语法高亮代码：{code, filePath, width, dim, startLine, lineNumbers}；按扩展名选语言，结果缓存，超长截断为 "… from line N"。
 */
//@ chunk-yqj79cx2.js:3215-5545 fingerprint = HighlightedCode (0.345)
var HIGHLIGHT_MAX_WIDTH = 80,
  HighlightedCode = Rh(function (a) {
    let $ = w(40),
      {
        code: code,
        filePath: filePath,
        width: width,
        dim: dim,
        startLine: startLine,
        lineNumbers: lineNumbers,
      } = a,
      h = dim === void 0 ? !1 : dim,
      c = startLine === void 0 ? 1 : startLine,
      p = lineNumbers === void 0 ? !0 : lineNumbers,
      D = R(null),
      [f, W] = y(HIGHLIGHT_MAX_WIDTH),
      pt = width || f,
      [x] = useTheme(),
      E = qd().syntaxHighlightingDisabled ?? !1,
      v;
    if ($[0] !== code || $[1] !== filePath || $[2] !== E) {
      _e: {
        if (E) {
          v = null;
          break _e;
        }
        let tt = JFn();
        if (!tt) {
          v = null;
          break _e;
        }
        v = new tt(convertLeadingTabsToSpaces(code), filePath);
      }
      (($[0] = code), ($[1] = filePath), ($[2] = E), ($[3] = v));
    } else v = $[3];
    let I = v,
      Qt,
      Vt;
    if ($[4] !== width)
      ((Qt = () => {
        if (!width && D.current) {
          let { width: width } = measureElement(D.current);
          if (width > 0) W(width - 2);
        }
      }),
        (Vt = [width]),
        ($[4] = width),
        ($[5] = Qt),
        ($[6] = Vt));
    else ((Qt = $[5]), (Vt = $[6]));
    P(Qt, Vt);
    let Zt;
    if ($[7] !== code) ((Zt = Y(code)), ($[7] = code), ($[8] = Zt));
    else Zt = $[8];
    let Ae = String(Zt).length + 2,
      bt;
    Ci: {
      if (!p || c === 1) {
        bt = null;
        break Ci;
      }
      let te = Y(code);
      let et = String(c + te - 1).length;
      const max = Math.max(0, et - String(te).length);
      let b;
      if ($[9] !== et || $[10] !== max)
        ((b = { digits: et, extraCols: max }), ($[9] = et), ($[10] = max), ($[11] = b));
      else b = $[11];
      bt = b;
    }
    let yt = bt,
      $e = useIsFullscreen() || c !== 1,
      M;
    Gi: {
      if (I === null) {
        M = null;
        break Gi;
      }
      let B = pt - (yt?.extraCols ?? 0) + (p ? 0 : Ae);
      if (p && !$e) {
        let b;
        if ($[12] !== I || $[13] !== B || $[14] !== h || $[15] !== x)
          ((b = I.render(x, B, h) ?? []), ($[12] = I), ($[13] = B), ($[14] = h), ($[15] = x), ($[16] = b));
        else b = $[16];
        let N;
        if ($[17] !== b) ((N = { split: !1, lines: b }), ($[17] = b), ($[18] = N));
        else N = $[18];
        M = N;
        break Gi;
      }
      let b;
      if ($[19] !== I || $[20] !== B || $[21] !== h || $[22] !== x)
        ((b = I.renderSplit(x, B, h)), ($[19] = I), ($[20] = B), ($[21] = h), ($[22] = x), ($[23] = b));
      else b = $[23];
      let { gutters: gutters, contents: contents } = b;
      let N;
      if ($[24] !== contents || $[25] !== gutters)
        ((N = { split: !0, gutters: gutters, contents: contents }),
          ($[24] = contents),
          ($[25] = gutters),
          ($[26] = N));
      else N = $[26];
      M = N;
    }
    let k = M,
      b;
    Ni: {
      if (yt === null || k === null || !k.split) {
        b = null;
        break Ni;
      }
      let { digits: digits } = yt;
      let N;
      if ($[27] !== digits || $[28] !== k.gutters || $[29] !== c) {
        let kt = c;
        N = k.gutters.map((gutter) => {
          if (Yn(gutter).trim() === "") {
            return " ".repeat(digits + 2);
          }
          let ve = kt;
          return ((kt = kt + 1), ` ${String(ve).padStart(digits)} `);
        });
        (($[27] = digits), ($[28] = k.gutters), ($[29] = c), ($[30] = N));
      } else N = $[30];
      b = N;
    }
    let Ct = b,
      N;
    if (
      $[31] !== code ||
      $[32] !== h ||
      $[33] !== Ct ||
      $[34] !== filePath ||
      $[35] !== p ||
      $[36] !== k ||
      $[37] !== c ||
      $[38] !== E
    )
      ((N = e(Box, {
        ref: D,
        children: k
          ? e(Box, {
              flexDirection: "column",
              children: k.split
                ? k.contents.map((content, rt) =>
                    !p
                      ? e(Text, { children: e(Ansi, { children: content }) }, rt)
                      : e(
                          CodeLineRow,
                          { gutter: k.gutters[rt], content: content, displayGutter: Ct?.[rt] },
                          rt,
                        ),
                  )
                : k.lines.map(Me),
            })
          : r(Box, {
              flexDirection: "column",
              children: [
                p && c !== 1 && r(Text, { dimColor: !0, children: ["\u2026 from line ", c] }),
                e(HighlightedCodeFallback, { code: code, filePath: filePath, dim: h, skipColoring: E }),
              ],
            }),
      })),
        ($[31] = code),
        ($[32] = h),
        ($[33] = Ct),
        ($[34] = filePath),
        ($[35] = p),
        ($[36] = k),
        ($[37] = c),
        ($[38] = E),
        ($[39] = N));
    else N = $[39];
    return N;
  });
/**
 * 计算代码每个逻辑行折行后占用的屏幕行数：无高亮器或禁用高亮时按纯文本折行估算，否则用高亮器 renderSplit 的 gutter 位置差得出。
 */
//@ chunk-yqj79cx2.js:5545-6164 placement
function useHighlightedLineHeights(o, a, i) {
  let m = w(8),
    [g] = useTheme(),
    l = qd().syntaxHighlightingDisabled ?? !1,
    d;
  if (m[0] !== o || m[1] !== a || m[2] !== l || m[3] !== g || m[4] !== i) {
    W: {
      let h = l ? null : JFn();
      if (h === null) {
        let { text: text, markers: markers } = protectLongLines(convertLeadingTabsToSpaces(o));
        let D = nrn([restoreLongLines(text, markers)]);
        let parts = D.split(`
`);
        if (parts.length > 1 && parts.at(-1) === "") parts.pop();
        if (F0t(D, i).width <= i) {
          d = parts.map(Re);
          break W;
        }
        let pt;
        if (m[6] !== i)
          ((pt = (x) =>
            Math.max(
              1,
              countCharInString(
                wrapText(x.replace(/\r$/, ""), i, "wrap"),
                `
`,
              ) + 1,
            )),
            (m[6] = i),
            (m[7] = pt));
        else pt = m[7];
        d = parts.map(pt);
        break W;
      }
      let { gutters: gutters } = new h(convertLeadingTabsToSpaces(o), a).renderSplit(g, i, !1);
      let flattened = gutters.flatMap(Fe);
      d = flattened.map((v, G) => (flattened[G + 1] ?? gutters.length) - v);
    }
    ((m[0] = o), (m[1] = a), (m[2] = l), (m[3] = g), (m[4] = i), (m[5] = d));
  } else d = m[5];
  return d;
}
//@ chunk-yqj79cx2.js:6164-6225 placement
function Y(o) {
  let a =
    countCharInString(
      o,
      `
`,
    ) + 1;
  return o.endsWith(`
`)
    ? a - 1
    : a;
}
/**
 * 渲染代码的一行：不可选中的行号槽位加内容。
 */
//@ chunk-yqj79cx2.js:6225-6653 placement
function CodeLineRow(o) {
  let u = w(8),
    { gutter: gutter, content: content, displayGutter: displayGutter } = o,
    l;
  if (u[0] !== displayGutter || u[1] !== gutter)
    ((l = e(NoSelect, {
      fromLeftEdge: !0,
      children:
        displayGutter === void 0
          ? e(Text, { children: e(Ansi, { children: gutter }) })
          : e(Text, { dimColor: !0, children: displayGutter }),
    })),
      (u[0] = displayGutter),
      (u[1] = gutter),
      (u[2] = l));
  else l = u[2];
  let d;
  if (u[3] !== content)
    ((d = e(Text, { children: e(Ansi, { children: content }) })), (u[3] = content), (u[4] = d));
  else d = u[4];
  let m;
  if (u[5] !== l || u[6] !== d)
    ((m = r(Box, { flexDirection: "row", children: [l, d] })), (u[5] = l), (u[6] = d), (u[7] = m));
  else m = u[7];
  return m;
}
//@ chunk-ag5x7vhf.js:150071-150628 fingerprint = CodeLine (0.514)
function CodeLine(t0) {
  let $ = w(13),
    { verbose: verbose, children: children } = t0,
    T = shouldShowNotice(verbose) ? lTe : 0,
    k = useTerminalSize(),
    I;
  if ($[0] !== T || $[1] !== k) ((I = wr(k, T)), ($[0] = T), ($[1] = k), ($[2] = I));
  else I = $[2];
  let D = I;
  if (T === 0) {
    return children;
  }
  let A;
  if ($[3] !== T) ((A = e(NoSelect, { fromLeftEdge: !0, minWidth: T })), ($[3] = T), ($[4] = A));
  else A = $[4];
  let L;
  if ($[5] !== children)
    ((L = e(Box, { flexGrow: 1, flexDirection: "column", children: children })),
      ($[5] = children),
      ($[6] = L));
  else L = $[6];
  let V;
  if ($[7] !== A || $[8] !== L)
    ((V = r(Box, { flexDirection: "row", children: [A, L] })), ($[7] = A), ($[8] = L), ($[9] = V));
  else V = $[9];
  let W;
  if ($[10] !== D || $[11] !== V)
    ((W = e(TerminalSizeContext, { value: D, children: V })), ($[10] = D), ($[11] = V), ($[12] = W));
  else W = $[12];
  return W;
}

export { HighlightedCode, CodeLine, useHighlightedLineHeights };
