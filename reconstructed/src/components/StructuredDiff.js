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
import { init_react_production, Rh } from "../../vendor/react/cjs/react.production.js";
import { getColorDiff } from "../native-ts/color-diff/index.js";
import { sequential } from "../utils/sequential.js";
import { expandTabsInText } from "../ink/wrapAnsi.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme, useActiveThemeOverrides } from "./design-system/ThemeProvider.js";
import { useSettingsState } from "../hooks/useSettings.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useIsFullscreen, useFrameRegistry } from "../ink/renderModeContext.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";
import { StructuredDiffFallback } from "./StructuredDiff/Fallback.js";
import { NoSelect, RawAnsi } from "../ink/components/Input.js";

//@ chunk-887tgx6t.js:733-737 placement
init_react_production();
//@ chunk-887tgx6t.js:737-741 placement
init_react_production();
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
function pickDiffThemeColors(activeThemeOverrides) {
  if (!activeThemeOverrides) return;
  let i;
  for (let t of DIFF_THEME_KEYS) {
    let o = activeThemeOverrides[t];
    if (o !== undefined) {
      i ??= {};
      i[t] = o;
    }
  }
  return i;
}
//@ chunk-887tgx6t.js:5519-6020 fingerprint = renderColorDiff (0.894)
function renderColorDiff(structuredDiff, patch, firstLine, filePath, a, theme, l, safeWidth, u, splitGutter) {
  let ColorDiff = getColorDiff();
  if (!ColorDiff) return null;
  let rawGutterWidth = splitGutter ? computeGutterWidth(patch) : 0;
  let gutterWidth = rawGutterWidth > 0 && rawGutterWidth < safeWidth ? rawGutterWidth : 0;
  let H = l ? DIFF_THEME_KEYS.map((C) => l[C] ?? "").join(",") : "";
  let key = `${theme}|${H}|${safeWidth}|${u ? 1 : 0}|${gutterWidth}|${sequential.level}|${firstLine ?? ""}|${filePath}`;
  let perHunk = structuredDiff.get(patch);
  let hit = perHunk?.get(key);
  if (hit) return hit;
  let v = new ColorDiff(patch, firstLine, filePath, a);
  let entry;
  if (gutterWidth > 0) {
    let { gutters, contents } = v.renderSplit(theme, safeWidth, u, l);
    entry = {
      split: true,
      gutterWidth,
      gutters,
      contents,
    };
  } else {
    let C = v.render(theme, safeWidth, u, l);
    if (C === null) return null;
    entry = {
      split: false,
      lines: C,
    };
  }
  if (!perHunk) {
    perHunk = new Map();
    structuredDiff.set(patch, perHunk);
  }
  if (perHunk.size >= 4) perHunk.clear();
  perHunk.set(key, entry);
  return entry;
}
//@ chunk-887tgx6t.js:6020-6158 layout
function expandTabsInPatch(patch) {
  if (!patch.lines.some((line) => line.includes("\t"))) return patch;
  let lines = patch.lines.map((line) => line.slice(0, 1) + expandTabsInText(line.slice(1)));
  return {
    ...patch,
    lines,
  };
}
//@ chunk-887tgx6t.js:6158-7247 fingerprint = StructuredDiff (0.928)
/**
 * 结构化 diff：{patch, dim, filePath, width, …}；原生 color-diff 可用时调用 renderColorDiff 得到带词级高亮的行，否则用 StructuredDiffFallback。tab 先展开。
 */
var StructuredDiff = Rh(function (props) {
  let $ = w(19);
  let { patch, dim, filePath, firstLine, fileContent, width, skipHighlighting } = props;
  let skipHighlighting_2 = skipHighlighting === undefined ? false : skipHighlighting;
  let [theme] = useTheme();
  let x = pickDiffThemeColors(useActiveThemeOverrides());
  let syntaxHighlightingDisabled = useSettingsState().syntaxHighlightingDisabled ?? false;
  let settings = useIsScreenReaderEnabled();
  let N;
  if ($[0] !== settings || $[1] !== patch) {
    N = settings ? expandTabsInPatch(patch) : patch;
    $[0] = settings;
    $[1] = patch;
    $[2] = N;
  } else N = $[2];
  let patch_2 = N;
  let safeWidth = Math.max(1, Math.floor(width));
  let splitGutter = useIsFullscreen();
  let { structuredDiff } = useFrameRegistry();
  let D =
    skipHighlighting_2 || syntaxHighlightingDisabled || settings
      ? null
      : renderColorDiff(
          structuredDiff,
          patch,
          firstLine,
          filePath,
          fileContent ?? null,
          theme,
          x,
          safeWidth,
          dim,
          splitGutter,
        );
  if (!D) {
    const width_2 = settings ? width - 1 : width;
    let t3;
    if ($[3] !== dim || $[4] !== patch_2 || $[5] !== width_2) {
      t3 = jsxProd_default(Box, {
        children: jsxProd_default(StructuredDiffFallback, {
          patch: patch_2,
          dim,
          width: width_2,
        }),
      });
      $[3] = dim;
      $[4] = patch_2;
      $[5] = width_2;
      $[6] = t3;
    } else t3 = $[6];
    return t3;
  }
  if (D.split) {
    let { gutterWidth, gutters, contents } = D;
    let t3;
    if ($[7] !== gutterWidth || $[8] !== gutters) {
      t3 = jsxProd_default(NoSelect, {
        fromLeftEdge: true,
        flexShrink: 0,
        children: jsxProd_default(RawAnsi, {
          lines: gutters,
          width: gutterWidth,
        }),
      });
      $[7] = gutterWidth;
      $[8] = gutters;
      $[9] = t3;
    } else t3 = $[9];
    const width = safeWidth - gutterWidth;
    let t5;
    if ($[10] !== contents || $[11] !== width) {
      t5 = jsxProd_default(RawAnsi, {
        lines: contents,
        width,
      });
      $[10] = contents;
      $[11] = width;
      $[12] = t5;
    } else t5 = $[12];
    let t6;
    if ($[13] !== t3 || $[14] !== t5) {
      t6 = jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [t3, t5],
      });
      $[13] = t3;
      $[14] = t5;
      $[15] = t6;
    } else t6 = $[15];
    return t6;
  }
  let t3;
  if ($[16] !== D.lines || $[17] !== safeWidth) {
    t3 = jsxProd_default(Box, {
      children: jsxProd_default(RawAnsi, {
        lines: D.lines,
        width: safeWidth,
      }),
    });
    $[16] = D.lines;
    $[17] = safeWidth;
    $[18] = t3;
  } else t3 = $[18];
  return t3;
});
//@ chunk-0vxm8afm.js:191-279 fingerprint = computeGutterWidth (1)
var computeGutterWidth = (patch) =>
  `+ ${Math.max(patch.oldStart + patch.oldLines - 1, patch.newStart + patch.newLines - 1, 1)} `.length;
export { StructuredDiff, computeGutterWidth };
