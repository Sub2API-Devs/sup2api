/**
 * utils/personalConfigRestriction.ts
 *
 * 2.1.316 新增。个人配置限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rsktsadk.js (5)
 * attribution: placement 5
 */
import { env } from "./env.js";
import { isEnvTruthy } from "./envUtils.js";

//@ chunk-rsktsadk.js:262-273 placement
var t = null;
//@ chunk-rsktsadk.js:273-293 placement
function c_i(e) {
  t = e;
}
//@ chunk-rsktsadk.js:293-407 placement
function isPersonalConfigRestricted() {
  return (
    env.CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG === !0 ||
    isEnvTruthy(t?.()?.CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)
  );
}
//@ chunk-rsktsadk.js:407-417 placement
var o = 300;
//@ chunk-rsktsadk.js:417-624 placement
function getPersonalConfigFixHint() {
  let e = t?.(),
    n = (e === void 0 ? env.CLAUDE_CODE_PERSONAL_CONFIG_FIX : e.CLAUDE_CODE_PERSONAL_CONFIG_FIX)?.trim();
  if (n === void 0 || n === "" || n.length > o || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(n)) return;
  return n;
}

export { isPersonalConfigRestricted, getPersonalConfigFixHint, c_i };
