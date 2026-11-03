/**
 * highlight.js/lib/languages/r.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:388349-391276 cjs-fingerprint
var gs = x(function (Ug, Es) {
  function em(e) {
    let regex = e.regex,
      n = /(?:(?:[a-zA-Z]|\.[._a-zA-Z])[._a-zA-Z0-9]*)|\.(?!\d)/,
      either = regex.either(
        /0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/,
        /0[xX][0-9a-fA-F]+(?:[pP][+-]?\d+)?[Li]?/,
        /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[Li]?/,
      ),
      s = /[=!<>:]=|\|\||&&|:::?|<-|<<-|->>|->|\|>|[-+*\/?!$&|:<=>@^~]|\*\*/,
      either_2 = regex.either(/[()]/, /[{}]/, /\[\[/, /[[\]]/, /\\/, /,/);
    return {
      name: "R",
      keywords: {
        $pattern: n,
        keyword: "function if in break next repeat else for while",
        literal: "NULL NA TRUE FALSE Inf NaN NA_integer_|10 NA_real_|10 NA_character_|10 NA_complex_|10",
        built_in:
          "LETTERS letters month.abb month.name pi T F abs acos acosh all any anyNA Arg as.call as.character as.complex as.double as.environment as.integer as.logical as.null.default as.numeric as.raw asin asinh atan atanh attr attributes baseenv browser c call ceiling class Conj cos cosh cospi cummax cummin cumprod cumsum digamma dim dimnames emptyenv exp expression floor forceAndCall gamma gc.time globalenv Im interactive invisible is.array is.atomic is.call is.character is.complex is.double is.environment is.expression is.finite is.function is.infinite is.integer is.language is.list is.logical is.matrix is.na is.name is.nan is.null is.numeric is.object is.pairlist is.raw is.recursive is.single is.symbol lazyLoadDBfetch length lgamma list log max min missing Mod names nargs nzchar oldClass on.exit pos.to.env proc.time prod quote range Re rep retracemem return round seq_along seq_len seq.int sign signif sin sinh sinpi sqrt standardGeneric substitute sum switch tan tanh tanpi tracemem trigamma trunc unclass untracemem UseMethod xtfrm",
      },
      contains: [
        e.COMMENT(/#'/, /$/, {
          contains: [
            {
              scope: "doctag",
              match: /@examples/,
              starts: {
                end: regex.lookahead(regex.either(/\n^#'\s*(?=@[a-zA-Z]+)/, /\n^(?!#')/)),
                endsParent: !0,
              },
            },
            {
              scope: "doctag",
              begin: "@param",
              end: /$/,
              contains: [
                {
                  scope: "variable",
                  variants: [{ match: n }, { match: /`(?:\\.|[^`\\])+`/ }],
                  endsParent: !0,
                },
              ],
            },
            { scope: "doctag", match: /@[a-zA-Z]+/ },
            { scope: "keyword", match: /\\[a-zA-Z]+/ },
          ],
        }),
        e.HASH_COMMENT_MODE,
        {
          scope: "string",
          contains: [e.BACKSLASH_ESCAPE],
          variants: [
            e.END_SAME_AS_BEGIN({ begin: /[rR]"(-*)\(/, end: /\)(-*)"/ }),
            e.END_SAME_AS_BEGIN({ begin: /[rR]"(-*)\{/, end: /\}(-*)"/ }),
            e.END_SAME_AS_BEGIN({ begin: /[rR]"(-*)\[/, end: /\](-*)"/ }),
            e.END_SAME_AS_BEGIN({ begin: /[rR]'(-*)\(/, end: /\)(-*)'/ }),
            e.END_SAME_AS_BEGIN({ begin: /[rR]'(-*)\{/, end: /\}(-*)'/ }),
            e.END_SAME_AS_BEGIN({ begin: /[rR]'(-*)\[/, end: /\](-*)'/ }),
            { begin: '"', end: '"', relevance: 0 },
            { begin: "'", end: "'", relevance: 0 },
          ],
        },
        {
          relevance: 0,
          variants: [
            { scope: { 1: "operator", 2: "number" }, match: [s, either] },
            { scope: { 1: "operator", 2: "number" }, match: [/%[^%]*%/, either] },
            { scope: { 1: "punctuation", 2: "number" }, match: [either_2, either] },
            { scope: { 2: "number" }, match: [/[^a-zA-Z0-9._]|^/, either] },
          ],
        },
        { scope: { 3: "operator" }, match: [n, /\s+/, /<-/, /\s+/] },
        { scope: "operator", relevance: 0, variants: [{ match: s }, { match: /%[^%]*%/ }] },
        { scope: "punctuation", relevance: 0, match: either_2 },
        { begin: "`", end: "`", contains: [{ begin: /\\./ }] },
      ],
    };
  }
  Es.exports = em;
});

export { gs };
