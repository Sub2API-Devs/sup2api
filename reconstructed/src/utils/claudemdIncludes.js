/**
 * utils/claudemdIncludes.ts
 *
 * 2.1.316 新增：CLAUDE.md include 处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axmbhcjg.js (15)
 * attribution: placement 15
 */
import { lexMarkdown } from "./claudemd.js";
import { uniq } from "./collections.js";
import { referenceSpelling, allowAllIncludes, AT_REFERENCE_RE } from "../services/homeSeed/workingFiles.js";

//@ chunk-axmbhcjg.js:5490-5551 placement
function escapeAtSigns(e) {
  return e.replace(/@/g, (n, r) => (isBackslashEscaped(e, r) ? n : "\\@"));
}
//@ chunk-axmbhcjg.js:5551-5617 placement
function isBackslashEscaped(e, n) {
  let r = 0;
  while (e[n - 1 - r] === "\\") r++;
  return r % 2 === 1;
}
//@ chunk-axmbhcjg.js:5617-5638 placement
var UNVETTABLE = {
  vettable: false,
};
//@ chunk-axmbhcjg.js:5638-5934 placement
function collectAtReferenceSpellings(e, n) {
  let r = lexMarkdown(n);
  let i = [
    ...uniq(uniq([n, e]).flatMap((u) => [u, u.replace(/\\([[\]])/g, "$1")])).map((u) =>
      scanAtReferences(u, "as_loader"),
    ),
    ...extractIncludePathsFromTokens(r).map((u) => scanAtReferences(u, "every_at")),
  ];
  let s = uniq([...extractIncludePathsFromTokens_2(r), ...i.flatMap((u) => (u.vettable ? u.spellings : []))]);
  return i.every((u) => u.vettable) && s.length <= MAX_VETTABLE_TEXT_CHARS
    ? {
        vettable: true,
        spellings: s,
      }
    : UNVETTABLE;
}
//@ chunk-axmbhcjg.js:5934-6215 placement = extractIncludePathsFromTokens (0.968)
function extractIncludePathsFromTokens(textContent) {
  let n = (textContent) =>
    textContent.flatMap((elements) => {
      if (elements.type === "code" || elements.type === "codespan") return [];
      if (elements.type === "html") {
        let trimmed = elements.raw.trimStart();
        return trimmed.startsWith("<!--") && trimmed.includes("-->")
          ? [elements.raw.replace(/<!--[\s\S]*?-->/g, "")]
          : [];
      }
      return n([...(elements.tokens ?? []), ...(elements.items ?? [])]);
    });
  return n(textContent);
}
//@ chunk-axmbhcjg.js:6215-6374 placement
/**
 * 可校验的 @ 引用数量上限（64）。
 */
var MAX_AT_RUN_LENGTH = 4096;
var MAX_VETTED_REFERENCES = 64;
var MAX_VETTABLE_TEXT_CHARS = 4096;
var MAX_TOTAL_AT_RUN_CHARS = 1048576;
var AT_SIGN_RE = /@(?!@)(?=[^\s\\]|\\ )/g;
var regExp = new RegExp(String.raw`(?:[^\s\\]|\\ ){1,${MAX_AT_RUN_LENGTH + 1}}`, "y");
var WORD_CHAR_CLASS_RE = /[\p{L}\p{N}]/u;
var UNDERSCORE_AT_RE = /[*_[\]!<`]/g;
//@ chunk-axmbhcjg.js:6374-6840 placement
function scanAtReferences(e, n) {
  let r = [];
  let o = 0;
  let regExp_2 = new RegExp(regExp);
  for (let s of e.matchAll(AT_SIGN_RE)) {
    if (
      n === "as_loader" &&
      (WORD_CHAR_CLASS_RE.test(e[s.index - 1] ?? "") || isBackslashEscaped(e, s.index))
    )
      continue;
    regExp_2.lastIndex = s.index + 1;
    let u = regExp_2.exec(e)?.[0] ?? "";
    o += u.length;
    if (u.length > MAX_AT_RUN_LENGTH || o > MAX_TOTAL_AT_RUN_CHARS) return UNVETTABLE;
    let atReferenceIndexes = collectAtReferenceIndexes(u);
    if (atReferenceIndexes.length > MAX_VETTED_REFERENCES) return UNVETTABLE;
    r.push({
      run: u,
      closers: atReferenceIndexes,
    });
  }
  return {
    vettable: true,
    spellings: r.flatMap(({ run, closers }) =>
      uniq([run, ...closers.map((closer) => run.slice(0, closer))]).flatMap((d) => {
        let f = referenceSpelling(d);
        return f === "" || f.startsWith("@") ? [] : [f];
      }),
    ),
  };
}
//@ chunk-axmbhcjg.js:6840-6932 placement
/**
 * 收集文档里所有有效 @ 引用的位置。
 */
function collectAtReferenceIndexes(e) {
  return [...e.matchAll(UNDERSCORE_AT_RE)]
    .filter((n) => n.index > 0 && !isUnderscoreBoundary(e, n))
    .map((n) => n.index);
}
//@ chunk-axmbhcjg.js:6932-7021 placement
/**
 * 判断 @ 两侧都是词字符（属于标识符而不是引用）。
 */
function isUnderscoreBoundary(e, n) {
  return (
    n[0] === "_" &&
    WORD_CHAR_CLASS_RE.test(e[n.index - 1] ?? "") &&
    WORD_CHAR_CLASS_RE.test(e[n.index + 1] ?? "")
  );
}
//@ chunk-axmbhcjg.js:7021-7071 placement
function hasUnvettedInclude(e, n = allowAllIncludes) {
  return extractIncludePathsFromText(e).some((r) => !n(r));
}
//@ chunk-axmbhcjg.js:7071-7104 placement
function extractIncludePathsFromText(e) {
  return extractIncludePathsFromTokens_2(lexMarkdown(e));
}
//@ chunk-axmbhcjg.js:7104-7431 placement = extractIncludePathsFromTokens (0.968)
function extractIncludePathsFromTokens_2(textContent) {
  let n = (textContent) =>
    textContent.flatMap((elements) => {
      if (elements.type === "code" || elements.type === "codespan") return [];
      if (elements.type === "html") {
        let trimmed = elements.raw.trimStart();
        return trimmed.startsWith("<!--") && trimmed.includes("-->")
          ? matchIncludePathsInText(elements.raw.replace(/<!--[\s\S]*?-->/g, ""))
          : [];
      }
      return [
        ...(elements.type === "text" ? matchIncludePathsInText(elements.text ?? elements.raw) : []),
        ...n([...(elements.tokens ?? []), ...(elements.items ?? [])]),
      ];
    });
  return n(textContent);
}
//@ chunk-axmbhcjg.js:7431-7659 placement
function matchIncludePathsInText(e) {
  return [...e.matchAll(AT_REFERENCE_RE)].flatMap((n) => {
    let r = referenceSpelling(n[2] ?? "");
    return r.startsWith("./") ||
      r.startsWith("~/") ||
      (r.startsWith("/") && r !== "/") ||
      (!r.startsWith("@") && !/^[#%^&*()]+/.test(r) && /^[a-zA-Z0-9._-]/.test(r))
      ? [r]
      : [];
  });
}
//@ chunk-axmbhcjg.js:7659-7818 placement
function endsInsideOpenBlock(body) {
  let last = lexMarkdown(`${body}

<!-- ccr-home-probe -->
`).findLast((i) => i.type !== "space");
  return !(last?.type === "html" && last.raw.trim() === "<!-- ccr-home-probe -->");
}
//@ chunk-axmbhcjg.js:7818-7886 placement
/**
 * 生成“内联导入”的注释标记文本。
 */
function inlinedImportMarker(e) {
  return `

<!-- inlined import: ${encodeURI(e)} -->

`;
}
export {
  hasUnvettedInclude,
  escapeAtSigns,
  isBackslashEscaped,
  collectAtReferenceSpellings,
  endsInsideOpenBlock,
  inlinedImportMarker,
  extractIncludePathsFromText,
};
