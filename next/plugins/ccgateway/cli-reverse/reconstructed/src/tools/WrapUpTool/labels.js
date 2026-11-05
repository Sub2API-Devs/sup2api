/**
 * tools/WrapUpTool/labels.ts
 *
 * Wrap up 按钮标签的校验规则与码位说明（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (3)
 * attribution: placement 3
 */
//@ chunk-fmnbrxwy.js:23564-24444 placement
/**
 * 按钮标签里不允许出现的组合附加符码位区间。
 */
var COMBINING_SCRIPT_SOURCE = String.raw`\u0334-\u0338\u1CD4\u1CE2-\u1CE8\u20D2\u20D3\u20D8-\u20DA\u20E5\u20E6\u20EA\u20EB\u{10A39}\u{16AF0}-\u{16AF4}\u{1BC9E}\u{1D167}-\u{1D169}`;
var WORD_WITH_MARKS_SOURCE = String.raw`[\p{L}\p{N}](?:(?![${COMBINING_SCRIPT_SOURCE}])[\p{Mn}\p{Mc}])*`;
var LEADING_PUNCT_SOURCE = String.raw`[.\-#'\u2018\u201C\u201E\u00AB\u00BF\u00A1\u300C\u300E]`;
var INNER_PUNCT_SOURCE = String.raw`['\u2019\-/._,:\u3001\u3002\uFF0C\uFF1A\u30FB\uFF0F\u060C]`;
var TRAILING_PUNCT_SOURCE = String.raw`[,.:?!%+/#'\u2019\u2026\u00BB\u201D\u201C\u300D\u300F\u3001\u3002\uFF0C\uFF1A\uFF01\uFF1F\uFF05\uFF0B\u060C\u061F]`;
var WORD_SOURCE = `${WORD_WITH_MARKS_SOURCE}(?:${INNER_PUNCT_SOURCE}?${WORD_WITH_MARKS_SOURCE})*`;
var BRACKETED_WORD_SOURCE = String.raw`(?:\(${WORD_SOURCE}\)|\uFF08${WORD_SOURCE}\uFF09)`;
var regExp_2 = new RegExp(
  `^(?:${LEADING_PUNCT_SOURCE}?${WORD_SOURCE}${BRACKETED_WORD_SOURCE}?|${BRACKETED_WORD_SOURCE})${TRAILING_PUNCT_SOURCE}*$`,
  "u",
);
var WORD_SEQUENCE_SOURCE = `(?:${WORD_WITH_MARKS_SOURCE}(?:${INNER_PUNCT_SOURCE}(?=${WORD_WITH_MARKS_SOURCE}))?)*`;
var regExp_3 = new RegExp(
  `^${LEADING_PUNCT_SOURCE}?(?:(?=${WORD_WITH_MARKS_SOURCE}|[(\uFF08])${WORD_SEQUENCE_SOURCE}(?:[(\uFF08]${WORD_SEQUENCE_SOURCE}[)\uFF09]?)?${TRAILING_PUNCT_SOURCE}*)?`,
  "u",
);
var regExp_4 = new RegExp(`^${INNER_PUNCT_SOURCE}$`, "u");
var BETWEEN_WORD_SIGNS = new Set(["&", "\uFF06", "-", "\u2013", "\u2014", ":", "\uFF1A"]);
var END_WORD_SIGNS = new Set(["!", "?", "\uFF01", "\uFF1F"]);
//@ chunk-fmnbrxwy.js:24444-25928 placement
/**
 * 按钮标签校验的实际规则：空、像编号列表、首尾空格、内部双空格、双冒号、括号错位、像链接、像 emoji 等逐条给出原因。
 */
function describeLabelProblem(label) {
  if (label.trim() === "") return "is empty";
  if (/^\d{1,9}\.(?: |$)/.test(label)) return "starts like a numbered list, whose number an app may not show";
  let parts = label.split(" ");
  for (let [index, word] of parts.entries()) {
    if (word === "") return "starts or ends with a blank, or holds two in a row";
    if (BETWEEN_WORD_SIGNS.has(word) || END_WORD_SIGNS.has(word)) {
      if (
        index > 0 &&
        regExp_2.test(parts[index - 1]) &&
        (index < parts.length - 1 ? BETWEEN_WORD_SIGNS : END_WORD_SIGNS).has(word)
      )
        continue;
      return `has ${describeChar(word)} on its own, which may only ${END_WORD_SIGNS.has(word) ? "end the label, right after a word" : "stand between two words"}`;
    }
    if (/www\./iu.test(word)) return "has www., which an app may draw as a link";
    if (/[:\uFF1A].*[:\uFF1A]/u.test(word))
      return "has two colons in one word, which an app may read as the name of an emoji";
    if (regExp_2.test(word)) continue;
    let prefix = regExp_3.exec(word)?.[0] ?? "";
    let list = Array.from(word.slice(prefix.length));
    let sign = list[0] !== undefined && /[\p{L}\p{N}]/u.test(list[0]) ? Array.from(prefix).at(-1) : list[0];
    if (/[()\uFF08\uFF09]/u.test(sign ?? word))
      return 'has a bracket out of place: "(" and ")" go around one word with no blank in it, as in "Yes (safer)", and only signs that may end a word follow ")"';
    if (!/[\p{L}\p{N}]/u.test(prefix))
      return `has a word that starts with ${describeChar(sign ?? word)}: start each word with a letter or digit`;
    if (!/[\p{L}\p{N}]/u.test(list.join("")))
      return `has ${describeChar(sign)} at the end of a word, where only , . : ? ! % + / # ' or a bracketed word may stand`;
    return sign !== undefined && regExp_4.test(sign)
      ? `has ${describeChar(sign)} next to another sign inside a word, where signs stand one at a time`
      : `has ${describeChar(sign)} inside a word, where only one of ' - / . _ , : may stand, between two letters or digits`;
  }
  return;
}
//@ chunk-fmnbrxwy.js:25928-26158 placement
/**
 * 把一个码位渲染成 U+XXXX 说明，可见 ASCII 直接加引号。
 */
function describeChar(char = "") {
  let codePoint = `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;
  if (/^[!#-~]$/.test(char)) return `"${char}"`;
  return /[\p{C}\p{Z}\p{M}"]/u.test(char)
    ? `${codePoint}${char === "\xA0" ? " (a no-break space)" : ""}`
    : `"${char}" (${codePoint})`;
}
export { describeLabelProblem };
