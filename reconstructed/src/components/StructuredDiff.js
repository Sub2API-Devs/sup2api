/**
 * components/StructuredDiff.tsx
 *
 * 结构化 diff 组件：优先用原生 color-diff 模块渲染（词级高亮），不可用时退回 StructuredDiffFallback；gutter 宽度计算。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StructuredDiff.tsx
 * pieces: chunk-0vxm8afm.js (1), chunk-887tgx6t.js (7)
 * attribution: fingerprint 3, placement 2, sole-consumer 1, affinity 1, layout 1
 */
import { j, Rh } from "../../vendor/react/cjs/react.production.js";
import { $Ps } from "../native-ts/color-diff/index.js";
import { sequential } from "../utils/sequential.js";
import { Che } from "../ink/wrapAnsi.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme, useActiveThemeOverrides } from "./design-system/ThemeProvider.js";
import { qd } from "../hooks/useSettings.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useIsFullscreen, useFrameRegistry } from "../ink/renderModeContext.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";
import { StructuredDiffFallback } from "./StructuredDiff/Fallback.js";
import { NoSelect, RawAnsi } from "../ink/components/Input.js";

//@ chunk-887tgx6t.js:733-737 placement
j();
//@ chunk-887tgx6t.js:737-741 placement
j();
//@ chunk-887tgx6t.js:5314-5421 sole-consumer
var DIFF_THEME_KEYS = [
  "diffAdded",
  "diffRemoved",
  "diffAddedDimmed",
  "diffRemovedDimmed",
  "diffAddedWord",
  "diffRemovedWord",
];
//@ chunk-887tgx6t.js:5421-5519 affinity
function pickDiffThemeColors(d) {
  if (!d) return;
  let i;
  for (let t of DIFF_THEME_KEYS) {
    let o = d[t];
    if (o !== void 0) ((i ??= {}), (i[t] = o));
  }
  return i;
}
//@ chunk-887tgx6t.js:5519-6020 fingerprint = renderColorDiff (0.894)
function renderColorDiff(d, i, t, o, a, c, l, f, u, R) {
  let ColorDiff = $Ps();
  if (!ColorDiff) return null;
  let x = R ? computeGutterWidth(i) : 0,
    b = x > 0 && x < f ? x : 0,
    H = l ? DIFF_THEME_KEYS.map((C) => l[C] ?? "").join(",") : "",
    key = `${c}|${H}|${f}|${u ? 1 : 0}|${b}|${sequential.level}|${t ?? ""}|${o}`,
    perHunk = d.get(i),
    hit = perHunk?.get(key);
  if (hit) return hit;
  let v = new ColorDiff(i, t, o, a),
    g;
  if (b > 0) {
    let { gutters: gutters, contents: contents } = v.renderSplit(c, f, u, l);
    g = { split: !0, gutterWidth: b, gutters: gutters, contents: contents };
  } else {
    let render = v.render(c, f, u, l);
    if (render === null) return null;
    g = { split: !1, lines: render };
  }
  if (!perHunk) ((perHunk = new Map()), d.set(i, perHunk));
  if (perHunk.size >= 4) perHunk.clear();
  return (perHunk.set(key, g), g);
}
//@ chunk-887tgx6t.js:6020-6158 layout
function expandTabsInPatch(d) {
  if (!d.lines.some((line) => line.includes("\t"))) return d;
  let mapped = d.lines.map((line) => line.slice(0, 1) + Che(line.slice(1)));
  return { ...d, lines: mapped };
}
/**
 * 结构化 diff：{patch, dim, filePath, width, …}；原生 color-diff 可用时调用 renderColorDiff 得到带词级高亮的行，否则用 StructuredDiffFallback。tab 先展开。
 */
//@ chunk-887tgx6t.js:6158-7247 fingerprint = StructuredDiff (0.928)
var StructuredDiff = Rh(function (t0) {
  let $ = w(19),
    {
      patch: patch,
      dim: dim,
      filePath: filePath,
      firstLine: firstLine,
      fileContent: fileContent,
      width: width,
      skipHighlighting: t1,
    } = t0,
    R = t1 === void 0 ? !1 : t1,
    [m] = useTheme(),
    x = pickDiffThemeColors(useActiveThemeOverrides()),
    H = qd().syntaxHighlightingDisabled ?? !1,
    settings = useIsScreenReaderEnabled(),
    N;
  if ($[0] !== settings || $[1] !== patch)
    ((N = settings ? expandTabsInPatch(patch) : patch), ($[0] = settings), ($[1] = patch), ($[2] = N));
  else N = $[2];
  let v = N,
    safeWidth = Math.max(1, Math.floor(width)),
    splitGutter = useIsFullscreen(),
    { structuredDiff: structuredDiff } = useFrameRegistry(),
    D =
      R || H || settings
        ? null
        : renderColorDiff(
            structuredDiff,
            patch,
            firstLine,
            filePath,
            fileContent ?? null,
            m,
            x,
            safeWidth,
            dim,
            splitGutter,
          );
  if (!D) {
    const k = settings ? width - 1 : width;
    let y;
    if ($[3] !== dim || $[4] !== v || $[5] !== k)
      ((y = e(Box, { children: e(StructuredDiffFallback, { patch: v, dim: dim, width: k }) })),
        ($[3] = dim),
        ($[4] = v),
        ($[5] = k),
        ($[6] = y));
    else y = $[6];
    return y;
  }
  if (D.split) {
    let { gutterWidth: gutterWidth, gutters: gutters, contents: contents } = D;
    let k;
    if ($[7] !== gutterWidth || $[8] !== gutters)
      ((k = e(NoSelect, {
        fromLeftEdge: !0,
        flexShrink: 0,
        children: e(RawAnsi, { lines: gutters, width: gutterWidth }),
      })),
        ($[7] = gutterWidth),
        ($[8] = gutters),
        ($[9] = k));
    else k = $[9];
    const t4 = safeWidth - gutterWidth;
    let P;
    if ($[10] !== contents || $[11] !== t4)
      ((P = e(RawAnsi, { lines: contents, width: t4 })), ($[10] = contents), ($[11] = t4), ($[12] = P));
    else P = $[12];
    let E;
    if ($[13] !== k || $[14] !== P)
      ((E = r(Box, { flexDirection: "row", children: [k, P] })), ($[13] = k), ($[14] = P), ($[15] = E));
    else E = $[15];
    return E;
  }
  let k;
  if ($[16] !== D.lines || $[17] !== safeWidth)
    ((k = e(Box, { children: e(RawAnsi, { lines: D.lines, width: safeWidth }) })),
      ($[16] = D.lines),
      ($[17] = safeWidth),
      ($[18] = k));
  else k = $[18];
  return k;
});
//@ chunk-0vxm8afm.js:191-279 fingerprint = computeGutterWidth (1)
var computeGutterWidth = (patch) =>
  `+ ${Math.max(patch.oldStart + patch.oldLines - 1, patch.newStart + patch.newLines - 1, 1)} `.length;

export { StructuredDiff, computeGutterWidth };
