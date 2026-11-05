/**
 * highlight.js/lib/languages/handlebars.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:183653-185869 cjs-fingerprint
var require_handlebars = __commonJS(function (cjsExports, cjsModule) {
  function handlebars(hljs) {
    let regex = hljs.regex;
    let BUILT_INS = {
      $pattern: /[\w.\/]+/,
      built_in: [
        "action",
        "bindattr",
        "collection",
        "component",
        "concat",
        "debugger",
        "each",
        "each-in",
        "get",
        "hash",
        "if",
        "in",
        "input",
        "link-to",
        "loc",
        "log",
        "lookup",
        "mut",
        "outlet",
        "partial",
        "query-params",
        "render",
        "template",
        "textarea",
        "unbound",
        "unless",
        "view",
        "with",
        "yield",
      ],
    };
    let LITERALS = {
      $pattern: /[\w.\/]+/,
      literal: ["true", "false", "undefined", "null"],
    };
    let DOUBLE_QUOTED_ID_REGEX = /""|"[^"]+"/;
    let SINGLE_QUOTED_ID_REGEX = /''|'[^']+'/;
    let BRACKET_QUOTED_ID_REGEX = /\[\]|\[[^\]]+\]/;
    let PLAIN_ID_REGEX = /[^\s!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]+/;
    let PATH_DELIMITER_REGEX = /(\.|\/)/;
    let ANY_ID = regex.either(
      DOUBLE_QUOTED_ID_REGEX,
      SINGLE_QUOTED_ID_REGEX,
      BRACKET_QUOTED_ID_REGEX,
      PLAIN_ID_REGEX,
    );
    let IDENTIFIER_REGEX = regex.concat(
      regex.optional(/\.|\.\/|\//),
      ANY_ID,
      regex.anyNumberOfTimes(regex.concat(PATH_DELIMITER_REGEX, ANY_ID)),
    );
    let HASH_PARAM_REGEX = regex.concat("(", BRACKET_QUOTED_ID_REGEX, "|", PLAIN_ID_REGEX, ")(?==)");
    let HELPER_NAME_OR_PATH_EXPRESSION = {
      begin: IDENTIFIER_REGEX,
    };
    let HELPER_PARAMETER = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      keywords: LITERALS,
    });
    let SUB_EXPRESSION = {
      begin: /\(/,
      end: /\)/,
    };
    let HASH = {
      className: "attr",
      begin: HASH_PARAM_REGEX,
      relevance: 0,
      starts: {
        begin: /=/,
        end: /=/,
        starts: {
          contains: [
            hljs.NUMBER_MODE,
            hljs.QUOTE_STRING_MODE,
            hljs.APOS_STRING_MODE,
            HELPER_PARAMETER,
            SUB_EXPRESSION,
          ],
        },
      },
    };
    let BLOCK_PARAMS = {
      begin: /as\s+\|/,
      keywords: {
        keyword: "as",
      },
      end: /\|/,
      contains: [
        {
          begin: /\w+/,
        },
      ],
    };
    let HELPER_PARAMETERS = {
      contains: [
        hljs.NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        BLOCK_PARAMS,
        HASH,
        HELPER_PARAMETER,
        SUB_EXPRESSION,
      ],
      returnEnd: true,
    };
    let SUB_EXPRESSION_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      className: "name",
      keywords: BUILT_INS,
      starts: hljs.inherit(HELPER_PARAMETERS, {
        end: /\)/,
      }),
    });
    SUB_EXPRESSION.contains = [SUB_EXPRESSION_CONTENTS];
    let OPENING_BLOCK_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      keywords: BUILT_INS,
      className: "name",
      starts: hljs.inherit(HELPER_PARAMETERS, {
        end: /\}\}/,
      }),
    });
    let CLOSING_BLOCK_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      keywords: BUILT_INS,
      className: "name",
    });
    let BASIC_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      className: "name",
      keywords: BUILT_INS,
      starts: hljs.inherit(HELPER_PARAMETERS, {
        end: /\}\}/,
      }),
    });
    return {
      name: "Handlebars",
      aliases: ["hbs", "html.hbs", "html.handlebars", "htmlbars"],
      case_insensitive: true,
      subLanguage: "xml",
      contains: [
        {
          begin: /\\\{\{/,
          skip: true,
        },
        {
          begin: /\\\\(?=\{\{)/,
          skip: true,
        },
        hljs.COMMENT(/\{\{!--/, /--\}\}/),
        hljs.COMMENT(/\{\{!/, /\}\}/),
        {
          className: "template-tag",
          begin: /\{\{\{\{(?!\/)/,
          end: /\}\}\}\}/,
          contains: [OPENING_BLOCK_MUSTACHE_CONTENTS],
          starts: {
            end: /\{\{\{\{\//,
            returnEnd: true,
            subLanguage: "xml",
          },
        },
        {
          className: "template-tag",
          begin: /\{\{\{\{\//,
          end: /\}\}\}\}/,
          contains: [CLOSING_BLOCK_MUSTACHE_CONTENTS],
        },
        {
          className: "template-tag",
          begin: /\{\{#/,
          end: /\}\}/,
          contains: [OPENING_BLOCK_MUSTACHE_CONTENTS],
        },
        {
          className: "template-tag",
          begin: /\{\{(?=else\}\})/,
          end: /\}\}/,
          keywords: "else",
        },
        {
          className: "template-tag",
          begin: /\{\{(?=else if)/,
          end: /\}\}/,
          keywords: "else if",
        },
        {
          className: "template-tag",
          begin: /\{\{\//,
          end: /\}\}/,
          contains: [CLOSING_BLOCK_MUSTACHE_CONTENTS],
        },
        {
          className: "template-variable",
          begin: /\{\{\{/,
          end: /\}\}\}/,
          contains: [BASIC_MUSTACHE_CONTENTS],
        },
        {
          className: "template-variable",
          begin: /\{\{/,
          end: /\}\}/,
          contains: [BASIC_MUSTACHE_CONTENTS],
        },
      ],
    };
  }
  cjsModule.exports = handlebars;
});
export { require_handlebars };
