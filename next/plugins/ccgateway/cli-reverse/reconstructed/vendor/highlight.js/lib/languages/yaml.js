/**
 * highlight.js/lib/languages/yaml.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:561601-563704 cjs-fingerprint
var require_yaml = __commonJS(function (cjsExports, cjsModule) {
  function yaml(hljs) {
    let KEY = {
      className: "attr",
      variants: [
        {
          begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/,
        },
        {
          begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/,
        },
        {
          begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/,
        },
      ],
    };
    let TEMPLATE_VARIABLES = {
      className: "template-variable",
      variants: [
        {
          begin: /\{\{/,
          end: /\}\}/,
        },
        {
          begin: /%\{/,
          end: /\}/,
        },
      ],
    };
    let SINGLE_QUOTE_STRING = {
      className: "string",
      relevance: 0,
      begin: /'/,
      end: /'/,
      contains: [
        {
          match: /''/,
          scope: "char.escape",
          relevance: 0,
        },
      ],
    };
    let STRING = {
      className: "string",
      relevance: 0,
      variants: [
        {
          begin: /"/,
          end: /"/,
        },
        {
          begin: /\S+/,
        },
      ],
      contains: [hljs.BACKSLASH_ESCAPE, TEMPLATE_VARIABLES],
    };
    let CONTAINER_STRING = hljs.inherit(STRING, {
      variants: [
        {
          begin: /'/,
          end: /'/,
          contains: [
            {
              begin: /''/,
              relevance: 0,
            },
          ],
        },
        {
          begin: /"/,
          end: /"/,
        },
        {
          begin: /[^\s,{}[\]]+/,
        },
      ],
    });
    let DATE_RE = "[0-9]{4}(-[0-9][0-9]){0,2}";
    let TIME_RE = "([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?";
    let FRACTION_RE = "(\\.[0-9]*)?";
    let ZONE_RE = "([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?";
    let TIMESTAMP = {
      className: "number",
      begin:
        "\\b[0-9]{4}(-[0-9][0-9]){0,2}([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?(\\.[0-9]*)?([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?\\b",
    };
    let VALUE_CONTAINER = {
      end: ",",
      endsWithParent: true,
      excludeEnd: true,
      keywords: "true false yes no null",
      relevance: 0,
    };
    let OBJECT = {
      begin: /\{/,
      end: /\}/,
      contains: [VALUE_CONTAINER],
      illegal: "\\n",
      relevance: 0,
    };
    let ARRAY = {
      begin: "\\[",
      end: "\\]",
      contains: [VALUE_CONTAINER],
      illegal: "\\n",
      relevance: 0,
    };
    let MODES = [
      KEY,
      {
        className: "meta",
        begin: "^---\\s*$",
        relevance: 10,
      },
      {
        className: "string",
        begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*",
      },
      {
        begin: "<%[%=-]?",
        end: "[%-]?%>",
        subLanguage: "ruby",
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0,
      },
      {
        className: "type",
        begin: "!\\w+![\\w#;/?:@&=+$,.~*'()[\\]]+",
      },
      {
        className: "type",
        begin: "!<[\\w#;/?:@&=+$,.~*'()[\\]]+>",
      },
      {
        className: "type",
        begin: "![\\w#;/?:@&=+$,.~*'()[\\]]+",
      },
      {
        className: "type",
        begin: "!![\\w#;/?:@&=+$,.~*'()[\\]]+",
      },
      {
        className: "meta",
        begin: "&" + hljs.UNDERSCORE_IDENT_RE + "$",
      },
      {
        className: "meta",
        begin: "\\*" + hljs.UNDERSCORE_IDENT_RE + "$",
      },
      {
        className: "bullet",
        begin: "-(?=[ ]|$)",
        relevance: 0,
      },
      hljs.HASH_COMMENT_MODE,
      {
        beginKeywords: "true false yes no null",
        keywords: {
          literal: "true false yes no null",
        },
      },
      TIMESTAMP,
      {
        className: "number",
        begin: hljs.C_NUMBER_RE + "\\b",
        relevance: 0,
      },
      OBJECT,
      ARRAY,
      SINGLE_QUOTE_STRING,
      STRING,
    ];
    let VALUE_MODES = [...MODES];
    VALUE_MODES.pop();
    VALUE_MODES.push(CONTAINER_STRING);
    VALUE_CONTAINER.contains = VALUE_MODES;
    return {
      name: "YAML",
      case_insensitive: true,
      aliases: ["yml"],
      contains: MODES,
    };
  }
  cjsModule.exports = yaml;
});
export { require_yaml };
