/**
 * highlight.js/lib/languages/scala.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:414424-416491 cjs-fingerprint
var require_scala = __commonJS(function (cjsExports, cjsModule) {
  function scala(hljs) {
    let regex = hljs.regex;
    let ANNOTATION = {
      className: "meta",
      begin: "@[A-Za-z]+",
    };
    let SUBST = {
      className: "subst",
      variants: [
        {
          begin: "\\$[A-Za-z0-9_]+",
        },
        {
          begin: /\$\{/,
          end: /\}/,
        },
      ],
    };
    let STRING = {
      className: "string",
      variants: [
        {
          begin: '"""',
          end: '"""',
        },
        {
          begin: '"',
          end: '"',
          illegal: "\\n",
          contains: [hljs.BACKSLASH_ESCAPE],
        },
        {
          begin: '[a-z]+"',
          end: '"',
          illegal: "\\n",
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
        },
        {
          className: "string",
          begin: '[a-z]+"""',
          end: '"""',
          contains: [SUBST],
          relevance: 10,
        },
      ],
    };
    let TYPE = {
      className: "type",
      begin: "\\b[A-Z][A-Za-z0-9_]*",
      relevance: 0,
    };
    let NAME = {
      className: "title",
      begin: /[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,
      relevance: 0,
    };
    let CLASS = {
      className: "class",
      beginKeywords: "class object trait type",
      end: /[:={\[\n;]/,
      excludeEnd: true,
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          beginKeywords: "extends with",
          relevance: 10,
        },
        {
          begin: /\[/,
          end: /\]/,
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0,
          contains: [TYPE, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
        },
        {
          className: "params",
          begin: /\(/,
          end: /\)/,
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0,
          contains: [TYPE, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
        },
        NAME,
      ],
    };
    let METHOD = {
      className: "function",
      beginKeywords: "def",
      end: regex.lookahead(/[:={\[(\n;]/),
      contains: [NAME],
    };
    let EXTENSION = {
      begin: [/^\s*/, "extension", /\s+(?=[[(])/],
      beginScope: {
        2: "keyword",
      },
    };
    let END = {
      begin: [/^\s*/, /end/, /\s+/, /(extension\b)?/],
      beginScope: {
        2: "keyword",
        4: "keyword",
      },
    };
    let INLINE_MODES = [
      {
        match: /\.inline\b/,
      },
      {
        begin: /\binline(?=\s)/,
        keywords: "inline",
      },
    ];
    let USING_PARAM_CLAUSE = {
      begin: [/\(\s*/, /using/, /\s+(?!\))/],
      beginScope: {
        2: "keyword",
      },
    };
    return {
      name: "Scala",
      keywords: {
        literal: "true false null",
        keyword:
          "type yield lazy override def with val var sealed abstract private trait object if then forSome for while do throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit export enum given transparent",
      },
      contains: [
        {
          begin: ["//>", /\s+/, /using/, /\s+/, /\S+/],
          beginScope: {
            1: "comment",
            3: "keyword",
            5: "type",
          },
          end: /$/,
          contains: [
            {
              className: "string",
              begin: /\S+/,
            },
          ],
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        STRING,
        TYPE,
        METHOD,
        CLASS,
        hljs.C_NUMBER_MODE,
        EXTENSION,
        END,
        ...INLINE_MODES,
        USING_PARAM_CLAUSE,
        ANNOTATION,
      ],
    };
  }
  cjsModule.exports = scala;
});
export { require_scala };
