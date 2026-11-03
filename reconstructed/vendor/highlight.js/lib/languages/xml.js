/**
 * highlight.js/lib/languages/xml.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:554094-556013 cjs-fingerprint
var lc = x(function (Ib, cc) {
  function __(e) {
    let regex = e.regex,
      combined = regex.concat(/[\p{L}_]/u, regex.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u),
      a = /[\p{L}0-9._:-]+/u,
      s = { className: "symbol", begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/ },
      o = { begin: /\s/, contains: [{ className: "keyword", begin: /#?[a-z_][a-z1-9_-]+/, illegal: /\n/ }] },
      inherit = e.inherit(o, { begin: /\(/, end: /\)/ }),
      inherit_2 = e.inherit(e.APOS_STRING_MODE, { className: "string" }),
      inherit_3 = e.inherit(e.QUOTE_STRING_MODE, { className: "string" }),
      l = {
        endsWithParent: !0,
        illegal: /</,
        relevance: 0,
        contains: [
          { className: "attr", begin: a, relevance: 0 },
          {
            begin: /=\s*/,
            relevance: 0,
            contains: [
              {
                className: "string",
                endsParent: !0,
                variants: [
                  { begin: /"/, end: /"/, contains: [s] },
                  { begin: /'/, end: /'/, contains: [s] },
                  { begin: /[^\s"'=<>`]+/ },
                ],
              },
            ],
          },
        ],
      };
    return {
      name: "HTML, XML",
      aliases: ["html", "xhtml", "rss", "atom", "xjb", "xsd", "xsl", "plist", "wsf", "svg"],
      case_insensitive: !0,
      unicodeRegex: !0,
      contains: [
        {
          className: "meta",
          begin: /<![a-z]/,
          end: />/,
          relevance: 10,
          contains: [
            o,
            inherit_3,
            inherit_2,
            inherit,
            {
              begin: /\[/,
              end: /\]/,
              contains: [
                {
                  className: "meta",
                  begin: /<![a-z]/,
                  end: />/,
                  contains: [o, inherit, inherit_3, inherit_2],
                },
              ],
            },
          ],
        },
        e.COMMENT(/<!--/, /-->/, { relevance: 10 }),
        { begin: /<!\[CDATA\[/, end: /\]\]>/, relevance: 10 },
        s,
        {
          className: "meta",
          end: /\?>/,
          variants: [
            { begin: /<\?xml/, relevance: 10, contains: [inherit_3] },
            { begin: /<\?[a-z][a-z0-9]+/ },
          ],
        },
        {
          className: "tag",
          begin: /<style(?=\s|>)/,
          end: />/,
          keywords: { name: "style" },
          contains: [l],
          starts: { end: /<\/style>/, returnEnd: !0, subLanguage: ["css", "xml"] },
        },
        {
          className: "tag",
          begin: /<script(?=\s|>)/,
          end: />/,
          keywords: { name: "script" },
          contains: [l],
          starts: { end: /<\/script>/, returnEnd: !0, subLanguage: ["javascript", "handlebars", "xml"] },
        },
        { className: "tag", begin: /<>|<\/>/ },
        {
          className: "tag",
          begin: regex.concat(/</, regex.lookahead(regex.concat(combined, regex.either(/\/>/, />/, /\s/)))),
          end: /\/?>/,
          contains: [{ className: "name", begin: combined, relevance: 0, starts: l }],
        },
        {
          className: "tag",
          begin: regex.concat(/<\//, regex.lookahead(regex.concat(combined, />/))),
          contains: [
            { className: "name", begin: combined, relevance: 0 },
            { begin: />/, relevance: 0, endsParent: !0 },
          ],
        },
      ],
    };
  }
  cc.exports = __;
});

export { lc };
