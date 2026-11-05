/**
 * utils/codeMode/displayableScriptDescription.ts
 *
 * 脚本描述能否安全展示（含不可见/组合字符时返回空）与截断（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hf5txq1x.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFirstLine } from "../stringUtils.js";
import { redactAndTruncate, redactSecretsInText } from "../../services/teamMemorySync/secretScanner.js";

//@ chunk-hf5txq1x.js:267-353 placement
var UNDISPLAYABLE_CHARS = /[\p{Cc}\p{Cf}\p{Cs}\p{Mn}\p{Me}\p{Default_Ignorable_Code_Point}\u2028\u2029]/u;
//@ chunk-hf5txq1x.js:353-546 placement
/**
 * 脚本描述的可展示化：含不可见字符时返回空，否则按宽度截断。
 */
function displayableScriptDescription(description, width) {
  if (typeof description !== "string") return "";
  let firstLine = getFirstLine(description).replace(/\r$/, "");
  if (UNDISPLAYABLE_CHARS.test(firstLine)) return "";
  if (width !== undefined) return firstLine.trim() === "" ? "" : redactAndTruncate(firstLine, width).trim();
  return firstLine.trim() === "" ? "" : redactSecretsInText(firstLine).trim();
}
export { displayableScriptDescription };
