/**
 * ink/frame.ts
 *
 * 并入已有模块：粘贴事件（文本、是否为空、是否带焦点尾）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/frame.ts
 * pieces: chunk-2avr6cej.js (4)
 * attribution: placement 3, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { TerminalEvent } from "./events/terminal-event.js";
import { stripAnsiPerLine } from "../utils/stripAnsi.js";
import { normalizeFullWidthSpace } from "../utils/stringUtils.js";
import { createScreen } from "./screen.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:252261-252520 placement
var C1_CONTROL_RE = /[\u0090\u0098\u009b\u009d-\u009f]/;
var ESC_C1_RE = /\u001b[\u0090\u0098\u009b\u009d-\u009f]/g;
var C1_CONTROL_GLOBAL_RE = /[\u0090\u0098\u009b\u009d-\u009f]/g;
var C1_STRING_BEL_RE = /([\u0090\u0098\u009d-\u009f][^\u0007\u001b\u0090\u0098\u009d-\u009f\r\n]*)\u0007/g;
var ESC_STRING_BEL_RE = /(\u001b[PX^_][^\u0007\u001b]*)\u0007/g;
//@ chunk-2avr6cej.js:252520-253034 placement
/**
 * 粘贴事件（文本、是否为空、是否带焦点尾）。
 */
let PasteEvent; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:252520", () => {
  PasteEvent = class PasteEvent extends TerminalEvent {
    text;
    rawEmpty;
    rawEndedWithFocusTail;
    constructor(raw) {
      super("paste", {
        bubbles: true,
        cancelable: true,
      });
      if (raw instanceof PasteEvent) {
        this.text = raw.text;
        this.rawEmpty = raw.rawEmpty;
        this.rawEndedWithFocusTail = raw.rawEndedWithFocusTail;
        return;
      }
      this.rawEmpty = raw.length === 0 || raw === "[I" || raw === "[O";
      this.rawEndedWithFocusTail = raw.endsWith("[I") || raw.endsWith("[O");
      let cleaned = C1_CONTROL_RE.test(raw)
        ? raw.replace(C1_STRING_BEL_RE, "$1").replace(ESC_C1_RE, "").replace(C1_CONTROL_GLOBAL_RE, "")
        : raw;
      if (cleaned.includes("\x1B")) {
        let stripped = stripAnsiPerLine(cleaned.replace(ESC_STRING_BEL_RE, "$1\x1B\\"));
        cleaned = normalizeFullWidthSpace(stripped.replaceAll("\x07", ""));
      }
      this.text = cleaned;
    }
  };
});
//@ chunk-2avr6cej.js:253034-253286 placement
/**
 * 滚轮事件（wheel，冒泡、可取消）：deltaY/deltaX、修饰键、鼠标格坐标。
 */
let WheelEvent; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:253034", () => {
  WheelEvent = class WheelEvent extends TerminalEvent {
    deltaY;
    deltaX;
    ctrl;
    shift;
    meta;
    col;
    row;
    constructor(deltaY, init) {
      super("wheel", {
        bubbles: true,
        cancelable: true,
      });
      this.deltaY = deltaY;
      this.deltaX = init.deltaX ?? 0;
      this.ctrl = init.ctrl ?? false;
      this.shift = init.shift ?? false;
      this.meta = init.meta ?? false;
      this.col = init.col;
      this.row = init.row;
    }
  };
});
//@ chunk-2avr6cej.js:253286-253395 fingerprint (2.1.88 match: emptyFrame, 1)
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
export { emptyFrame, PasteEvent, WheelEvent };
