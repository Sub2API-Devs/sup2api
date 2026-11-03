/**
 * components/LogoV2/AnimatedAsterisk.tsx
 *
 * 欢迎区动画星号（颜色渐变到 SETTLED_GREY）；本模块混入了 fflate 解压表等第三方代码（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/AnimatedAsterisk.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-ag5x7vhf.js (3)
 * attribution: fingerprint 2, placement 1, layout 1
 */
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { toRGBColor, snapTo360, hueToRgb } from "../Spinner/utils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { isXtermJs } from "../../ink/terminal.js";

//@ chunk-ag5x7vhf.js:83769-83820 placement
function prefersReducedMotion() {
  return isReducedMotion(getInitialSettings_2().prefersReducedMotion);
}
//@ chunk-ag5x7vhf.js:83820-83873 layout = SETTLED_GREY (1)
var ASTERISK_SPIN_MS = 1500;
var ASTERISK_TURN_COUNT = 2;
var ASTERISK_SETTLE_MS = ASTERISK_SPIN_MS * ASTERISK_TURN_COUNT;
var SETTLED_GREY_COLOR = toRGBColor({
  r: 153,
  g: 153,
  b: 153,
});
//@ chunk-ag5x7vhf.js:83873-84754 fingerprint = AnimatedAsterisk (0.765)
function AnimatedAsterisk(props) {
  let $ = w(22);
  let { char } = props;
  let children = char === undefined ? TEARDROP_ASTERISK : char;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [k] = y(prefersReducedMotion);
  let [_, I] = y(k || isScreenReaderEnabled);
  let [D, A] = y(null);
  let [L, V] = useAnimationFrame(_ ? null : 50);
  let z;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    z = () => I(true);
    $[0] = z;
  } else z = $[0];
  let K;
  if ($[1] !== _) {
    K = [_];
    $[1] = _;
    $[2] = K;
  } else K = $[2];
  useTimeout(z, _ ? null : ASTERISK_SETTLE_MS, K);
  if (_) {
    let children_2;
    if ($[3] !== children) {
      children_2 = jsxProd_default(Text, {
        color: SETTLED_GREY_COLOR,
        children,
      });
      $[3] = children;
      $[4] = children_2;
    } else children_2 = $[4];
    let Y;
    if ($[5] !== L || $[6] !== children_2) {
      Y = jsxProd_default(Box, {
        ref: L,
        children: children_2,
      });
      $[5] = L;
      $[6] = children_2;
      $[7] = Y;
    } else Y = $[7];
    return Y;
  }
  if (D === null) A(V);
  let xe = (((V - (D ?? V)) / ASTERISK_SPIN_MS) * 360) % 360;
  let ge;
  let Re;
  let color;
  let ref;
  if ($[8] !== xe || $[9] !== L) {
    let We = isXtermJs() ? snapTo360(xe) : xe;
    Re = Box;
    ref = L;
    ge = Text;
    color = toRGBColor(hueToRgb(We));
    $[8] = xe;
    $[9] = L;
    $[10] = ge;
    $[11] = Re;
    $[12] = color;
    $[13] = ref;
  } else {
    ge = $[10];
    Re = $[11];
    color = $[12];
    ref = $[13];
  }
  let children_2;
  if ($[14] !== ge || $[15] !== children || $[16] !== color) {
    children_2 = jsxProd_default(ge, {
      color,
      children,
    });
    $[14] = ge;
    $[15] = children;
    $[16] = color;
    $[17] = children_2;
  } else children_2 = $[17];
  let Fe;
  if ($[18] !== Re || $[19] !== ref || $[20] !== children_2) {
    Fe = jsxProd_default(Re, {
      ref,
      children: children_2,
    });
    $[18] = Re;
    $[19] = ref;
    $[20] = children_2;
    $[21] = Fe;
  } else Fe = $[21];
  return Fe;
}
//@ chunk-18hwfzwa.js:785671-785728 fingerprint = SETTLED_GREY (1)
var ASTERISK_RAY_COUNT = 20;
var ASTERISK_SPIN_PERIOD_MS = 4000;
var ASTERISK_TICK_MS = ASTERISK_SPIN_PERIOD_MS / ASTERISK_RAY_COUNT;
var ASTERISK_FADE_FLOOR = 0.18;
var SETTLED_GREY_RGB = {
  r: 0,
  g: 0,
  b: 0,
};
export { ASTERISK_TICK_MS, ASTERISK_RAY_COUNT, ASTERISK_FADE_FLOOR, SETTLED_GREY_RGB, AnimatedAsterisk };
