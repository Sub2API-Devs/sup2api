/**
 * highlight.js/lib/languages/markdown.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:275687-277786 cjs-fingerprint
var require_markdown = __commonJS(function (cjsExports, cjsModule) {
  function markdown(hljs) {
    let regex = hljs.regex;
    let INLINE_HTML = {
      begin: /<\/?[A-Za-z_]/,
      end: ">",
      subLanguage: "xml",
      relevance: 0,
    };
    let HORIZONTAL_RULE = {
      begin: "^[-\\*]{3,}",
      end: "$",
    };
    let CODE = {
      className: "code",
      variants: [
        {
          begin: "(`{3,})[^`](.|\\n)*?\\1`*[ ]*",
        },
        {
          begin: "(~{3,})[^~](.|\\n)*?\\1~*[ ]*",
        },
        {
          begin: "```",
          end: "```+[ ]*$",
        },
        {
          begin: "~~~",
          end: "~~~+[ ]*$",
        },
        {
          begin: "`.+?`",
        },
        {
          begin: "(?=^( {4}|\\t))",
          contains: [
            {
              begin: "^( {4}|\\t)",
              end: "(\\n)$",
            },
          ],
          relevance: 0,
        },
      ],
    };
    let LIST = {
      className: "bullet",
      begin: "^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)",
      end: "\\s+",
      excludeEnd: true,
    };
    let LINK_REFERENCE = {
      begin: /^\[[^\n]+\]:/,
      returnBegin: true,
      contains: [
        {
          className: "symbol",
          begin: /\[/,
          end: /\]/,
          excludeBegin: true,
          excludeEnd: true,
        },
        {
          className: "link",
          begin: /:\s*/,
          end: /$/,
          excludeBegin: true,
        },
      ],
    };
    let URL_SCHEME = /[A-Za-z][A-Za-z0-9+.-]*/;
    let LINK = {
      variants: [
        {
          begin: /\[.+?\]\[.*?\]/,
          relevance: 0,
        },
        {
          begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
          relevance: 2,
        },
        {
          begin: regex.concat(/\[.+?\]\(/, URL_SCHEME, /:\/\/.*?\)/),
          relevance: 2,
        },
        {
          begin: /\[.+?\]\([./?&#].*?\)/,
          relevance: 1,
        },
        {
          begin: /\[.*?\]\(.*?\)/,
          relevance: 0,
        },
      ],
      returnBegin: true,
      contains: [
        {
          match: /\[(?=\])/,
        },
        {
          className: "string",
          relevance: 0,
          begin: "\\[",
          end: "\\]",
          excludeBegin: true,
          returnEnd: true,
        },
        {
          className: "link",
          relevance: 0,
          begin: "\\]\\(",
          end: "\\)",
          excludeBegin: true,
          excludeEnd: true,
        },
        {
          className: "symbol",
          relevance: 0,
          begin: "\\]\\[",
          end: "\\]",
          excludeBegin: true,
          excludeEnd: true,
        },
      ],
    };
    let BOLD = {
      className: "strong",
      contains: [],
      variants: [
        {
          begin: /_{2}(?!\s)/,
          end: /_{2}/,
        },
        {
          begin: /\*{2}(?!\s)/,
          end: /\*{2}/,
        },
      ],
    };
    let ITALIC = {
      className: "emphasis",
      contains: [],
      variants: [
        {
          begin: /\*(?![*\s])/,
          end: /\*/,
        },
        {
          begin: /_(?![_\s])/,
          end: /_/,
          relevance: 0,
        },
      ],
    };
    let BOLD_WITHOUT_ITALIC = hljs.inherit(BOLD, {
      contains: [],
    });
    let ITALIC_WITHOUT_BOLD = hljs.inherit(ITALIC, {
      contains: [],
    });
    BOLD.contains.push(ITALIC_WITHOUT_BOLD);
    ITALIC.contains.push(BOLD_WITHOUT_ITALIC);
    let CONTAINABLE = [INLINE_HTML, LINK];
    [BOLD, ITALIC, BOLD_WITHOUT_ITALIC, ITALIC_WITHOUT_BOLD].forEach((m) => {
      m.contains = m.contains.concat(CONTAINABLE);
    });
    CONTAINABLE = CONTAINABLE.concat(BOLD, ITALIC);
    return {
      name: "Markdown",
      aliases: ["md", "mkdown", "mkd"],
      contains: [
        {
          className: "section",
          variants: [
            {
              begin: "^#{1,6}",
              end: "$",
              contains: CONTAINABLE,
            },
            {
              begin: "(?=^.+?\\n[=-]{2,}$)",
              contains: [
                {
                  begin: "^[=-]*$",
                },
                {
                  begin: "^",
                  end: "\\n",
                  contains: CONTAINABLE,
                },
              ],
            },
          ],
        },
        INLINE_HTML,
        LIST,
        BOLD,
        ITALIC,
        {
          className: "quote",
          begin: "^>\\s+",
          contains: CONTAINABLE,
          end: "$",
        },
        CODE,
        HORIZONTAL_RULE,
        LINK,
        LINK_REFERENCE,
        {
          scope: "literal",
          match: /&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/,
        },
      ],
    };
  }
  cjsModule.exports = markdown;
});
export { require_markdown };
