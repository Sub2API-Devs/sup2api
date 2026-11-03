/**
 * components/PromptInput/spellcheck.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */

/**
 * 拼写检查分词与过滤用的正则：单词、代码段、首尾标点、前导引号、类代码字符/前缀、CJK 等脚本。错归（PromptInput 拼写检查）。
 */
//@ chunk-18hwfzwa.js:871872-872399 placement
var WORD_RE = /\p{L}[\p{L}\p{M}]*(?:['\u2019][\p{L}\p{M}]+)*/gu,
  CODE_SPAN_RE = /(``+)[\s\S]*?(?:\1|$)|`[^`\n]*(?:`|\n|$)/g,
  EDGE_PUNCT_CLASS = String.raw`[\s.,;:!?"'\u2018\u2019\u201c\u201d\u00ab\u00bb()[\]{}<>\u2014\u2013\u2026*_~-]`,
  EDGE_PUNCT_RE = new RegExp(`^${EDGE_PUNCT_CLASS}+|${EDGE_PUNCT_CLASS}+$`, "gu"),
  LEADING_QUOTE_RE = /^["'\u2018\u2019\u201c\u201d\u00ab\u00bb([{*_~]+/u,
  CODE_LIKE_CHAR_RE = /[0-9_/\\@#=<>{}[\]()|~^$%*+:;`]|\.\p{L}/u,
  CODE_LIKE_PREFIX_RE = /^(?:-|\.\p{L}|<\/?\p{L}[^<>]*>)/u,
  CJK_SCRIPT_RE =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
/**
 * 拼写检查：找出输入文本中可检查的单词位置（跳过代码段、CJK、类代码 token、大小写混合词）。错归（PromptInput 拼写检查），旧版名 findBtwTriggerPositions 为错配。
 */
//@ chunk-18hwfzwa.js:872399-873043 placement = findBtwTriggerPositions (1)
function findSpellcheckWordPositions(text) {
  let x = [];
  for (let Be of text.matchAll(CODE_SPAN_RE)) x.push({ start: Be.index, end: Be.index + Be[0].length });
  let D = [],
    L = -1,
    ee = -1,
    ke = !1,
    Re = 0;
  for (let Be of text.matchAll(WORD_RE)) {
    let He = Be[0],
      index = Be.index,
      ze = index + He.length;
    while (Re < x.length && x[Re].end <= index) Re++;
    if (Re < x.length && x[Re].start < ze) continue;
    if (He.length < 2 || He.length > 64) continue;
    if (He.slice(1) !== He.slice(1).toLowerCase()) continue;
    if (CJK_SCRIPT_RE.test(He)) continue;
    if (index >= ee) {
      L = index;
      while (L > 0 && !/\s/.test(text[L - 1])) L--;
      ee = ze;
      while (ee < text.length && !/\s/.test(text[ee])) ee++;
      let sliced = text.slice(L, ee);
      ke =
        !CODE_LIKE_PREFIX_RE.test(sliced.replace(LEADING_QUOTE_RE, "")) &&
        !CODE_LIKE_CHAR_RE.test(sliced.replace(EDGE_PUNCT_RE, ""));
    }
    if (!ke) continue;
    D.push({ word: He, start: index, end: ze });
  }
  return D;
}

export { findSpellcheckWordPositions };
