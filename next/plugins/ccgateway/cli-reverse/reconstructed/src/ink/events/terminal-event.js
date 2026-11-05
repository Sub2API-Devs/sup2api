/**
 * ink/events/terminal-event.ts
 *
 * 终端事件基类（带 target/currentTarget 的 DOM 风格事件）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/terminal-event.ts
 * pieces: chunk-2avr6cej.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { InkEvent } from "./event.js";

//@ chunk-2avr6cej.js:189664-190645 fingerprint (2.1.88 match: TerminalEvent, 0.981)
/**
 * 终端 DOM 事件基类：type、时间戳、bubbles/cancelable、target/currentTarget/eventPhase，stopPropagation/stopImmediatePropagation/preventDefault，consume()=两者都做。
 */
class TerminalEvent extends InkEvent {
  type;
  timeStamp;
  bubbles;
  cancelable;
  _target = null;
  _currentTarget = null;
  _eventPhase = "none";
  _propagationStopped = false;
  _defaultPrevented = false;
  constructor(type, init) {
    super();
    this.type = type;
    this.timeStamp = performance.now();
    this.bubbles = init?.bubbles ?? true;
    this.cancelable = init?.cancelable ?? true;
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
    this._propagationStopped = true;
  }
  stopImmediatePropagation() {
    super.stopImmediatePropagation();
    this._propagationStopped = true;
  }
  preventDefault() {
    if (this.cancelable) this._defaultPrevented = true;
  }
  consume() {
    this.preventDefault();
    this.stopImmediatePropagation();
  }
  _setTarget(target) {
    this._target = target;
  }
  _setCurrentTarget(target) {
    this._currentTarget = target;
  }
  _setEventPhase(phase) {
    this._eventPhase = phase;
  }
  _isPropagationStopped() {
    return this._propagationStopped;
  }
  _isImmediatePropagationStopped() {
    return this.didStopImmediatePropagation();
  }
  _prepareForTarget(_target) {}
}
export { TerminalEvent };
