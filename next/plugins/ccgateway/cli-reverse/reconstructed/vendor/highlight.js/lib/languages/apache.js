/**
 * highlight.js/lib/languages/apache.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:7127-8101 cjs-fingerprint
var require_apache = __commonJS(function (cjsExports, cjsModule) {
  function apache(hljs) {
    let NUMBER_REF = {
      className: "number",
      begin: /[$%]\d+/,
    };
    let NUMBER = {
      className: "number",
      begin: /\b\d+/,
    };
    let IP_ADDRESS = {
      className: "number",
      begin: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?/,
    };
    let PORT_NUMBER = {
      className: "number",
      begin: /:\d{1,5}/,
    };
    return {
      name: "Apache config",
      aliases: ["apacheconf"],
      case_insensitive: true,
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          className: "section",
          begin: /<\/?/,
          end: />/,
          contains: [
            IP_ADDRESS,
            PORT_NUMBER,
            hljs.inherit(hljs.QUOTE_STRING_MODE, {
              relevance: 0,
            }),
          ],
        },
        {
          className: "attribute",
          begin: /\w+/,
          relevance: 0,
          keywords: {
            _: [
              "order",
              "deny",
              "allow",
              "setenv",
              "rewriterule",
              "rewriteengine",
              "rewritecond",
              "documentroot",
              "sethandler",
              "errordocument",
              "loadmodule",
              "options",
              "header",
              "listen",
              "serverroot",
              "servername",
            ],
          },
          starts: {
            end: /$/,
            relevance: 0,
            keywords: {
              literal: "on off all deny allow",
            },
            contains: [
              {
                scope: "punctuation",
                match: /\\\n/,
              },
              {
                className: "meta",
                begin: /\s\[/,
                end: /\]$/,
              },
              {
                className: "variable",
                begin: /[\$%]\{/,
                end: /\}/,
                contains: ["self", NUMBER_REF],
              },
              IP_ADDRESS,
              NUMBER,
              hljs.QUOTE_STRING_MODE,
            ],
          },
        },
      ],
      illegal: /\S/,
    };
  }
  cjsModule.exports = apache;
});
export { require_apache };
