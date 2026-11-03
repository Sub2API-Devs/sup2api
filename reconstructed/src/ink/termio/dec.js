/**
 * ink/termio/dec.ts
 *
 * DEC 私有模式序列（同步更新、括号粘贴、焦点事件等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/dec.ts
 * pieces: chunk-ebxn0psw.js (5)
 * attribution: fingerprint 1, placement 4
 */
import { csi } from "./csi.js";

/**
 * DEC 私有模式号：光标可见 25、备用屏 47/1049、鼠标 1000/1002/1003/1006/1016（像素）、焦点事件 1004、括号粘贴 2004、主题通知 2031、同步输出 2026、win32-input-mode 9001。
 */
//@ chunk-ebxn0psw.js:227-482 fingerprint = DEC (0.869)
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
//@ chunk-ebxn0psw.js:482-517 placement
function decset(mode) {
  return csi(`?${mode}h`);
}
//@ chunk-ebxn0psw.js:517-552 placement
function decreset(mode) {
  return csi(`?${mode}l`);
}
/**
 * 预生成的 DEC 模式序列：同步输出开始/结束（BSU/ESU）、括号粘贴、焦点事件、主题通知、光标显隐、备用屏 1049、关闭 win32-input-mode、鼠标跟踪（1000+1002+1003+1006 全开，或只开点击 1000+1006）、像素鼠标 1016。
 */
//@ chunk-ebxn0psw.js:552-1168 placement = DEC (0.815)
var BSU = decset(DEC.SYNCHRONIZED_UPDATE),
  ESU = decreset(DEC.SYNCHRONIZED_UPDATE),
  EBP = decset(DEC.BRACKETED_PASTE),
  DBP = decreset(DEC.BRACKETED_PASTE),
  EFE = decset(DEC.FOCUS_EVENTS),
  DFE = decreset(DEC.FOCUS_EVENTS),
  ENABLE_THEME_NOTIFY = decset(DEC.THEME_NOTIFY),
  DISABLE_THEME_NOTIFY = decreset(DEC.THEME_NOTIFY),
  SHOW_CURSOR = decset(DEC.CURSOR_VISIBLE),
  HIDE_CURSOR = decreset(DEC.CURSOR_VISIBLE),
  ENTER_ALT_SCREEN = decset(DEC.ALT_SCREEN_CLEAR),
  EXIT_ALT_SCREEN = decreset(DEC.ALT_SCREEN_CLEAR),
  DISABLE_WIN32_INPUT_MODE = decreset(DEC.WIN32_INPUT_MODE),
  ENABLE_MOUSE_TRACKING =
    decset(DEC.MOUSE_NORMAL) + decset(DEC.MOUSE_BUTTON) + decset(DEC.MOUSE_ANY) + decset(DEC.MOUSE_SGR),
  ENABLE_MOUSE_CLICKS = decset(DEC.MOUSE_NORMAL) + decset(DEC.MOUSE_SGR),
  DISABLE_MOUSE_TRACKING =
    decreset(DEC.MOUSE_SGR) +
    decreset(DEC.MOUSE_ANY) +
    decreset(DEC.MOUSE_BUTTON) +
    decreset(DEC.MOUSE_NORMAL),
  ENABLE_MOUSE_PIXELS = decset(DEC.MOUSE_SGR_PIXELS),
  DISABLE_MOUSE_PIXELS = decreset(DEC.MOUSE_SGR_PIXELS) + decset(DEC.MOUSE_SGR);
//@ chunk-ebxn0psw.js:1168-1256 placement
function ZUn(E) {
  switch (E) {
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
  ENTER_ALT_SCREEN,
  EXIT_ALT_SCREEN,
  BSU,
  HIDE_CURSOR,
  ESU,
  EBP,
  DBP,
  ENABLE_THEME_NOTIFY,
  DISABLE_THEME_NOTIFY,
  EFE,
  DFE,
  ENABLE_MOUSE_PIXELS,
  DISABLE_MOUSE_PIXELS,
  ZUn,
  DISABLE_MOUSE_TRACKING,
  DEC,
  DISABLE_WIN32_INPUT_MODE,
  decreset,
  decset,
};
