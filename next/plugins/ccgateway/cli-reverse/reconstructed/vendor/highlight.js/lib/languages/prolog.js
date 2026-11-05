/**
 * highlight.js/lib/languages/prolog.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:372714-373395 cjs-fingerprint
var require_prolog = __commonJS(function (cjsExports, cjsModule) {
  function prolog(hljs) {
    let ATOM = {
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
    let COMMENT = {
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
      ATOM,
      VAR,
      PARENTED,
      {
        begin: /:-/,
      },
      LIST,
      COMMENT,
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
