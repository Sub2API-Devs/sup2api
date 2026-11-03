/**
 * highlight.js/lib/languages/erlang.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:130357-132930 cjs-fingerprint
var Jn = x(function (iE, Qn) {
  function nd(e) {
    let n = "([a-z'][a-zA-Z0-9_']*:[a-z'][a-zA-Z0-9_']*|[a-z'][a-zA-Z0-9_']*)",
      a = {
        keyword:
          "after and andalso|10 band begin bnot bor bsl bzr bxor case catch cond div end fun if let not of orelse|10 query receive rem try when xor maybe else",
        literal: "false true",
      },
      COMMENT = e.COMMENT("%", "$"),
      o = {
        className: "number",
        begin:
          "\\b(\\d+(_\\d+)*#[a-fA-F0-9]+(_[a-fA-F0-9]+)*|\\d+(_\\d+)*(\\.\\d+(_\\d+)*)?([eE][-+]?\\d+)?)",
        relevance: 0,
      },
      r = { begin: "fun\\s+[a-z'][a-zA-Z0-9_']*/\\d+" },
      i = {
        begin: n + "\\(",
        end: "\\)",
        returnBegin: !0,
        relevance: 0,
        contains: [
          { begin: n, relevance: 0 },
          { begin: "\\(", end: "\\)", endsWithParent: !0, returnEnd: !0, relevance: 0 },
        ],
      },
      c = { begin: /\{/, end: /\}/, relevance: 0 },
      l = { begin: "\\b_([A-Z][A-Za-z0-9_]*)?", relevance: 0 },
      d = { begin: "[A-Z][a-zA-Z0-9_]*", relevance: 0 },
      m = {
        begin: "#" + e.UNDERSCORE_IDENT_RE,
        relevance: 0,
        returnBegin: !0,
        contains: [
          { begin: "#" + e.UNDERSCORE_IDENT_RE, relevance: 0 },
          { begin: /\{/, end: /\}/, relevance: 0 },
        ],
      },
      p = { scope: "string", match: /\$(\\([^0-9]|[0-9]{1,3}|)|.)/ },
      _ = { scope: "string", match: /"""("*)(?!")[\s\S]*?"""\1/ },
      E = {
        scope: "string",
        contains: [e.BACKSLASH_ESCAPE],
        variants: [
          { match: /~\w?"""("*)(?!")[\s\S]*?"""\1/ },
          { begin: /~\w?\(/, end: /\)/ },
          { begin: /~\w?\[/, end: /\]/ },
          { begin: /~\w?{/, end: /}/ },
          { begin: /~\w?</, end: />/ },
          { begin: /~\w?\//, end: /\// },
          { begin: /~\w?\|/, end: /\|/ },
          { begin: /~\w?'/, end: /'/ },
          { begin: /~\w?"/, end: /"/ },
          { begin: /~\w?`/, end: /`/ },
          { begin: /~\w?#/, end: /#/ },
        ],
      },
      u = { beginKeywords: "fun receive if try case maybe", end: "end", keywords: a };
    u.contains = [
      COMMENT,
      r,
      e.inherit(e.APOS_STRING_MODE, { className: "" }),
      u,
      i,
      E,
      _,
      e.QUOTE_STRING_MODE,
      o,
      c,
      l,
      d,
      m,
      p,
    ];
    let b = [COMMENT, r, u, i, E, _, e.QUOTE_STRING_MODE, o, c, l, d, m, p];
    ((i.contains[1].contains = b), (c.contains = b), (m.contains[1].contains = b));
    let f = [
        "-module",
        "-record",
        "-undef",
        "-export",
        "-ifdef",
        "-ifndef",
        "-author",
        "-copyright",
        "-doc",
        "-moduledoc",
        "-vsn",
        "-import",
        "-include",
        "-include_lib",
        "-compile",
        "-define",
        "-else",
        "-endif",
        "-file",
        "-behaviour",
        "-behavior",
        "-spec",
        "-on_load",
        "-nifs",
      ],
      O = { className: "params", begin: "\\(", end: "\\)", contains: b };
    return {
      name: "Erlang",
      aliases: ["erl"],
      keywords: a,
      illegal: "(</|\\*=|\\+=|-=|/\\*|\\*/|\\(\\*|\\*\\))",
      contains: [
        {
          className: "function",
          begin: "^[a-z'][a-zA-Z0-9_']*\\s*\\(",
          end: "->",
          returnBegin: !0,
          illegal: "\\(|#|//|/\\*|\\\\|:|;",
          contains: [O, e.inherit(e.TITLE_MODE, { begin: "[a-z'][a-zA-Z0-9_']*" })],
          starts: { end: ";|\\.", keywords: a, contains: b },
        },
        COMMENT,
        {
          begin: "^-",
          end: "\\.",
          relevance: 0,
          excludeEnd: !0,
          returnBegin: !0,
          keywords: { $pattern: "-" + e.IDENT_RE, keyword: f.map((S) => `${S}|1.5`).join(" ") },
          contains: [O, E, _, e.QUOTE_STRING_MODE],
        },
        o,
        E,
        _,
        e.QUOTE_STRING_MODE,
        m,
        l,
        d,
        c,
        p,
        { begin: /\.$/ },
      ],
    };
  }
  Qn.exports = nd;
});

export { Jn };
