/**
 * highlight.js/lib/languages/vala.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:507047-507954 cjs-fingerprint
var require_vala = __commonJS(function (cjsExports, cjsModule) {
  function vala(hljs) {
    return {
      name: "Vala",
      keywords: {
        keyword:
          "char uchar unichar int uint long ulong short ushort int8 int16 int32 int64 uint8 uint16 uint32 uint64 float double bool struct enum string void weak unowned owned async signal static abstract interface override virtual delegate if while do for foreach else switch case break default return try catch public private protected internal using new this get set const stdout stdin stderr var",
        built_in: "DBus GLib CCode Gee Object Gtk Posix",
        literal: "false true null",
      },
      contains: [
        {
          className: "class",
          beginKeywords: "class interface namespace",
          end: /\{/,
          excludeEnd: true,
          illegal: "[^,:\\n\\s\\.]",
          contains: [hljs.UNDERSCORE_TITLE_MODE],
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "string",
          begin: '"""',
          end: '"""',
          relevance: 5,
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE,
        {
          className: "meta",
          begin: "^#",
          end: "$",
        },
      ],
    };
  }
  cjsModule.exports = vala;
});
export { require_vala };
