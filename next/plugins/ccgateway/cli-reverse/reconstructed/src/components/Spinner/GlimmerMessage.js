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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3mec1atf.js:1871-1875 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3mec1atf.js:1871", () => {
  init_react_production();
});
//@ chunk-3mec1atf.js:1875-1879 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3mec1atf.js:1875", () => {
  init_react_production();
});
//@ chunk-3mec1atf.js:1879-1883 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3mec1atf.js:1879", () => {
  init_react_production();
});
//@ chunk-3mec1atf.js:1883-1908 layout (2.1.88 match: SETTLED_GREY, 1)
var SETTLED_GREY = {
  r: 171,
  g: 43,
  b: 63,
};
//@ chunk-3mec1atf.js:1908-5903 fingerprint (2.1.88 match: GlimmerMessage, 0.805)
function GlimmerMessage(props) {
  let $ = useMemoCache(97);
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
  let thinking = thinkingIntensity === undefined ? 0 : thinkingIntensity;
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
    let rgb = resolvedTheme[messageColor];
    let earlyReturn;
    if ($[7] !== rgb || $[8] !== message || $[9] !== stalledIntensity_2) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      tt: {
        let interpolated = rgb ? interpolateColor(rgb) : null;
        if (interpolated) {
          let interpolated_2 = parseRGB(interpolated, SETTLED_GREY, roundToStep(stalledIntensity_2));
          let theme = toRGBColor(interpolated_2);
          let textNode;
          if ($[11] !== theme || $[12] !== message) {
            textNode = jsxProd_default(Text, {
              color: theme,
              children: message,
            });
            $[11] = theme;
            $[12] = message;
            $[13] = textNode;
          } else textNode = $[13];
          let spaceNode;
          if ($[14] !== theme) {
            spaceNode = jsxProd_default(Text, {
              color: theme,
              children: " ",
            });
            $[14] = theme;
            $[15] = spaceNode;
          } else spaceNode = $[15];
          let fragment;
          if ($[16] !== textNode || $[17] !== spaceNode) {
            fragment = jsxProd_default_2(Fragment, {
              children: [textNode, spaceNode],
            });
            $[16] = textNode;
            $[17] = spaceNode;
            $[18] = fragment;
          } else fragment = $[18];
          earlyReturn = fragment;
          break tt;
        }
      }
      $[7] = rgb;
      $[8] = message;
      $[9] = stalledIntensity_2;
      $[10] = earlyReturn;
    } else earlyReturn = $[10];
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
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
    let fragment;
    if ($[24] !== t5 || $[25] !== t6) {
      fragment = jsxProd_default_2(Fragment, {
        children: [t5, t6],
      });
      $[24] = t5;
      $[25] = t6;
      $[26] = fragment;
    } else fragment = $[26];
    return fragment;
  }
  if (thinking > 0) {
    let rgb = resolvedTheme[messageColor];
    let earlyReturn;
    if ($[27] !== rgb || $[28] !== message || $[29] !== resolvedTheme.warning || $[30] !== thinking) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      X: {
        let interpolated = rgb ? interpolateColor(rgb) : null;
        let warningRGB = interpolateColor(resolvedTheme.warning);
        if (interpolated && warningRGB) {
          let interpolated_2 = parseRGB(interpolated, warningRGB, roundToStep(thinking));
          let color = toRGBColor(interpolated_2);
          let textNode;
          if ($[32] !== color || $[33] !== message) {
            textNode = jsxProd_default(Text, {
              color,
              children: message,
            });
            $[32] = color;
            $[33] = message;
            $[34] = textNode;
          } else textNode = $[34];
          let spaceNode;
          if ($[35] !== color) {
            spaceNode = jsxProd_default(Text, {
              color,
              children: " ",
            });
            $[35] = color;
            $[36] = spaceNode;
          } else spaceNode = $[36];
          let fragment;
          if ($[37] !== textNode || $[38] !== spaceNode) {
            fragment = jsxProd_default_2(Fragment, {
              children: [textNode, spaceNode],
            });
            $[37] = textNode;
            $[38] = spaceNode;
            $[39] = fragment;
          } else fragment = $[39];
          earlyReturn = fragment;
          break X;
        }
      }
      $[27] = rgb;
      $[28] = message;
      $[29] = resolvedTheme.warning;
      $[30] = thinking;
      $[31] = earlyReturn;
    } else earlyReturn = $[31];
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
    let color = thinking > 0.5 ? "warning" : messageColor;
    let textNode;
    if ($[40] !== color || $[41] !== message) {
      textNode = jsxProd_default(Text, {
        color,
        children: message,
      });
      $[40] = color;
      $[41] = message;
      $[42] = textNode;
    } else textNode = $[42];
    let spaceNode;
    if ($[43] !== color) {
      spaceNode = jsxProd_default(Text, {
        color,
        children: " ",
      });
      $[43] = color;
      $[44] = spaceNode;
    } else spaceNode = $[44];
    let fragment;
    if ($[45] !== textNode || $[46] !== spaceNode) {
      fragment = jsxProd_default_2(Fragment, {
        children: [textNode, spaceNode],
      });
      $[45] = textNode;
      $[46] = spaceNode;
      $[47] = fragment;
    } else fragment = $[47];
    return fragment;
  }
  if (mode === "tool-use") {
    let rgb = resolvedTheme[messageColor];
    let shimmerColorStr = resolvedTheme[shimmerColor];
    let earlyReturn;
    if (
      $[48] !== rgb ||
      $[49] !== flashOpacity ||
      $[50] !== message ||
      $[51] !== messageColor ||
      $[52] !== shimmerColorStr
    ) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      At: {
        let interpolated = rgb ? interpolateColor(rgb) : null;
        let shimmerRGB = shimmerColorStr ? interpolateColor(shimmerColorStr) : null;
        if (interpolated && shimmerRGB) {
          let interpolated_2 = parseRGB(interpolated, shimmerRGB, roundToStep(flashOpacity));
          const t5 = jsxProd_default(Text, {
            color: toRGBColor(interpolated_2),
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
          earlyReturn = t7;
          break At;
        }
      }
      $[48] = rgb;
      $[49] = flashOpacity;
      $[50] = message;
      $[51] = messageColor;
      $[52] = shimmerColorStr;
      $[53] = earlyReturn;
    } else earlyReturn = $[53];
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
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
    let fragment;
    if ($[64] !== t5 || $[65] !== t6) {
      fragment = jsxProd_default_2(Fragment, {
        children: [t5, t6],
      });
      $[64] = t5;
      $[65] = t6;
      $[66] = fragment;
    } else fragment = $[66];
    return fragment;
  }
  let shimmerStart = glimmerIndex - 1;
  let shimmerEnd = glimmerIndex + 1;
  if (shimmerStart >= messageWidth_2 || shimmerEnd < 0) {
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
  let after;
  let before;
  let shim;
  if ($[75] !== clampedStart || $[76] !== segments || $[77] !== shimmerEnd) {
    let colPos = 0;
    before = "";
    shim = "";
    after = "";
    for (const { segment, width } of segments) {
      if (colPos + width <= clampedStart) before = before + segment;
      else if (colPos > shimmerEnd) after = after + segment;
      else shim = shim + segment;
      colPos = colPos + width;
    }
    $[75] = clampedStart;
    $[76] = segments;
    $[77] = shimmerEnd;
    $[78] = after;
    $[79] = before;
    $[80] = shim;
  } else {
    after = $[78];
    before = $[79];
    shim = $[80];
  }
  let t3;
  if ($[81] !== before || $[82] !== messageColor) {
    t3 =
      before &&
      jsxProd_default(Text, {
        color: messageColor,
        children: before,
      });
    $[81] = before;
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
  if ($[87] !== after || $[88] !== messageColor) {
    t5 =
      after &&
      jsxProd_default(Text, {
        color: messageColor,
        children: after,
      });
    $[87] = after;
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
