/**
 * highlight.js/lib/languages/prolog.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:372714-373395 cjs-fingerprint
var require_prolog = x(function (cjsExports, cjsModule) {
  function prolog(hljs) {
    let t = {
      begin: /[a-z][A-Za-z0-9_]*/,
      relevance: 0,
    };
    let VAR = {
      className: "symbol",
      variants: [
        {
          begin: /[A-Z][a-zA-Z0-9_]*/,
        },
        {
          begin: /_[A-Za-z0-9_]*/,
        },
      ],
      relevance: 0,
    };
    let PARENTED = {
      begin: /\(/,
      end: /\)/,
      relevance: 0,
    };
    let LIST = {
      begin: /\[/,
      end: /\]/,
    };
    let o = {
      className: "comment",
      begin: /%/,
      end: /$/,
      contains: [hljs.PHRASAL_WORDS_MODE],
    };
    let BACKTICK_STRING = {
      className: "string",
      begin: /`/,
      end: /`/,
      contains: [hljs.BACKSLASH_ESCAPE],
    };
    let CHAR_CODE = {
      className: "string",
      begin: /0'(\\'|.)/,
    };
    let SPACE_CODE = {
      className: "string",
      begin: /0'\\s/,
    };
    let inner = [
      t,
      VAR,
      PARENTED,
      {
        begin: /:-/,
      },
      LIST,
      o,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,
      BACKTICK_STRING,
      CHAR_CODE,
      SPACE_CODE,
      hljs.C_NUMBER_MODE,
    ];
    PARENTED.contains = inner;
    LIST.contains = inner;
    return {
      name: "Prolog",
      contains: inner.concat([
        {
          begin: /\.$/,
        },
      ]),
    };
  }
  cjsModule.exports = prolog;
});
export { require_prolog };
