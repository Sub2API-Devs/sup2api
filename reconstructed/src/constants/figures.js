/**
 * constants/figures.ts
 *
 * 终端界面符号常量（桥接转圈帧、就绪/失败标记、三角、⎿、盲文转圈帧）；另混入一组路径规范化/显示辅助（应归别处）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/figures.ts
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: fingerprint 1
 */

/**
 * Remote Control 桥接状态转圈帧与符号：就绪 ·✔·、失败 ×、✕、▸、⎿、⠿、盲文转圈帧。
 */
//@ chunk-dcmhvw5a.js:203409-203657 fingerprint = BRIDGE_SPINNER_FRAMES (0.889)
var BRIDGE_SPINNER_FRAMES = ["\xB7|\xB7", "\xB7/\xB7", "\xB7\u2014\xB7", "\xB7\\\xB7"],
  BRIDGE_READY_INDICATOR = "\xB7\u2714\uFE0E\xB7",
  BRIDGE_FAILED_INDICATOR = "\xD7",
  HEAVY_MULTIPLICATION_X = "\u2715",
  SMALL_TRIANGLE_RIGHT = "\u25B8",
  RESPONSE_CONNECTOR = "\u23BF",
  BRAILLE_FULL_BLOCK = "\u283F",
  BRAILLE_SPINNER_FRAMES = [
    "\u280B",
    "\u2819",
    "\u2839",
    "\u2838",
    "\u283C",
    "\u2834",
    "\u2826",
    "\u2827",
    "\u2807",
    "\u280F",
  ];

export {
  HEAVY_MULTIPLICATION_X,
  BRIDGE_FAILED_INDICATOR,
  BRIDGE_READY_INDICATOR,
  SMALL_TRIANGLE_RIGHT,
  RESPONSE_CONNECTOR,
  BRAILLE_SPINNER_FRAMES,
  BRIDGE_SPINNER_FRAMES,
  BRAILLE_FULL_BLOCK,
};
