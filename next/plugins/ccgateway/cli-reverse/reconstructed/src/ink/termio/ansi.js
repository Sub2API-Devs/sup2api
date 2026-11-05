/**
 * ink/termio/ansi.ts
 *
 * C0 控制字符常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/ansi.ts
 * pieces: chunk-3zb8bxyj.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-3zb8bxyj.js:191-508 fingerprint (2.1.88 match: C0, 0.886)
/**
 * C0 控制字符码表（NUL…US 与 DEL）以及 ESC/BEL/分隔符、字符集复位与各转义引导符（CSI/OSC/DCS/APC/PM/SOS/ST）的字符码。
 */
var C0 = {
  NUL: 0,
  SOH: 1,
  STX: 2,
  ETX: 3,
  EOT: 4,
  ENQ: 5,
  ACK: 6,
  BEL: 7,
  BS: 8,
  HT: 9,
  LF: 10,
  VT: 11,
  FF: 12,
  CR: 13,
  SO: 14,
  SI: 15,
  DLE: 16,
  DC1: 17,
  DC2: 18,
  DC3: 19,
  DC4: 20,
  NAK: 21,
  SYN: 22,
  ETB: 23,
  CAN: 24,
  EM: 25,
  SUB: 26,
  ESC: 27,
  FS: 28,
  GS: 29,
  RS: 30,
  US: 31,
  DEL: 127,
};
var ESC = "\x1B";
var BEL = "\x07";
var SEP = ";";
var RESET_CHARSET = "\x1B(B\x0F";
var ESC_TYPE = {
  CSI: 91,
  OSC: 93,
  DCS: 80,
  APC: 95,
  PM: 94,
  SOS: 88,
  ST: 92,
};
export { ESC, SEP, BEL, ESC_TYPE, RESET_CHARSET, C0 };
