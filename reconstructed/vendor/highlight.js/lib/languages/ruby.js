/**
 * highlight.js/lib/languages/ruby.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:398652-402801 cjs-fingerprint
var ys = x(function ($g, Cs) {
  function sm(e) {
    let regex = e.regex,
      n = "([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)",
      either = regex.either(/\b([A-Z]+[a-z0-9]+)+/, /\b([A-Z]+[a-z0-9]+)+[A-Z]+/),
      combined = regex.concat(either, /(::\w+)*/),
      r = {
        "variable.constant": ["__FILE__", "__LINE__", "__ENCODING__"],
        "variable.language": ["self", "super"],
        keyword: [
          "alias",
          "and",
          "begin",
          "BEGIN",
          "break",
          "case",
          "class",
          "defined",
          "do",
          "else",
          "elsif",
          "end",
          "END",
          "ensure",
          "for",
          "if",
          "in",
          "module",
          "next",
          "not",
          "or",
          "redo",
          "require",
          "rescue",
          "retry",
          "return",
          "then",
          "undef",
          "unless",
          "until",
          "when",
          "while",
          "yield",
          ...["include", "extend", "prepend", "public", "private", "protected", "raise", "throw"],
        ],
        built_in: [
          "proc",
          "lambda",
          "attr_accessor",
          "attr_reader",
          "attr_writer",
          "define_method",
          "private_constant",
          "module_function",
        ],
        literal: ["true", "false", "nil"],
      },
      i = { className: "doctag", begin: "@[A-Za-z]+" },
      c = { begin: "#<", end: ">" },
      l = [
        e.COMMENT("#", "$", { contains: [i] }),
        e.COMMENT("^=begin", "^=end", { contains: [i], relevance: 10 }),
        e.COMMENT("^__END__", e.MATCH_NOTHING_RE),
      ],
      d = { className: "subst", begin: /#\{/, end: /\}/, keywords: r },
      m = {
        className: "string",
        contains: [e.BACKSLASH_ESCAPE, d],
        variants: [
          { begin: /'/, end: /'/ },
          { begin: /"/, end: /"/ },
          { begin: /`/, end: /`/ },
          { begin: /%[qQwWx]?\(/, end: /\)/ },
          { begin: /%[qQwWx]?\[/, end: /\]/ },
          { begin: /%[qQwWx]?\{/, end: /\}/ },
          { begin: /%[qQwWx]?</, end: />/ },
          { begin: /%[qQwWx]?\//, end: /\// },
          { begin: /%[qQwWx]?%/, end: /%/ },
          { begin: /%[qQwWx]?-/, end: /-/ },
          { begin: /%[qQwWx]?\|/, end: /\|/ },
          { begin: /\B\?(\\\d{1,3})/ },
          { begin: /\B\?(\\x[A-Fa-f0-9]{1,2})/ },
          { begin: /\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/ },
          { begin: /\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/ },
          { begin: /\B\?\\(c|C-)[\x20-\x7e]/ },
          { begin: /\B\?\\?\S/ },
          {
            begin: regex.concat(/<<[-~]?'?/, regex.lookahead(/(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b/)),
            contains: [
              e.END_SAME_AS_BEGIN({ begin: /(\w+)/, end: /(\w+)/, contains: [e.BACKSLASH_ESCAPE, d] }),
            ],
          },
        ],
      },
      p = "[1-9](_?[0-9])*|0",
      _ = "[0-9](_?[0-9])*",
      E = {
        className: "number",
        relevance: 0,
        variants: [
          { begin: "\\b([1-9](_?[0-9])*|0)(\\.([0-9](_?[0-9])*))?([eE][+-]?([0-9](_?[0-9])*)|r)?i?\\b" },
          { begin: "\\b0[dD][0-9](_?[0-9])*r?i?\\b" },
          { begin: "\\b0[bB][0-1](_?[0-1])*r?i?\\b" },
          { begin: "\\b0[oO][0-7](_?[0-7])*r?i?\\b" },
          { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b" },
          { begin: "\\b0(_?[0-7])+r?i?\\b" },
        ],
      },
      u = {
        variants: [
          { match: /\(\)/ },
          { className: "params", begin: /\(/, end: /(?=\))/, excludeBegin: !0, endsParent: !0, keywords: r },
        ],
      },
      combined_2 = [
        m,
        {
          variants: [
            { match: [/class\s+/, combined, /\s+<\s+/, combined] },
            { match: [/\b(class|module)\s+/, combined] },
          ],
          scope: { 2: "title.class", 4: "title.class.inherited" },
          keywords: r,
        },
        { match: [/(include|extend)\s+/, combined], scope: { 2: "title.class" }, keywords: r },
        { relevance: 0, match: [combined, /\.new[. (]/], scope: { 1: "title.class" } },
        { relevance: 0, match: /\b[A-Z][A-Z_0-9]+\b/, className: "variable.constant" },
        { relevance: 0, match: either, scope: "title.class" },
        {
          match: [
            /def/,
            /\s+/,
            "([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)",
          ],
          scope: { 1: "keyword", 3: "title.function" },
          contains: [u],
        },
        { begin: e.IDENT_RE + "::" },
        { className: "symbol", begin: e.UNDERSCORE_IDENT_RE + "(!|\\?)?:", relevance: 0 },
        {
          className: "symbol",
          begin: ":(?!\\s)",
          contains: [
            m,
            { begin: "([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)" },
          ],
          relevance: 0,
        },
        E,
        { className: "variable", begin: "(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])(?![A-Za-z])(?![@$?'])" },
        {
          className: "params",
          begin: /\|(?!=)/,
          end: /\|/,
          excludeBegin: !0,
          excludeEnd: !0,
          relevance: 0,
          keywords: r,
        },
        {
          begin: "(" + e.RE_STARTERS_RE + "|unless)\\s*",
          keywords: "unless",
          contains: [
            {
              className: "regexp",
              contains: [e.BACKSLASH_ESCAPE, d],
              illegal: /\n/,
              variants: [
                { begin: "/", end: "/[a-z]*" },
                { begin: /%r\{/, end: /\}[a-z]*/ },
                { begin: "%r\\(", end: "\\)[a-z]*" },
                { begin: "%r!", end: "![a-z]*" },
                { begin: "%r\\[", end: "\\][a-z]*" },
              ],
            },
          ].concat(c, l),
          relevance: 0,
        },
      ].concat(c, l);
    ((d.contains = combined_2), (u.contains = combined_2));
    let k = "[>?]>",
      M = "[\\w#]+\\(\\w+\\):\\d+:\\d+[>*]",
      P = "(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>",
      D = [
        { begin: /^\s*=>/, starts: { end: "$", contains: combined_2 } },
        {
          className: "meta.prompt",
          begin: "^(" + k + "|" + M + "|" + P + ")(?=[ ])",
          starts: { end: "$", keywords: r, contains: combined_2 },
        },
      ];
    return (
      l.unshift(c),
      {
        name: "Ruby",
        aliases: ["rb", "gemspec", "podspec", "thor", "irb"],
        keywords: r,
        illegal: /\/\*/,
        contains: [e.SHEBANG({ binary: "ruby" })].concat(D).concat(l).concat(combined_2),
      }
    );
  }
  Cs.exports = sm;
});

export { ys };
