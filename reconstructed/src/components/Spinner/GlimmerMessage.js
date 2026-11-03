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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useResolvedTheme } from "../design-system/ThemeProvider.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { interpolateColor, parseRGB, roundToStep, toRGBColor } from "./utils.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-3mec1atf.js:1871-1875 placement
init_react_production();
//@ chunk-3mec1atf.js:1875-1879 placement
init_react_production();
//@ chunk-3mec1atf.js:1879-1883 placement
init_react_production();
//@ chunk-3mec1atf.js:1883-1908 layout = SETTLED_GREY (1)
var SETTLED_GREY = {
  r: 171,
  g: 43,
  b: 63,
};
//@ chunk-3mec1atf.js:1908-5903 fingerprint = GlimmerMessage (0.805)
function GlimmerMessage(props) {
  let $ = w(97);
  let {
    message,
    mode,
    messageColor,
    glimmerIndex,
    flashOpacity,
    shimmerColor,
    stalledIntensity,
    thinkingIntensity,
  } = props;
  let stalledIntensity_2 = stalledIntensity === undefined ? 0 : stalledIntensity;
  let E = thinkingIntensity === undefined ? 0 : thinkingIntensity;
  let resolvedTheme = useResolvedTheme();
  let segs;
  if ($[0] !== message) {
    segs = [];
    for (const { segment } of getGraphemeSegmenter().segment(message))
      segs.push({
        segment,
        width: bunStringWidth(segment),
      });
    $[0] = message;
    $[1] = segs;
  } else segs = $[1];
  let messageWidth;
  if ($[2] !== message) {
    messageWidth = bunStringWidth(message);
    $[2] = message;
    $[3] = messageWidth;
  } else messageWidth = $[3];
  let t4;
  if ($[4] !== segs || $[5] !== messageWidth) {
    t4 = {
      segments: segs,
      messageWidth,
    };
    $[4] = segs;
    $[5] = messageWidth;
    $[6] = t4;
  } else t4 = $[6];
  let { segments, messageWidth: messageWidth_2 } = t4;
  if (!message) {
    return null;
  }
  if (stalledIntensity_2 > 0) {
    let O = resolvedTheme[messageColor];
    let g;
    if ($[7] !== O || $[8] !== message || $[9] !== stalledIntensity_2) {
      g = EARLY_RETURN_SENTINEL;
      tt: {
        let J = O ? interpolateColor(O) : null;
        if (J) {
          let interpolated = parseRGB(J, SETTLED_GREY, roundToStep(stalledIntensity_2));
          let theme = toRGBColor(interpolated);
          let p;
          if ($[11] !== theme || $[12] !== message) {
            p = jsxProd_default(Text, {
              color: theme,
              children: message,
            });
            $[11] = theme;
            $[12] = message;
            $[13] = p;
          } else p = $[13];
          let d;
          if ($[14] !== theme) {
            d = jsxProd_default(Text, {
              color: theme,
              children: " ",
            });
            $[14] = theme;
            $[15] = d;
          } else d = $[15];
          let x;
          if ($[16] !== p || $[17] !== d) {
            x = jsxProd_default_2(Fragment, {
              children: [p, d],
            });
            $[16] = p;
            $[17] = d;
            $[18] = x;
          } else x = $[18];
          g = x;
          break tt;
        }
      }
      $[7] = O;
      $[8] = message;
      $[9] = stalledIntensity_2;
      $[10] = g;
    } else g = $[10];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    let color = stalledIntensity_2 > 0.5 ? "error" : messageColor;
    let t5;
    if ($[19] !== color || $[20] !== message) {
      t5 = jsxProd_default(Text, {
        color,
        children: message,
      });
      $[19] = color;
      $[20] = message;
      $[21] = t5;
    } else t5 = $[21];
    let t6;
    if ($[22] !== color) {
      t6 = jsxProd_default(Text, {
        color,
        children: " ",
      });
      $[22] = color;
      $[23] = t6;
    } else t6 = $[23];
    let x;
    if ($[24] !== t5 || $[25] !== t6) {
      x = jsxProd_default_2(Fragment, {
        children: [t5, t6],
      });
      $[24] = t5;
      $[25] = t6;
      $[26] = x;
    } else x = $[26];
    return x;
  }
  if (E > 0) {
    let Rt = resolvedTheme[messageColor];
    let g;
    if ($[27] !== Rt || $[28] !== message || $[29] !== resolvedTheme.warning || $[30] !== E) {
      g = EARLY_RETURN_SENTINEL;
      X: {
        let ht = Rt ? interpolateColor(Rt) : null;
        let wt = interpolateColor(resolvedTheme.warning);
        if (ht && wt) {
          let interpolated = parseRGB(ht, wt, roundToStep(E));
          let color = toRGBColor(interpolated);
          let p;
          if ($[32] !== color || $[33] !== message) {
            p = jsxProd_default(Text, {
              color,
              children: message,
            });
            $[32] = color;
            $[33] = message;
            $[34] = p;
          } else p = $[34];
          let d;
          if ($[35] !== color) {
            d = jsxProd_default(Text, {
              color,
              children: " ",
            });
            $[35] = color;
            $[36] = d;
          } else d = $[36];
          let x;
          if ($[37] !== p || $[38] !== d) {
            x = jsxProd_default_2(Fragment, {
              children: [p, d],
            });
            $[37] = p;
            $[38] = d;
            $[39] = x;
          } else x = $[39];
          g = x;
          break X;
        }
      }
      $[27] = Rt;
      $[28] = message;
      $[29] = resolvedTheme.warning;
      $[30] = E;
      $[31] = g;
    } else g = $[31];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    let color = E > 0.5 ? "warning" : messageColor;
    let p;
    if ($[40] !== color || $[41] !== message) {
      p = jsxProd_default(Text, {
        color,
        children: message,
      });
      $[40] = color;
      $[41] = message;
      $[42] = p;
    } else p = $[42];
    let d;
    if ($[43] !== color) {
      d = jsxProd_default(Text, {
        color,
        children: " ",
      });
      $[43] = color;
      $[44] = d;
    } else d = $[44];
    let x;
    if ($[45] !== p || $[46] !== d) {
      x = jsxProd_default_2(Fragment, {
        children: [p, d],
      });
      $[45] = p;
      $[46] = d;
      $[47] = x;
    } else x = $[47];
    return x;
  }
  if (mode === "tool-use") {
    let mt = resolvedTheme[messageColor];
    let shimmerColorStr = resolvedTheme[shimmerColor];
    let g;
    if (
      $[48] !== mt ||
      $[49] !== flashOpacity ||
      $[50] !== message ||
      $[51] !== messageColor ||
      $[52] !== shimmerColorStr
    ) {
      g = EARLY_RETURN_SENTINEL;
      At: {
        let it = mt ? interpolateColor(mt) : null;
        let shimmerRGB = shimmerColorStr ? interpolateColor(shimmerColorStr) : null;
        if (it && shimmerRGB) {
          let interpolated = parseRGB(it, shimmerRGB, roundToStep(flashOpacity));
          const t5 = jsxProd_default(Text, {
            color: toRGBColor(interpolated),
            children: message,
          });
          let t6;
          if ($[54] !== messageColor) {
            t6 = jsxProd_default(Text, {
              color: messageColor,
              children: " ",
            });
            $[54] = messageColor;
            $[55] = t6;
          } else t6 = $[55];
          let t7;
          if ($[56] !== t5 || $[57] !== t6) {
            t7 = jsxProd_default_2(Fragment, {
              children: [t5, t6],
            });
            $[56] = t5;
            $[57] = t6;
            $[58] = t7;
          } else t7 = $[58];
          g = t7;
          break At;
        }
      }
      $[48] = mt;
      $[49] = flashOpacity;
      $[50] = message;
      $[51] = messageColor;
      $[52] = shimmerColorStr;
      $[53] = g;
    } else g = $[53];
    if (g !== EARLY_RETURN_SENTINEL) return g;
    let color = flashOpacity > 0.5 ? shimmerColor : messageColor;
    let t5;
    if ($[59] !== color || $[60] !== message) {
      t5 = jsxProd_default(Text, {
        color,
        children: message,
      });
      $[59] = color;
      $[60] = message;
      $[61] = t5;
    } else t5 = $[61];
    let t6;
    if ($[62] !== messageColor) {
      t6 = jsxProd_default(Text, {
        color: messageColor,
        children: " ",
      });
      $[62] = messageColor;
      $[63] = t6;
    } else t6 = $[63];
    let x;
    if ($[64] !== t5 || $[65] !== t6) {
      x = jsxProd_default_2(Fragment, {
        children: [t5, t6],
      });
      $[64] = t5;
      $[65] = t6;
      $[66] = x;
    } else x = $[66];
    return x;
  }
  let shimmerStart = glimmerIndex - 1;
  let z = glimmerIndex + 1;
  if (shimmerStart >= messageWidth_2 || z < 0) {
    let t3;
    if ($[67] !== message || $[68] !== messageColor) {
      t3 = jsxProd_default(Text, {
        color: messageColor,
        children: message,
      });
      $[67] = message;
      $[68] = messageColor;
      $[69] = t3;
    } else t3 = $[69];
    let t4;
    if ($[70] !== messageColor) {
      t4 = jsxProd_default(Text, {
        color: messageColor,
        children: " ",
      });
      $[70] = messageColor;
      $[71] = t4;
    } else t4 = $[71];
    let t5;
    if ($[72] !== t3 || $[73] !== t4) {
      t5 = jsxProd_default_2(Fragment, {
        children: [t3, t4],
      });
      $[72] = t3;
      $[73] = t4;
      $[74] = t5;
    } else t5 = $[74];
    return t5;
  }
  let clampedStart = Math.max(0, shimmerStart);
  let ct;
  let ft;
  let shim;
  if ($[75] !== clampedStart || $[76] !== segments || $[77] !== z) {
    let colPos = 0;
    ft = "";
    shim = "";
    ct = "";
    for (const { segment, width } of segments) {
      if (colPos + width <= clampedStart) ft = ft + segment;
      else if (colPos > z) ct = ct + segment;
      else shim = shim + segment;
      colPos = colPos + width;
    }
    $[75] = clampedStart;
    $[76] = segments;
    $[77] = z;
    $[78] = ct;
    $[79] = ft;
    $[80] = shim;
  } else {
    ct = $[78];
    ft = $[79];
    shim = $[80];
  }
  let t3;
  if ($[81] !== ft || $[82] !== messageColor) {
    t3 =
      ft &&
      jsxProd_default(Text, {
        color: messageColor,
        children: ft,
      });
    $[81] = ft;
    $[82] = messageColor;
    $[83] = t3;
  } else t3 = $[83];
  let t4_2;
  if ($[84] !== shim || $[85] !== shimmerColor) {
    t4_2 = jsxProd_default(Text, {
      color: shimmerColor,
      children: shim,
    });
    $[84] = shim;
    $[85] = shimmerColor;
    $[86] = t4_2;
  } else t4_2 = $[86];
  let t5;
  if ($[87] !== ct || $[88] !== messageColor) {
    t5 =
      ct &&
      jsxProd_default(Text, {
        color: messageColor,
        children: ct,
      });
    $[87] = ct;
    $[88] = messageColor;
    $[89] = t5;
  } else t5 = $[89];
  let t6;
  if ($[90] !== messageColor) {
    t6 = jsxProd_default(Text, {
      color: messageColor,
      children: " ",
    });
    $[90] = messageColor;
    $[91] = t6;
  } else t6 = $[91];
  let t7;
  if ($[92] !== t3 || $[93] !== t4_2 || $[94] !== t5 || $[95] !== t6) {
    t7 = jsxProd_default_2(Fragment, {
      children: [t3, t4_2, t5, t6],
    });
    $[92] = t3;
    $[93] = t4_2;
    $[94] = t5;
    $[95] = t6;
    $[96] = t7;
  } else t7 = $[96];
  return t7;
}
export { GlimmerMessage };
