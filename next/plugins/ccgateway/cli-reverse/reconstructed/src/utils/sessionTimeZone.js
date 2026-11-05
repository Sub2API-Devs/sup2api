/**
 * utils/sessionTimeZone.ts
 *
 * 2.1.316 新增：会话时区（宿主下发或假定 UTC）与会话日期
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v4ach9rb.js (10)
 * attribution: placement 10
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getRootSession, isDisklessProcess } from "../bootstrap/state.js";
import { isDiagLogging, isInDiagScope } from "./diagLogs.js";
import { getDateTimeFormat } from "./intl.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-v4ach9rb.js:377-479 placement
class SessionTimeZoneCell {
  #e;
  #t = false;
  get() {
    return this.#e;
  }
  isAssumed() {
    return this.#t;
  }
  replace(value, assumed = false) {
    this.#e = value;
    this.#t = assumed;
  }
}
//@ chunk-v4ach9rb.js:479-503 placement
var sessionTimeZoneCellSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v4ach9rb.js:479", () => {
  sessionTimeZoneCellSlot = new SessionRootSlot(() => new SessionTimeZoneCell());
});
//@ chunk-v4ach9rb.js:503-544 placement
/**
 * sessionTimeZone：会话时区。
 */
function sessionTimeZone() {
  return sessionTimeZoneCellSlot.peek(getRootSession())?.get();
}
//@ chunk-v4ach9rb.js:544-614 placement
/**
 * effectiveSessionTimeZone：诊断作用域外的有效时区。
 */
function effectiveSessionTimeZone() {
  return (
    (isDiagLogging() && !isInDiagScope() ? undefined : sessionTimeZone()) ??
    (isDisklessProcess() ? "UTC" : undefined)
  );
}
//@ chunk-v4ach9rb.js:614-979 placement
/**
 * 返回会话日期 YYYY-MM-DD：有会话时区时按该时区，否则按本地时间。
 */
function sessionDateString() {
  let date = new Date();
  let zone = sessionTimeZone();
  if (zone !== undefined) {
    let parts = new Map(
      getDateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(date)
        .map((part) => [part.type, part.value]),
    );
    return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
  }
  let fullYear = date.getFullYear();
  let padded = String(date.getMonth() + 1).padStart(2, "0");
  let padded_2 = String(date.getDate()).padStart(2, "0");
  return `${fullYear}-${padded}-${padded_2}`;
}
//@ chunk-v4ach9rb.js:979-1150 placement
/**
 * 判断会话时区是否是假定的（宿主未下发且本机为 UTC）。
 */
function isTimeZoneAssumed() {
  let cell = sessionTimeZoneCellSlot.peek(getRootSession());
  return cell?.get() !== undefined
    ? cell.isAssumed()
    : isRemoteManagedEnvironment() &&
        new Date().getTimezoneOffset() === 0 &&
        Intl.DateTimeFormat().resolvedOptions().timeZone === "UTC";
}
//@ chunk-v4ach9rb.js:1150-1261 placement
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
//@ chunk-v4ach9rb.js:1261-1287 placement
/**
 * sessionDateCellSlot：按会话根保存的日期单元。
 */
var sessionDateCellSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v4ach9rb.js:1261", () => {
  sessionDateCellSlot = new SessionRootSlot(() => new SessionDateCell());
});
//@ chunk-v4ach9rb.js:1287-1326 placement
/**
 * sessionDateCell：某会话的日期单元。
 */
function sessionDateCell(session) {
  return sessionDateCellSlot.of(session).get();
}
//@ chunk-v4ach9rb.js:1326-1357 placement
/**
 * currentSessionDate：当前会话日期。
 */
function currentSessionDate() {
  return sessionDateCell(getRootSession());
}
export {
  currentSessionDate,
  sessionTimeZone,
  effectiveSessionTimeZone,
  sessionDateCell,
  sessionDateCellSlot,
  isTimeZoneAssumed,
  sessionDateString,
};
