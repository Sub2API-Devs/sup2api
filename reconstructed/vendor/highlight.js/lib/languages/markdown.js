/**
 * highlight.js/lib/languages/markdown.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:275687-277786 cjs-fingerprint
var zr = x(function (QE, $r) {
  function up(e) {
    let regex = e.regex,
      n = { begin: /<\/?[A-Za-z_]/, end: ">", subLanguage: "xml", relevance: 0 },
      a = { begin: "^[-\\*]{3,}", end: "$" },
      s = {
        className: "code",
        variants: [
          { begin: "(`{3,})[^`](.|\\n)*?\\1`*[ ]*" },
          { begin: "(~{3,})[^~](.|\\n)*?\\1~*[ ]*" },
          { begin: "```", end: "```+[ ]*$" },
          { begin: "~~~", end: "~~~+[ ]*$" },
          { begin: "`.+?`" },
          { begin: "(?=^( {4}|\\t))", contains: [{ begin: "^( {4}|\\t)", end: "(\\n)$" }], relevance: 0 },
        ],
      },
      o = { className: "bullet", begin: "^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)", end: "\\s+", excludeEnd: !0 },
      r = {
        begin: /^\[[^\n]+\]:/,
        returnBegin: !0,
        contains: [
          { className: "symbol", begin: /\[/, end: /\]/, excludeBegin: !0, excludeEnd: !0 },
          { className: "link", begin: /:\s*/, end: /$/, excludeBegin: !0 },
        ],
      },
      i = /[A-Za-z][A-Za-z0-9+.-]*/,
      c = {
        variants: [
          { begin: /\[.+?\]\[.*?\]/, relevance: 0 },
          { begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/, relevance: 2 },
          { begin: regex.concat(/\[.+?\]\(/, i, /:\/\/.*?\)/), relevance: 2 },
          { begin: /\[.+?\]\([./?&#].*?\)/, relevance: 1 },
          { begin: /\[.*?\]\(.*?\)/, relevance: 0 },
        ],
        returnBegin: !0,
        contains: [
          { match: /\[(?=\])/ },
          { className: "string", relevance: 0, begin: "\\[", end: "\\]", excludeBegin: !0, returnEnd: !0 },
          { className: "link", relevance: 0, begin: "\\]\\(", end: "\\)", excludeBegin: !0, excludeEnd: !0 },
          {
            className: "symbol",
            relevance: 0,
            begin: "\\]\\[",
            end: "\\]",
            excludeBegin: !0,
            excludeEnd: !0,
          },
        ],
      },
      l = {
        className: "strong",
        contains: [],
        variants: [
          { begin: /_{2}(?!\s)/, end: /_{2}/ },
          { begin: /\*{2}(?!\s)/, end: /\*{2}/ },
        ],
      },
      d = {
        className: "emphasis",
        contains: [],
        variants: [
          { begin: /\*(?![*\s])/, end: /\*/ },
          { begin: /_(?![_\s])/, end: /_/, relevance: 0 },
        ],
      },
      inherit = e.inherit(l, { contains: [] }),
      inherit_2 = e.inherit(d, { contains: [] });
    (l.contains.push(inherit_2), d.contains.push(inherit));
    let _ = [n, c];
    return (
      [l, d, inherit, inherit_2].forEach((f) => {
        f.contains = f.contains.concat(_);
      }),
      (_ = _.concat(l, d)),
      {
        name: "Markdown",
        aliases: ["md", "mkdown", "mkd"],
        contains: [
          {
            className: "section",
            variants: [
              { begin: "^#{1,6}", end: "$", contains: _ },
              {
                begin: "(?=^.+?\\n[=-]{2,}$)",
                contains: [{ begin: "^[=-]*$" }, { begin: "^", end: "\\n", contains: _ }],
              },
            ],
          },
          n,
          o,
          l,
          d,
          { className: "quote", begin: "^>\\s+", contains: _, end: "$" },
          s,
          a,
          c,
          r,
          { scope: "literal", match: /&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/ },
        ],
      }
    );
  }
  $r.exports = up;
});

export { zr };
