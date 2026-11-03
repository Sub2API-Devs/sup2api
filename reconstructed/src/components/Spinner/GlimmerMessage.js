/**
 * components/Spinner/GlimmerMessage.tsx
 *
 * Spinner 文案的微光（glimmer）渲染，按模式着色（错误/警告/工具使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/GlimmerMessage.tsx
 * pieces: chunk-3mec1atf.js (5)
 * attribution: placement 3, layout 1, fingerprint 1
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useResolvedTheme } from "../design-system/ThemeProvider.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { interpolateColor, parseRGB, roundToStep, toRGBColor } from "./utils.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-3mec1atf.js:1871-1875 placement
j();
//@ chunk-3mec1atf.js:1875-1879 placement
j();
//@ chunk-3mec1atf.js:1879-1883 placement
j();
//@ chunk-3mec1atf.js:1883-1908 layout = SETTLED_GREY (1)
var SETTLED_GREY = { r: 171, g: 43, b: 63 };
//@ chunk-3mec1atf.js:1908-5903 fingerprint = GlimmerMessage (0.805)
function GlimmerMessage(t0) {
  let $ = w(97),
    {
      message: message,
      mode: mode,
      messageColor: messageColor,
      glimmerIndex: glimmerIndex,
      flashOpacity: flashOpacity,
      shimmerColor: shimmerColor,
      stalledIntensity: t1,
      thinkingIntensity: thinkingIntensity,
    } = t0,
    M = t1 === void 0 ? 0 : t1,
    E = thinkingIntensity === void 0 ? 0 : thinkingIntensity,
    N = useResolvedTheme(),
    b;
  if ($[0] !== message) {
    b = [];
    for (const { segment: segment } of getGraphemeSegmenter().segment(message))
      b.push({ segment: segment, width: bunStringWidth(segment) });
    (($[0] = message), ($[1] = b));
  } else b = $[1];
  let U;
  if ($[2] !== message) ((U = bunStringWidth(message)), ($[2] = message), ($[3] = U));
  else U = $[3];
  let B;
  if ($[4] !== b || $[5] !== U) ((B = { segments: b, messageWidth: U }), ($[4] = b), ($[5] = U), ($[6] = B));
  else B = $[6];
  let { segments: segments, messageWidth: messageWidth } = B;
  if (!message) {
    return null;
  }
  if (M > 0) {
    let O = N[messageColor];
    let g;
    if ($[7] !== O || $[8] !== message || $[9] !== M) {
      g = EARLY_RETURN_SENTINEL;
      tt: {
        let J = O ? interpolateColor(O) : null;
        if (J) {
          let at = parseRGB(J, SETTLED_GREY, roundToStep(M));
          let theme = toRGBColor(at);
          let p;
          if ($[11] !== theme || $[12] !== message)
            ((p = e(Text, { color: theme, children: message })),
              ($[11] = theme),
              ($[12] = message),
              ($[13] = p));
          else p = $[13];
          let d;
          if ($[14] !== theme) ((d = e(Text, { color: theme, children: " " })), ($[14] = theme), ($[15] = d));
          else d = $[15];
          let x;
          if ($[16] !== p || $[17] !== d)
            ((x = r(Fragment, { children: [p, d] })), ($[16] = p), ($[17] = d), ($[18] = x));
          else x = $[18];
          g = x;
          break tt;
        }
      }
      (($[7] = O), ($[8] = message), ($[9] = M), ($[10] = g));
    } else g = $[10];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    let A = M > 0.5 ? "error" : messageColor;
    let p;
    if ($[19] !== A || $[20] !== message)
      ((p = e(Text, { color: A, children: message })), ($[19] = A), ($[20] = message), ($[21] = p));
    else p = $[21];
    let d;
    if ($[22] !== A) ((d = e(Text, { color: A, children: " " })), ($[22] = A), ($[23] = d));
    else d = $[23];
    let x;
    if ($[24] !== p || $[25] !== d)
      ((x = r(Fragment, { children: [p, d] })), ($[24] = p), ($[25] = d), ($[26] = x));
    else x = $[26];
    return x;
  }
  if (E > 0) {
    let Rt = N[messageColor];
    let g;
    if ($[27] !== Rt || $[28] !== message || $[29] !== N.warning || $[30] !== E) {
      g = EARLY_RETURN_SENTINEL;
      X: {
        let ht = Rt ? interpolateColor(Rt) : null;
        let wt = interpolateColor(N.warning);
        if (ht && wt) {
          let interpolated = parseRGB(ht, wt, roundToStep(E));
          let color = toRGBColor(interpolated);
          let p;
          if ($[32] !== color || $[33] !== message)
            ((p = e(Text, { color: color, children: message })),
              ($[32] = color),
              ($[33] = message),
              ($[34] = p));
          else p = $[34];
          let d;
          if ($[35] !== color) ((d = e(Text, { color: color, children: " " })), ($[35] = color), ($[36] = d));
          else d = $[36];
          let x;
          if ($[37] !== p || $[38] !== d)
            ((x = r(Fragment, { children: [p, d] })), ($[37] = p), ($[38] = d), ($[39] = x));
          else x = $[39];
          g = x;
          break X;
        }
      }
      (($[27] = Rt), ($[28] = message), ($[29] = N.warning), ($[30] = E), ($[31] = g));
    } else g = $[31];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    let K = E > 0.5 ? "warning" : messageColor;
    let p;
    if ($[40] !== K || $[41] !== message)
      ((p = e(Text, { color: K, children: message })), ($[40] = K), ($[41] = message), ($[42] = p));
    else p = $[42];
    let d;
    if ($[43] !== K) ((d = e(Text, { color: K, children: " " })), ($[43] = K), ($[44] = d));
    else d = $[44];
    let x;
    if ($[45] !== p || $[46] !== d)
      ((x = r(Fragment, { children: [p, d] })), ($[45] = p), ($[46] = d), ($[47] = x));
    else x = $[47];
    return x;
  }
  if (mode === "tool-use") {
    let mt = N[messageColor];
    let Tt = N[shimmerColor];
    let g;
    if (
      $[48] !== mt ||
      $[49] !== flashOpacity ||
      $[50] !== message ||
      $[51] !== messageColor ||
      $[52] !== Tt
    ) {
      g = EARLY_RETURN_SENTINEL;
      At: {
        let it = mt ? interpolateColor(mt) : null;
        let Mt = Tt ? interpolateColor(Tt) : null;
        if (it && Mt) {
          let interpolated_0 = parseRGB(it, Mt, roundToStep(flashOpacity));
          const p = e(Text, { color: toRGBColor(interpolated_0), children: message });
          let d;
          if ($[54] !== messageColor)
            ((d = e(Text, { color: messageColor, children: " " })), ($[54] = messageColor), ($[55] = d));
          else d = $[55];
          let x;
          if ($[56] !== p || $[57] !== d)
            ((x = r(Fragment, { children: [p, d] })), ($[56] = p), ($[57] = d), ($[58] = x));
          else x = $[58];
          g = x;
          break At;
        }
      }
      (($[48] = mt),
        ($[49] = flashOpacity),
        ($[50] = message),
        ($[51] = messageColor),
        ($[52] = Tt),
        ($[53] = g));
    } else g = $[53];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    let Lt = flashOpacity > 0.5 ? shimmerColor : messageColor;
    let p;
    if ($[59] !== Lt || $[60] !== message)
      ((p = e(Text, { color: Lt, children: message })), ($[59] = Lt), ($[60] = message), ($[61] = p));
    else p = $[61];
    let d;
    if ($[62] !== messageColor)
      ((d = e(Text, { color: messageColor, children: " " })), ($[62] = messageColor), ($[63] = d));
    else d = $[63];
    let x;
    if ($[64] !== p || $[65] !== d)
      ((x = r(Fragment, { children: [p, d] })), ($[64] = p), ($[65] = d), ($[66] = x));
    else x = $[66];
    return x;
  }
  let st = glimmerIndex - 1,
    z = glimmerIndex + 1;
  if (st >= messageWidth || z < 0) {
    let g;
    if ($[67] !== message || $[68] !== messageColor)
      ((g = e(Text, { color: messageColor, children: message })),
        ($[67] = message),
        ($[68] = messageColor),
        ($[69] = g));
    else g = $[69];
    let p;
    if ($[70] !== messageColor)
      ((p = e(Text, { color: messageColor, children: " " })), ($[70] = messageColor), ($[71] = p));
    else p = $[71];
    let d;
    if ($[72] !== g || $[73] !== p)
      ((d = r(Fragment, { children: [g, p] })), ($[72] = g), ($[73] = p), ($[74] = d));
    else d = $[74];
    return d;
  }
  let clampedStart = Math.max(0, st),
    ct,
    ft,
    Y;
  if ($[75] !== clampedStart || $[76] !== segments || $[77] !== z) {
    let colPos = 0;
    ft = "";
    Y = "";
    ct = "";
    for (const { segment: segment_0, width: width } of segments) {
      if (colPos + width <= clampedStart) ft = ft + segment_0;
      else if (colPos > z) ct = ct + segment_0;
      else Y = Y + segment_0;
      colPos = colPos + width;
    }
    (($[75] = clampedStart), ($[76] = segments), ($[77] = z), ($[78] = ct), ($[79] = ft), ($[80] = Y));
  } else ((ct = $[78]), (ft = $[79]), (Y = $[80]));
  let g;
  if ($[81] !== ft || $[82] !== messageColor)
    ((g = ft && e(Text, { color: messageColor, children: ft })),
      ($[81] = ft),
      ($[82] = messageColor),
      ($[83] = g));
  else g = $[83];
  let p;
  if ($[84] !== Y || $[85] !== shimmerColor)
    ((p = e(Text, { color: shimmerColor, children: Y })), ($[84] = Y), ($[85] = shimmerColor), ($[86] = p));
  else p = $[86];
  let d;
  if ($[87] !== ct || $[88] !== messageColor)
    ((d = ct && e(Text, { color: messageColor, children: ct })),
      ($[87] = ct),
      ($[88] = messageColor),
      ($[89] = d));
  else d = $[89];
  let x;
  if ($[90] !== messageColor)
    ((x = e(Text, { color: messageColor, children: " " })), ($[90] = messageColor), ($[91] = x));
  else x = $[91];
  let Et;
  if ($[92] !== g || $[93] !== p || $[94] !== d || $[95] !== x)
    ((Et = r(Fragment, { children: [g, p, d, x] })),
      ($[92] = g),
      ($[93] = p),
      ($[94] = d),
      ($[95] = x),
      ($[96] = Et));
  else Et = $[96];
  return Et;
}

export { GlimmerMessage };
