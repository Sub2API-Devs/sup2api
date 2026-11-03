/**
 * ink/frame.ts
 *
 * 并入已有模块：粘贴事件（文本、是否为空、是否带焦点尾）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/frame.ts
 * pieces: chunk-bzr73sfg.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { TerminalEvent } from "./events/terminal-event.js";
import { stripAnsiPerLine } from "../utils/stripAnsi.js";
import { normalizeFullWidthSpace } from "../utils/stringUtils.js";
import { createScreen } from "./screen.js";

//@ chunk-bzr73sfg.js:252585-252844 placement
var C1_CONTROL_RE = /[\u0090\u0098\u009b\u009d-\u009f]/;
var ESC_C1_RE = /\u001b[\u0090\u0098\u009b\u009d-\u009f]/g;
var C1_CONTROL_GLOBAL_RE = /[\u0090\u0098\u009b\u009d-\u009f]/g;
var C1_STRING_BEL_RE = /([\u0090\u0098\u009d-\u009f][^\u0007\u001b\u0090\u0098\u009d-\u009f\r\n]*)\u0007/g;
var ESC_STRING_BEL_RE = /(\u001b[PX^_][^\u0007\u001b]*)\u0007/g;
//@ chunk-bzr73sfg.js:252844-253358 placement
/**
 * 粘贴事件（文本、是否为空、是否带焦点尾）。
 */
class PasteEvent extends TerminalEvent {
  text;
  rawEmpty;
  rawEndedWithFocusTail;
  constructor(n) {
    super("paste", {
      bubbles: true,
      cancelable: true,
    });
    if (n instanceof PasteEvent) {
      this.text = n.text;
      this.rawEmpty = n.rawEmpty;
      this.rawEndedWithFocusTail = n.rawEndedWithFocusTail;
      return;
    }
    this.rawEmpty = n.length === 0 || n === "[I" || n === "[O";
    this.rawEndedWithFocusTail = n.endsWith("[I") || n.endsWith("[O");
    let u = C1_CONTROL_RE.test(n)
      ? n.replace(C1_STRING_BEL_RE, "$1").replace(ESC_C1_RE, "").replace(C1_CONTROL_GLOBAL_RE, "")
      : n;
    if (u.includes("\x1B")) {
      let f = stripAnsiPerLine(u.replace(ESC_STRING_BEL_RE, "$1\x1B\\"));
      u = normalizeFullWidthSpace(f.replaceAll("\x07", ""));
    }
    this.text = u;
  }
}
//@ chunk-bzr73sfg.js:253358-253610 placement
/**
 * 滚轮事件（wheel，冒泡、可取消）：deltaY/deltaX、修饰键、鼠标格坐标。
 */
class WheelEvent extends TerminalEvent {
  deltaY;
  deltaX;
  ctrl;
  shift;
  meta;
  col;
  row;
  constructor(deltaY, u) {
    super("wheel", {
      bubbles: true,
      cancelable: true,
    });
    this.deltaY = deltaY;
    this.deltaX = u.deltaX ?? 0;
    this.ctrl = u.ctrl ?? false;
    this.shift = u.shift ?? false;
    this.meta = u.meta ?? false;
    this.col = u.col;
    this.row = u.row;
  }
}
//@ chunk-bzr73sfg.js:253610-253719 fingerprint = emptyFrame (1)
/**
 * 空帧：0×0 屏幕、给定视口、光标在原点可见。
 */
function emptyFrame(rows, columns, stylePool, charPool, hyperlinkPool) {
  return {
    screen: createScreen(0, 0, stylePool, charPool, hyperlinkPool),
    viewport: {
      width: columns,
      height: rows,
    },
    cursor: {
      x: 0,
      y: 0,
      visible: true,
    },
  };
}
export { PasteEvent, emptyFrame, WheelEvent };
