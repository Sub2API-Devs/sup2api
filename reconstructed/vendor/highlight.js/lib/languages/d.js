/**
 * highlight.js/lib/languages/d.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:110452-113039 cjs-fingerprint
var An = x(function (zu, Sn) {
  function ql(e) {
    let t = {
        $pattern: e.UNDERSCORE_IDENT_RE,
        keyword:
          "abstract alias align asm assert auto body break byte case cast catch class const continue debug default delete deprecated do else enum export extern final finally for foreach foreach_reverse|10 goto if immutable import in inout int interface invariant is lazy macro mixin module new nothrow out override package pragma private protected public pure ref return scope shared static struct super switch synchronized template this throw try typedef typeid typeof union unittest version void volatile while with __FILE__ __LINE__ __gshared|10 __thread __traits __DATE__ __EOF__ __TIME__ __TIMESTAMP__ __VENDOR__ __VERSION__",
        built_in:
          "bool cdouble cent cfloat char creal dchar delegate double dstring float function idouble ifloat ireal long real short string ubyte ucent uint ulong ushort wchar wstring",
        literal: "false null true",
      },
      n = "(0|[1-9][\\d_]*)",
      a = "(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)",
      s = "0[bB][01_]+",
      o = "([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)",
      r = "0[xX]([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)",
      i = "([eE][+-]?(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d))",
      c =
        "((0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)(\\.\\d*|" +
        i +
        ")|\\d+\\.(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)|\\.(0|[1-9][\\d_]*)" +
        i +
        "?)",
      l =
        "(0[xX](([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)\\.([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)|\\.?([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*))[pP][+-]?(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d))",
      d = "((0|[1-9][\\d_]*)|0[bB][01_]+|" + r + ")",
      m = "(" + l + "|" + c + ")",
      p = `\\\\(['"\\?\\\\abfnrtv]|u[\\dA-Fa-f]{4}|[0-7]{1,3}|x[\\dA-Fa-f]{2}|U[\\dA-Fa-f]{8})|&[a-zA-Z\\d]{2,};`,
      _ = { className: "number", begin: "\\b" + d + "(L|u|U|Lu|LU|uL|UL)?", relevance: 0 },
      E = {
        className: "number",
        begin: "\\b(" + m + "([fF]|L|i|[fF]i|Li)?|" + d + "(i|[fF]i|Li))",
        relevance: 0,
      },
      u = { className: "string", begin: "'(" + p + "|.)", end: "'", illegal: "." },
      f = { className: "string", begin: '"', contains: [{ begin: p, relevance: 0 }], end: '"[cwd]?' },
      O = { className: "string", begin: '[rq]"', end: '"[cwd]?', relevance: 5 },
      S = { className: "string", begin: "`", end: "`[cwd]?" },
      N = { className: "string", begin: 'x"[\\da-fA-F\\s\\n\\r]*"[cwd]?', relevance: 10 },
      A = { className: "string", begin: 'q"\\{', end: '\\}"' },
      C = { className: "meta", begin: "^#!", end: "$", relevance: 5 },
      k = { className: "meta", begin: "#(line)", end: "$", relevance: 5 },
      M = { className: "keyword", begin: "@[a-zA-Z_][a-zA-Z_\\d]*" },
      COMMENT = e.COMMENT("\\/\\+", "\\+\\/", { contains: ["self"], relevance: 10 });
    return {
      name: "D",
      keywords: t,
      contains: [e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE, COMMENT, N, f, O, S, A, E, _, u, C, k, M],
    };
  }
  Sn.exports = ql;
});

export { An };
