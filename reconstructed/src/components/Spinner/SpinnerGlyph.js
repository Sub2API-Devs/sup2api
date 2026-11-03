/**
 * components/Spinner/SpinnerGlyph.tsx
 *
 * Spinner 旋转字形（按帧/停滞状态变色）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/SpinnerGlyph.tsx
 * pieces: chunk-mjyddqh1.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useResolvedTheme } from "../design-system/ThemeProvider.js";
import { qWe, interpolateColor, parseRGB, roundToStep, toRGBColor, VWe } from "./utils.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-mjyddqh1.js:425-485 placement = SETTLED_GREY (1)
var SPINNER_DOT = "\u25CF",
  M = 2000,
  P = { r: 171, g: 43, b: 63 },
  T = { r: 0, g: 0, b: 0 };
//@ chunk-mjyddqh1.js:485-2774 fingerprint = SpinnerGlyph (0.763)
function SpinnerGlyph(t0) {
  let $ = w(35),
    {
      frame: frame,
      messageColor: messageColor,
      stalledIntensity: t1,
      thinkingIntensity: thinkingIntensity,
      reducedMotion: t2,
      time: t3,
    } = t0,
    f = t1 === void 0 ? 0 : t1,
    i = thinkingIntensity === void 0 ? 0 : thinkingIntensity,
    he = t2 === void 0 ? !1 : t2,
    de = t3 === void 0 ? 0 : t3,
    m = useResolvedTheme();
  if (he) {
    let C = 1 - qWe(de, M);
    let u = i > 0 ? "warning" : messageColor;
    let R = m[u];
    let g;
    if ($[0] !== R || $[1] !== C || $[2] !== i) {
      g = EARLY_RETURN_SENTINEL;
      Re: {
        let G = R ? interpolateColor(R) : null;
        if (G) {
          let ce = parseRGB(G, T, 0.5);
          let me = parseRGB(ce, G, roundToStep(C));
          const r = e(Text, { color: toRGBColor(me), bold: i >= 0.5, children: SPINNER_DOT });
          let t;
          if ($[4] !== r)
            ((t = e(Box, { "aria-hidden": !0, flexWrap: "wrap", height: 1, width: 2, children: r })),
              ($[4] = r),
              ($[5] = t));
          else t = $[5];
          g = t;
          break Re;
        }
      }
      (($[0] = R), ($[1] = C), ($[2] = i), ($[3] = g));
    } else g = $[3];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    const r = C < 0.5;
    const t = i >= 0.5;
    let h;
    if ($[6] !== u || $[7] !== r || $[8] !== t)
      ((h = e(Box, {
        "aria-hidden": !0,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: e(Text, { color: u, dimColor: r, bold: t, children: SPINNER_DOT }),
      })),
        ($[6] = u),
        ($[7] = r),
        ($[8] = t),
        ($[9] = h));
    else h = $[9];
    return h;
  }
  let g;
  if ($[10] === MEMO_CACHE_SENTINEL) ((g = VWe()), ($[10] = g));
  else g = $[10];
  let q = g,
    o = q[frame % q.length];
  if (f > 0) {
    let B = m[messageColor];
    let r;
    if ($[11] !== B || $[12] !== o || $[13] !== f) {
      r = EARLY_RETURN_SENTINEL;
      Be: {
        let z = B ? interpolateColor(B) : null;
        if (z) {
          let interpolated = parseRGB(z, P, roundToStep(f));
          const t = e(Text, { color: toRGBColor(interpolated), children: o });
          let h;
          if ($[15] !== t)
            ((h = e(Box, { "aria-hidden": !0, flexWrap: "wrap", height: 1, width: 2, children: t })),
              ($[15] = t),
              ($[16] = h));
          else h = $[16];
          r = h;
          break Be;
        }
      }
      (($[11] = B), ($[12] = o), ($[13] = f), ($[14] = r));
    } else r = $[14];
    if (r !== EARLY_RETURN_SENTINEL) return r;
    let W = f > 0.5 ? "error" : messageColor;
    let t;
    if ($[17] !== W || $[18] !== o)
      ((t = e(Box, {
        "aria-hidden": !0,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: e(Text, { color: W, children: o }),
      })),
        ($[17] = W),
        ($[18] = o),
        ($[19] = t));
    else t = $[19];
    return t;
  }
  if (i > 0) {
    let I = m[messageColor];
    let p, r;
    if ($[20] !== I || $[21] !== o || $[22] !== m.warning || $[23] !== i) {
      r = EARLY_RETURN_SENTINEL;
      Ie: {
        let E = I ? interpolateColor(I) : null;
        let _ = interpolateColor(m.warning);
        p = i >= 0.5;
        if (E && _) {
          let be = parseRGB(E, _, roundToStep(i));
          const t = e(Text, { bold: p, color: toRGBColor(be), children: o });
          let h;
          if ($[26] !== t)
            ((h = e(Box, { "aria-hidden": !0, flexWrap: "wrap", height: 1, width: 2, children: t })),
              ($[26] = t),
              ($[27] = h));
          else h = $[27];
          r = h;
          break Ie;
        }
      }
      (($[20] = I), ($[21] = o), ($[22] = m.warning), ($[23] = i), ($[24] = p), ($[25] = r));
    } else ((p = $[24]), (r = $[25]));
    if (r !== EARLY_RETURN_SENTINEL) return r;
    let K = i > 0.5 ? "warning" : messageColor;
    let t;
    if ($[28] !== p || $[29] !== K || $[30] !== o)
      ((t = e(Box, {
        "aria-hidden": !0,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: e(Text, { bold: p, color: K, children: o }),
      })),
        ($[28] = p),
        ($[29] = K),
        ($[30] = o),
        ($[31] = t));
    else t = $[31];
    return t;
  }
  let r;
  if ($[32] !== messageColor || $[33] !== o)
    ((r = e(Box, {
      "aria-hidden": !0,
      flexWrap: "wrap",
      height: 1,
      width: 2,
      children: e(Text, { color: messageColor, children: o }),
    })),
      ($[32] = messageColor),
      ($[33] = o),
      ($[34] = r));
  else r = $[34];
  return r;
}

export { SpinnerGlyph, SPINNER_DOT };
