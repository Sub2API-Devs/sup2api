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
import { toRGBColor, Jnn, hueToRgb } from "../Spinner/utils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { isXtermJs } from "../../ink/terminal.js";

//@ chunk-ag5x7vhf.js:83769-83820 placement
function prefersReducedMotion() {
  return isReducedMotion(getInitialSettings_2().prefersReducedMotion);
}
//@ chunk-ag5x7vhf.js:83820-83873 layout = SETTLED_GREY (1)
var km = 1500,
  Z_ = 2,
  eS = km * Z_,
  tS = toRGBColor({ r: 153, g: 153, b: 153 });
//@ chunk-ag5x7vhf.js:83873-84754 fingerprint = AnimatedAsterisk (0.765)
function AnimatedAsterisk(m) {
  let $ = w(22),
    { char: char } = m,
    x = char === void 0 ? TEARDROP_ASTERISK : char,
    T = useIsScreenReaderEnabled(),
    [k] = y(prefersReducedMotion),
    [_, I] = y(k || T),
    [D, A] = y(null),
    [L, V] = useAnimationFrame(_ ? null : 50),
    z;
  if ($[0] === MEMO_CACHE_SENTINEL) ((z = () => I(!0)), ($[0] = z));
  else z = $[0];
  let K;
  if ($[1] !== _) ((K = [_]), ($[1] = _), ($[2] = K));
  else K = $[2];
  if ((useTimeout(z, _ ? null : eS, K), _)) {
    let q;
    if ($[3] !== x) ((q = e(Text, { color: tS, children: x })), ($[3] = x), ($[4] = q));
    else q = $[4];
    let Y;
    if ($[5] !== L || $[6] !== q) ((Y = e(Box, { ref: L, children: q })), ($[5] = L), ($[6] = q), ($[7] = Y));
    else Y = $[7];
    return Y;
  }
  if (D === null) A(V);
  let xe = (((V - (D ?? V)) / km) * 360) % 360,
    ge,
    Re,
    q,
    Y;
  if ($[8] !== xe || $[9] !== L) {
    let We = isXtermJs() ? Jnn(xe) : xe;
    Re = Box;
    Y = L;
    ge = Text;
    q = toRGBColor(hueToRgb(We));
    (($[8] = xe), ($[9] = L), ($[10] = ge), ($[11] = Re), ($[12] = q), ($[13] = Y));
  } else ((ge = $[10]), (Re = $[11]), (q = $[12]), (Y = $[13]));
  let fe;
  if ($[14] !== ge || $[15] !== x || $[16] !== q)
    ((fe = e(ge, { color: q, children: x })), ($[14] = ge), ($[15] = x), ($[16] = q), ($[17] = fe));
  else fe = $[17];
  let Fe;
  if ($[18] !== Re || $[19] !== Y || $[20] !== fe)
    ((Fe = e(Re, { ref: Y, children: fe })), ($[18] = Re), ($[19] = Y), ($[20] = fe), ($[21] = Fe));
  else Fe = $[21];
  return Fe;
}
//@ chunk-18hwfzwa.js:785671-785728 fingerprint = SETTLED_GREY (1)
var $J = 20,
  u9t = 4000,
  R5e = u9t / $J,
  m9t = 0.18,
  p9t = { r: 0, g: 0, b: 0 };

export { R5e, $J, m9t, p9t, AnimatedAsterisk };
