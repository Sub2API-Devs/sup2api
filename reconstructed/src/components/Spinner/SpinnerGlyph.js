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
import {
  cosineEase,
  interpolateColor,
  parseRGB,
  roundToStep,
  toRGBColor,
  spinnerFramesForTerminal,
} from "./utils.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-mjyddqh1.js:425-485 placement = SETTLED_GREY (1)
/**
 * 导出值：同一声明里的多个绑定：GLYPH_ANIM_MS（2000）；GLYPH_ACCENT_RGB（强调色）；GLYPH_BASE_RGB（基础色）；位于「Spinner 旋转字形（按帧/停滞状态变色）」模块。
 */
var SPINNER_DOT = "\u25CF";
var GLYPH_ANIM_MS = 2000;
var GLYPH_ACCENT_RGB = {
  r: 171,
  g: 43,
  b: 63,
};
var GLYPH_BASE_RGB = {
  r: 0,
  g: 0,
  b: 0,
};
//@ chunk-mjyddqh1.js:485-2774 fingerprint = SpinnerGlyph (0.763)
function SpinnerGlyph(props) {
  let $ = w(35);
  let { frame, messageColor, stalledIntensity, thinkingIntensity, reducedMotion, time } = props;
  let f = stalledIntensity === undefined ? 0 : stalledIntensity;
  let i = thinkingIntensity === undefined ? 0 : thinkingIntensity;
  let he = reducedMotion === undefined ? false : reducedMotion;
  let de = time === undefined ? 0 : time;
  let resolvedTheme = useResolvedTheme();
  if (he) {
    let C = 1 - cosineEase(de, GLYPH_ANIM_MS);
    let u = i > 0 ? "warning" : messageColor;
    let R = resolvedTheme[u];
    let g;
    if ($[0] !== R || $[1] !== C || $[2] !== i) {
      g = EARLY_RETURN_SENTINEL;
      Re: {
        let G = R ? interpolateColor(R) : null;
        if (G) {
          let ce = parseRGB(G, GLYPH_BASE_RGB, 0.5);
          let me = parseRGB(ce, G, roundToStep(C));
          const children = jsxProd_default(Text, {
            color: toRGBColor(me),
            bold: i >= 0.5,
            children: SPINNER_DOT,
          });
          let t;
          if ($[4] !== children) {
            t = jsxProd_default(Box, {
              "aria-hidden": true,
              flexWrap: "wrap",
              height: 1,
              width: 2,
              children,
            });
            $[4] = children;
            $[5] = t;
          } else t = $[5];
          g = t;
          break Re;
        }
      }
      $[0] = R;
      $[1] = C;
      $[2] = i;
      $[3] = g;
    } else g = $[3];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    const dimColor = C < 0.5;
    const bold = i >= 0.5;
    let h;
    if ($[6] !== u || $[7] !== dimColor || $[8] !== bold) {
      h = jsxProd_default(Box, {
        "aria-hidden": true,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: jsxProd_default(Text, {
          color: u,
          dimColor,
          bold,
          children: SPINNER_DOT,
        }),
      });
      $[6] = u;
      $[7] = dimColor;
      $[8] = bold;
      $[9] = h;
    } else h = $[9];
    return h;
  }
  let g;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    g = spinnerFramesForTerminal();
    $[10] = g;
  } else g = $[10];
  let q = g;
  let children = q[frame % q.length];
  if (f > 0) {
    let B = resolvedTheme[messageColor];
    let r;
    if ($[11] !== B || $[12] !== children || $[13] !== f) {
      r = EARLY_RETURN_SENTINEL;
      Be: {
        let z = B ? interpolateColor(B) : null;
        if (z) {
          let interpolated = parseRGB(z, GLYPH_ACCENT_RGB, roundToStep(f));
          const children_2 = jsxProd_default(Text, {
            color: toRGBColor(interpolated),
            children,
          });
          let h;
          if ($[15] !== children_2) {
            h = jsxProd_default(Box, {
              "aria-hidden": true,
              flexWrap: "wrap",
              height: 1,
              width: 2,
              children: children_2,
            });
            $[15] = children_2;
            $[16] = h;
          } else h = $[16];
          r = h;
          break Be;
        }
      }
      $[11] = B;
      $[12] = children;
      $[13] = f;
      $[14] = r;
    } else r = $[14];
    if (r !== EARLY_RETURN_SENTINEL) return r;
    let color = f > 0.5 ? "error" : messageColor;
    let t;
    if ($[17] !== color || $[18] !== children) {
      t = jsxProd_default(Box, {
        "aria-hidden": true,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: jsxProd_default(Text, {
          color,
          children,
        }),
      });
      $[17] = color;
      $[18] = children;
      $[19] = t;
    } else t = $[19];
    return t;
  }
  if (i > 0) {
    let I = resolvedTheme[messageColor];
    let bold;
    let r;
    if ($[20] !== I || $[21] !== children || $[22] !== resolvedTheme.warning || $[23] !== i) {
      r = EARLY_RETURN_SENTINEL;
      Ie: {
        let E = I ? interpolateColor(I) : null;
        let _ = interpolateColor(resolvedTheme.warning);
        bold = i >= 0.5;
        if (E && _) {
          let be = parseRGB(E, _, roundToStep(i));
          const children_2 = jsxProd_default(Text, {
            bold,
            color: toRGBColor(be),
            children,
          });
          let h;
          if ($[26] !== children_2) {
            h = jsxProd_default(Box, {
              "aria-hidden": true,
              flexWrap: "wrap",
              height: 1,
              width: 2,
              children: children_2,
            });
            $[26] = children_2;
            $[27] = h;
          } else h = $[27];
          r = h;
          break Ie;
        }
      }
      $[20] = I;
      $[21] = children;
      $[22] = resolvedTheme.warning;
      $[23] = i;
      $[24] = bold;
      $[25] = r;
    } else {
      bold = $[24];
      r = $[25];
    }
    if (r !== EARLY_RETURN_SENTINEL) return r;
    let color = i > 0.5 ? "warning" : messageColor;
    let t;
    if ($[28] !== bold || $[29] !== color || $[30] !== children) {
      t = jsxProd_default(Box, {
        "aria-hidden": true,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: jsxProd_default(Text, {
          bold,
          color,
          children,
        }),
      });
      $[28] = bold;
      $[29] = color;
      $[30] = children;
      $[31] = t;
    } else t = $[31];
    return t;
  }
  let r;
  if ($[32] !== messageColor || $[33] !== children) {
    r = jsxProd_default(Box, {
      "aria-hidden": true,
      flexWrap: "wrap",
      height: 1,
      width: 2,
      children: jsxProd_default(Text, {
        color: messageColor,
        children,
      }),
    });
    $[32] = messageColor;
    $[33] = children;
    $[34] = r;
  } else r = $[34];
  return r;
}
export { SpinnerGlyph, SPINNER_DOT };
