/**
 * highlight.js/lib/languages/erlang-repl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:132930-133716 cjs-fingerprint
var require_erlang_repl = __commonJS(function (cjsExports, cjsModule) {
  function erlangRepl(hljs) {
    let regex = hljs.regex;
    return {
      name: "Erlang REPL",
      keywords: {
        built_in: "spawn spawn_link self",
        keyword:
          "after and andalso|10 band begin bnot bor bsl bsr bxor case catch cond div end fun if let not of or orelse|10 query receive rem try when xor",
      },
      contains: [
        {
          className: "meta.prompt",
          begin: "^[0-9]+> ",
          relevance: 10,
        },
        hljs.COMMENT("%", "$"),
        {
          className: "number",
          begin:
            "\\b(\\d+(_\\d+)*#[a-fA-F0-9]+(_[a-fA-F0-9]+)*|\\d+(_\\d+)*(\\.\\d+(_\\d+)*)?([eE][-+]?\\d+)?)",
          relevance: 0,
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          begin: regex.concat(/\?(::)?/, /([A-Z]\w*)/, /((::)[A-Z]\w*)*/),
        },
        {
          begin: "->",
        },
        {
          begin: "ok",
        },
        {
          begin: "!",
        },
        {
          begin: "(\\b[a-z'][a-zA-Z0-9_']*:[a-z'][a-zA-Z0-9_']*)|(\\b[a-z'][a-zA-Z0-9_']*)",
          relevance: 0,
        },
        {
          begin: "[A-Z][a-zA-Z0-9_']*",
          relevance: 0,
        },
      ],
    };
  }
  cjsModule.exports = erlangRepl;
});
export { require_erlang_repl };
