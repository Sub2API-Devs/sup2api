/**
 * highlight.js/lib/languages/angelscript.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:5450-7127 cjs-fingerprint
var require_angelscript = __commonJS(function (cjsExports, cjsModule) {
  function angelscript(hljs) {
    let builtInTypeMode = {
      className: "built_in",
      begin:
        "\\b(void|bool|int8|int16|int32|int64|int|uint8|uint16|uint32|uint64|uint|string|ref|array|double|float|auto|dictionary)",
    };
    let objectHandleMode = {
      className: "symbol",
      begin: "[a-zA-Z0-9_]+@",
    };
    let genericMode = {
      className: "keyword",
      begin: "<",
      end: ">",
      contains: [builtInTypeMode, objectHandleMode],
    };
    builtInTypeMode.contains = [genericMode];
    objectHandleMode.contains = [genericMode];
    return {
      name: "AngelScript",
      aliases: ["asc"],
      keywords: [
        "for",
        "in|0",
        "break",
        "continue",
        "while",
        "do|0",
        "return",
        "if",
        "else",
        "case",
        "switch",
        "namespace",
        "is",
        "cast",
        "or",
        "and",
        "xor",
        "not",
        "get|0",
        "in",
        "inout|10",
        "out",
        "override",
        "set|0",
        "private",
        "public",
        "const",
        "default|0",
        "final",
        "shared",
        "external",
        "mixin|10",
        "enum",
        "typedef",
        "funcdef",
        "this",
        "super",
        "import",
        "from",
        "interface",
        "abstract|0",
        "try",
        "catch",
        "protected",
        "explicit",
        "property",
      ],
      illegal: "(^using\\s+[A-Za-z0-9_\\.]+;$|\\bfunction\\s*[^\\(])",
      contains: [
        {
          className: "string",
          begin: "'",
          end: "'",
          illegal: "\\n",
          contains: [hljs.BACKSLASH_ESCAPE],
          relevance: 0,
        },
        {
          className: "string",
          begin: '"""',
          end: '"""',
        },
        {
          className: "string",
          begin: '"',
          end: '"',
          illegal: "\\n",
          contains: [hljs.BACKSLASH_ESCAPE],
          relevance: 0,
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "string",
          begin: "^\\s*\\[",
          end: "\\]",
        },
        {
          beginKeywords: "interface namespace",
          end: /\{/,
          illegal: "[;.\\-]",
          contains: [
            {
              className: "symbol",
              begin: "[a-zA-Z0-9_]+",
            },
          ],
        },
        {
          beginKeywords: "class",
          end: /\{/,
          illegal: "[;.\\-]",
          contains: [
            {
              className: "symbol",
              begin: "[a-zA-Z0-9_]+",
              contains: [
                {
                  begin: "[:,]\\s*",
                  contains: [
                    {
                      className: "symbol",
                      begin: "[a-zA-Z0-9_]+",
                    },
                  ],
                },
              ],
            },
          ],
        },
        builtInTypeMode,
        objectHandleMode,
        {
          className: "literal",
          begin: "\\b(null|true|false)",
        },
        {
          className: "number",
          relevance: 0,
          begin: "(-?)(\\b0[xXbBoOdD][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?f?|\\.\\d+f?)([eE][-+]?\\d+f?)?)",
        },
      ],
    };
  }
  cjsModule.exports = angelscript;
});
export { require_angelscript };
