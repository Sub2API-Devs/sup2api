/**
 * highlight.js/lib/languages/haml.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:182575-183653 cjs-fingerprint
var require_haml = __commonJS(function (cjsExports, cjsModule) {
  function haml(hljs) {
    return {
      name: "HAML",
      case_insensitive: true,
      contains: [
        {
          className: "meta",
          begin: "^!!!( (5|1\\.1|Strict|Frameset|Basic|Mobile|RDFa|XML\\b.*))?$",
          relevance: 10,
        },
        hljs.COMMENT("^\\s*(!=#|=#|-#|/).*$", null, {
          relevance: 0,
        }),
        {
          begin: "^\\s*(-|=|!=)(?!#)",
          end: /$/,
          subLanguage: "ruby",
          excludeBegin: true,
          excludeEnd: true,
        },
        {
          className: "tag",
          begin: "^\\s*%",
          contains: [
            {
              className: "selector-tag",
              begin: "\\w+",
            },
            {
              className: "selector-id",
              begin: "#[\\w-]+",
            },
            {
              className: "selector-class",
              begin: "\\.[\\w-]+",
            },
            {
              begin: /\{\s*/,
              end: /\s*\}/,
              contains: [
                {
                  begin: ":\\w+\\s*=>",
                  end: ",\\s+",
                  returnBegin: true,
                  endsWithParent: true,
                  contains: [
                    {
                      className: "attr",
                      begin: ":\\w+",
                    },
                    hljs.APOS_STRING_MODE,
                    hljs.QUOTE_STRING_MODE,
                    {
                      begin: "\\w+",
                      relevance: 0,
                    },
                  ],
                },
              ],
            },
            {
              begin: "\\(\\s*",
              end: "\\s*\\)",
              excludeEnd: true,
              contains: [
                {
                  begin: "\\w+\\s*=",
                  end: "\\s+",
                  returnBegin: true,
                  endsWithParent: true,
                  contains: [
                    {
                      className: "attr",
                      begin: "\\w+",
                      relevance: 0,
                    },
                    hljs.APOS_STRING_MODE,
                    hljs.QUOTE_STRING_MODE,
                    {
                      begin: "\\w+",
                      relevance: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          begin: "^\\s*[=~]\\s*",
        },
        {
          begin: /#\{/,
          end: /\}/,
          subLanguage: "ruby",
          excludeBegin: true,
          excludeEnd: true,
        },
      ],
    };
  }
  cjsModule.exports = haml;
});
export { require_haml };
