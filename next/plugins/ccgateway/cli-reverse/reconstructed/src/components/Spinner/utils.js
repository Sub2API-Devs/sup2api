/**
 * components/Spinner/utils.ts
 *
 * Spinner 工具：默认字形帧（Ghostty 特判）、RGB 解析/插值、HSL 转 RGB。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/utils.ts
 * pieces: chunk-wvevfede.js (11)
 * attribution: affinity 1, fingerprint 3, layout 5, callgraph-witnessed 2
 */
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wvevfede.js:226-474 affinity
var GHOSTTY_SPINNER_FRAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_SPINNER_FRAMES_ALT;
var DEFAULT_SPINNER_FRAMES;
var GHOSTTY_SPINNER_CYCLE;
var DEFAULT_SPINNER_CYCLE_ALT;
var DEFAULT_SPINNER_CYCLE;
deferInit("chunk-wvevfede.js:226", () => {
  GHOSTTY_SPINNER_FRAMES = ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273B"];
  DEFAULT_SPINNER_FRAMES_ALT = ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273D"];
  DEFAULT_SPINNER_FRAMES = ["\xB7", "\u2722", "*", "\u2736", "\u273B", "\u273D"];
  GHOSTTY_SPINNER_CYCLE = [...GHOSTTY_SPINNER_FRAMES, ...GHOSTTY_SPINNER_FRAMES.toReversed()];
  DEFAULT_SPINNER_CYCLE_ALT = [...DEFAULT_SPINNER_FRAMES_ALT, ...DEFAULT_SPINNER_FRAMES_ALT.toReversed()];
  DEFAULT_SPINNER_CYCLE = [...DEFAULT_SPINNER_FRAMES, ...DEFAULT_SPINNER_FRAMES.toReversed()];
});
//@ chunk-wvevfede.js:474-535 fingerprint (2.1.88 match: getDefaultCharacters, 0.719)
function getDefaultCharacters() {
  if (env.TERM === "xterm-ghostty") return GHOSTTY_SPINNER_FRAMES;
  return DEFAULT_SPINNER_FRAMES;
}
//@ chunk-wvevfede.js:535-596 layout
/**
 * 函数 spinnerFramesForTerminal（按终端选帧集）；位于「Spinner 工具：默认字形帧（Ghostty 特判）、RGB 解析/插值、HSL 转 RGB」模块。
 */
function spinnerFramesForTerminal() {
  if (env.TERM === "xterm-ghostty") return GHOSTTY_SPINNER_CYCLE;
  return DEFAULT_SPINNER_CYCLE;
}
//@ chunk-wvevfede.js:596-604 layout
var GHOSTTY_FRAME_COUNT = 8;
//@ chunk-wvevfede.js:604-644 layout
function roundToStep(value) {
  return Math.round(value * GHOSTTY_FRAME_COUNT) / GHOSTTY_FRAME_COUNT;
}
//@ chunk-wvevfede.js:644-681 layout
/**
 * 函数 snapTo360（对齐到 360 度）；位于「Spinner 工具：默认字形帧（Ghostty 特判）、RGB 解析/插值、HSL 转 RGB」模块。
 */
function snapTo360(value) {
  return roundToStep(value / 360) * 360;
}
//@ chunk-wvevfede.js:681-735 layout
/**
 * 函数 cosineEase（余弦缓动）；位于「Spinner 工具：默认字形帧（Ghostty 特判）、RGB 解析/插值、HSL 转 RGB」模块。
 */
function cosineEase(progress, total) {
  return (1 - Math.cos((2 * Math.PI * progress) / total)) / 2;
}
//@ chunk-wvevfede.js:735-852 callgraph-witnessed (2.1.88 match: interpolateColor, 1)
function interpolateColor(color1, color2, t) {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t),
  };
}
//@ chunk-wvevfede.js:852-901 fingerprint (2.1.88 match: toRGBColor, 1)
function toRGBColor(color) {
  return `rgb(${color.r},${color.g},${color.b})`;
}
//@ chunk-wvevfede.js:901-1237 fingerprint (2.1.88 match: hueToRgb, 1)
function hueToRgb(hue) {
  let hueDegrees = ((hue % 360) + 360) % 360;
  let saturation = 0.7;
  let lightness = 0.6;
  let chroma = (1 - Math.abs(0.19999999999999996)) * 0.7;
  let x = chroma * (1 - Math.abs(((hueDegrees / 60) % 2) - 1));
  let m = 0.6 - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (hueDegrees < 60) {
    red = chroma;
    green = x;
  } else if (hueDegrees < 120) {
    red = x;
    green = chroma;
  } else if (hueDegrees < 180) {
    green = chroma;
    blue = x;
  } else if (hueDegrees < 240) {
    green = x;
    blue = chroma;
  } else if (hueDegrees < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }
  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  };
}
//@ chunk-wvevfede.js:1237-1388 callgraph-witnessed (2.1.88 match: parseRGB, 1)
function parseRGB(colorStr) {
  let match = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  return match
    ? {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
      }
    : null;
}
export {
  toRGBColor,
  snapTo360,
  hueToRgb,
  roundToStep,
  interpolateColor,
  parseRGB,
  cosineEase,
  spinnerFramesForTerminal,
  getDefaultCharacters,
};
