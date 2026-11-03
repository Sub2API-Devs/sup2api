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
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";

//@ chunk-d0k42hx1.js:345-447 placement
class SessionTimeZoneCell {
  #e;
  #t = false;
  get() {
    return this.#e;
  }
  isAssumed() {
    return this.#t;
  }
  replace(e, t = false) {
    this.#e = e;
    this.#t = t;
  }
}
//@ chunk-d0k42hx1.js:447-471 placement
var sessionTimeZoneCellSlot = new SessionRootSlot(() => new SessionTimeZoneCell());
//@ chunk-d0k42hx1.js:471-512 placement
/**
 * sessionTimeZone：会话时区。
 */
function sessionTimeZone() {
  return sessionTimeZoneCellSlot.peek(getRootSession())?.get();
}
//@ chunk-d0k42hx1.js:512-583 placement
/**
 * effectiveSessionTimeZone：诊断作用域外的有效时区。
 */
function effectiveSessionTimeZone() {
  return (
    (isDiagLogging() && !isInDiagScope() ? undefined : sessionTimeZone()) ??
    (isDisklessProcess() ? "UTC" : undefined)
  );
}
//@ chunk-d0k42hx1.js:583-948 placement
/**
 * 返回会话日期 YYYY-MM-DD：有会话时区时按该时区，否则按本地时间。
 */
function sessionDateString() {
  let date = new Date();
  let t = sessionTimeZone();
  if (t !== undefined) {
    let n = new Map(
      getDateTimeFormat("en-US", {
        timeZone: t,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(date)
        .map((o) => [o.type, o.value]),
    );
    return `${n.get("year")}-${n.get("month")}-${n.get("day")}`;
  }
  let fullYear = date.getFullYear();
  let padded = String(date.getMonth() + 1).padStart(2, "0");
  let padded_2 = String(date.getDate()).padStart(2, "0");
  return `${fullYear}-${padded}-${padded_2}`;
}
//@ chunk-d0k42hx1.js:948-1119 placement
/**
 * 判断会话时区是否是假定的（宿主未下发且本机为 UTC）。
 */
function isTimeZoneAssumed() {
  let e = sessionTimeZoneCellSlot.peek(getRootSession());
  return e?.get() !== undefined
    ? e.isAssumed()
    : isRemoteManagedEnvironment() &&
        new Date().getTimezoneOffset() === 0 &&
        Intl.DateTimeFormat().resolvedOptions().timeZone === "UTC";
}
//@ chunk-d0k42hx1.js:1119-1230 placement
class SessionDateCell {
  #e;
  get() {
    this.#e ??= sessionDateString();
    return this.#e;
  }
  clear() {
    this.#e = undefined;
  }
  get captured() {
    return this.#e !== undefined;
  }
}
//@ chunk-d0k42hx1.js:1230-1256 placement
/**
 * sessionDateCellSlot：按会话根保存的日期单元。
 */
var sessionDateCellSlot = new SessionRootSlot(() => new SessionDateCell());
//@ chunk-d0k42hx1.js:1256-1295 placement
/**
 * sessionDateCell：某会话的日期单元。
 */
function sessionDateCell(e) {
  return sessionDateCellSlot.of(e).get();
}
//@ chunk-d0k42hx1.js:1295-1326 placement
/**
 * currentSessionDate：当前会话日期。
 */
function currentSessionDate() {
  return sessionDateCell(getRootSession());
}
export {
  currentSessionDate,
  sessionTimeZone,
  sessionDateCellSlot,
  effectiveSessionTimeZone,
  sessionDateCell,
  isTimeZoneAssumed,
  sessionDateString,
};
