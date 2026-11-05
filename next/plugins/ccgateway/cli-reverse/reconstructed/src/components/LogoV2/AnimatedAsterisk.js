/**
 * components/LogoV2/AnimatedAsterisk.tsx
 *
 * 欢迎区动画星号（颜色渐变到 SETTLED_GREY）；本模块混入了 fflate 解压表等第三方代码（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/AnimatedAsterisk.tsx
 * pieces: chunk-0fgj42c8.js (2), chunk-hnxhr3bs.js (3)
 * attribution: fingerprint 2, affinity 1, placement 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
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

//@ chunk-0fgj42c8.js:852-1135 fingerprint (2.1.88 match: SETTLED_GREY, 1)
function SETTLED_GREY(color) {
  let match = /^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(color);
  if (match)
    return {
      r: hexPairToFraction(match[1]),
      g: hexPairToFraction(match[2]),
      b: hexPairToFraction(match[3]),
    };
  let match_2 = /^#([0-9a-f]+)$/i.exec(color);
  if (match_2 && match_2[1].length % 3 === 0) {
    let hex = match_2[1];
    let pairLength = hex.length / 3;
    return {
      r: hexPairToFraction(hex.slice(0, pairLength)),
      g: hexPairToFraction(hex.slice(pairLength, 2 * pairLength)),
      b: hexPairToFraction(hex.slice(2 * pairLength)),
    };
  }
  return;
}
//@ chunk-0fgj42c8.js:1135-1194 affinity
function hexPairToFraction(hexPair) {
  let maxPairValue = 16 ** hexPair.length - 1;
  return parseInt(hexPair, 16) / maxPairValue;
}
//@ chunk-hnxhr3bs.js:83254-83305 placement
function prefersReducedMotion() {
  return isReducedMotion(getInitialSettings().prefersReducedMotion);
}
//@ chunk-hnxhr3bs.js:83305-83358 layout (2.1.88 match: SETTLED_GREY, 1)
var ASTERISK_SPIN_MS; // deferred: uses toRGBColor (../Spinner/utils.js) of its import cycle while loading; runs once the cycle is complete
var ASTERISK_TURN_COUNT;
var ASTERISK_SETTLE_MS;
var SETTLED_GREY_COLOR;
deferInit("chunk-hnxhr3bs.js:83305", () => {
  ASTERISK_SPIN_MS = 1500;
  ASTERISK_TURN_COUNT = 2;
  ASTERISK_SETTLE_MS = ASTERISK_SPIN_MS * ASTERISK_TURN_COUNT;
  SETTLED_GREY_COLOR = toRGBColor({
    r: 153,
    g: 153,
    b: 153,
  });
});
//@ chunk-hnxhr3bs.js:83358-84239 fingerprint (2.1.88 match: AnimatedAsterisk, 0.765)
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
export { SETTLED_GREY, AnimatedAsterisk };
