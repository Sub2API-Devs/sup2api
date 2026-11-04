/**
 * utils/userPromptKeywords.ts
 *
 * 用户提示关键词检测：判断输入是否为 continue / keep going / go on 这类续写请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/userPromptKeywords.ts
 * pieces: chunk-ha3km179.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-ha3km179.js:14540-14651 fingerprint = matchesKeepGoingKeyword (1)
/**
 * 输入（小写去空白）为 continue，或含 keep going / go on 时为真。
 */
function matchesKeepGoingKeyword(input) {
  let lowerInput = input.toLowerCase().trim();
  if (lowerInput === "continue") return true;
  return /\b(keep going|go on)\b/.test(lowerInput);
}
export { matchesKeepGoingKeyword };
