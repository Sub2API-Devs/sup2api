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

//@ chunk-24t3dkzb.js:5133-5424 placement = EventEmitter (1)
/**
 * Ink 内部事件发射器：不限监听数；某个监听者对事件调用 stopImmediatePropagation 后后续监听者不再执行。
 */
class EventEmitter extends EventEmitter_2 {
  constructor() {
    super();
    this.setMaxListeners(0);
  }
  emit(type, ...args) {
    if (type === "error") return super.emit(type, ...args);
    let listeners = this.rawListeners(type);
    if (listeners.length === 0) return false;
    let ccEvent = args[0] instanceof InkEvent ? args[0] : null;
    for (let listener of listeners) {
      listener.apply(this, args);
      if (ccEvent?.didStopImmediatePropagation()) break;
    }
    return true;
  }
}
export { EventEmitter };
