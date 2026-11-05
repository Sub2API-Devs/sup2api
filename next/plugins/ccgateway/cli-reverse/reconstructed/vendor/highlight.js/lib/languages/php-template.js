/**
 * highlight.js/lib/languages/php-template.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:361952-362383 cjs-fingerprint
var require_php_template = __commonJS(function (cjsExports, cjsModule) {
  function phpTemplate(hljs) {
    return {
      name: "PHP template",
      subLanguage: "xml",
      contains: [
        {
          begin: /<\?(php|=)?/,
          end: /\?>/,
          subLanguage: "php",
          contains: [
            {
              begin: "/\\*",
              end: "\\*/",
              skip: true,
            },
            {
              begin: 'b"',
              end: '"',
              skip: true,
            },
            {
              begin: "b'",
              end: "'",
              skip: true,
            },
            hljs.inherit(hljs.APOS_STRING_MODE, {
              illegal: null,
              className: null,
              contains: null,
              skip: true,
            }),
            hljs.inherit(hljs.QUOTE_STRING_MODE, {
              illegal: null,
              className: null,
              contains: null,
              skip: true,
            }),
          ],
        },
      ],
    };
  }
  cjsModule.exports = phpTemplate;
});
export { require_php_template };
