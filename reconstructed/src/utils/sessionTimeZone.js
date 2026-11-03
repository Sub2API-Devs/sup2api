/**
 * utils/sessionTimeZone.ts
 *
 * 2.1.316 新增：会话时区（宿主下发或假定 UTC）与会话日期
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d0k42hx1.js (10)
 * attribution: placement 10
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getRootSession, isDisklessProcess } from "../bootstrap/state.js";
import { isDiagLogging, isInDiagScope } from "./diagLogs.js";
import { getDateTimeFormat } from "./intl.js";
import { mn } from "./remoteEnvironment.js";

//@ chunk-d0k42hx1.js:345-447 placement
class SessionTimeZoneCell {
  #e;
  #t = !1;
  get() {
    return this.#e;
  }
  isAssumed() {
    return this.#t;
  }
  replace(e, t = !1) {
    ((this.#e = e), (this.#t = t));
  }
}
//@ chunk-d0k42hx1.js:447-471 placement
var r = new SessionRootSlot(() => new SessionTimeZoneCell());
//@ chunk-d0k42hx1.js:471-512 placement
function vXr() {
  return r.peek(getRootSession())?.get();
}
//@ chunk-d0k42hx1.js:512-583 placement
function llr() {
  return (isDiagLogging() && !isInDiagScope() ? void 0 : vXr()) ?? (isDisklessProcess() ? "UTC" : void 0);
}
/**
 * 返回会话日期 YYYY-MM-DD：有会话时区时按该时区，否则按本地时间。
 */
//@ chunk-d0k42hx1.js:583-948 placement
function sessionDateString() {
  let date = new Date(),
    t = vXr();
  if (t !== void 0) {
    let n = new Map(
      getDateTimeFormat("en-US", { timeZone: t, year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(date)
        .map((o) => [o.type, o.value]),
    );
    return `${n.get("year")}-${n.get("month")}-${n.get("day")}`;
  }
  let fullYear = date.getFullYear(),
    padded = String(date.getMonth() + 1).padStart(2, "0"),
    padded_2 = String(date.getDate()).padStart(2, "0");
  return `${fullYear}-${padded}-${padded_2}`;
}
/**
 * 判断会话时区是否是假定的（宿主未下发且本机为 UTC）。
 */
//@ chunk-d0k42hx1.js:948-1119 placement
function isTimeZoneAssumed() {
  let peek = r.peek(getRootSession());
  return peek?.get() !== void 0
    ? peek.isAssumed()
    : mn() &&
        new Date().getTimezoneOffset() === 0 &&
        Intl.DateTimeFormat().resolvedOptions().timeZone === "UTC";
}
//@ chunk-d0k42hx1.js:1119-1230 placement
class SessionDateCell {
  #e;
  get() {
    return ((this.#e ??= sessionDateString()), this.#e);
  }
  clear() {
    this.#e = void 0;
  }
  get captured() {
    return this.#e !== void 0;
  }
}
//@ chunk-d0k42hx1.js:1230-1256 placement
var Gvn = new SessionRootSlot(() => new SessionDateCell());
//@ chunk-d0k42hx1.js:1256-1295 placement
function zQo(e) {
  return Gvn.of(e).get();
}
//@ chunk-d0k42hx1.js:1295-1326 placement
function Tfi() {
  return zQo(getRootSession());
}

export { Tfi, vXr, Gvn, llr, zQo, isTimeZoneAssumed, sessionDateString };
