/**
 * highlight.js/lib/languages/thrift.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:493931-494607 cjs-fingerprint
var Io = x(function (pb, vo) {
  function Qm(e) {
    let t = ["bool", "byte", "i16", "i32", "i64", "double", "string", "binary"];
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
        type: t,
        literal: "true false",
      },
      contains: [
        e.QUOTE_STRING_MODE,
        e.NUMBER_MODE,
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        {
          className: "class",
          beginKeywords: "struct enum service exception",
          end: /\{/,
          illegal: /\n/,
          contains: [e.inherit(e.TITLE_MODE, { starts: { endsWithParent: !0, excludeEnd: !0 } })],
        },
        {
          begin: "\\b(set|list|map)\\s*<",
          keywords: { type: [...t, "set", "list", "map"] },
          end: ">",
          contains: ["self"],
        },
      ],
    };
  }
  vo.exports = Qm;
});

export { Io };
