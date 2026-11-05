/**
 * utils/proactivityMode.ts
 *
 * 主动性模式（ask/default/proactive）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:88245-88297 placement
var PROACTIVITY_MODES = ["ask", "default", "proactive"];
var DEFAULT = "default";
//@ chunk-5xgkngpb.js:88297-88357 placement
/**
 * isProactivityMode：是否为主动性模式。
 */
function isProactivityMode(level) {
  return typeof level === "string" && PROACTIVITY_MODES.includes(level);
}
//@ chunk-5xgkngpb.js:88357-88423 placement
/**
 * nextProactivityMode：下一个主动性模式。
 */
function nextProactivityMode(level) {
  let index = PROACTIVITY_MODES.indexOf(level);
  return PROACTIVITY_MODES[(index + 1) % PROACTIVITY_MODES.length];
}
//@ chunk-5xgkngpb.js:88423-88500 placement
/**
 * previousProactivityMode：上一个主动性模式。
 */
function previousProactivityMode(level) {
  let index = PROACTIVITY_MODES.indexOf(level);
  return PROACTIVITY_MODES[(index + PROACTIVITY_MODES.length - 1) % PROACTIVITY_MODES.length];
}
export { isProactivityMode, PROACTIVITY_MODES, DEFAULT, nextProactivityMode, previousProactivityMode };
