/**
 * utils/settings/permissionRuleCarveOut.ts
 *
 * 2.1.316 新增：max effort 的说明文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (3)
 * attribution: placement 3
 */

/**
 * max effort 的说明文本。
 */
//@ chunk-dcmhvw5a.js:189681-189802 placement
var MAX_EFFORT_DESCRIPTION =
  "May use excessive tokens resulting in long response times or overthinking. Use sparingly for the hardest tasks.";
//@ chunk-dcmhvw5a.js:189802-189838 placement
var PATH_RULE_CARVE_OUT_RE = /^(?:Read|Edit)\((?:\.\/)?!/;
//@ chunk-dcmhvw5a.js:189838-189885 placement
function _Ot(e) {
  return e === void 0 || e === !1 ? e : !0;
}

export { PATH_RULE_CARVE_OUT_RE, MAX_EFFORT_DESCRIPTION, _Ot };
