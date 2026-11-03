/**
 * components/design-system/ProgressBar.tsx
 *
 * 进度条（block/shade 字符填充，读屏标签）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ProgressBar.tsx
 * pieces: chunk-7tjtztz1.js (2)
 * attribution: sole-consumer 1, fingerprint 1
 */
import { terminalDetector } from "../../ink/terminalColorSupport.js";
import { repeatString } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-7tjtztz1.js:406-841 sole-consumer
/**
 * 进度条使用的字符集：部分块字符和几种填充/空白样式（按终端是否有渲染缺陷选择）。
 */
var PARTIAL_BLOCK_CHARS = [
  " ",
  "\u258F",
  "\u258E",
  "\u258D",
  "\u258C",
  "\u258B",
  "\u258A",
  "\u2589",
  "\u2588",
];
var GEOMETRIC_BAR_CHARS = {
  fill: "\u25B0",
  empty: "\u25B1",
};
var BLOCK_BAR_CHARS = {
  fill: "\u2588",
  empty: "\u2591",
};
var SHADE_BAR_CHARS = {
  fill: "\u2593",
  empty: "\u2591",
};
var getBarChars = () =>
  terminalDetector.hasGeometricShapesInkBleedBug() ? BLOCK_BAR_CHARS : GEOMETRIC_BAR_CHARS;
var clampRatio = (inputRatio) => Math.min(1, Math.max(0, inputRatio));
var renderBlockBar = (m, width) => {
  let floored = Math.floor(m * width);
  let i = [repeatString(PARTIAL_BLOCK_CHARS.at(-1), floored)];
  if (floored < width) {
    let l = m * width - floored;
    let floored_2 = Math.floor(l * (PARTIAL_BLOCK_CHARS.length - 1));
    i.push(PARTIAL_BLOCK_CHARS[floored_2]);
    let t = width - floored - 1;
    if (t > 0) i.push(PARTIAL_BLOCK_CHARS[0].repeat(t));
  }
  return i.join("");
};
//@ chunk-7tjtztz1.js:841-1732 fingerprint = ProgressBar (0.457)
function ProgressBar(props) {
  let $ = w(17);
  let { ratio: inputRatio, width, fillColor, emptyColor, variant } = props;
  let t = variant === undefined ? "block" : variant;
  let u;
  let color;
  let backgroundColor;
  let C;
  let children;
  let M;
  if ($[0] !== emptyColor || $[1] !== fillColor || $[2] !== inputRatio || $[3] !== t || $[4] !== width) {
    M = EARLY_RETURN_SENTINEL;
    J: {
      let d = clampRatio(inputRatio);
      if (t !== "block") {
        let { fill, empty } = t === "shade" ? SHADE_BAR_CHARS : getBarChars();
        let rounded = Math.round(d * width);
        let I =
          t === "shade" && d > 0 && d < 1 ? Math.min(Math.max(width - 1, 0), Math.max(1, rounded)) : rounded;
        M = jsxProd_default_2(Text, {
          "aria-label": t === "shade" ? `${Math.round(d * 100)}%` : undefined,
          children: [
            jsxProd_default(Text, {
              color: fillColor,
              children: repeatString(fill, I),
            }),
            jsxProd_default(Text, {
              color: emptyColor,
              dimColor: emptyColor === undefined,
              children: repeatString(empty, width - I),
            }),
          ],
        });
        break J;
      }
      u = Text;
      color = fillColor;
      backgroundColor = emptyColor;
      C = `${Math.round(d * 100)}%`;
      children = renderBlockBar(d, width);
    }
    $[0] = emptyColor;
    $[1] = fillColor;
    $[2] = inputRatio;
    $[3] = t;
    $[4] = width;
    $[5] = u;
    $[6] = color;
    $[7] = backgroundColor;
    $[8] = C;
    $[9] = children;
    $[10] = M;
  } else {
    u = $[5];
    color = $[6];
    backgroundColor = $[7];
    C = $[8];
    children = $[9];
    M = $[10];
  }
  if (M !== EARLY_RETURN_SENTINEL) return M;
  let E;
  if ($[11] !== u || $[12] !== color || $[13] !== backgroundColor || $[14] !== C || $[15] !== children) {
    E = jsxProd_default(u, {
      color,
      backgroundColor,
      "aria-label": C,
      children,
    });
    $[11] = u;
    $[12] = color;
    $[13] = backgroundColor;
    $[14] = C;
    $[15] = children;
    $[16] = E;
  } else E = $[16];
  return E;
}
export { ProgressBar };
