/**
 * cli/handlers/_new/parseStringRecord.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d4eg9at2.js (3)
 * attribution: sole-consumer-new 3
 */
import { stripInvisibleKeepEmoji } from "../../../utils/settings/marketplaceSettingsAliases.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../../utils/errors.js";

//@ chunk-d4eg9at2.js:46302-46342 sole-consumer-new
function ge(s, o) {
  return stripInvisibleKeepEmoji(o?.title || s);
}
//@ chunk-d4eg9at2.js:46342-46413 sole-consumer-new
class oe extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  option;
  constructor(s, o, i) {
    super(s, o);
    this.option = i;
  }
}
/**
 * 把输入校验为"值全是字符串的普通对象"并复制到无原型对象；不是对象或有非字符串值时返回 undefined。
 */
//@ chunk-d4eg9at2.js:46413-46592 sole-consumer-new
function parseStringRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;
  let create = Object.create(null);
  for (let [i, u] of Object.entries(value)) {
    if (typeof u !== "string") return;
    create[i] = u;
  }
  return create;
}

export { oe, ge, parseStringRecord };
