/**
 * highlight.js/lib/languages/wasm.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:529224-530928 cjs-fingerprint
var require_wasm = __commonJS(function (cjsExports, cjsModule) {
  function wasm(hljs) {
    hljs.regex;
    let BLOCK_COMMENT = hljs.COMMENT(/\(;/, /;\)/);
    BLOCK_COMMENT.contains.push("self");
    let LINE_COMMENT = hljs.COMMENT(/;;/, /$/);
    let keyword = [
      "anyfunc",
      "block",
      "br",
      "br_if",
      "br_table",
      "call",
      "call_indirect",
      "data",
      "drop",
      "elem",
      "else",
      "end",
      "export",
      "func",
      "global.get",
      "global.set",
      "local.get",
      "local.set",
      "local.tee",
      "get_global",
      "get_local",
      "global",
      "if",
      "import",
      "local",
      "loop",
      "memory",
      "memory.grow",
      "memory.size",
      "module",
      "mut",
      "nop",
      "offset",
      "param",
      "result",
      "return",
      "select",
      "set_global",
      "set_local",
      "start",
      "table",
      "tee_local",
      "then",
      "type",
      "unreachable",
    ];
    let FUNCTION_REFERENCE = {
      begin: [/(?:func|call|call_indirect)/, /\s+/, /\$[^\s)]+/],
      className: {
        1: "keyword",
        3: "title.function",
      },
    };
    let ARGUMENT = {
      className: "variable",
      begin: /\$[\w_]+/,
    };
    let PARENS = {
      match: /(\((?!;)|\))+/,
      className: "punctuation",
      relevance: 0,
    };
    let NUMBER = {
      className: "number",
      relevance: 0,
      match:
        /[+-]?\b(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?|0x[\da-fA-F](?:_?[\da-fA-F])*(?:\.[\da-fA-F](?:_?[\da-fA-D])*)?(?:[pP][+-]?\d(?:_?\d)*)?)\b|\binf\b|\bnan(?::0x[\da-fA-F](?:_?[\da-fA-D])*)?\b/,
    };
    let TYPE = {
      match: /(i32|i64|f32|f64)(?!\.)/,
      className: "type",
    };
    let MATH_OPERATIONS = {
      className: "keyword",
      match:
        /\b(f32|f64|i32|i64)(?:\.(?:abs|add|and|ceil|clz|const|convert_[su]\/i(?:32|64)|copysign|ctz|demote\/f64|div(?:_[su])?|eqz?|extend_[su]\/i32|floor|ge(?:_[su])?|gt(?:_[su])?|le(?:_[su])?|load(?:(?:8|16|32)_[su])?|lt(?:_[su])?|max|min|mul|nearest|neg?|or|popcnt|promote\/f32|reinterpret\/[fi](?:32|64)|rem_[su]|rot[lr]|shl|shr_[su]|store(?:8|16|32)?|sqrt|sub|trunc(?:_[su]\/f(?:32|64))?|wrap\/i64|xor))\b/,
    };
    return {
      name: "WebAssembly",
      keywords: {
        $pattern: /[\w.]+/,
        keyword,
      },
      contains: [
        LINE_COMMENT,
        BLOCK_COMMENT,
        {
          match: [/(?:offset|align)/, /\s*/, /=/],
          className: {
            1: "keyword",
            3: "operator",
          },
        },
        ARGUMENT,
        PARENS,
        FUNCTION_REFERENCE,
        hljs.QUOTE_STRING_MODE,
        TYPE,
        MATH_OPERATIONS,
        NUMBER,
      ],
    };
  }
  cjsModule.exports = wasm;
});
export { require_wasm };
