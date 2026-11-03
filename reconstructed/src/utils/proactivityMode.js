/**
 * utils/proactivityMode.ts
 *
 * 主动性模式（ask/default/proactive）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (4)
 * attribution: placement 4
 */
//@ chunk-s61vbvea.js:52554-52606 placement
var PROACTIVITY_MODES = ["ask", "default", "proactive"];
var DEFAULT = "default";
//@ chunk-s61vbvea.js:52606-52666 placement
/**
 * isProactivityMode：是否为主动性模式。
 */
function isProactivityMode(level) {
  return typeof level === "string" && PROACTIVITY_MODES.includes(level);
}
//@ chunk-s61vbvea.js:52666-52732 placement
/**
 * nextProactivityMode：下一个主动性模式。
 */
function nextProactivityMode(level) {
  let index = PROACTIVITY_MODES.indexOf(level);
  return PROACTIVITY_MODES[(index + 1) % PROACTIVITY_MODES.length];
}
//@ chunk-s61vbvea.js:52732-52809 placement
/**
 * previousProactivityMode：上一个主动性模式。
 */
function previousProactivityMode(level) {
  let index = PROACTIVITY_MODES.indexOf(level);
  return PROACTIVITY_MODES[(index + PROACTIVITY_MODES.length - 1) % PROACTIVITY_MODES.length];
}
export { isProactivityMode, PROACTIVITY_MODES, nextProactivityMode, previousProactivityMode, DEFAULT };
