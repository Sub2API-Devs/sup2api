/**
 * utils/claudemdIncludes.ts
 *
 * 2.1.316 新增：CLAUDE.md include 处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vb7ng9fr.js (15)
 * attribution: placement 15
 */
import { lexMarkdown } from "./claudemd.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { referenceSpelling, allowAllIncludes, AT_REFERENCE_RE } from "../services/homeSeed/workingFiles.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vb7ng9fr.js:5524-5585 placement
function escapeAtSigns(text) {
  return text.replace(/@/g, (matchText, offset) => (isBackslashEscaped(text, offset) ? matchText : "\\@"));
}
//@ chunk-vb7ng9fr.js:5585-5651 placement
function isBackslashEscaped(text, index) {
  let backslashes = 0;
  while (text[index - 1 - backslashes] === "\\") backslashes++;
  return backslashes % 2 === 1;
}
//@ chunk-vb7ng9fr.js:5651-5672 placement
var UNVETTABLE = {
  vettable: false,
};
//@ chunk-vb7ng9fr.js:5672-5968 placement
function collectAtReferenceSpellings(filePath, text) {
  let tokens = lexMarkdown(text);
  let scans = [
    ...normalizeCaseForComparison_2(
      normalizeCaseForComparison_2([text, filePath]).flatMap((candidate) => [
        candidate,
        candidate.replace(/\\([[\]])/g, "$1"),
      ]),
    ).map((candidate) => scanAtReferences(candidate, "as_loader")),
    ...extractIncludePathsFromTokens(tokens).map((includePath) => scanAtReferences(includePath, "every_at")),
  ];
  let spellings = normalizeCaseForComparison_2([
    ...extractIncludePathsFromTokens_2(tokens),
    ...scans.flatMap((scan) => (scan.vettable ? scan.spellings : [])),
  ]);
  return scans.every((scan) => scan.vettable) && spellings.length <= MAX_VETTABLE_TEXT_CHARS
    ? {
        vettable: true,
        spellings,
      }
    : UNVETTABLE;
}
//@ chunk-vb7ng9fr.js:5968-6249 placement (2.1.88 match: extractIncludePathsFromTokens, 0.968)
function extractIncludePathsFromTokens(textContent) {
  let textContent_2 = (textContent) =>
    textContent.flatMap((elements) => {
      if (elements.type === "code" || elements.type === "codespan") return [];
      if (elements.type === "html") {
        let trimmed = elements.raw.trimStart();
        return trimmed.startsWith("<!--") && trimmed.includes("-->")
          ? [elements.raw.replace(/<!--[\s\S]*?-->/g, "")]
          : [];
      }
      return textContent_2([...(elements.tokens ?? []), ...(elements.items ?? [])]);
    });
  return textContent_2(textContent);
}
//@ chunk-vb7ng9fr.js:6249-6408 placement
/**
 * 可校验的 @ 引用数量上限（64）。
 */
var MAX_AT_RUN_LENGTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_VETTED_REFERENCES;
var MAX_VETTABLE_TEXT_CHARS;
var MAX_TOTAL_AT_RUN_CHARS;
var AT_SIGN_RE;
var regExp;
var WORD_CHAR_CLASS_RE;
var UNDERSCORE_AT_RE;
deferInit("chunk-vb7ng9fr.js:6249", () => {
  MAX_AT_RUN_LENGTH = 4096;
  MAX_VETTED_REFERENCES = 64;
  MAX_VETTABLE_TEXT_CHARS = 4096;
  MAX_TOTAL_AT_RUN_CHARS = 1048576;
  AT_SIGN_RE = /@(?!@)(?=[^\s\\]|\\ )/g;
  regExp = new RegExp(String.raw`(?:[^\s\\]|\\ ){1,${MAX_AT_RUN_LENGTH + 1}}`, "y");
  WORD_CHAR_CLASS_RE = /[\p{L}\p{N}]/u;
  UNDERSCORE_AT_RE = /[*_[\]!<`]/g;
});
//@ chunk-vb7ng9fr.js:6408-6874 placement
function scanAtReferences(text, mode) {
  let references = [];
  let cursor = 0;
  let regExp_2 = new RegExp(regExp);
  for (let match of text.matchAll(AT_SIGN_RE)) {
    if (
      mode === "as_loader" &&
      (WORD_CHAR_CLASS_RE.test(text[match.index - 1] ?? "") || isBackslashEscaped(text, match.index))
    )
      continue;
    regExp_2.lastIndex = match.index + 1;
    let trailing = regExp_2.exec(text)?.[0] ?? "";
    cursor += trailing.length;
    if (trailing.length > MAX_AT_RUN_LENGTH || cursor > MAX_TOTAL_AT_RUN_CHARS) return UNVETTABLE;
    let atReferenceIndexes = collectAtReferenceIndexes(trailing);
    if (atReferenceIndexes.length > MAX_VETTED_REFERENCES) return UNVETTABLE;
    references.push({
      run: trailing,
      closers: atReferenceIndexes,
    });
  }
  return {
    vettable: true,
    spellings: references.flatMap(({ run, closers }) =>
      normalizeCaseForComparison_2([run, ...closers.map((closer) => run.slice(0, closer))]).flatMap((run) => {
        let spelling = referenceSpelling(run);
        return spelling === "" || spelling.startsWith("@") ? [] : [spelling];
      }),
    ),
  };
}
//@ chunk-vb7ng9fr.js:6874-6966 placement
/**
 * 收集文档里所有有效 @ 引用的位置。
 */
function collectAtReferenceIndexes(text) {
  return [...text.matchAll(UNDERSCORE_AT_RE)]
    .filter((match) => match.index > 0 && !isUnderscoreBoundary(text, match))
    .map((match) => match.index);
}
//@ chunk-vb7ng9fr.js:6966-7055 placement
/**
 * 判断 @ 两侧都是词字符（属于标识符而不是引用）。
 */
function isUnderscoreBoundary(text, match) {
  return (
    match[0] === "_" &&
    WORD_CHAR_CLASS_RE.test(text[match.index - 1] ?? "") &&
    WORD_CHAR_CLASS_RE.test(text[match.index + 1] ?? "")
  );
}
//@ chunk-vb7ng9fr.js:7055-7105 placement
function hasUnvettedInclude(text, isAllowed = allowAllIncludes) {
  return extractIncludePathsFromText(text).some((includePath) => !isAllowed(includePath));
}
//@ chunk-vb7ng9fr.js:7105-7138 placement
function extractIncludePathsFromText(text) {
  return extractIncludePathsFromTokens_2(lexMarkdown(text));
}
//@ chunk-vb7ng9fr.js:7138-7465 placement (2.1.88 match: extractIncludePathsFromTokens, 0.968)
function extractIncludePathsFromTokens_2(textContent) {
  let textContent_2 = (textContent) =>
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
        ...textContent_2([...(elements.tokens ?? []), ...(elements.items ?? [])]),
      ];
    });
  return textContent_2(textContent);
}
//@ chunk-vb7ng9fr.js:7465-7693 placement
function matchIncludePathsInText(text) {
  return [...text.matchAll(AT_REFERENCE_RE)].flatMap((match) => {
    let spelling = referenceSpelling(match[2] ?? "");
    return spelling.startsWith("./") ||
      spelling.startsWith("~/") ||
      (spelling.startsWith("/") && spelling !== "/") ||
      (!spelling.startsWith("@") && !/^[#%^&*()]+/.test(spelling) && /^[a-zA-Z0-9._-]/.test(spelling))
      ? [spelling]
      : [];
  });
}
//@ chunk-vb7ng9fr.js:7693-7852 placement
function endsInsideOpenBlock(body) {
  let last = lexMarkdown(`${body}

<!-- ccr-home-probe -->
`).findLast((token) => token.type !== "space");
  return !(last?.type === "html" && last.raw.trim() === "<!-- ccr-home-probe -->");
}
//@ chunk-vb7ng9fr.js:7852-7920 placement
/**
 * 生成“内联导入”的注释标记文本。
 */
function inlinedImportMarker(filePath) {
  return `

<!-- inlined import: ${encodeURI(filePath)} -->

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
