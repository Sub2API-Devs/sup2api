/**
 * highlight.js/lib/languages/autohotkey.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:34494-35394 cjs-fingerprint
var require_autohotkey = __commonJS(function (cjsExports, cjsModule) {
  function autohotkey(hljs) {
    let BACKTICK_ESCAPE = {
      begin: "`[\\s\\S]",
    };
    return {
      name: "AutoHotkey",
      case_insensitive: true,
      aliases: ["ahk"],
      keywords: {
        keyword:
          "Break Continue Critical Exit ExitApp Gosub Goto New OnExit Pause return SetBatchLines SetTimer Suspend Thread Throw Until ahk_id ahk_class ahk_pid ahk_exe ahk_group",
        literal: "true false NOT AND OR",
        built_in: "ComSpec Clipboard ClipboardAll ErrorLevel",
      },
      contains: [
        BACKTICK_ESCAPE,
        hljs.inherit(hljs.QUOTE_STRING_MODE, {
          contains: [BACKTICK_ESCAPE],
        }),
        hljs.COMMENT(";", "$", {
          relevance: 0,
        }),
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "number",
          begin: hljs.NUMBER_RE,
          relevance: 0,
        },
        {
          className: "variable",
          begin: "%[a-zA-Z0-9#_$@]+%",
        },
        {
          className: "built_in",
          begin: "^\\s*\\w+\\s*(,|%)",
        },
        {
          className: "title",
          variants: [
            {
              begin: '^[^\\n";]+::(?!=)',
            },
            {
              begin: '^[^\\n";]+:(?!=)',
              relevance: 0,
            },
          ],
        },
        {
          className: "meta",
          begin: "^\\s*#\\w+",
          end: "$",
          relevance: 0,
        },
        {
          className: "built_in",
          begin: "A_[a-zA-Z0-9]+",
        },
        {
          begin: ",\\s*,",
        },
      ],
    };
  }
  cjsModule.exports = autohotkey;
});
export { require_autohotkey };
