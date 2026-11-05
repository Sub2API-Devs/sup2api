/**
 * highlight.js/lib/languages/protobuf.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:374067-374758 cjs-fingerprint
var require_protobuf = __commonJS(function (cjsExports, cjsModule) {
  function protobuf(hljs) {
    let KEYWORDS = ["package", "import", "option", "optional", "required", "repeated", "group", "oneof"];
    let TYPES = [
      "double",
      "float",
      "int32",
      "int64",
      "uint32",
      "uint64",
      "sint32",
      "sint64",
      "fixed32",
      "fixed64",
      "sfixed32",
      "sfixed64",
      "bool",
      "string",
      "bytes",
    ];
    let CLASS_DEFINITION = {
      match: [/(message|enum|service)\s+/, hljs.IDENT_RE],
      scope: {
        1: "keyword",
        2: "title.class",
      },
    };
    return {
      name: "Protocol Buffers",
      aliases: ["proto"],
      keywords: {
        keyword: KEYWORDS,
        type: TYPES,
        literal: ["true", "false"],
      },
      contains: [
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        CLASS_DEFINITION,
        {
          className: "function",
          beginKeywords: "rpc",
          end: /[{;]/,
          excludeEnd: true,
          keywords: "rpc returns",
        },
        {
          begin: /^\s*[A-Z_]+(?=\s*=[^\n]+;$)/,
        },
      ],
    };
  }
  cjsModule.exports = protobuf;
});
export { require_protobuf };
