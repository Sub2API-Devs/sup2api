/**
 * highlight.js/lib/languages/fsharp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:146112-150274 cjs-fingerprint
var pa = x(function (pE, da) {
  function cd(e) {
    return new RegExp(e.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "m");
  }
  function la(e) {
    if (!e) return null;
    if (typeof e === "string") return e;
    return e.source;
  }
  function fe(e) {
    return ne("(?=", e, ")");
  }
  function ne(...e) {
    return e.map((n) => la(n)).join("");
  }
  function ld(e) {
    let t = e[e.length - 1];
    if (typeof t === "object" && t.constructor === Object) return (e.splice(e.length - 1, 1), t);
    else return {};
  }
  function ce(...e) {
    return "(" + (ld(e).capture ? "" : "?:") + e.map((a) => la(a)).join("|") + ")";
  }
  function dd(e) {
    let t = [
        "abstract",
        "and",
        "as",
        "assert",
        "base",
        "begin",
        "class",
        "default",
        "delegate",
        "do",
        "done",
        "downcast",
        "downto",
        "elif",
        "else",
        "end",
        "exception",
        "extern",
        "finally",
        "fixed",
        "for",
        "fun",
        "function",
        "global",
        "if",
        "in",
        "inherit",
        "inline",
        "interface",
        "internal",
        "lazy",
        "let",
        "match",
        "member",
        "module",
        "mutable",
        "namespace",
        "new",
        "of",
        "open",
        "or",
        "override",
        "private",
        "public",
        "rec",
        "return",
        "static",
        "struct",
        "then",
        "to",
        "try",
        "type",
        "upcast",
        "use",
        "val",
        "void",
        "when",
        "while",
        "with",
        "yield",
      ],
      n = { scope: "keyword", match: /\b(yield|return|let|do|match|use)!/ },
      a = ["if", "else", "endif", "line", "nowarn", "light", "r", "i", "I", "load", "time", "help", "quit"],
      s = ["true", "false", "null", "Some", "None", "Ok", "Error", "infinity", "infinityf", "nan", "nanf"],
      o = ["__LINE__", "__SOURCE_DIRECTORY__", "__SOURCE_FILE__"],
      r = [
        "bool",
        "byte",
        "sbyte",
        "int8",
        "int16",
        "int32",
        "uint8",
        "uint16",
        "uint32",
        "int",
        "uint",
        "int64",
        "uint64",
        "nativeint",
        "unativeint",
        "decimal",
        "float",
        "double",
        "float32",
        "single",
        "char",
        "string",
        "unit",
        "bigint",
        "option",
        "voption",
        "list",
        "array",
        "seq",
        "byref",
        "exn",
        "inref",
        "nativeptr",
        "obj",
        "outref",
        "voidptr",
        "Result",
      ],
      c = {
        keyword: t,
        literal: s,
        built_in: [
          "not",
          "ref",
          "raise",
          "reraise",
          "dict",
          "readOnlyDict",
          "set",
          "get",
          "enum",
          "sizeof",
          "typeof",
          "typedefof",
          "nameof",
          "nullArg",
          "invalidArg",
          "invalidOp",
          "id",
          "fst",
          "snd",
          "ignore",
          "lock",
          "using",
          "box",
          "unbox",
          "tryUnbox",
          "printf",
          "printfn",
          "sprintf",
          "eprintf",
          "eprintfn",
          "fprintf",
          "fprintfn",
          "failwith",
          "failwithf",
        ],
        "variable.constant": o,
      },
      d = { variants: [e.COMMENT(/\(\*(?!\))/, /\*\)/, { contains: ["self"] }), e.C_LINE_COMMENT_MODE] },
      m = /[a-zA-Z_](\w|')*/,
      p = { scope: "variable", begin: /``/, end: /``/ },
      _ = /\B('|\^)/,
      E = {
        scope: "symbol",
        variants: [{ match: ne(_, /``.*?``/) }, { match: ne(_, e.UNDERSCORE_IDENT_RE) }],
        relevance: 0,
      },
      u = function ({ includeEqual: includeEqual }) {
        let h;
        if (includeEqual) h = "!%&*+-/<=>@^|~?";
        else h = "!%&*+-/<>@^|~?";
        let list = Array.from(h),
          U = ne("[", ...list.map(cd), "]"),
          G = ce(U, /\./),
          j = ne(G, fe(G)),
          Y = ce(ne(j, G, "*"), ne(U, "+"));
        return { scope: "operator", match: ce(Y, /:\?>/, /:\?/, /:>/, /:=/, /::?/, /\$/), relevance: 0 };
      },
      b = u({ includeEqual: !0 }),
      f = u({ includeEqual: !1 }),
      O = function (R, h) {
        return {
          begin: ne(R, fe(ne(/\s*/, ce(/\w/, /'/, /\^/, /#/, /``/, /\(/, /{\|/)))),
          beginScope: h,
          end: fe(ce(/\n/, /=/)),
          relevance: 0,
          keywords: e.inherit(c, { type: r }),
          contains: [d, E, e.inherit(p, { scope: null }), f],
        };
      },
      S = O(/:/, "operator"),
      N = O(/\bof\b/, "keyword"),
      A = {
        begin: [/(^|\s+)/, /type/, /\s+/, m],
        beginScope: { 2: "keyword", 4: "title.class" },
        end: fe(/\(|=|$/),
        keywords: c,
        contains: [d, e.inherit(p, { scope: null }), E, { scope: "operator", match: /<|>/ }, S],
      },
      C = { scope: "computation-expression", match: /\b[_a-z]\w*(?=\s*\{)/ },
      k = { begin: [/^\s*/, ne(/#/, ce(...a)), /\b/], beginScope: { 2: "meta" }, end: fe(/\s|$/) },
      M = { variants: [e.BINARY_NUMBER_MODE, e.C_NUMBER_MODE] },
      P = { scope: "string", begin: /"/, end: /"/, contains: [e.BACKSLASH_ESCAPE] },
      D = { scope: "string", begin: /@"/, end: /"/, contains: [{ match: /""/ }, e.BACKSLASH_ESCAPE] },
      K = { scope: "string", begin: /"""/, end: /"""/, relevance: 2 },
      W = { scope: "subst", begin: /\{/, end: /\}/, keywords: c },
      J = {
        scope: "string",
        begin: /\$"/,
        end: /"/,
        contains: [{ match: /\{\{/ }, { match: /\}\}/ }, e.BACKSLASH_ESCAPE, W],
      },
      z = {
        scope: "string",
        begin: /(\$@|@\$)"/,
        end: /"/,
        contains: [{ match: /\{\{/ }, { match: /\}\}/ }, { match: /""/ }, e.BACKSLASH_ESCAPE, W],
      },
      V = {
        scope: "string",
        begin: /\$"""/,
        end: /"""/,
        contains: [{ match: /\{\{/ }, { match: /\}\}/ }, W],
        relevance: 2,
      },
      g = {
        scope: "string",
        match: ne(/'/, ce(/[^\\']/, /\\(?:.|\d{3}|x[a-fA-F\d]{2}|u[a-fA-F\d]{4}|U[a-fA-F\d]{8})/), /'/),
      };
    return (
      (W.contains = [z, J, D, P, g, n, d, p, S, C, k, M, E, b]),
      {
        name: "F#",
        aliases: ["fs", "f#"],
        keywords: c,
        illegal: /\/\*/,
        classNameAliases: { "computation-expression": "keyword" },
        contains: [
          n,
          { variants: [V, z, J, K, D, P, g] },
          d,
          p,
          A,
          { scope: "meta", begin: /\[</, end: />\]/, relevance: 2, contains: [p, K, D, P, g, M] },
          N,
          S,
          C,
          k,
          M,
          E,
          b,
        ],
      }
    );
  }
  da.exports = dd;
});

export { pa };
