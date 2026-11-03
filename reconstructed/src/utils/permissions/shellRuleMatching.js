/**
 * utils/permissions/shellRuleMatching.ts
 *
 * Shell 规则匹配：旧式 cmd:* 前缀、通配检测与通配模式转正则（转义、globstar、尾部可选参数）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/shellRuleMatching.ts
 * pieces: chunk-dcmhvw5a.js (5)
 * attribution: fingerprint 2, file-local 2, layout 1
 */
//@ chunk-dcmhvw5a.js:213036-213187 fingerprint = ESCAPED_STAR_PLACEHOLDER (0.5)
var ESCAPED_STAR_RE = new RegExp("\x00ESCAPED_STAR\x00", "g");
var ESCAPED_BACKSLASH_RE = new RegExp("\x00ESCAPED_BACKSLASH\x00", "g");
var GLOBSTAR_SEGMENT_RE = /\/(?:\*\*\/)+/g;
var GLOBSTAR_PLACEHOLDER_RE = new RegExp("\x00GLOBSTAR\x00", "g");
//@ chunk-dcmhvw5a.js:213187-213242 file-local
/**
 * 旧式前缀规则 "cmd:*" 取出前缀 cmd；不是则 null。
 */
function permissionRuleExtractPrefix(permissionRule) {
  return permissionRule.match(/^(.+):\*$/)?.[1] ?? null;
}
//@ chunk-dcmhvw5a.js:213242-213404 file-local
/**
 * 内容是否含未转义的 *（以 ":*" 结尾的旧式前缀规则不算通配）。
 */
function hasWildcards(pattern) {
  if (pattern.endsWith(":*")) return false;
  for (let i = 0; i < pattern.length; i++)
    if (pattern[i] === "*") {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && pattern[j] === "\\") {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) return true;
    }
  return false;
}
//@ chunk-dcmhvw5a.js:213404-213535 layout
/**
 * Shell 规则是否以未转义的 * 结尾（统计结尾 * 之前反斜杠个数的奇偶）。
 */
function endsWithUnescapedStar(e) {
  let n = e.trimEnd();
  if (!n.endsWith("*")) return false;
  let backslashCount = 0;
  let j = n.length - 2;
  while (j >= 0 && n[j] === "\\") {
    backslashCount++;
    j--;
  }
  return backslashCount % 2 === 0;
}
//@ chunk-dcmhvw5a.js:213535-214175 fingerprint = matchWildcardPattern (0.584)
/**
 * Shell 规则通配匹配：\* 与 \\ 为字面量，/**\/ 匹配零或多级目录，* 匹配任意字符（含换行，s 标志）；"cmd *" 只有一个 * 时尾部参数可省略；含 NUL 的模式拒绝；可选忽略大小写、折叠空白。
 */
function matchWildcardPattern(pattern, command, caseInsensitive = false, collapseWhitespace = false) {
  if (pattern.includes("\x00")) return false;
  let trimmedPattern = pattern.trim();
  let trimmedPattern_2 = collapseWhitespace ? trimmedPattern.replace(/[ \t]+/g, " ") : trimmedPattern;
  let g = collapseWhitespace ? command.replace(/[ \t]+/g, " ") : command;
  let processed = "";
  let i = 0;
  while (i < trimmedPattern_2.length) {
    let char = trimmedPattern_2[i];
    if (char === "\\" && i + 1 < trimmedPattern_2.length) {
      let nextChar = trimmedPattern_2[i + 1];
      if (nextChar === "*") {
        processed += "\x00ESCAPED_STAR\x00";
        i += 2;
        continue;
      } else if (nextChar === "\\") {
        processed += "\x00ESCAPED_BACKSLASH\x00";
        i += 2;
        continue;
      }
    }
    processed += char;
    i++;
  }
  let regexPattern = processed
    .replace(/[.+?^${}()|[\]\\'"]/g, "\\$&")
    .replace(GLOBSTAR_SEGMENT_RE, "\x00GLOBSTAR\x00")
    .replaceAll("*", ".*")
    .replace(GLOBSTAR_PLACEHOLDER_RE, "/(?:.*/)?")
    .replace(ESCAPED_STAR_RE, "\\*")
    .replace(ESCAPED_BACKSLASH_RE, "\\\\");
  let unescapedStarCount = (processed.match(/\*/g) || []).length;
  if (regexPattern.endsWith(" .*") && unescapedStarCount === 1)
    regexPattern = regexPattern.slice(0, -3) + "( .*)?";
  let flags = "s" + (caseInsensitive ? "i" : "");
  return new RegExp(`^${regexPattern}$`, flags).test(g);
}
export { hasWildcards, matchWildcardPattern, permissionRuleExtractPrefix, endsWithUnescapedStar };
