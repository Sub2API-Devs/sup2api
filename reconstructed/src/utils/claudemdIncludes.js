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
import { me, oe, He } from "../services/homeSeed/workingFiles.js";

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
var UNVETTABLE = { vettable: !1 };
//@ chunk-axmbhcjg.js:5638-5934 placement
function collectAtReferenceSpellings(e, n) {
  let r = lexMarkdown(n),
    i = [
      ...uniq(uniq([n, e]).flatMap((u) => [u, u.replace(/\\([[\]])/g, "$1")])).map((u) =>
        scanAtReferences(u, "as_loader"),
      ),
      ...extractIncludePathsFromTokens(r).map((u) => scanAtReferences(u, "every_at")),
    ],
    s = uniq([...extractIncludePathsFromTokens_2(r), ...i.flatMap((u) => (u.vettable ? u.spellings : []))]);
  return i.every((u) => u.vettable) && s.length <= Sn ? { vettable: !0, spellings: s } : UNVETTABLE;
}
//@ chunk-axmbhcjg.js:5934-6215 placement = extractIncludePathsFromTokens (0.968)
function extractIncludePathsFromTokens(e) {
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
  return n(e);
}
//@ chunk-axmbhcjg.js:6215-6374 placement
var MAX_AT_RUN_LENGTH = 4096,
  yn = 64,
  Sn = 4096,
  _n = 1048576,
  kn = /@(?!@)(?=[^\s\\]|\\ )/g,
  regExp = new RegExp(String.raw`(?:[^\s\\]|\\ ){1,${MAX_AT_RUN_LENGTH + 1}}`, "y"),
  Re = /[\p{L}\p{N}]/u,
  wn = /[*_[\]!<`]/g;
//@ chunk-axmbhcjg.js:6374-6840 placement
function scanAtReferences(e, n) {
  let r = [],
    o = 0,
    regExp_2 = new RegExp(regExp);
  for (let s of e.matchAll(kn)) {
    if (n === "as_loader" && (Re.test(e[s.index - 1] ?? "") || isBackslashEscaped(e, s.index))) continue;
    regExp_2.lastIndex = s.index + 1;
    let u = regExp_2.exec(e)?.[0] ?? "";
    if (((o += u.length), u.length > MAX_AT_RUN_LENGTH || o > _n)) return UNVETTABLE;
    let d = Rn(u);
    if (d.length > yn) return UNVETTABLE;
    r.push({ run: u, closers: d });
  }
  return {
    vettable: !0,
    spellings: r.flatMap(({ run: run, closers: closers }) =>
      uniq([run, ...closers.map((d) => run.slice(0, d))]).flatMap((d) => {
        let f = me(d);
        return f === "" || f.startsWith("@") ? [] : [f];
      }),
    ),
  };
}
//@ chunk-axmbhcjg.js:6840-6932 placement
function Rn(e) {
  return [...e.matchAll(wn)].filter((n) => n.index > 0 && !vn(e, n)).map((n) => n.index);
}
//@ chunk-axmbhcjg.js:6932-7021 placement
function vn(e, n) {
  return n[0] === "_" && Re.test(e[n.index - 1] ?? "") && Re.test(e[n.index + 1] ?? "");
}
//@ chunk-axmbhcjg.js:7021-7071 placement
function hasUnvettedInclude(e, n = oe) {
  return extractIncludePathsFromText(e).some((r) => !n(r));
}
//@ chunk-axmbhcjg.js:7071-7104 placement
function extractIncludePathsFromText(e) {
  return extractIncludePathsFromTokens_2(lexMarkdown(e));
}
//@ chunk-axmbhcjg.js:7104-7431 placement = extractIncludePathsFromTokens (0.968)
function extractIncludePathsFromTokens_2(e) {
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
  return n(e);
}
//@ chunk-axmbhcjg.js:7431-7659 placement
function matchIncludePathsInText(e) {
  return [...e.matchAll(He)].flatMap((n) => {
    let r = me(n[2] ?? "");
    return r.startsWith("./") ||
      r.startsWith("~/") ||
      (r.startsWith("/") && r !== "/") ||
      (!r.startsWith("@") && !/^[#%^&*()]+/.test(r) && /^[a-zA-Z0-9._-]/.test(r))
      ? [r]
      : [];
  });
}
//@ chunk-axmbhcjg.js:7659-7818 placement
function endsInsideOpenBlock(e) {
  let last = lexMarkdown(`${e}

<!-- ccr-home-probe -->
`).findLast((i) => i.type !== "space");
  return !(last?.type === "html" && last.raw.trim() === "<!-- ccr-home-probe -->");
}
//@ chunk-axmbhcjg.js:7818-7886 placement
function mt(e) {
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
  mt,
  extractIncludePathsFromText,
};
