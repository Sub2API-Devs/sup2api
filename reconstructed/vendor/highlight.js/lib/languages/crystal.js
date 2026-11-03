/**
 * highlight.js/lib/languages/crystal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:88643-92608 cjs-fingerprint
var un = x(function (Fu, _n) {
  function hl(e) {
    let r = {
        $pattern: "[a-zA-Z_]\\w*[!?=]?",
        keyword:
          "abstract alias annotation as as? asm begin break case class def do else elsif end ensure enum extend for fun if include instance_sizeof is_a? lib macro module next nil? of out pointerof private protected rescue responds_to? return require select self sizeof struct super then type typeof union uninitialized unless until verbatim when while with yield __DIR__ __END_LINE__ __FILE__ __LINE__",
        literal: "false nil true",
      },
      i = { className: "subst", begin: /#\{/, end: /\}/, keywords: r },
      c = { className: "variable", begin: "(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])(?![A-Za-z])(?![@$?'])" },
      l = {
        className: "template-variable",
        variants: [
          { begin: "\\{\\{", end: "\\}\\}" },
          { begin: "\\{%", end: "%\\}" },
        ],
        keywords: r,
      };
    function d(f, O) {
      let S = [{ begin: f, end: O }];
      return ((S[0].contains = S), S);
    }
    let m = {
        className: "string",
        contains: [e.BACKSLASH_ESCAPE, i],
        variants: [
          { begin: /'/, end: /'/ },
          { begin: /"/, end: /"/ },
          { begin: /`/, end: /`/ },
          { begin: "%[Qwi]?\\(", end: "\\)", contains: d("\\(", "\\)") },
          { begin: "%[Qwi]?\\[", end: "\\]", contains: d("\\[", "\\]") },
          { begin: "%[Qwi]?\\{", end: /\}/, contains: d(/\{/, /\}/) },
          { begin: "%[Qwi]?<", end: ">", contains: d("<", ">") },
          { begin: "%[Qwi]?\\|", end: "\\|" },
          { begin: /<<-\w+$/, end: /^\s*\w+$/ },
        ],
        relevance: 0,
      },
      p = {
        className: "string",
        variants: [
          { begin: "%q\\(", end: "\\)", contains: d("\\(", "\\)") },
          { begin: "%q\\[", end: "\\]", contains: d("\\[", "\\]") },
          { begin: "%q\\{", end: /\}/, contains: d(/\{/, /\}/) },
          { begin: "%q<", end: ">", contains: d("<", ">") },
          { begin: "%q\\|", end: "\\|" },
          { begin: /<<-'\w+'$/, end: /^\s*\w+$/ },
        ],
        relevance: 0,
      },
      _ = {
        begin: "(?!%\\})(" + e.RE_STARTERS_RE + "|\\n|\\b(case|if|select|unless|until|when|while)\\b)\\s*",
        keywords: "case if select unless until when while",
        contains: [
          {
            className: "regexp",
            contains: [e.BACKSLASH_ESCAPE, i],
            variants: [
              { begin: "//[a-z]*", relevance: 0 },
              { begin: "/(?!\\/)", end: "/[a-z]*" },
            ],
          },
        ],
        relevance: 0,
      },
      E = {
        className: "regexp",
        contains: [e.BACKSLASH_ESCAPE, i],
        variants: [
          { begin: "%r\\(", end: "\\)", contains: d("\\(", "\\)") },
          { begin: "%r\\[", end: "\\]", contains: d("\\[", "\\]") },
          { begin: "%r\\{", end: /\}/, contains: d(/\{/, /\}/) },
          { begin: "%r<", end: ">", contains: d("<", ">") },
          { begin: "%r\\|", end: "\\|" },
        ],
        relevance: 0,
      },
      u = {
        className: "meta",
        begin: "@\\[",
        end: "\\]",
        contains: [e.inherit(e.QUOTE_STRING_MODE, { className: "string" })],
      },
      b = [
        l,
        m,
        p,
        E,
        _,
        u,
        c,
        e.HASH_COMMENT_MODE,
        {
          className: "class",
          beginKeywords: "class module struct",
          end: "$|;",
          illegal: /=/,
          contains: [
            e.HASH_COMMENT_MODE,
            e.inherit(e.TITLE_MODE, { begin: "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?" }),
            { begin: "<" },
          ],
        },
        {
          className: "class",
          beginKeywords: "lib enum union",
          end: "$|;",
          illegal: /=/,
          contains: [
            e.HASH_COMMENT_MODE,
            e.inherit(e.TITLE_MODE, { begin: "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?" }),
          ],
        },
        {
          beginKeywords: "annotation",
          end: "$|;",
          illegal: /=/,
          contains: [
            e.HASH_COMMENT_MODE,
            e.inherit(e.TITLE_MODE, { begin: "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?" }),
          ],
          relevance: 2,
        },
        {
          className: "function",
          beginKeywords: "def",
          end: /\B\b/,
          contains: [
            e.inherit(e.TITLE_MODE, {
              begin:
                "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|[=!]~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~|]|//|//=|&[-+*]=?|&\\*\\*|\\[\\][=?]?",
              endsParent: !0,
            }),
          ],
        },
        {
          className: "function",
          beginKeywords: "fun macro",
          end: /\B\b/,
          contains: [
            e.inherit(e.TITLE_MODE, {
              begin:
                "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|[=!]~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~|]|//|//=|&[-+*]=?|&\\*\\*|\\[\\][=?]?",
              endsParent: !0,
            }),
          ],
          relevance: 2,
        },
        { className: "symbol", begin: e.UNDERSCORE_IDENT_RE + "(!|\\?)?:", relevance: 0 },
        {
          className: "symbol",
          begin: ":",
          contains: [
            m,
            {
              begin:
                "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|[=!]~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~|]|//|//=|&[-+*]=?|&\\*\\*|\\[\\][=?]?",
            },
          ],
          relevance: 0,
        },
        {
          className: "number",
          variants: [
            { begin: "\\b0b([01_]+)(_?[ui](8|16|32|64|128))?" },
            { begin: "\\b0o([0-7_]+)(_?[ui](8|16|32|64|128))?" },
            { begin: "\\b0x([A-Fa-f0-9_]+)(_?[ui](8|16|32|64|128))?" },
            {
              begin: "\\b([1-9][0-9_]*[0-9]|[0-9])(\\.[0-9][0-9_]*)?([eE]_?[-+]?[0-9_]*)?(_?f(32|64))?(?!_)",
            },
            { begin: "\\b([1-9][0-9_]*|0)(_?[ui](8|16|32|64|128))?" },
          ],
          relevance: 0,
        },
      ];
    return (
      (i.contains = b),
      (l.contains = b.slice(1)),
      { name: "Crystal", aliases: ["cr"], keywords: r, contains: b }
    );
  }
  _n.exports = hl;
});

export { un };
