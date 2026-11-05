/**
 * components/Spinner/SpinnerGlyph.tsx
 *
 * Spinner 旋转字形（按帧/停滞状态变色）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/SpinnerGlyph.tsx
 * pieces: chunk-9xvmzd8d.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useResolvedTheme } from "../design-system/ThemeProvider.js";
import {
  cosineEase,
  parseRGB,
  interpolateColor,
  roundToStep,
  toRGBColor,
  spinnerFramesForTerminal,
} from "./utils.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-9xvmzd8d.js:425-485 placement (2.1.88 match: SETTLED_GREY, 1)
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
//@ chunk-9xvmzd8d.js:485-2774 fingerprint (2.1.88 match: SpinnerGlyph, 0.762)
function SpinnerGlyph(props) {
  let $ = useMemoCache(35);
  let { frame, messageColor, stalledIntensity, thinkingIntensity, reducedMotion, time } = props;
  let stalled = stalledIntensity === undefined ? 0 : stalledIntensity;
  let thinking = thinkingIntensity === undefined ? 0 : thinkingIntensity;
  let reduced = reducedMotion === undefined ? false : reducedMotion;
  let timeMs = time === undefined ? 0 : time;
  let resolvedTheme = useResolvedTheme();
  if (reduced) {
    let ease = 1 - cosineEase(timeMs, GLYPH_ANIM_MS);
    let color = thinking > 0 ? "warning" : messageColor;
    let rgb = resolvedTheme[color];
    let earlyReturn;
    if ($[0] !== rgb || $[1] !== ease || $[2] !== thinking) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      Re: {
        let interpolated = rgb ? parseRGB(rgb) : null;
        if (interpolated) {
          let baseRGB = interpolateColor(interpolated, GLYPH_BASE_RGB, 0.5);
          let mixedRGB = interpolateColor(baseRGB, interpolated, roundToStep(ease));
          const children = jsxProd_default(Text, {
            color: toRGBColor(mixedRGB),
            bold: thinking >= 0.5,
            children: SPINNER_DOT,
          });
          let box;
          if ($[4] !== children) {
            box = jsxProd_default(Box, {
              "aria-hidden": true,
              flexWrap: "wrap",
              height: 1,
              width: 2,
              children,
            });
            $[4] = children;
            $[5] = box;
          } else box = $[5];
          earlyReturn = box;
          break Re;
        }
      }
      $[0] = rgb;
      $[1] = ease;
      $[2] = thinking;
      $[3] = earlyReturn;
    } else earlyReturn = $[3];
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
    const dimColor = ease < 0.5;
    const bold = thinking >= 0.5;
    let box;
    if ($[6] !== color || $[7] !== dimColor || $[8] !== bold) {
      box = jsxProd_default(Box, {
        "aria-hidden": true,
        flexWrap: "wrap",
        height: 1,
        width: 2,
        children: jsxProd_default(Text, {
          color,
          dimColor,
          bold,
          children: SPINNER_DOT,
        }),
      });
      $[6] = color;
      $[7] = dimColor;
      $[8] = bold;
      $[9] = box;
    } else box = $[9];
    return box;
  }
  let frames;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    frames = spinnerFramesForTerminal();
    $[10] = frames;
  } else frames = $[10];
  let frames_2 = frames;
  let children = frames_2[frame % frames_2.length];
  if (stalled > 0) {
    let rgb = resolvedTheme[messageColor];
    let earlyReturn;
    if ($[11] !== rgb || $[12] !== children || $[13] !== stalled) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      Be: {
        let interpolated = rgb ? parseRGB(rgb) : null;
        if (interpolated) {
          let interpolated_2 = interpolateColor(interpolated, GLYPH_ACCENT_RGB, roundToStep(stalled));
          const children_2 = jsxProd_default(Text, {
            color: toRGBColor(interpolated_2),
            children,
          });
          let box;
          if ($[15] !== children_2) {
            box = jsxProd_default(Box, {
              "aria-hidden": true,
              flexWrap: "wrap",
              height: 1,
              width: 2,
              children: children_2,
            });
            $[15] = children_2;
            $[16] = box;
          } else box = $[16];
          earlyReturn = box;
          break Be;
        }
      }
      $[11] = rgb;
      $[12] = children;
      $[13] = stalled;
      $[14] = earlyReturn;
    } else earlyReturn = $[14];
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
    let color = stalled > 0.5 ? "error" : messageColor;
    let box;
    if ($[17] !== color || $[18] !== children) {
      box = jsxProd_default(Box, {
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
      $[19] = box;
    } else box = $[19];
    return box;
  }
  if (thinking > 0) {
    let rgb = resolvedTheme[messageColor];
    let bold;
    let earlyReturn;
    if ($[20] !== rgb || $[21] !== children || $[22] !== resolvedTheme.warning || $[23] !== thinking) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      Ie: {
        let interpolated = rgb ? parseRGB(rgb) : null;
        let warningRGB = parseRGB(resolvedTheme.warning);
        bold = thinking >= 0.5;
        if (interpolated && warningRGB) {
          let mixedRGB = interpolateColor(interpolated, warningRGB, roundToStep(thinking));
          const children_2 = jsxProd_default(Text, {
            bold,
            color: toRGBColor(mixedRGB),
            children,
          });
          let glyphBox;
          if ($[26] !== children_2) {
            glyphBox = jsxProd_default(Box, {
              "aria-hidden": true,
              flexWrap: "wrap",
              height: 1,
              width: 2,
              children: children_2,
            });
            $[26] = children_2;
            $[27] = glyphBox;
          } else glyphBox = $[27];
          earlyReturn = glyphBox;
          break Ie;
        }
      }
      $[20] = rgb;
      $[21] = children;
      $[22] = resolvedTheme.warning;
      $[23] = thinking;
      $[24] = bold;
      $[25] = earlyReturn;
    } else {
      bold = $[24];
      earlyReturn = $[25];
    }
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
    let color = thinking > 0.5 ? "warning" : messageColor;
    let box;
    if ($[28] !== bold || $[29] !== color || $[30] !== children) {
      box = jsxProd_default(Box, {
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
      $[31] = box;
    } else box = $[31];
    return box;
  }
  let box;
  if ($[32] !== messageColor || $[33] !== children) {
    box = jsxProd_default(Box, {
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
    $[34] = box;
  } else box = $[34];
  return box;
}
export { SpinnerGlyph, SPINNER_DOT };
