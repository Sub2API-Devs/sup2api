/**
 * ink/events/event.ts
 *
 * 沿用旧版路径：Ink 事件基类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/event.ts
 * pieces: chunk-24t3dkzb.js (1)
 * attribution: placement 1
 */

//@ chunk-24t3dkzb.js:4916-5094 placement = Event (1)
/**
 * Ink 事件基类：记录是否已调用 stopImmediatePropagation。
 */
class InkEvent {
  _didStopImmediatePropagation = false;
  didStopImmediatePropagation() {
    return this._didStopImmediatePropagation;
  }
  stopImmediatePropagation() {
    this._didStopImmediatePropagation = true;
  }
}
export { InkEvent };
