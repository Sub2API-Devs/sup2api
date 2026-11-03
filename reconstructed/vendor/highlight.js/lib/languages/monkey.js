/**
 * highlight.js/lib/languages/monkey.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:302076-303563 cjs-fingerprint
var require_monkey = x(function (cjsExports, cjsModule) {
  function monkey(hljs) {
    let NUMBER = {
      className: "number",
      relevance: 0,
      variants: [
        {
          begin: "[$][a-fA-F0-9]+",
        },
        hljs.NUMBER_MODE,
      ],
    };
    let FUNC_DEFINITION = {
      variants: [
        {
          match: [/(function|method)/, /\s+/, hljs.UNDERSCORE_IDENT_RE],
        },
      ],
      scope: {
        1: "keyword",
        3: "title.function",
      },
    };
    let CLASS_DEFINITION = {
      variants: [
        {
          match: [/(class|interface|extends|implements)/, /\s+/, hljs.UNDERSCORE_IDENT_RE],
        },
      ],
      scope: {
        1: "keyword",
        3: "title.class",
      },
    };
    return {
      name: "Monkey",
      case_insensitive: true,
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
        hljs.COMMENT("#rem", "#end"),
        hljs.COMMENT("'", "$", {
          relevance: 0,
        }),
        FUNC_DEFINITION,
        CLASS_DEFINITION,
        {
          className: "variable.language",
          begin: /\b(self|super)\b/,
        },
        {
          className: "meta",
          begin: /\s*#/,
          end: "$",
          keywords: {
            keyword: "if else elseif endif end then",
          },
        },
        {
          match: [/^\s*/, /strict\b/],
          scope: {
            2: "meta",
          },
        },
        {
          beginKeywords: "alias",
          end: "=",
          contains: [hljs.UNDERSCORE_TITLE_MODE],
        },
        hljs.QUOTE_STRING_MODE,
        NUMBER,
      ],
    };
  }
  cjsModule.exports = monkey;
});
export { require_monkey };
