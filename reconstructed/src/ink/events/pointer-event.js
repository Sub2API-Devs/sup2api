/**
 * ink/events/pointer-event.ts
 *
 * 2.1.316 新增：Ink 指针事件类（鼠标位置与按钮）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: placement 1
 */

//@ chunk-bzr73sfg.js:257728-258061 placement
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
  constructor(n) {
    ((this.type = n.kind),
      (this.col = n.col),
      (this.row = n.row),
      (this.localCol = n.localCol),
      (this.localRow = n.localRow),
      (this.button = n.button),
      (this.shift = n.mods.shift),
      (this.alt = n.mods.alt),
      (this.ctrl = n.mods.ctrl),
      (this.fine = n.fine),
      (this.isUnreported = n.unreported ?? !1));
  }
}

export { PointerEvent };
