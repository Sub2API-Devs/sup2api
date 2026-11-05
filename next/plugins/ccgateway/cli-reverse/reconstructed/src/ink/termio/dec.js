/**
 * ink/termio/dec.ts
 *
 * DEC 私有模式序列（同步更新、括号粘贴、焦点事件等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/dec.ts
 * pieces: chunk-7yvrza4y.js (5)
 * attribution: fingerprint 1, placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { csi } from "./csi.js";

//@ chunk-7yvrza4y.js:227-482 fingerprint (2.1.88 match: DEC, 0.869)
/**
 * DEC 私有模式编号常量表（光标显示、备用屏、鼠标模式、焦点事件、括号粘贴、同步更新等）。
 */
var DEC = {
  CURSOR_VISIBLE: 25,
  ALT_SCREEN: 47,
  ALT_SCREEN_CLEAR: 1049,
  MOUSE_NORMAL: 1000,
  MOUSE_BUTTON: 1002,
  MOUSE_ANY: 1003,
  MOUSE_SGR: 1006,
  MOUSE_SGR_PIXELS: 1016,
  FOCUS_EVENTS: 1004,
  BRACKETED_PASTE: 2004,
  THEME_NOTIFY: 2031,
  SYNCHRONIZED_UPDATE: 2026,
  WIN32_INPUT_MODE: 9001,
};
//@ chunk-7yvrza4y.js:482-517 placement
function decset(mode) {
  return csi(`?${mode}h`);
}
//@ chunk-7yvrza4y.js:517-552 placement
function decreset(mode) {
  return csi(`?${mode}l`);
}
//@ chunk-7yvrza4y.js:552-1168 placement (2.1.88 match: DEC, 0.815)
/**
 * 预生成的 DEC 模式序列：同步输出开始/结束（BSU/ESU）、括号粘贴、焦点事件、主题通知、光标显隐、备用屏 1049、关闭 win32-input-mode、鼠标跟踪（1000+1002+1003+1006 全开，或只开点击 1000+1006）、像素鼠标 1016。
 */
var BSU = decset(DEC.SYNCHRONIZED_UPDATE);
var ESU = decreset(DEC.SYNCHRONIZED_UPDATE);
var EBP = decset(DEC.BRACKETED_PASTE);
var DBP = decreset(DEC.BRACKETED_PASTE);
var EFE = decset(DEC.FOCUS_EVENTS);
var DFE = decreset(DEC.FOCUS_EVENTS);
var ENABLE_THEME_NOTIFY = decset(DEC.THEME_NOTIFY);
var DISABLE_THEME_NOTIFY = decreset(DEC.THEME_NOTIFY);
var SHOW_CURSOR = decset(DEC.CURSOR_VISIBLE);
var HIDE_CURSOR = decreset(DEC.CURSOR_VISIBLE);
var ENTER_ALT_SCREEN = decset(DEC.ALT_SCREEN_CLEAR);
var EXIT_ALT_SCREEN = decreset(DEC.ALT_SCREEN_CLEAR);
var DISABLE_WIN32_INPUT_MODE = decreset(DEC.WIN32_INPUT_MODE);
var ENABLE_MOUSE_TRACKING =
  decset(DEC.MOUSE_NORMAL) + decset(DEC.MOUSE_BUTTON) + decset(DEC.MOUSE_ANY) + decset(DEC.MOUSE_SGR);
var ENABLE_MOUSE_CLICKS = decset(DEC.MOUSE_NORMAL) + decset(DEC.MOUSE_SGR);
var DISABLE_MOUSE_TRACKING =
  decreset(DEC.MOUSE_SGR) + decreset(DEC.MOUSE_ANY) + decreset(DEC.MOUSE_BUTTON) + decreset(DEC.MOUSE_NORMAL);
var ENABLE_MOUSE_PIXELS = decset(DEC.MOUSE_SGR_PIXELS);
var DISABLE_MOUSE_PIXELS = decreset(DEC.MOUSE_SGR_PIXELS) + decset(DEC.MOUSE_SGR);
//@ chunk-7yvrza4y.js:1168-1256 placement
/**
 * 按 full/scroll/off 返回开启完整鼠标跟踪、仅点击或空的序列。
 */
function mouseTrackingSequence(mode) {
  switch (mode) {
    case "full":
      return ENABLE_MOUSE_TRACKING;
    case "scroll":
      return ENABLE_MOUSE_CLICKS;
    case "off":
      return "";
  }
}
export {
  SHOW_CURSOR,
  DEC,
  DISABLE_WIN32_INPUT_MODE,
  DISABLE_MOUSE_TRACKING,
  HIDE_CURSOR,
  decreset,
  DFE,
  DISABLE_THEME_NOTIFY,
  DBP,
  ENTER_ALT_SCREEN,
  EXIT_ALT_SCREEN,
  EFE,
  mouseTrackingSequence,
  BSU,
  ESU,
  decset,
  EBP,
  ENABLE_THEME_NOTIFY,
  ENABLE_MOUSE_PIXELS,
  DISABLE_MOUSE_PIXELS,
};
