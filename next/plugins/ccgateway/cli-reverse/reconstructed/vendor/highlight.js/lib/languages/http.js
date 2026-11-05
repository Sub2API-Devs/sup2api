/**
 * highlight.js/lib/languages/http.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:193632-194529 cjs-fingerprint
var require_http = __commonJS(function (cjsExports, cjsModule) {
  function http(hljs) {
    let regex = hljs.regex;
    let VERSION = "HTTP/([32]|1\\.[01])";
    let HEADER_NAME = /[A-Za-z][A-Za-z0-9-]*/;
    let HEADER = {
      className: "attribute",
      begin: regex.concat("^", HEADER_NAME, "(?=\\:\\s)"),
      starts: {
        contains: [
          {
            className: "punctuation",
            begin: /: /,
            relevance: 0,
            starts: {
              end: "$",
              relevance: 0,
            },
          },
        ],
      },
    };
    let HEADERS_AND_BODY = [
      HEADER,
      {
        begin: "\\n\\n",
        starts: {
          subLanguage: [],
          endsWithParent: true,
        },
      },
    ];
    return {
      name: "HTTP",
      aliases: ["https"],
      illegal: /\S/,
      contains: [
        {
          begin: "^(?=HTTP/([32]|1\\.[01]) \\d{3})",
          end: /$/,
          contains: [
            {
              className: "meta",
              begin: "HTTP/([32]|1\\.[01])",
            },
            {
              className: "number",
              begin: "\\b\\d{3}\\b",
            },
          ],
          starts: {
            end: /\b\B/,
            illegal: /\S/,
            contains: HEADERS_AND_BODY,
          },
        },
        {
          begin: "(?=^[A-Z]+ (.*?) HTTP/([32]|1\\.[01])$)",
          end: /$/,
          contains: [
            {
              className: "string",
              begin: " ",
              end: " ",
              excludeBegin: true,
              excludeEnd: true,
            },
            {
              className: "meta",
              begin: "HTTP/([32]|1\\.[01])",
            },
            {
              className: "keyword",
              begin: "[A-Z]+",
            },
          ],
          starts: {
            end: /\b\B/,
            illegal: /\S/,
            contains: HEADERS_AND_BODY,
          },
        },
        hljs.inherit(HEADER, {
          relevance: 0,
        }),
      ],
    };
  }
  cjsModule.exports = http;
});
export { require_http };
