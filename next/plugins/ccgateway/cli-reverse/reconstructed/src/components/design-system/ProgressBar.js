/**
 * components/design-system/ProgressBar.tsx
 *
 * 进度条（block/shade 字符填充，读屏标签）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ProgressBar.tsx
 * pieces: chunk-rf2d2hdc.js (2)
 * attribution: sole-consumer 1, fingerprint 1
 */
import { terminalDetector } from "../../ink/terminalColorSupport.js";
import { repeatString } from "../../utils/stringUtils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-rf2d2hdc.js:406-841 sole-consumer
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
var renderBlockBar = (ratio, width) => {
  let floored = Math.floor(ratio * width);
  let segments = [repeatString(PARTIAL_BLOCK_CHARS.at(-1), floored)];
  if (floored < width) {
    let fraction = ratio * width - floored;
    let floored_2 = Math.floor(fraction * (PARTIAL_BLOCK_CHARS.length - 1));
    segments.push(PARTIAL_BLOCK_CHARS[floored_2]);
    let remaining = width - floored - 1;
    if (remaining > 0) segments.push(PARTIAL_BLOCK_CHARS[0].repeat(remaining));
  }
  return segments.join("");
};
//@ chunk-rf2d2hdc.js:841-1732 fingerprint (2.1.88 match: ProgressBar, 0.458)
function ProgressBar(props) {
  let $ = useMemoCache(17);
  let { ratio: inputRatio, width, fillColor, emptyColor, variant } = props;
  let variantName = variant === undefined ? "block" : variant;
  let Component;
  let color;
  let backgroundColor;
  let percentLabel;
  let children;
  let result;
  if (
    $[0] !== emptyColor ||
    $[1] !== fillColor ||
    $[2] !== inputRatio ||
    $[3] !== variantName ||
    $[4] !== width
  ) {
    result = EARLY_RETURN_SENTINEL;
    J: {
      let ratio = clampRatio(inputRatio);
      if (variantName !== "block") {
        let { fill, empty } = variantName === "shade" ? SHADE_BAR_CHARS : getBarChars();
        let rounded = Math.round(ratio * width);
        let fillCount =
          variantName === "shade" && ratio > 0 && ratio < 1
            ? Math.min(Math.max(width - 1, 0), Math.max(1, rounded))
            : rounded;
        result = jsxProd_default_2(Text, {
          "aria-label": variantName === "shade" ? `${Math.round(ratio * 100)}%` : undefined,
          children: [
            jsxProd_default(Text, {
              color: fillColor,
              children: repeatString(fill, fillCount),
            }),
            jsxProd_default(Text, {
              color: emptyColor,
              dimColor: emptyColor === undefined,
              children: repeatString(empty, width - fillCount),
            }),
          ],
        });
        break J;
      }
      Component = Text;
      color = fillColor;
      backgroundColor = emptyColor;
      percentLabel = `${Math.round(ratio * 100)}%`;
      children = renderBlockBar(ratio, width);
    }
    $[0] = emptyColor;
    $[1] = fillColor;
    $[2] = inputRatio;
    $[3] = variantName;
    $[4] = width;
    $[5] = Component;
    $[6] = color;
    $[7] = backgroundColor;
    $[8] = percentLabel;
    $[9] = children;
    $[10] = result;
  } else {
    Component = $[5];
    color = $[6];
    backgroundColor = $[7];
    percentLabel = $[8];
    children = $[9];
    result = $[10];
  }
  if (result !== EARLY_RETURN_SENTINEL) return result;
  let bar;
  if (
    $[11] !== Component ||
    $[12] !== color ||
    $[13] !== backgroundColor ||
    $[14] !== percentLabel ||
    $[15] !== children
  ) {
    bar = jsxProd_default(Component, {
      color,
      backgroundColor,
      "aria-label": percentLabel,
      children,
    });
    $[11] = Component;
    $[12] = color;
    $[13] = backgroundColor;
    $[14] = percentLabel;
    $[15] = children;
    $[16] = bar;
  } else bar = $[16];
  return bar;
}
export { ProgressBar };
