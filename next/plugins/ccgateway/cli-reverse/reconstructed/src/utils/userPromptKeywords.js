/**
 * utils/userPromptKeywords.ts
 *
 * 用户提示关键词检测：判断输入是否为 continue / keep going / go on 这类续写请求。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/userPromptKeywords.ts
 * pieces: chunk-w3ch4xq2.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-w3ch4xq2.js:14632-14743 placement (2.1.88 match: matchesKeepGoingKeyword, 1)
/**
 * 输入（小写去空白）为 continue，或含 keep going / go on 时为真。
 */
function matchesKeepGoingKeyword(input) {
  let lowerInput = input.toLowerCase().trim();
  if (lowerInput === "continue") return true;
  return /\b(keep going|go on)\b/.test(lowerInput);
}
export { matchesKeepGoingKeyword };
