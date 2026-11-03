/**
 * highlight.js/lib/languages/monkey.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:302076-303563 cjs-fingerprint
var ri = x(function (rg, ai) {
  function Sp(e) {
    let t = { className: "number", relevance: 0, variants: [{ begin: "[$][a-fA-F0-9]+" }, e.NUMBER_MODE] },
      n = {
        variants: [{ match: [/(function|method)/, /\s+/, e.UNDERSCORE_IDENT_RE] }],
        scope: { 1: "keyword", 3: "title.function" },
      },
      a = {
        variants: [{ match: [/(class|interface|extends|implements)/, /\s+/, e.UNDERSCORE_IDENT_RE] }],
        scope: { 1: "keyword", 3: "title.class" },
      };
    return {
      name: "Monkey",
      case_insensitive: !0,
      keywords: {
        keyword: [
          "public",
          "private",
          "property",
          "continue",
          "exit",
          "extern",
          "new",
          "try",
          "catch",
          "eachin",
          "not",
          "abstract",
          "final",
          "select",
          "case",
          "default",
          "const",
          "local",
          "global",
          "field",
          "end",
          "if",
          "then",
          "else",
          "elseif",
          "endif",
          "while",
          "wend",
          "repeat",
          "until",
          "forever",
          "for",
          "to",
          "step",
          "next",
          "return",
          "module",
          "inline",
          "throw",
          "import",
          "and",
          "or",
          "shl",
          "shr",
          "mod",
        ],
        built_in: [
          "DebugLog",
          "DebugStop",
          "Error",
          "Print",
          "ACos",
          "ACosr",
          "ASin",
          "ASinr",
          "ATan",
          "ATan2",
          "ATan2r",
          "ATanr",
          "Abs",
          "Abs",
          "Ceil",
          "Clamp",
          "Clamp",
          "Cos",
          "Cosr",
          "Exp",
          "Floor",
          "Log",
          "Max",
          "Max",
          "Min",
          "Min",
          "Pow",
          "Sgn",
          "Sgn",
          "Sin",
          "Sinr",
          "Sqrt",
          "Tan",
          "Tanr",
          "Seed",
          "PI",
          "HALFPI",
          "TWOPI",
        ],
        literal: ["true", "false", "null"],
      },
      illegal: /\/\*/,
      contains: [
        e.COMMENT("#rem", "#end"),
        e.COMMENT("'", "$", { relevance: 0 }),
        n,
        a,
        { className: "variable.language", begin: /\b(self|super)\b/ },
        {
          className: "meta",
          begin: /\s*#/,
          end: "$",
          keywords: { keyword: "if else elseif endif end then" },
        },
        { match: [/^\s*/, /strict\b/], scope: { 2: "meta" } },
        { beginKeywords: "alias", end: "=", contains: [e.UNDERSCORE_TITLE_MODE] },
        e.QUOTE_STRING_MODE,
        t,
      ],
    };
  }
  ai.exports = Sp;
});

export { ri };
