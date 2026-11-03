/**
 * highlight.js/lib/languages/oxygene.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:328178-330060 cjs-fingerprint
var yi = x(function (gg, Ci) {
  function wp(e) {
    let t = {
        $pattern: /\.?\w+/,
        keyword:
          "abstract add and array as asc aspect assembly async begin break block by case class concat const copy constructor continue create default delegate desc distinct div do downto dynamic each else empty end ensure enum equals event except exit extension external false final finalize finalizer finally flags for forward from function future global group has if implementation implements implies in index inherited inline interface into invariants is iterator join locked locking loop matching method mod module namespace nested new nil not notify nullable of old on operator or order out override parallel params partial pinned private procedure property protected public queryable raise read readonly record reintroduce remove repeat require result reverse sealed select self sequence set shl shr skip static step soft take then to true try tuple type union unit unsafe until uses using var virtual raises volatile where while with write xor yield await mapped deprecated stdcall cdecl pascal register safecall overload library platform reference packed strict published autoreleasepool selector strong weak unretained",
      },
      COMMENT = e.COMMENT(/\{/, /\}/, { relevance: 0 }),
      COMMENT_2 = e.COMMENT("\\(\\*", "\\*\\)", { relevance: 10 }),
      s = { className: "string", begin: "'", end: "'", contains: [{ begin: "''" }] },
      o = { className: "string", begin: "(#\\d+)+" },
      r = {
        beginKeywords: "function constructor destructor procedure method",
        end: "[:;]",
        keywords: "function constructor|10 destructor|10 procedure|10 method|10",
        contains: [
          e.inherit(e.TITLE_MODE, { scope: "title.function" }),
          { className: "params", begin: "\\(", end: "\\)", keywords: t, contains: [s, o] },
          COMMENT,
          COMMENT_2,
        ],
      },
      i = { scope: "punctuation", match: /;/, relevance: 0 };
    return {
      name: "Oxygene",
      case_insensitive: !0,
      keywords: t,
      illegal: '("|\\$[G-Zg-z]|\\/\\*|</|=>|->)',
      contains: [COMMENT, COMMENT_2, e.C_LINE_COMMENT_MODE, s, o, e.NUMBER_MODE, r, i],
    };
  }
  Ci.exports = wp;
});

export { yi };
