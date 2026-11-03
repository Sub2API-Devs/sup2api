/**
 * highlight.js/lib/languages/protobuf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:374067-374758 cjs-fingerprint
var ns = x(function (Mg, ts) {
  function Wp(e) {
    let t = ["package", "import", "option", "optional", "required", "repeated", "group", "oneof"],
      n = [
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
      ],
      a = { match: [/(message|enum|service)\s+/, e.IDENT_RE], scope: { 1: "keyword", 2: "title.class" } };
    return {
      name: "Protocol Buffers",
      aliases: ["proto"],
      keywords: { keyword: t, type: n, literal: ["true", "false"] },
      contains: [
        e.QUOTE_STRING_MODE,
        e.NUMBER_MODE,
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        a,
        { className: "function", beginKeywords: "rpc", end: /[{;]/, excludeEnd: !0, keywords: "rpc returns" },
        { begin: /^\s*[A-Z_]+(?=\s*=[^\n]+;$)/ },
      ],
    };
  }
  ts.exports = Wp;
});

export { ns };
