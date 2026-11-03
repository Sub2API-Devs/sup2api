/**
 * ink/events/terminal-event.ts
 *
 * 终端事件基类（带 target/currentTarget 的 DOM 风格事件）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/terminal-event.ts
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: fingerprint 1
 */
import { InkEvent } from "./event.js";

/**
 * 终端 DOM 事件基类：type、时间戳、bubbles/cancelable、target/currentTarget/eventPhase，stopPropagation/stopImmediatePropagation/preventDefault，consume()=两者都做。
 */
//@ chunk-bzr73sfg.js:190017-190998 fingerprint = TerminalEvent (0.981)
class TerminalEvent extends InkEvent {
  type;
  timeStamp;
  bubbles;
  cancelable;
  _target = null;
  _currentTarget = null;
  _eventPhase = "none";
  _propagationStopped = !1;
  _defaultPrevented = !1;
  constructor(n, u) {
    super();
    ((this.type = n),
      (this.timeStamp = performance.now()),
      (this.bubbles = u?.bubbles ?? !0),
      (this.cancelable = u?.cancelable ?? !0));
  }
  get target() {
    return this._target;
  }
  get currentTarget() {
    return this._currentTarget;
  }
  get eventPhase() {
    return this._eventPhase;
  }
  get defaultPrevented() {
    return this._defaultPrevented;
  }
  stopPropagation() {
    this._propagationStopped = !0;
  }
  stopImmediatePropagation() {
    (super.stopImmediatePropagation(), (this._propagationStopped = !0));
  }
  preventDefault() {
    if (this.cancelable) this._defaultPrevented = !0;
  }
  consume() {
    (this.preventDefault(), this.stopImmediatePropagation());
  }
  _setTarget(n) {
    this._target = n;
  }
  _setCurrentTarget(n) {
    this._currentTarget = n;
  }
  _setEventPhase(n) {
    this._eventPhase = n;
  }
  _isPropagationStopped() {
    return this._propagationStopped;
  }
  _isImmediatePropagationStopped() {
    return this.didStopImmediatePropagation();
  }
  _prepareForTarget(n) {}
}

export { TerminalEvent };
