/**
 * highlight.js/lib/languages/javascript.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:206900-213926 cjs-fingerprint
var sr = x(function (wE, ir) {
  var Ld = [
      "as",
      "in",
      "of",
      "if",
      "for",
      "while",
      "finally",
      "var",
      "new",
      "function",
      "do",
      "return",
      "void",
      "else",
      "break",
      "catch",
      "instanceof",
      "with",
      "throw",
      "case",
      "default",
      "try",
      "switch",
      "continue",
      "typeof",
      "delete",
      "let",
      "yield",
      "const",
      "class",
      "debugger",
      "async",
      "await",
      "static",
      "import",
      "from",
      "export",
      "extends",
      "using",
    ],
    wd = ["true", "false", "null", "undefined", "NaN", "Infinity"],
    nr = [
      "Object",
      "Function",
      "Boolean",
      "Symbol",
      "Math",
      "Date",
      "Number",
      "BigInt",
      "String",
      "RegExp",
      "Array",
      "Float32Array",
      "Float64Array",
      "Int8Array",
      "Uint8Array",
      "Uint8ClampedArray",
      "Int16Array",
      "Int32Array",
      "Uint16Array",
      "Uint32Array",
      "BigInt64Array",
      "BigUint64Array",
      "Set",
      "Map",
      "WeakSet",
      "WeakMap",
      "ArrayBuffer",
      "SharedArrayBuffer",
      "Atomics",
      "DataView",
      "JSON",
      "Promise",
      "Generator",
      "GeneratorFunction",
      "AsyncFunction",
      "Reflect",
      "Proxy",
      "Intl",
      "WebAssembly",
    ],
    ar = [
      "Error",
      "EvalError",
      "InternalError",
      "RangeError",
      "ReferenceError",
      "SyntaxError",
      "TypeError",
      "URIError",
    ],
    rr = [
      "setInterval",
      "setTimeout",
      "clearInterval",
      "clearTimeout",
      "require",
      "exports",
      "eval",
      "isFinite",
      "isNaN",
      "parseFloat",
      "parseInt",
      "decodeURI",
      "decodeURIComponent",
      "encodeURI",
      "encodeURIComponent",
      "escape",
      "unescape",
    ],
    xd = [
      "arguments",
      "this",
      "super",
      "console",
      "window",
      "document",
      "localStorage",
      "sessionStorage",
      "module",
      "global",
    ],
    combined = [].concat(rr, nr, ar);
  function Pd(e) {
    let regex = e.regex,
      n = (R, { after: after }) => {
        let w = "</" + R[0].slice(1);
        return R.input.indexOf(w, after) !== -1;
      },
      a = "[A-Za-z$_][0-9A-Za-z$_]*",
      s = { begin: "<>", end: "</>" },
      o = /<[A-Za-z0-9\\._:-]+\s*\/>/,
      r = {
        begin: /<[A-Za-z0-9\\._:-]+/,
        end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
        isTrulyOpeningTag: (R, h) => {
          let w = R[0].length + R.index,
            U = R.input[w];
          if (U === "<" || U === ",") {
            h.ignoreMatch();
            return;
          }
          if (U === ">") {
            if (!n(R, { after: w })) h.ignoreMatch();
          }
          let G,
            substring = R.input.substring(w);
          if ((G = substring.match(/^\s*=/))) {
            h.ignoreMatch();
            return;
          }
          if ((G = substring.match(/^\s+extends\s+/))) {
            if (G.index === 0) {
              h.ignoreMatch();
              return;
            }
          }
        },
      },
      i = {
        $pattern: "[A-Za-z$_][0-9A-Za-z$_]*",
        keyword: Ld,
        literal: wd,
        built_in: combined,
        "variable.language": xd,
      },
      c = "[0-9](_?[0-9])*",
      l = "\\.([0-9](_?[0-9])*)",
      d = "0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",
      m = {
        className: "number",
        variants: [
          {
            begin:
              "(\\b(0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*)((\\.([0-9](_?[0-9])*))|\\.)?|(\\.([0-9](_?[0-9])*)))[eE][+-]?([0-9](_?[0-9])*)\\b",
          },
          {
            begin:
              "\\b(0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*)\\b((\\.([0-9](_?[0-9])*))\\b|\\.)?|(\\.([0-9](_?[0-9])*))\\b",
          },
          { begin: "\\b(0|[1-9](_?[0-9])*)n\\b" },
          { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
          { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
          { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
          { begin: "\\b0[0-7]+n?\\b" },
        ],
        relevance: 0,
      },
      p = { className: "subst", begin: "\\$\\{", end: "\\}", keywords: i, contains: [] },
      _ = {
        begin: ".?html`",
        end: "",
        starts: { end: "`", returnEnd: !1, contains: [e.BACKSLASH_ESCAPE, p], subLanguage: "xml" },
      },
      E = {
        begin: ".?css`",
        end: "",
        starts: { end: "`", returnEnd: !1, contains: [e.BACKSLASH_ESCAPE, p], subLanguage: "css" },
      },
      u = {
        begin: ".?gql`",
        end: "",
        starts: { end: "`", returnEnd: !1, contains: [e.BACKSLASH_ESCAPE, p], subLanguage: "graphql" },
      },
      b = { className: "string", begin: "`", end: "`", contains: [e.BACKSLASH_ESCAPE, p] },
      O = {
        className: "comment",
        variants: [
          e.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
            relevance: 0,
            contains: [
              {
                begin: "(?=@[A-Za-z]+)",
                relevance: 0,
                contains: [
                  { className: "doctag", begin: "@[A-Za-z]+" },
                  {
                    className: "type",
                    begin: "\\{",
                    end: "\\}",
                    excludeEnd: !0,
                    excludeBegin: !0,
                    relevance: 0,
                  },
                  {
                    className: "variable",
                    begin: "[A-Za-z$_][0-9A-Za-z$_]*(?=\\s*(-)|$)",
                    endsParent: !0,
                    relevance: 0,
                  },
                  { begin: /(?=[^\n])\s/, relevance: 0 },
                ],
              },
            ],
          }),
          e.C_BLOCK_COMMENT_MODE,
          e.C_LINE_COMMENT_MODE,
        ],
      },
      S = [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, _, E, u, b, { match: /\$\d+/ }, m];
    p.contains = S.concat({ begin: /\{/, end: /\}/, keywords: i, contains: ["self"].concat(S) });
    let combined_2 = [].concat(O, p.contains),
      combined_3 = combined_2.concat([
        { begin: /(\s*)\(/, end: /\)/, keywords: i, contains: ["self"].concat(combined_2) },
      ]),
      C = {
        className: "params",
        begin: /(\s*)\(/,
        end: /\)/,
        excludeBegin: !0,
        excludeEnd: !0,
        keywords: i,
        contains: combined_3,
      },
      k = {
        variants: [
          {
            match: [
              /class/,
              /\s+/,
              "[A-Za-z$_][0-9A-Za-z$_]*",
              /\s+/,
              /extends/,
              /\s+/,
              regex.concat(
                "[A-Za-z$_][0-9A-Za-z$_]*",
                "(",
                regex.concat(/\./, "[A-Za-z$_][0-9A-Za-z$_]*"),
                ")*",
              ),
            ],
            scope: { 1: "keyword", 3: "title.class", 5: "keyword", 7: "title.class.inherited" },
          },
          { match: [/class/, /\s+/, "[A-Za-z$_][0-9A-Za-z$_]*"], scope: { 1: "keyword", 3: "title.class" } },
        ],
      },
      M = {
        relevance: 0,
        match: regex.either(
          /\bJSON/,
          /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
          /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
          /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
        ),
        className: "title.class",
        keywords: { _: [...nr, ...ar] },
      },
      P = { label: "use_strict", className: "meta", relevance: 10, begin: /^\s*['"]use (strict|asm)['"]/ },
      D = {
        variants: [
          { match: [/function/, /\s+/, "[A-Za-z$_][0-9A-Za-z$_]*", /(?=\s*\()/] },
          { match: [/function/, /\s*(?=\()/] },
        ],
        className: { 1: "keyword", 3: "title.function" },
        label: "func.def",
        contains: [C],
        illegal: /%/,
      },
      K = { relevance: 0, match: /\b[A-Z][A-Z_0-9]+\b/, className: "variable.constant" };
    function W(R) {
      return regex.concat("(?!", R.join("|"), ")");
    }
    let J = {
        match: regex.concat(
          /\b/,
          W([...rr, "super", "import"].map((R) => `${R}\\s*\\(`)),
          "[A-Za-z$_][0-9A-Za-z$_]*",
          regex.lookahead(/\s*\(/),
        ),
        className: "title.function",
        relevance: 0,
      },
      z = {
        begin: regex.concat(
          /\./,
          regex.lookahead(regex.concat("[A-Za-z$_][0-9A-Za-z$_]*", /(?![0-9A-Za-z$_(])/)),
        ),
        end: "[A-Za-z$_][0-9A-Za-z$_]*",
        excludeBegin: !0,
        keywords: "prototype",
        className: "property",
        relevance: 0,
      },
      V = {
        match: [/get|set/, /\s+/, "[A-Za-z$_][0-9A-Za-z$_]*", /(?=\()/],
        className: { 1: "keyword", 3: "title.function" },
        contains: [{ begin: /\(\)/ }, C],
      },
      g = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + e.UNDERSCORE_IDENT_RE + ")\\s*=>",
      v = {
        match: [
          /const|var|let/,
          /\s+/,
          "[A-Za-z$_][0-9A-Za-z$_]*",
          /\s*/,
          /=\s*/,
          /(async\s*)?/,
          regex.lookahead(g),
        ],
        keywords: "async",
        className: { 1: "keyword", 3: "title.function" },
        contains: [C],
      };
    return {
      name: "JavaScript",
      aliases: ["js", "jsx", "mjs", "cjs"],
      keywords: i,
      exports: { PARAMS_CONTAINS: combined_3, CLASS_REFERENCE: M },
      illegal: /#(?![$_A-z])/,
      contains: [
        e.SHEBANG({ label: "shebang", binary: "node", relevance: 5 }),
        P,
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
        _,
        E,
        u,
        b,
        O,
        { match: /\$\d+/ },
        m,
        M,
        { scope: "attr", match: "[A-Za-z$_][0-9A-Za-z$_]*" + regex.lookahead(":"), relevance: 0 },
        v,
        {
          begin: "(" + e.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
          keywords: "return throw case",
          relevance: 0,
          contains: [
            O,
            e.REGEXP_MODE,
            {
              className: "function",
              begin: g,
              returnBegin: !0,
              end: "\\s*=>",
              contains: [
                {
                  className: "params",
                  variants: [
                    { begin: e.UNDERSCORE_IDENT_RE, relevance: 0 },
                    { className: null, begin: /\(\s*\)/, skip: !0 },
                    {
                      begin: /(\s*)\(/,
                      end: /\)/,
                      excludeBegin: !0,
                      excludeEnd: !0,
                      keywords: i,
                      contains: combined_3,
                    },
                  ],
                },
              ],
            },
            { begin: /,/, relevance: 0 },
            { match: /\s+/, relevance: 0 },
            {
              variants: [
                { begin: s.begin, end: s.end },
                { match: o },
                { begin: r.begin, "on:begin": r.isTrulyOpeningTag, end: r.end },
              ],
              subLanguage: "xml",
              contains: [{ begin: r.begin, end: r.end, skip: !0, contains: ["self"] }],
            },
          ],
        },
        D,
        { beginKeywords: "while if switch catch for" },
        {
          begin:
            "\\b(?!function)" +
            e.UNDERSCORE_IDENT_RE +
            "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
          returnBegin: !0,
          label: "func.def",
          contains: [
            C,
            e.inherit(e.TITLE_MODE, { begin: "[A-Za-z$_][0-9A-Za-z$_]*", className: "title.function" }),
          ],
        },
        { match: /\.\.\./, relevance: 0 },
        z,
        { match: "\\$[A-Za-z$_][0-9A-Za-z$_]*", relevance: 0 },
        { match: [/\bconstructor(?=\s*\()/], className: { 1: "title.function" }, contains: [C] },
        J,
        K,
        k,
        V,
        { match: /\$[(.]/ },
      ],
    };
  }
  ir.exports = Pd;
});

export { sr };
