/**
 * highlight.js/lib/languages/pony.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:362509-363481 cjs-fingerprint
var require_pony = __commonJS(function (cjsExports, cjsModule) {
  function pony(hljs) {
    let KEYWORDS = {
      keyword:
        "actor addressof and as be break class compile_error compile_intrinsic consume continue delegate digestof do else elseif embed end error for fun if ifdef in interface is isnt lambda let match new not object or primitive recover repeat return struct then trait try type until use var where while with xor",
      meta: "iso val tag trn box ref",
      literal: "this false true",
    };
    let TRIPLE_QUOTE_STRING_MODE = {
      className: "string",
      begin: '"""',
      end: '"""',
      relevance: 10,
    };
    let QUOTE_STRING_MODE = {
      className: "string",
      begin: '"',
      end: '"',
      contains: [hljs.BACKSLASH_ESCAPE],
    };
    let SINGLE_QUOTE_CHAR_MODE = {
      className: "string",
      begin: "'",
      end: "'",
      contains: [hljs.BACKSLASH_ESCAPE],
      relevance: 0,
    };
    let TYPE_NAME = {
      className: "type",
      begin: "\\b_?[A-Z][\\w]*",
      relevance: 0,
    };
    let PRIMED_NAME = {
      begin: hljs.IDENT_RE + "'",
      relevance: 0,
    };
    return {
      name: "Pony",
      keywords: KEYWORDS,
      contains: [
        TYPE_NAME,
        TRIPLE_QUOTE_STRING_MODE,
        QUOTE_STRING_MODE,
        SINGLE_QUOTE_CHAR_MODE,
        PRIMED_NAME,
        {
          className: "number",
          begin:
            "(-?)(\\b0[xX][a-fA-F0-9]+|\\b0[bB][01]+|(\\b\\d+(_\\d+)?(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",
          relevance: 0,
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
      ],
    };
  }
  cjsModule.exports = pony;
});
export { require_pony };
