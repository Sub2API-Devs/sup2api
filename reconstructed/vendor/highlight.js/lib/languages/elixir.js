/**
 * highlight.js/lib/languages/elixir.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:126377-128976 cjs-fingerprint
var Vn = x(function (nE, Kn) {
  function jl(e) {
    let regex = e.regex,
      n = "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?",
      a = "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?",
      r = {
        $pattern: "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?",
        keyword: [
          "after",
          "alias",
          "and",
          "case",
          "catch",
          "cond",
          "defstruct",
          "defguard",
          "do",
          "else",
          "end",
          "fn",
          "for",
          "if",
          "import",
          "in",
          "not",
          "or",
          "quote",
          "raise",
          "receive",
          "require",
          "reraise",
          "rescue",
          "try",
          "unless",
          "unquote",
          "unquote_splicing",
          "use",
          "when",
          "with|0",
        ],
        literal: ["false", "nil", "true"],
      },
      i = { className: "subst", begin: /#\{/, end: /\}/, keywords: r },
      c = {
        className: "number",
        begin:
          "(\\b0o[0-7_]+)|(\\b0b[01_]+)|(\\b0x[0-9a-fA-F_]+)|(-?\\b[0-9][0-9_]*(\\.[0-9_]+([eE][-+]?[0-9]+)?)?)",
        relevance: 0,
      },
      d = { match: /\\[\s\S]/, scope: "char.escape", relevance: 0 },
      m = `[/|([{<"']`,
      p = [
        { begin: /"/, end: /"/ },
        { begin: /'/, end: /'/ },
        { begin: /\//, end: /\// },
        { begin: /\|/, end: /\|/ },
        { begin: /\(/, end: /\)/ },
        { begin: /\[/, end: /\]/ },
        { begin: /\{/, end: /\}/ },
        { begin: /</, end: />/ },
      ],
      _ = (A) => ({ scope: "char.escape", begin: regex.concat(/\\/, A), relevance: 0 }),
      E = {
        className: "string",
        begin: `~[a-z](?=[/|([{<"'])`,
        contains: p.map((A) => e.inherit(A, { contains: [_(A.end), d, i] })),
      },
      u = {
        className: "string",
        begin: `~[A-Z](?=[/|([{<"'])`,
        contains: p.map((A) => e.inherit(A, { contains: [_(A.end)] })),
      },
      b = {
        className: "regex",
        variants: [
          {
            begin: `~r(?=[/|([{<"'])`,
            contains: p.map((A) =>
              e.inherit(A, { end: regex.concat(A.end, /[uismxfU]{0,7}/), contains: [_(A.end), d, i] }),
            ),
          },
          {
            begin: `~R(?=[/|([{<"'])`,
            contains: p.map((A) =>
              e.inherit(A, { end: regex.concat(A.end, /[uismxfU]{0,7}/), contains: [_(A.end)] }),
            ),
          },
        ],
      },
      f = {
        className: "string",
        contains: [e.BACKSLASH_ESCAPE, i],
        variants: [
          { begin: /"""/, end: /"""/ },
          { begin: /'''/, end: /'''/ },
          { begin: /~S"""/, end: /"""/, contains: [] },
          { begin: /~S"/, end: /"/, contains: [] },
          { begin: /~S'''/, end: /'''/, contains: [] },
          { begin: /~S'/, end: /'/, contains: [] },
          { begin: /'/, end: /'/ },
          { begin: /"/, end: /"/ },
        ],
      },
      O = {
        className: "function",
        beginKeywords: "def defp defmacro defmacrop",
        end: /\B\b/,
        contains: [e.inherit(e.TITLE_MODE, { begin: "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?", endsParent: !0 })],
      },
      inherit = e.inherit(O, {
        className: "class",
        beginKeywords: "defimpl defmodule defprotocol defrecord",
        end: /\bdo\b|$|;/,
      }),
      N = [
        f,
        b,
        u,
        E,
        e.HASH_COMMENT_MODE,
        inherit,
        O,
        { begin: "::" },
        {
          className: "symbol",
          begin: ":(?![\\s:])",
          contains: [
            f,
            { begin: "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?" },
          ],
          relevance: 0,
        },
        { className: "symbol", begin: "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?:(?!:)", relevance: 0 },
        { className: "title.class", begin: /(\b[A-Z][a-zA-Z0-9_]+)/, relevance: 0 },
        c,
        { className: "variable", begin: "(\\$\\W)|((\\$|@@?)(\\w+))" },
      ];
    return ((i.contains = N), { name: "Elixir", aliases: ["ex", "exs"], keywords: r, contains: N });
  }
  Kn.exports = jl;
});

export { Vn };
