/**
 * utils/sanitizeDisplayText.ts
 *
 * 2.1.316 新增：清理显示文本中的控制/格式字符与 ANSI
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7k75rpzj.js (2)
 * attribution: placement 2
 */
import { CONTROL_CHARS_EXCEPT_WS_RE, toWellFormedString } from "./stringUtils.js";

//@ chunk-7k75rpzj.js:230-310 placement
var FORMAT_CHARS_RE = /(?![\u200C\u200D])[\p{Cf}\u2028\u2029]/gu;
var C1_CONTROL_RE = /[\u001b\u0080-\u009f]/g;
var MAX_ESCAPE_RUN = 8;
//@ chunk-7k75rpzj.js:310-509 placement
function sanitizeDisplayText(u) {
  let replaced = u
    .replace(C1_CONTROL_RE, "")
    .replace(CONTROL_CHARS_EXCEPT_WS_RE, "")
    .replace(/[\v\f\r]/g, "");
  for (let i = 0; i < MAX_ESCAPE_RUN; i++) {
    let wellFormedString = toWellFormedString(replaced.replace(FORMAT_CHARS_RE, ""));
    if (wellFormedString === replaced) return replaced;
    replaced = wellFormedString;
  }
  return replaced.replace(/[\ud800-\udfff]/g, "").replace(FORMAT_CHARS_RE, "");
}
export { sanitizeDisplayText };
