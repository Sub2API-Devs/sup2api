/**
 * highlight.js/lib/languages/capnproto.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:62603-63380 cjs-fingerprint
var require_capnproto = __commonJS(function (cjsExports, cjsModule) {
  function capnproto(hljs) {
    let KEYWORDS = [
      "struct",
      "enum",
      "interface",
      "union",
      "group",
      "import",
      "using",
      "const",
      "annotation",
      "extends",
      "in",
      "of",
      "on",
      "as",
      "with",
      "from",
      "fixed",
    ];
    let TYPES = [
      "Void",
      "Bool",
      "Int8",
      "Int16",
      "Int32",
      "Int64",
      "UInt8",
      "UInt16",
      "UInt32",
      "UInt64",
      "Float32",
      "Float64",
      "Text",
      "Data",
      "AnyPointer",
      "AnyStruct",
      "Capability",
      "List",
    ];
    let LITERALS = ["true", "false"];
    let CLASS_DEFINITION = {
      variants: [
        {
          match: [/(struct|enum|interface)/, /\s+/, hljs.IDENT_RE],
        },
        {
          match: [/extends/, /\s*\(/, hljs.IDENT_RE, /\s*\)/],
        },
      ],
      scope: {
        1: "keyword",
        3: "title.class",
      },
    };
    return {
      name: "Cap\u2019n Proto",
      aliases: ["capnp"],
      keywords: {
        keyword: KEYWORDS,
        type: TYPES,
        literal: LITERALS,
      },
      contains: [
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        hljs.HASH_COMMENT_MODE,
        {
          className: "meta",
          begin: /@0x[\w\d]{16};/,
          illegal: /\n/,
        },
        {
          className: "symbol",
          begin: /@\d+\b/,
        },
        CLASS_DEFINITION,
      ],
    };
  }
  cjsModule.exports = capnproto;
});
export { require_capnproto };
