/**
 * highlight.js/lib/languages/properties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:373395-374067 cjs-fingerprint
var require_properties = __commonJS(function (cjsExports, cjsModule) {
  function properties(hljs) {
    let EQUAL_DELIM = "[ \\t\\f]*[:=][ \\t\\f]*";
    let WS1 = "[ \\t\\f]+";
    let end = "(" + EQUAL_DELIM + "|[ \\t\\f]+)";
    let KEY = "([^\\\\:= \\t\\f\\n]|\\\\.)+";
    let DELIM_AND_VALUE = {
      end,
      relevance: 0,
      starts: {
        className: "string",
        end: /$/,
        relevance: 0,
        contains: [
          {
            begin: "\\\\\\\\",
          },
          {
            begin: "\\\\\\n",
          },
        ],
      },
    };
    return {
      name: ".properties",
      disableAutodetect: true,
      case_insensitive: true,
      illegal: /\S/,
      contains: [
        hljs.COMMENT("^\\s*[!#]", "$"),
        {
          returnBegin: true,
          variants: [
            {
              begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+" + EQUAL_DELIM,
            },
            {
              begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+[ \\t\\f]+",
            },
          ],
          contains: [
            {
              className: "attr",
              begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+",
              endsParent: true,
            },
          ],
          starts: DELIM_AND_VALUE,
        },
        {
          className: "attr",
          begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+[ \\t\\f]*$",
        },
      ],
    };
  }
  cjsModule.exports = properties;
});
export { require_properties };
