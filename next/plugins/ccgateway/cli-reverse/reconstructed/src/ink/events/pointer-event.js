/**
 * ink/events/pointer-event.ts
 *
 * 2.1.316 新增：Ink 指针事件类（鼠标位置与按钮）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2avr6cej.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-2avr6cej.js:257404-257737 placement
class PointerEvent {
  type;
  col;
  row;
  localCol;
  localRow;
  button;
  shift;
  alt;
  ctrl;
  fine;
  isUnreported;
  constructor(init) {
    this.type = init.kind;
    this.col = init.col;
    this.row = init.row;
    this.localCol = init.localCol;
    this.localRow = init.localRow;
    this.button = init.button;
    this.shift = init.mods.shift;
    this.alt = init.mods.alt;
    this.ctrl = init.mods.ctrl;
    this.fine = init.fine;
    this.isUnreported = init.unreported ?? false;
  }
}
export { PointerEvent };
