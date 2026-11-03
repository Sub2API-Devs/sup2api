/**
 * ink/events/emitter.ts
 *
 * 沿用旧版路径：Ink 事件分发器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/emitter.ts
 * pieces: chunk-24t3dkzb.js (1)
 * attribution: placement 1
 */
import { EventEmitter as EventEmitter_2 } from "events";
import { InkEvent } from "./event.js";

/**
 * Ink 内部事件发射器：不限监听数；某个监听者对事件调用 stopImmediatePropagation 后后续监听者不再执行。
 */
//@ chunk-24t3dkzb.js:5133-5424 placement = EventEmitter (1)
class EventEmitter extends EventEmitter_2 {
  constructor() {
    super();
    this.setMaxListeners(0);
  }
  emit(r, ...n) {
    if (r === "error") return super.emit(r, ...n);
    let rawListeners = this.rawListeners(r);
    if (rawListeners.length === 0) return !1;
    let u = n[0] instanceof InkEvent ? n[0] : null;
    for (let s of rawListeners) if ((s.apply(this, n), u?.didStopImmediatePropagation())) break;
    return !0;
  }
}

export { EventEmitter };
