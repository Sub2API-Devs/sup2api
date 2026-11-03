/**
 * utils/powershell/quoting.ts
 *
 * 2.1.316 新增：PowerShell 引号转义。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ahy3gsxp.js (2)
 * attribution: placement 2
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";

//@ chunk-ahy3gsxp.js:226-250 placement
var n = /[\u2018-\u201F]/;
/**
 * 把字符串安全地写成 PowerShell 单引号字面量（单引号加倍）；含 U+2018–U+201F 这类会被 PowerShell 当作引号的字符时抛出遥测安全错误。
 */
//@ chunk-ahy3gsxp.js:250-659 placement
function quotePowerShellSingleQuoted(t, e = "value") {
  let match = n.exec(t);
  if (match) {
    let padded = (match[0].codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot safely quote ${e} in a PowerShell single-quoted string literal: it contains U+${padded}, which PowerShell's tokenizer treats as a quote delimiter`,
      "psSingleQuotedLiteral: rejected a PowerShell quote-variant codepoint (U+2018..U+201F)",
    );
  }
  return `'${t.replaceAll("'", "''")}'`;
}

export { quotePowerShellSingleQuoted };
