/**
 * utils/semver.ts
 *
 * 语义版本比较（gt/gte/lt/lte/order/satisfies）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/semver.ts
 * pieces: chunk-exfmq47h.js (8)
 * attribution: affinity 1, fingerprint 2, layout 4, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { withTelemetryMessage, toError } from "./errors.js";

//@ chunk-exfmq47h.js:230282-230318 affinity
var INVALID_SEMVER_MESSAGE = "Invalid SemVer: <redacted>";
//@ chunk-exfmq47h.js:230318-230396 fingerprint (2.1.88 match: order, 0.532)
function order(a, b) {
  try {
    return Bun.semver.order(a, b);
  } catch (error) {
    throw withTelemetryMessage(toError(error), INVALID_SEMVER_MESSAGE);
  }
}
//@ chunk-exfmq47h.js:230396-230432 layout
/**
 * 语义版本 a > b。
 */
function semverGte(left, right) {
  return order(left, right) === 1;
}
//@ chunk-exfmq47h.js:230432-230467 layout
/**
 * 语义版本 a >= b。
 */
function semverGt(left, right) {
  return order(left, right) >= 0;
}
//@ chunk-exfmq47h.js:230467-230504 layout
/**
 * 语义版本 a < b。
 */
function lt(left, right) {
  return order(left, right) === -1;
}
//@ chunk-exfmq47h.js:230504-230540 layout
/**
 * 语义版本 a <= b。
 */
function semverLt(left, right) {
  return order(left, right) <= 0;
}
//@ chunk-exfmq47h.js:230540-230591 fingerprint (2.1.88 match: satisfies, 0.639)
function satisfies(version, range) {
  return Bun.semver.satisfies(version, range);
}
//@ chunk-exfmq47h.js:230591-230624 placement
function compareVersions(left, right) {
  return order(left, right);
}
export { semverGte, semverGt, lt, semverLt, satisfies, compareVersions };
