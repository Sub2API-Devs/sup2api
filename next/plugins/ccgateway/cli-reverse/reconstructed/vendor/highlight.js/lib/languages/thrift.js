/**
 * highlight.js/lib/languages/thrift.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:493931-494607 cjs-fingerprint
var require_thrift = __commonJS(function (cjsExports, cjsModule) {
  function thrift(hljs) {
    let TYPES = ["bool", "byte", "i16", "i32", "i64", "double", "string", "binary"];
    return {
      name: "Thrift",
      keywords: {
        keyword: [
          "namespace",
          "const",
          "typedef",
          "struct",
          "enum",
          "service",
          "exception",
          "void",
          "oneway",
          "set",
          "list",
          "map",
          "required",
          "optional",
        ],
        type: TYPES,
        literal: "true false",
      },
      contains: [
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "class",
          beginKeywords: "struct enum service exception",
          end: /\{/,
          illegal: /\n/,
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              starts: {
                endsWithParent: true,
                excludeEnd: true,
              },
            }),
          ],
        },
        {
          begin: "\\b(set|list|map)\\s*<",
          keywords: {
            type: [...TYPES, "set", "list", "map"],
          },
          end: ">",
          contains: ["self"],
        },
      ],
    };
  }
  cjsModule.exports = thrift;
});
export { require_thrift };
