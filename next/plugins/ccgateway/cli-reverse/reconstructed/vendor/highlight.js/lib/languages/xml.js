/**
 * highlight.js/lib/languages/xml.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:554094-556013 cjs-fingerprint
var require_xml = __commonJS(function (cjsExports, cjsModule) {
  function xml(hljs) {
    let regex = hljs.regex;
    let TAG_NAME_RE = regex.concat(/[\p{L}_]/u, regex.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u);
    let XML_IDENT_RE = /[\p{L}0-9._:-]+/u;
    let XML_ENTITIES = {
      className: "symbol",
      begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/,
    };
    let XML_META_KEYWORDS = {
      begin: /\s/,
      contains: [
        {
          className: "keyword",
          begin: /#?[a-z_][a-z1-9_-]+/,
          illegal: /\n/,
        },
      ],
    };
    let XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
      begin: /\(/,
      end: /\)/,
    });
    let APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, {
      className: "string",
    });
    let QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, {
      className: "string",
    });
    let TAG_INTERNALS = {
      endsWithParent: true,
      illegal: /</,
      relevance: 0,
      contains: [
        {
          className: "attr",
          begin: XML_IDENT_RE,
          relevance: 0,
        },
        {
          begin: /=\s*/,
          relevance: 0,
          contains: [
            {
              className: "string",
              endsParent: true,
              variants: [
                {
                  begin: /"/,
                  end: /"/,
                  contains: [XML_ENTITIES],
                },
                {
                  begin: /'/,
                  end: /'/,
                  contains: [XML_ENTITIES],
                },
                {
                  begin: /[^\s"'=<>`]+/,
                },
              ],
            },
          ],
        },
      ],
    };
    return {
      name: "HTML, XML",
      aliases: ["html", "xhtml", "rss", "atom", "xjb", "xsd", "xsl", "plist", "wsf", "svg"],
      case_insensitive: true,
      unicodeRegex: true,
      contains: [
        {
          className: "meta",
          begin: /<![a-z]/,
          end: />/,
          relevance: 10,
          contains: [
            XML_META_KEYWORDS,
            QUOTE_META_STRING_MODE,
            APOS_META_STRING_MODE,
            XML_META_PAR_KEYWORDS,
            {
              begin: /\[/,
              end: /\]/,
              contains: [
                {
                  className: "meta",
                  begin: /<![a-z]/,
                  end: />/,
                  contains: [
                    XML_META_KEYWORDS,
                    XML_META_PAR_KEYWORDS,
                    QUOTE_META_STRING_MODE,
                    APOS_META_STRING_MODE,
                  ],
                },
              ],
            },
          ],
        },
        hljs.COMMENT(/<!--/, /-->/, {
          relevance: 10,
        }),
        {
          begin: /<!\[CDATA\[/,
          end: /\]\]>/,
          relevance: 10,
        },
        XML_ENTITIES,
        {
          className: "meta",
          end: /\?>/,
          variants: [
            {
              begin: /<\?xml/,
              relevance: 10,
              contains: [QUOTE_META_STRING_MODE],
            },
            {
              begin: /<\?[a-z][a-z0-9]+/,
            },
          ],
        },
        {
          className: "tag",
          begin: /<style(?=\s|>)/,
          end: />/,
          keywords: {
            name: "style",
          },
          contains: [TAG_INTERNALS],
          starts: {
            end: /<\/style>/,
            returnEnd: true,
            subLanguage: ["css", "xml"],
          },
        },
        {
          className: "tag",
          begin: /<script(?=\s|>)/,
          end: />/,
          keywords: {
            name: "script",
          },
          contains: [TAG_INTERNALS],
          starts: {
            end: /<\/script>/,
            returnEnd: true,
            subLanguage: ["javascript", "handlebars", "xml"],
          },
        },
        {
          className: "tag",
          begin: /<>|<\/>/,
        },
        {
          className: "tag",
          begin: regex.concat(
            /</,
            regex.lookahead(regex.concat(TAG_NAME_RE, regex.either(/\/>/, />/, /\s/))),
          ),
          end: /\/?>/,
          contains: [
            {
              className: "name",
              begin: TAG_NAME_RE,
              relevance: 0,
              starts: TAG_INTERNALS,
            },
          ],
        },
        {
          className: "tag",
          begin: regex.concat(/<\//, regex.lookahead(regex.concat(TAG_NAME_RE, />/))),
          contains: [
            {
              className: "name",
              begin: TAG_NAME_RE,
              relevance: 0,
            },
            {
              begin: />/,
              relevance: 0,
              endsParent: true,
            },
          ],
        },
      ],
    };
  }
  cjsModule.exports = xml;
});
export { require_xml };
