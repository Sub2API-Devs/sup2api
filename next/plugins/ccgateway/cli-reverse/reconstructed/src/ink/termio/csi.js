/**
 * ink/termio/csi.ts
 *
 * CSI 序列构造与常量（光标移动、擦除、滚动区域、kitty 键盘协议、鼠标模式）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/csi.ts
 * pieces: chunk-wz6vk74d.js (22)
 * attribution: fingerprint 5, callgraph-witnessed 1, layout 15, callgraph-fingerprint 1
 */
import { ESC, ESC_TYPE, SEP } from "./ansi.js";

//@ chunk-wz6vk74d.js:544-685 fingerprint (2.1.88 match: CSI_RANGE, 0.882)
var CSI_PREFIX = ESC + String.fromCharCode(ESC_TYPE.CSI);
var CSI_RANGE = {
  PARAM_START: 48,
  PARAM_END: 63,
  INTERMEDIATE_START: 32,
  INTERMEDIATE_END: 47,
  FINAL_START: 64,
  FINAL_END: 126,
};
//@ chunk-wz6vk74d.js:685-741 fingerprint (2.1.88 match: isCSIParam, 1)
function isCSIParam(byte) {
  return byte >= CSI_RANGE.PARAM_START && byte <= CSI_RANGE.PARAM_END;
}
//@ chunk-wz6vk74d.js:741-811 fingerprint (2.1.88 match: isCSIIntermediate, 1)
function isCSIIntermediate(byte) {
  return byte >= CSI_RANGE.INTERMEDIATE_START && byte <= CSI_RANGE.INTERMEDIATE_END;
}
//@ chunk-wz6vk74d.js:811-867 fingerprint (2.1.88 match: isCSIFinal, 1)
function isCSIFinal(byte) {
  return byte >= CSI_RANGE.FINAL_START && byte <= CSI_RANGE.FINAL_END;
}
//@ chunk-wz6vk74d.js:867-1008 callgraph-witnessed (2.1.88 match: csi, 0)
/**
 * 按参数拼接 CSI 控制序列（空参数返回前缀、单参数直接拼、多参数用分号连接）。
 */
function csi(...args) {
  if (args.length === 0) return CSI_PREFIX;
  if (args.length === 1) return `${CSI_PREFIX}${args[0]}`;
  let params = args.slice(0, -1);
  let final = args.at(-1);
  return `${CSI_PREFIX}${params.join(SEP)}${final}`;
}
//@ chunk-wz6vk74d.js:1008-1536 fingerprint (2.1.88 match: CSI, 0.785)
/**
 * CSI 终结字节表：光标移动、擦除（ED/EL/ECH）、滚动（SU/SD）、模式设置（SM/RM）、SGR、DSR、DECSCUSR、DECSTBM 等。
 */
var CSI = {
  CUU: 65,
  CUD: 66,
  CUF: 67,
  CUB: 68,
  CNL: 69,
  CPL: 70,
  CHA: 71,
  CUP: 72,
  CHT: 73,
  HPA: 96,
  HPR: 97,
  VPA: 100,
  VPR: 101,
  HVP: 102,
  ED: 74,
  EL: 75,
  ECH: 88,
  IL: 76,
  DL: 77,
  ICH: 64,
  DCH: 80,
  SU: 83,
  SD: 84,
  SM: 104,
  RM: 108,
  SGR: 109,
  DSR: 110,
  DECSCUSR: 113,
  DECSTBM: 114,
  SCOSC: 115,
  SCORC: 117,
  CBT: 90,
};
var ERASE_DISPLAY = ["toEnd", "toStart", "all", "scrollback"];
var ERASE_LINE_REGION = ["toEnd", "toStart", "all"];
var CURSOR_STYLES = [
  {
    style: "block",
    blinking: true,
  },
  {
    style: "block",
    blinking: true,
  },
  {
    style: "block",
    blinking: false,
  },
  {
    style: "underline",
    blinking: true,
  },
  {
    style: "underline",
    blinking: false,
  },
  {
    style: "bar",
    blinking: true,
  },
  {
    style: "bar",
    blinking: false,
  },
];
//@ chunk-wz6vk74d.js:1536-1578 layout
function cursorUp(n = 1) {
  return n === 0 ? "" : csi(n, "A");
}
//@ chunk-wz6vk74d.js:1578-1622 layout
function cursorDown(n = 1) {
  return n === 0 ? "" : csi(n, "B");
}
//@ chunk-wz6vk74d.js:1622-1664 layout
function cursorForward(n = 1) {
  return n === 0 ? "" : csi(n, "C");
}
//@ chunk-wz6vk74d.js:1664-1706 layout
function cursorBack(n = 1) {
  return n === 0 ? "" : csi(n, "D");
}
//@ chunk-wz6vk74d.js:1706-1739 layout
function cursorTo(col) {
  return csi(col, "G");
}
//@ chunk-wz6vk74d.js:1739-1755 layout
var CURSOR_LEFT = csi("G");
//@ chunk-wz6vk74d.js:1755-1791 layout
function cursorPosition(row, col) {
  return csi(row, col, "H");
}
//@ chunk-wz6vk74d.js:1791-1806 layout
var CURSOR_HOME = csi("H");
//@ chunk-wz6vk74d.js:1806-1916 layout
function cursorMove(x, y) {
  let result = "";
  if (x < 0) result += cursorBack(-x);
  else if (x > 0) result += cursorForward(x);
  if (y < 0) result += cursorUp(-y);
  else if (y > 0) result += cursorDown(y);
  return result;
}
//@ chunk-wz6vk74d.js:1916-1946 layout
function eraseToEndOfLine() {
  return csi("K");
}
//@ chunk-wz6vk74d.js:1946-1991 layout
var ERASE_LINE = csi(2, "K");
var ERASE_SCREEN = csi(2, "J");
var ERASE_SCROLLBACK = csi(3, "J");
//@ chunk-wz6vk74d.js:1991-2093 layout
/**
 * 从当前行向上擦除 n 行，光标停在最上一行行首。
 */
function eraseLines(n_2) {
  if (n_2 <= 0) return "";
  let result = "";
  for (let i = 0; i < n_2; i++) {
    result += ERASE_LINE;
    if (i < n_2 - 1) result += cursorUp(1);
  }
  result += CURSOR_LEFT;
  return result;
}
//@ chunk-wz6vk74d.js:2093-2137 layout
function scrollUp(n = 1) {
  return n === 0 ? "" : csi(n, "S");
}
//@ chunk-wz6vk74d.js:2137-2181 layout
function scrollDown(n = 1) {
  return n === 0 ? "" : csi(n, "T");
}
//@ chunk-wz6vk74d.js:2181-2218 layout
function setScrollRegion(top, bottom) {
  return csi(top, bottom, "r");
}
//@ chunk-wz6vk74d.js:2218-2359 callgraph-fingerprint (2.1.88 match: PASTE_START, 0.286)
/**
 * 常用 CSI 常量：复位滚动区域、括号粘贴开始/结束标记、焦点进/出、kitty 键盘协议压栈（>5u：消歧+报告所有键为转义码；legacy >1u）与弹栈（<u）、modifyOtherKeys 开关（>4;2m / >4m）。
 */
var RESET_SCROLL_REGION = csi("r");
var PASTE_START = csi("200~");
var PASTE_END = csi("201~");
var FOCUS_IN = csi("I");
var FOCUS_OUT = csi("O");
var ENABLE_KITTY_KEYBOARD = csi(">5u");
var ENABLE_KITTY_KEYBOARD_LEGACY = csi(">1u");
var DISABLE_KITTY_KEYBOARD = csi("<u");
var ENABLE_MODIFY_OTHER_KEYS = csi(">4;2m");
var DISABLE_MODIFY_OTHER_KEYS = csi(">4m");
export {
  csi,
  DISABLE_KITTY_KEYBOARD,
  DISABLE_MODIFY_OTHER_KEYS,
  ENABLE_KITTY_KEYBOARD_LEGACY,
  ENABLE_KITTY_KEYBOARD,
  ENABLE_MODIFY_OTHER_KEYS,
  ERASE_SCREEN,
  CURSOR_HOME,
  eraseLines,
  cursorMove,
  cursorTo,
  ERASE_SCROLLBACK,
  ERASE_LINE,
  cursorDown,
  FOCUS_IN,
  FOCUS_OUT,
  setScrollRegion,
  RESET_SCROLL_REGION,
  cursorPosition,
  PASTE_START,
  PASTE_END,
  eraseToEndOfLine,
  scrollUp,
  scrollDown,
  CURSOR_LEFT,
  CSI,
  ERASE_DISPLAY,
  ERASE_LINE_REGION,
  CURSOR_STYLES,
  isCSIIntermediate,
  isCSIFinal,
  isCSIParam,
};
