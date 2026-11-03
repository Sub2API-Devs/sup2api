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
var ESCAPED_STAR_RE = new RegExp("\x00ESCAPED_STAR\x00", "g"),
  ESCAPED_BACKSLASH_RE = new RegExp("\x00ESCAPED_BACKSLASH\x00", "g"),
  GLOBSTAR_SEGMENT_RE = /\/(?:\*\*\/)+/g,
  GLOBSTAR_PLACEHOLDER_RE = new RegExp("\x00GLOBSTAR\x00", "g");
/**
 * 旧式前缀规则 "cmd:*" 取出前缀 cmd；不是则 null。
 */
//@ chunk-dcmhvw5a.js:213187-213242 file-local
function permissionRuleExtractPrefix(permissionRule) {
  return permissionRule.match(/^(.+):\*$/)?.[1] ?? null;
}
/**
 * 内容是否含未转义的 *（以 ":*" 结尾的旧式前缀规则不算通配）。
 */
//@ chunk-dcmhvw5a.js:213242-213404 file-local
function hasWildcards(pattern) {
  if (pattern.endsWith(":*")) return !1;
  for (let n = 0; n < pattern.length; n++)
    if (pattern[n] === "*") {
      let r = 0,
        s = n - 1;
      while (s >= 0 && pattern[s] === "\\") (r++, s--);
      if (r % 2 === 0) return !0;
    }
  return !1;
}
/**
 * Shell 规则是否以未转义的 * 结尾（统计结尾 * 之前反斜杠个数的奇偶）。
 */
//@ chunk-dcmhvw5a.js:213404-213535 layout
function endsWithUnescapedStar(e) {
  let trimEnd = e.trimEnd();
  if (!trimEnd.endsWith("*")) return !1;
  let r = 0,
    s = trimEnd.length - 2;
  while (s >= 0 && trimEnd[s] === "\\") (r++, s--);
  return r % 2 === 0;
}
/**
 * Shell 规则通配匹配：\* 与 \\ 为字面量，/**\/ 匹配零或多级目录，* 匹配任意字符（含换行，s 标志）；"cmd *" 只有一个 * 时尾部参数可省略；含 NUL 的模式拒绝；可选忽略大小写、折叠空白。
 */
//@ chunk-dcmhvw5a.js:213535-214175 fingerprint = matchWildcardPattern (0.584)
function matchWildcardPattern(pattern, command, caseInsensitive = !1, collapseWhitespace = !1) {
  if (pattern.includes("\x00")) return !1;
  let trimmedPattern = pattern.trim(),
    c = collapseWhitespace ? trimmedPattern.replace(/[ \t]+/g, " ") : trimmedPattern,
    g = collapseWhitespace ? command.replace(/[ \t]+/g, " ") : command,
    processed = "",
    f = 0;
  while (f < c.length) {
    let v = c[f];
    if (v === "\\" && f + 1 < c.length) {
      let j = c[f + 1];
      if (j === "*") {
        ((processed += "\x00ESCAPED_STAR\x00"), (f += 2));
        continue;
      } else if (j === "\\") {
        ((processed += "\x00ESCAPED_BACKSLASH\x00"), (f += 2));
        continue;
      }
    }
    ((processed += v), f++);
  }
  let regexPattern = processed
      .replace(/[.+?^${}()|[\]\\'"]/g, "\\$&")
      .replace(GLOBSTAR_SEGMENT_RE, "\x00GLOBSTAR\x00")
      .replaceAll("*", ".*")
      .replace(GLOBSTAR_PLACEHOLDER_RE, "/(?:.*/)?")
      .replace(ESCAPED_STAR_RE, "\\*")
      .replace(ESCAPED_BACKSLASH_RE, "\\\\"),
    unescapedStarCount = (processed.match(/\*/g) || []).length;
  if (regexPattern.endsWith(" .*") && unescapedStarCount === 1)
    regexPattern = regexPattern.slice(0, -3) + "( .*)?";
  let flags = "s" + (caseInsensitive ? "i" : "");
  return new RegExp(`^${regexPattern}$`, flags).test(g);
}

export { hasWildcards, matchWildcardPattern, permissionRuleExtractPrefix, endsWithUnescapedStar };
