/**
 * components/Spinner/utils.ts
 *
 * Spinner 工具：默认字形帧（Ghostty 特判）、RGB 解析/插值、HSL 转 RGB。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/utils.ts
 * pieces: chunk-mww2ey7m.js (11)
 * attribution: affinity 1, fingerprint 3, layout 5, callgraph-witnessed 2
 */
import { env } from "../../utils/env.js";

//@ chunk-mww2ey7m.js:226-474 affinity
var GHOSTTY_SPINNER_FRAMES = ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273B"],
  DEFAULT_SPINNER_FRAMES_ALT = ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273D"],
  DEFAULT_SPINNER_FRAMES = ["\xB7", "\u2722", "*", "\u2736", "\u273B", "\u273D"],
  GHOSTTY_SPINNER_CYCLE = [...GHOSTTY_SPINNER_FRAMES, ...GHOSTTY_SPINNER_FRAMES.toReversed()],
  DEFAULT_SPINNER_CYCLE_ALT = [...DEFAULT_SPINNER_FRAMES_ALT, ...DEFAULT_SPINNER_FRAMES_ALT.toReversed()],
  DEFAULT_SPINNER_CYCLE = [...DEFAULT_SPINNER_FRAMES, ...DEFAULT_SPINNER_FRAMES.toReversed()];
//@ chunk-mww2ey7m.js:474-535 fingerprint = getDefaultCharacters (0.719)
function getDefaultCharacters() {
  if (env.TERM === "xterm-ghostty") return GHOSTTY_SPINNER_FRAMES;
  return DEFAULT_SPINNER_FRAMES;
}
//@ chunk-mww2ey7m.js:535-596 layout
function VWe() {
  if (env.TERM === "xterm-ghostty") return GHOSTTY_SPINNER_CYCLE;
  return DEFAULT_SPINNER_CYCLE;
}
//@ chunk-mww2ey7m.js:596-604 layout
var T = 8;
//@ chunk-mww2ey7m.js:604-644 layout
function roundToStep(r) {
  return Math.round(r * T) / T;
}
//@ chunk-mww2ey7m.js:644-681 layout
function Jnn(r) {
  return roundToStep(r / 360) * 360;
}
//@ chunk-mww2ey7m.js:681-735 layout
function qWe(r, t) {
  return (1 - Math.cos((2 * Math.PI * r) / t)) / 2;
}
//@ chunk-mww2ey7m.js:735-852 callgraph-witnessed = parseRGB (1)
function parseRGB(r, t, a) {
  return {
    r: Math.round(r.r + (t.r - r.r) * a),
    g: Math.round(r.g + (t.g - r.g) * a),
    b: Math.round(r.b + (t.b - r.b) * a),
  };
}
//@ chunk-mww2ey7m.js:852-901 fingerprint = toRGBColor (1)
function toRGBColor(color) {
  return `rgb(${color.r},${color.g},${color.b})`;
}
//@ chunk-mww2ey7m.js:901-1237 fingerprint = hueToRgb (1)
function hueToRgb(hue) {
  let t = ((hue % 360) + 360) % 360,
    a = 0.7,
    m = 0.6,
    e = (1 - Math.abs(0.19999999999999996)) * 0.7,
    n = e * (1 - Math.abs(((t / 60) % 2) - 1)),
    R = 0.6 - e / 2,
    o = 0,
    s = 0,
    u = 0;
  if (t < 60) ((o = e), (s = n));
  else if (t < 120) ((o = n), (s = e));
  else if (t < 180) ((s = e), (u = n));
  else if (t < 240) ((s = n), (u = e));
  else if (t < 300) ((o = n), (u = e));
  else ((o = e), (u = n));
  return { r: Math.round((o + R) * 255), g: Math.round((s + R) * 255), b: Math.round((u + R) * 255) };
}
//@ chunk-mww2ey7m.js:1237-1388 callgraph-witnessed = interpolateColor (1)
function interpolateColor(r) {
  let match = r.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  return match ? { r: parseInt(match[1], 10), g: parseInt(match[2], 10), b: parseInt(match[3], 10) } : null;
}

export { parseRGB, roundToStep, toRGBColor, interpolateColor, Jnn, hueToRgb, qWe, getDefaultCharacters, VWe };
