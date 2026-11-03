/**
 * utils/semver.ts
 *
 * 语义版本比较（gt/gte/lt/lte/order/satisfies）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/semver.ts
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: affinity 1, fingerprint 2, layout 4
 */
import { withTelemetryMessage, toError } from "./errors.js";

//@ chunk-aepeg2w5.js:220767-220803 affinity
var INVALID_SEMVER_MESSAGE = "Invalid SemVer: <redacted>";
//@ chunk-aepeg2w5.js:220803-220881 fingerprint = order (0.532)
function order(a, b) {
  try {
    return Bun.semver.order(a, b);
  } catch (error) {
    throw withTelemetryMessage(toError(error), INVALID_SEMVER_MESSAGE);
  }
}
/**
 * 语义版本 a > b。
 */
//@ chunk-aepeg2w5.js:220881-220917 layout
function gt(e, n) {
  return order(e, n) === 1;
}
/**
 * 语义版本 a >= b。
 */
//@ chunk-aepeg2w5.js:220917-220952 layout
function gte(e, n) {
  return order(e, n) >= 0;
}
/**
 * 语义版本 a < b。
 */
//@ chunk-aepeg2w5.js:220952-220989 layout
function lt_2(e, n) {
  return order(e, n) === -1;
}
/**
 * 语义版本 a <= b。
 */
//@ chunk-aepeg2w5.js:220989-221025 layout
function lte(e, n) {
  return order(e, n) <= 0;
}
//@ chunk-aepeg2w5.js:221025-221076 fingerprint = satisfies (0.639)
function satisfies(version, range) {
  return Bun.semver.satisfies(version, range);
}

export { gt, lt_2, gte, lte, satisfies, order };
