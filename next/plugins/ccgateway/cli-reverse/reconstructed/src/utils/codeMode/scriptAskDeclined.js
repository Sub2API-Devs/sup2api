/**
 * utils/codeMode/scriptAskDeclined.ts
 *
 * 脚本内 ask 被拒绝的 AbortError 标识、原因判定与计数型订阅（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rq72psw1.js (4)
 * attribution: placement 4
 */
import { unwrapAbortReason } from "../abortController.js";
import { createSignal } from "../signal.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-rq72psw1.js:299-362 placement
/**
 * 脚本内 ask 被拒绝的中断原因值与同名 DOMException。
 */
var REPL_ASK_DECLINED = "repl-ask-declined";
var SCRIPT_ASK_DECLINED = new DOMException(REPL_ASK_DECLINED, "AbortError");
//@ chunk-rq72psw1.js:362-413 placement
/**
 * 中断是否由脚本内 ask 被拒引起。
 */
function isScriptAskDeclinedAbort(signal) {
  return signal.aborted && unwrapAbortReason(signal.reason) === REPL_ASK_DECLINED;
}
//@ chunk-rq72psw1.js:413-622 placement
class ScriptAskHoldCounter {
  #e = 0;
  #t = createSignal();
  subscribe = (listener) => this.#t.subscribe(listener);
  getSnapshot = () => this.#e > 0;
  hold() {
    this.#e++;
    if (this.#e === 1) this.#t.emit();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#e--;
      if (this.#e === 0) this.#t.emit();
    };
  }
}
//@ chunk-rq72psw1.js:622-648 placement
/**
 * 脚本内 ask 的计数型订阅单例。
 */
var scriptAskHolds = new SessionRootSlot(() => new ScriptAskHoldCounter());
export { isScriptAskDeclinedAbort, scriptAskHolds, SCRIPT_ASK_DECLINED };
