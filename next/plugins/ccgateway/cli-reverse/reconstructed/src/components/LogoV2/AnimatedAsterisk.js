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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { TEARDROP_ASTERISK } from "../../constants/figures.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { isXtermJs } from "../../ink/terminal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:83769-83820 placement
function prefersReducedMotion() {
  return isReducedMotion(getInitialSettings_2().prefersReducedMotion);
}
//@ chunk-ag5x7vhf.js:83820-83873 layout = SETTLED_GREY (1)
var ASTERISK_SPIN_MS; // deferred: uses toRGBColor (../Spinner/utils.js) of its import cycle while loading; runs once the cycle is complete
var ASTERISK_TURN_COUNT;
var ASTERISK_SETTLE_MS;
var SETTLED_GREY_COLOR;
deferInit("chunk-ag5x7vhf.js:83820", () => {
  ASTERISK_SPIN_MS = 1500;
  ASTERISK_TURN_COUNT = 2;
  ASTERISK_SETTLE_MS = ASTERISK_SPIN_MS * ASTERISK_TURN_COUNT;
  SETTLED_GREY_COLOR = toRGBColor({
    r: 153,
    g: 153,
    b: 153,
  });
});
//@ chunk-ag5x7vhf.js:83873-84754 fingerprint = AnimatedAsterisk (0.765)
function AnimatedAsterisk(props) {
  let $ = useMemoCache(22);
  let { char } = props;
  let children = char === undefined ? TEARDROP_ASTERISK : char;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [reducedMotion] = useState(prefersReducedMotion);
  let [settled, setSettled] = useState(reducedMotion || isScreenReaderEnabled);
  let [startMs, setStartMs] = useState(null);
  let [ref, frame] = useAnimationFrame(settled ? null : 50);
  let settle;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    settle = () => setSettled(true);
    $[0] = settle;
  } else settle = $[0];
  let settleDeps;
  if ($[1] !== settled) {
    settleDeps = [settled];
    $[1] = settled;
    $[2] = settleDeps;
  } else settleDeps = $[2];
  useTimeout(settle, settled ? null : ASTERISK_SETTLE_MS, settleDeps);
  if (settled) {
    let children_2;
    if ($[3] !== children) {
      children_2 = jsxProd_default(Text, {
        color: SETTLED_GREY_COLOR,
        children,
      });
      $[3] = children;
      $[4] = children_2;
    } else children_2 = $[4];
    let settledBox;
    if ($[5] !== ref || $[6] !== children_2) {
      settledBox = jsxProd_default(Box, {
        ref,
        children: children_2,
      });
      $[5] = ref;
      $[6] = children_2;
      $[7] = settledBox;
    } else settledBox = $[7];
    return settledBox;
  }
  if (startMs === null) setStartMs(frame);
  let hue = (((frame - (startMs ?? frame)) / ASTERISK_SPIN_MS) * 360) % 360;
  let TextComponent;
  let BoxComponent;
  let color;
  let ref_2;
  if ($[8] !== hue || $[9] !== ref) {
    let snappedHue = isXtermJs() ? snapTo360(hue) : hue;
    BoxComponent = Box;
    ref_2 = ref;
    TextComponent = Text;
    color = toRGBColor(hueToRgb(snappedHue));
    $[8] = hue;
    $[9] = ref;
    $[10] = TextComponent;
    $[11] = BoxComponent;
    $[12] = color;
    $[13] = ref_2;
  } else {
    TextComponent = $[10];
    BoxComponent = $[11];
    color = $[12];
    ref_2 = $[13];
  }
  let children_2;
  if ($[14] !== TextComponent || $[15] !== children || $[16] !== color) {
    children_2 = jsxProd_default(TextComponent, {
      color,
      children,
    });
    $[14] = TextComponent;
    $[15] = children;
    $[16] = color;
    $[17] = children_2;
  } else children_2 = $[17];
  let spinner;
  if ($[18] !== BoxComponent || $[19] !== ref_2 || $[20] !== children_2) {
    spinner = jsxProd_default(BoxComponent, {
      ref: ref_2,
      children: children_2,
    });
    $[18] = BoxComponent;
    $[19] = ref_2;
    $[20] = children_2;
    $[21] = spinner;
  } else spinner = $[21];
  return spinner;
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
