/**
 * highlight.js/lib/languages/go.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:176324-177748 cjs-fingerprint
var require_go = __commonJS(function (cjsExports, cjsModule) {
  function go(hljs) {
    let KEYWORDS = {
      keyword: [
        "break",
        "case",
        "chan",
        "const",
        "continue",
        "default",
        "defer",
        "else",
        "fallthrough",
        "for",
        "func",
        "go",
        "goto",
        "if",
        "import",
        "interface",
        "map",
        "package",
        "range",
        "return",
        "select",
        "struct",
        "switch",
        "type",
        "var",
      ],
      type: [
        "bool",
        "byte",
        "complex64",
        "complex128",
        "error",
        "float32",
        "float64",
        "int8",
        "int16",
        "int32",
        "int64",
        "string",
        "uint8",
        "uint16",
        "uint32",
        "uint64",
        "int",
        "uint",
        "uintptr",
        "rune",
      ],
      literal: ["true", "false", "iota", "nil"],
      built_in: [
        "append",
        "cap",
        "close",
        "complex",
        "copy",
        "imag",
        "len",
        "make",
        "new",
        "panic",
        "print",
        "println",
        "real",
        "recover",
        "delete",
      ],
    };
    return {
      name: "Go",
      aliases: ["golang"],
      keywords: KEYWORDS,
      illegal: "</",
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "string",
          variants: [
            hljs.QUOTE_STRING_MODE,
            hljs.APOS_STRING_MODE,
            {
              begin: "`",
              end: "`",
            },
          ],
        },
        {
          className: "number",
          variants: [
            {
              match: /-?\b0[xX]\.[a-fA-F0-9](_?[a-fA-F0-9])*[pP][+-]?\d(_?\d)*i?/,
              relevance: 0,
            },
            {
              match: /-?\b0[xX](_?[a-fA-F0-9])+((\.([a-fA-F0-9](_?[a-fA-F0-9])*)?)?[pP][+-]?\d(_?\d)*)?i?/,
              relevance: 0,
            },
            {
              match: /-?\b0[oO](_?[0-7])*i?/,
              relevance: 0,
            },
            {
              match: /-?\.\d(_?\d)*([eE][+-]?\d(_?\d)*)?i?/,
              relevance: 0,
            },
            {
              match: /-?\b\d(_?\d)*(\.(\d(_?\d)*)?)?([eE][+-]?\d(_?\d)*)?i?/,
              relevance: 0,
            },
          ],
        },
        {
          begin: /:=/,
        },
        {
          className: "function",
          beginKeywords: "func",
          end: "\\s*(\\{|$)",
          excludeEnd: true,
          contains: [
            hljs.TITLE_MODE,
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              endsParent: true,
              keywords: KEYWORDS,
              illegal: /["']/,
            },
          ],
        },
      ],
    };
  }
  cjsModule.exports = go;
});
export { require_go };
