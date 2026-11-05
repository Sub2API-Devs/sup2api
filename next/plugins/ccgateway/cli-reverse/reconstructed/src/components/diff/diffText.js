/**
 * components/diff/diffText.ts
 *
 * 2.1.316 新增：diff 行转纯文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tj01d5m3.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import { stripAnsi } from "../../utils/stripAnsi.js";

//@ chunk-tj01d5m3.js:263-324 placement
function diffLineToPlainText(line) {
  return stripInvisibleChars_2(stripAnsi(line)).text.replace(/[\t\n]+/g, " ");
}
export { diffLineToPlainText };
