/**
 * utils/permissions/shellRuleMatching.ts
 *
 * Shell 规则匹配：旧式 cmd:* 前缀、通配检测与通配模式转正则（转义、globstar、尾部可选参数）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/shellRuleMatching.ts
 * pieces: chunk-z20c443b.js (10)
 * attribution: fingerprint 2, file-local 2, layout 1, placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-z20c443b.js:207162-207313 fingerprint (2.1.88 match: ESCAPED_STAR_PLACEHOLDER, 0.5)
var ESCAPED_STAR_RE = new RegExp("\x00ESCAPED_STAR\x00", "g");
var ESCAPED_BACKSLASH_RE = new RegExp("\x00ESCAPED_BACKSLASH\x00", "g");
var GLOBSTAR_SEGMENT_RE = /\/(?:\*\*\/)+/g;
var GLOBSTAR_PLACEHOLDER_RE = new RegExp("\x00GLOBSTAR\x00", "g");
//@ chunk-z20c443b.js:207313-207368 file-local
/**
 * 旧式前缀规则 "cmd:*" 取出前缀 cmd；不是则 null。
 */
function permissionRuleExtractPrefix(permissionRule) {
  return permissionRule.match(/^(.+):\*$/)?.[1] ?? null;
}
//@ chunk-z20c443b.js:207368-207530 file-local
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
//@ chunk-z20c443b.js:207530-207661 layout
/**
 * Shell 规则是否以未转义的 * 结尾（统计结尾 * 之前反斜杠个数的奇偶）。
 */
function endsWithUnescapedStar(pattern) {
  let trimmed = pattern.trimEnd();
  if (!trimmed.endsWith("*")) return false;
  let backslashCount = 0;
  let j = trimmed.length - 2;
  while (j >= 0 && trimmed[j] === "\\") {
    backslashCount++;
    j--;
  }
  return backslashCount % 2 === 0;
}
//@ chunk-z20c443b.js:207661-208301 fingerprint (2.1.88 match: matchWildcardPattern, 0.584)
/**
 * Shell 规则通配匹配：\* 与 \\ 为字面量，/**\/ 匹配零或多级目录，* 匹配任意字符（含换行，s 标志）；"cmd *" 只有一个 * 时尾部参数可省略；含 NUL 的模式拒绝；可选忽略大小写、折叠空白。
 */
function matchWildcardPattern(pattern, command, caseInsensitive = false, collapseWhitespace = false) {
  if (pattern.includes("\x00")) return false;
  let trimmedPattern = pattern.trim();
  let trimmedPattern_2 = collapseWhitespace ? trimmedPattern.replace(/[ \t]+/g, " ") : trimmedPattern;
  let input = collapseWhitespace ? command.replace(/[ \t]+/g, " ") : command;
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
  return new RegExp(`^${regexPattern}$`, flags).test(input);
}
//@ chunk-z20c443b.js:208301-208591 placement
function ruleTextParts(rule) {
  let parts =
    rule.type === "wildcard"
      ? (rule.pattern.trim().match(/(?:\\[*\\]|[^*])+|\*/g) ?? [])
      : [rule.type === "prefix" ? rule.prefix : rule.command];
  return parts.flatMap((part, index) =>
    part === "*"
      ? []
      : {
          text: part.replace(/\\([*\\])/g, "$1").trim(),
          atWordStart: index === 0 || /^[ \t]/.test(part),
          atWordEnd: index === parts.length - 1 || /[ \t]$/.test(part),
        },
  );
}
//@ chunk-z20c443b.js:208591-208876 placement
function partsAppearInOrder(parts, text) {
  let from = 0;
  for (let { text: text_2, atWordStart, atWordEnd } of parts) {
    let index = text.indexOf(text_2, from);
    while (
      index !== -1 &&
      ((atWordStart && /(?:\w|(?:^|[^& ]|(?:^|[^&]) )-)$/.test(text.slice(Math.max(0, index - 3), index))) ||
        (atWordEnd && /[\w-]/.test(text[index + text_2.length] ?? "")))
    )
      index = text.indexOf(text_2, index + 1);
    if (index === -1) return false;
    from = index + text_2.length;
  }
  return parts.length > 0;
}
//@ chunk-z20c443b.js:208876-209231 placement
/**
 * 展开 `$'…'` 形式的 ANSI-C 转义。
 */
function expandEscapes(text) {
  let index = text.indexOf("$'");
  if (index === -1) return text;
  return (
    text.slice(0, index) +
    text
      .slice(index)
      .replaceAll("$'", "'")
      .replace(
        /\\(?:x\{([0-9a-fA-F]+)\}?|x([0-9a-fA-F]{1,2})|u([0-9a-fA-F]{1,4})|U([0-9a-fA-F]{1,8})|([0-7]{1,3}))/g,
        (match, xBraced, xHex, uHex, UHex, octal) => {
          let codePoint =
            octal !== undefined
              ? parseInt(octal, 8) & 255
              : parseInt(xBraced?.slice(-2) ?? xHex ?? uHex ?? UHex ?? "", 16);
          return codePoint <= 1114111 ? String.fromCodePoint(codePoint) : match;
        },
      )
  );
}
//@ chunk-z20c443b.js:209231-209277 placement
function stripQuotes(text) {
  return text.replace(/['"\\]/g, "");
}
//@ chunk-z20c443b.js:209277-209643 placement
/**
 * 生成命令匹配器：对通配/前缀规则的文本做多种转义形式比对；PowerShellTool 使用。
 */
function makeTextRuleMatcher(command) {
  let mapped = [(identity) => identity, stripQuotes, (text) => stripQuotes(expandEscapes(text))]
    .map((normalize) => (text) => normalize(text).replace(/[ \t]+/g, " "))
    .map((normalize) => ({
      form: normalize,
      texts: [command, command.replaceAll("\\\n", "")].map(normalize),
    }));
  return (rule) => {
    let parts = ruleTextParts(rule);
    if (!parts.some((part) => /[\p{L}\p{N}]/u.test(part.text))) return false;
    return mapped.some(({ form, texts }) => {
      let parts_2 = parts
        .map((part) => ({
          ...part,
          text: form(part.text),
        }))
        .filter((part) => part.text !== "");
      return texts.some((text) => partsAppearInOrder(parts_2, text));
    });
  };
}
export {
  hasWildcards,
  matchWildcardPattern,
  endsWithUnescapedStar,
  permissionRuleExtractPrefix,
  makeTextRuleMatcher,
};
