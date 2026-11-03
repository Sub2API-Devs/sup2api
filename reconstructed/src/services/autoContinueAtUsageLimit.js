/**
 * services/autoContinueAtUsageLimit.ts
 *
 * 2.1.316 新增。达到用量上限后自动继续。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8p3q5e5p.js (11)
 * attribution: placement 11
 */
import { getSecuritySensitiveSetting } from "../utils/settings/settings.js";
import { getIsInteractive } from "../bootstrap/state.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { wt } from "../remote/remoteMode.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";

//@ chunk-8p3q5e5p.js:337-393 placement
function dln() {
  return getSecuritySensitiveSetting("autoContinueAtUsageLimit")[0];
}
//@ chunk-8p3q5e5p.js:393-436 placement
function QKn(e) {
  return dln() ?? e === "absent";
}
//@ chunk-8p3q5e5p.js:436-463 placement
var TENGU_MARBLE_HERON = "tengu_marble_heron";
//@ chunk-8p3q5e5p.js:463-505 placement
function g0r() {
  let e = n();
  return o(e) ? e : {};
}
//@ chunk-8p3q5e5p.js:505-557 placement
function pze() {
  let e = n();
  return isTruthySetting(o(e) ? e.enabled : e);
}
//@ chunk-8p3q5e5p.js:557-598 placement
function cln() {
  return getIsInteractive() && !isBgSession() && !wt();
}
//@ chunk-8p3q5e5p.js:598-633 placement
function zjs() {
  return cln() && pze();
}
//@ chunk-8p3q5e5p.js:633-672 placement
function ZKn() {
  return isTruthySetting(g0r().autoArm);
}
//@ chunk-8p3q5e5p.js:672-700 placement
function n() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MARBLE_HERON, {});
}
//@ chunk-8p3q5e5p.js:700-770 placement
function o(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-8p3q5e5p.js:770-914 placement
function isTruthySetting(e) {
  if (e === void 0) return !0;
  if (typeof e === "string") {
    let lower = e.trim().toLowerCase();
    return lower !== "" && lower !== "false" && lower !== "0";
  }
  return Boolean(e);
}

export { QKn, zjs, g0r, ZKn, dln, pze, cln };
