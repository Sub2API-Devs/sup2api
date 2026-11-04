/**
 * highlight.js/lib/languages/d.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:110452-113039 cjs-fingerprint
var require_d = __commonJS(function (cjsExports, cjsModule) {
  function d(hljs) {
    let D_KEYWORDS = {
      $pattern: hljs.UNDERSCORE_IDENT_RE,
      keyword:
        "abstract alias align asm assert auto body break byte case cast catch class const continue debug default delete deprecated do else enum export extern final finally for foreach foreach_reverse|10 goto if immutable import in inout int interface invariant is lazy macro mixin module new nothrow out override package pragma private protected public pure ref return scope shared static struct super switch synchronized template this throw try typedef typeid typeof union unittest version void volatile while with __FILE__ __LINE__ __gshared|10 __thread __traits __DATE__ __EOF__ __TIME__ __TIMESTAMP__ __VENDOR__ __VERSION__",
      built_in:
        "bool cdouble cent cfloat char creal dchar delegate double dstring float function idouble ifloat ireal long real short string ubyte ucent uint ulong ushort wchar wstring",
      literal: "false null true",
    };
    let decimal_integer_re = "(0|[1-9][\\d_]*)";
    let decimal_integer_nosus_re = "(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)";
    let binary_integer_re = "0[bB][01_]+";
    let hexadecimal_digits_re = "([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)";
    let hexadecimal_integer_re = "0[xX]([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)";
    let decimal_exponent_re = "([eE][+-]?(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d))";
    let decimal_float_re =
      "((0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)(\\.\\d*|" +
      decimal_exponent_re +
      ")|\\d+\\.(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)|\\.(0|[1-9][\\d_]*)" +
      decimal_exponent_re +
      "?)";
    let hexadecimal_float_re =
      "(0[xX](([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)\\.([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)|\\.?([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*))[pP][+-]?(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d))";
    let integer_re = "((0|[1-9][\\d_]*)|0[bB][01_]+|" + hexadecimal_integer_re + ")";
    let float_re = "(" + hexadecimal_float_re + "|" + decimal_float_re + ")";
    let escape_sequence_re = `\\\\(['"\\?\\\\abfnrtv]|u[\\dA-Fa-f]{4}|[0-7]{1,3}|x[\\dA-Fa-f]{2}|U[\\dA-Fa-f]{8})|&[a-zA-Z\\d]{2,};`;
    let D_INTEGER_MODE = {
      className: "number",
      begin: "\\b" + integer_re + "(L|u|U|Lu|LU|uL|UL)?",
      relevance: 0,
    };
    let D_FLOAT_MODE = {
      className: "number",
      begin: "\\b(" + float_re + "([fF]|L|i|[fF]i|Li)?|" + integer_re + "(i|[fF]i|Li))",
      relevance: 0,
    };
    let D_CHARACTER_MODE = {
      className: "string",
      begin: "'(" + escape_sequence_re + "|.)",
      end: "'",
      illegal: ".",
    };
    let D_STRING_MODE = {
      className: "string",
      begin: '"',
      contains: [
        {
          begin: escape_sequence_re,
          relevance: 0,
        },
      ],
      end: '"[cwd]?',
    };
    let D_WYSIWYG_DELIMITED_STRING_MODE = {
      className: "string",
      begin: '[rq]"',
      end: '"[cwd]?',
      relevance: 5,
    };
    let D_ALTERNATE_WYSIWYG_STRING_MODE = {
      className: "string",
      begin: "`",
      end: "`[cwd]?",
    };
    let D_HEX_STRING_MODE = {
      className: "string",
      begin: 'x"[\\da-fA-F\\s\\n\\r]*"[cwd]?',
      relevance: 10,
    };
    let D_TOKEN_STRING_MODE = {
      className: "string",
      begin: 'q"\\{',
      end: '\\}"',
    };
    let D_HASHBANG_MODE = {
      className: "meta",
      begin: "^#!",
      end: "$",
      relevance: 5,
    };
    let D_SPECIAL_TOKEN_SEQUENCE_MODE = {
      className: "meta",
      begin: "#(line)",
      end: "$",
      relevance: 5,
    };
    let D_ATTRIBUTE_MODE = {
      className: "keyword",
      begin: "@[a-zA-Z_][a-zA-Z_\\d]*",
    };
    let D_NESTING_COMMENT_MODE = hljs.COMMENT("\\/\\+", "\\+\\/", {
      contains: ["self"],
      relevance: 10,
    });
    return {
      name: "D",
      keywords: D_KEYWORDS,
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        D_NESTING_COMMENT_MODE,
        D_HEX_STRING_MODE,
        D_STRING_MODE,
        D_WYSIWYG_DELIMITED_STRING_MODE,
        D_ALTERNATE_WYSIWYG_STRING_MODE,
        D_TOKEN_STRING_MODE,
        D_FLOAT_MODE,
        D_INTEGER_MODE,
        D_CHARACTER_MODE,
        D_HASHBANG_MODE,
        D_SPECIAL_TOKEN_SEQUENCE_MODE,
        D_ATTRIBUTE_MODE,
      ],
    };
  }
  cjsModule.exports = d;
});
export { require_d };
