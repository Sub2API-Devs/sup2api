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
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

/**
 * 进度条使用的字符集：部分块字符和几种填充/空白样式（按终端是否有渲染缺陷选择）。
 */
//@ chunk-7tjtztz1.js:406-841 sole-consumer
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
  ],
  GEOMETRIC_BAR_CHARS = { fill: "\u25B0", empty: "\u25B1" },
  BLOCK_BAR_CHARS = { fill: "\u2588", empty: "\u2591" },
  SHADE_BAR_CHARS = { fill: "\u2593", empty: "\u2591" },
  getBarChars = () =>
    terminalDetector.hasGeometricShapesInkBleedBug() ? BLOCK_BAR_CHARS : GEOMETRIC_BAR_CHARS,
  clampRatio = (m) => Math.min(1, Math.max(0, m)),
  renderBlockBar = (m, a) => {
    let floored = Math.floor(m * a),
      i = [repeatString(PARTIAL_BLOCK_CHARS.at(-1), floored)];
    if (floored < a) {
      let l = m * a - floored,
        floored_2 = Math.floor(l * (PARTIAL_BLOCK_CHARS.length - 1));
      i.push(PARTIAL_BLOCK_CHARS[floored_2]);
      let t = a - floored - 1;
      if (t > 0) i.push(PARTIAL_BLOCK_CHARS[0].repeat(t));
    }
    return i.join("");
  };
//@ chunk-7tjtztz1.js:841-1732 fingerprint = ProgressBar (0.457)
function ProgressBar(t0) {
  let $ = w(17),
    { ratio: inputRatio, width: width, fillColor: fillColor, emptyColor: emptyColor, variant: variant } = t0,
    t = variant === void 0 ? "block" : variant,
    u,
    y,
    L,
    C,
    P,
    M;
  if ($[0] !== emptyColor || $[1] !== fillColor || $[2] !== inputRatio || $[3] !== t || $[4] !== width) {
    M = EARLY_RETURN_SENTINEL;
    J: {
      let d = clampRatio(inputRatio);
      if (t !== "block") {
        let { fill: fill, empty: empty } = t === "shade" ? SHADE_BAR_CHARS : getBarChars();
        let rounded = Math.round(d * width);
        let I =
          t === "shade" && d > 0 && d < 1 ? Math.min(Math.max(width - 1, 0), Math.max(1, rounded)) : rounded;
        M = r(Text, {
          "aria-label": t === "shade" ? `${Math.round(d * 100)}%` : void 0,
          children: [
            e(Text, { color: fillColor, children: repeatString(fill, I) }),
            e(Text, {
              color: emptyColor,
              dimColor: emptyColor === void 0,
              children: repeatString(empty, width - I),
            }),
          ],
        });
        break J;
      }
      u = Text;
      y = fillColor;
      L = emptyColor;
      C = `${Math.round(d * 100)}%`;
      P = renderBlockBar(d, width);
    }
    (($[0] = emptyColor),
      ($[1] = fillColor),
      ($[2] = inputRatio),
      ($[3] = t),
      ($[4] = width),
      ($[5] = u),
      ($[6] = y),
      ($[7] = L),
      ($[8] = C),
      ($[9] = P),
      ($[10] = M));
  } else ((u = $[5]), (y = $[6]), (L = $[7]), (C = $[8]), (P = $[9]), (M = $[10]));
  if (M !== EARLY_RETURN_SENTINEL) return M;
  let E;
  if ($[11] !== u || $[12] !== y || $[13] !== L || $[14] !== C || $[15] !== P)
    ((E = e(u, { color: y, backgroundColor: L, "aria-label": C, children: P })),
      ($[11] = u),
      ($[12] = y),
      ($[13] = L),
      ($[14] = C),
      ($[15] = P),
      ($[16] = E));
  else E = $[16];
  return E;
}

export { ProgressBar };
