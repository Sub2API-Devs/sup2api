/**
 * services/oauth/loginEvents.ts
 *
 * 2.1.316 新增：登录事件计数（凭据持久化、登录完成）订阅
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r533agbk.js (2)
 * attribution: placement 2
 */
import { createSignal } from "../../utils/signal.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-r533agbk.js:263-589 placement
/**
 * 登录事件计数器：凭证保存与登录完成次数，可订阅。
 */
class LoginEventCounter {
  #e = {
    credentialsPersisted: 0,
    loginCompleted: 0,
  };
  #t = createSignal();
  subscribe = (t) => this.#t.subscribe(t);
  getSnapshot = () => this.#e;
  credentialsPersisted() {
    this.#e = {
      ...this.#e,
      credentialsPersisted: this.#e.credentialsPersisted + 1,
    };
    this.#t.emit();
  }
  loginCompleted() {
    this.#e = {
      ...this.#e,
      loginCompleted: this.#e.loginCompleted + 1,
    };
    this.#t.emit();
  }
}
//@ chunk-r533agbk.js:589-614 placement
/**
 * 按会话根保存的登录事件计数器。
 */
var loginEventCounter = new SessionRootSlot(() => new LoginEventCounter());
export { loginEventCounter };
