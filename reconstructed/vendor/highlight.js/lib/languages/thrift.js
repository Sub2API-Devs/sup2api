/**
 * highlight.js/lib/languages/thrift.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:493931-494607 cjs-fingerprint
var require_thrift = x(function (cjsExports, cjsModule) {
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
