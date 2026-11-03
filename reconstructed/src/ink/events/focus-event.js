/**
 * ink/events/focus-event.ts
 *
 * 焦点进入/离开事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/focus-event.ts
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: fingerprint 1
 */
import { TerminalEvent } from "./terminal-event.js";

/**
 * 焦点事件（focus/blur），冒泡、不可取消，relatedTarget 为另一方元素。
 */
//@ chunk-bzr73sfg.js:190998-191113 fingerprint = FocusEvent (1)
class FocusEvent extends TerminalEvent {
  relatedTarget;
  constructor(n, u = null) {
    super(n, { bubbles: !0, cancelable: !1 });
    this.relatedTarget = u;
  }
}

export { FocusEvent };
