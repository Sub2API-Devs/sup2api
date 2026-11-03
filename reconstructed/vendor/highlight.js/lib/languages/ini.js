/**
 * highlight.js/lib/languages/ini.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:198166-199129 cjs-fingerprint
var Xa = x(function (ME, Ya) {
  function hd(e) {
    let regex = e.regex,
      n = {
        className: "number",
        relevance: 0,
        variants: [{ begin: /([+-]+)?[\d]+_[\d_]+/ }, { begin: e.NUMBER_RE }],
      },
      COMMENT = e.COMMENT();
    COMMENT.variants = [
      { begin: /;/, end: /$/ },
      { begin: /#/, end: /$/ },
    ];
    let s = { className: "variable", variants: [{ begin: /\$[\w\d"][\w\d_]*/ }, { begin: /\$\{(.*?)\}/ }] },
      o = { className: "literal", begin: /\bon|off|true|false|yes|no\b/ },
      r = {
        className: "string",
        contains: [e.BACKSLASH_ESCAPE],
        variants: [
          { begin: "'''", end: "'''", relevance: 10 },
          { begin: '"""', end: '"""', relevance: 10 },
          { begin: '"', end: '"' },
          { begin: "'", end: "'" },
        ],
      },
      i = { begin: /\[/, end: /\]/, contains: [COMMENT, o, s, r, n, "self"], relevance: 0 },
      c = /[A-Za-z0-9_-]+/,
      l = /"(\\"|[^"])*"/,
      d = /'[^']*'/,
      either = regex.either(c, l, d),
      combined = regex.concat(either, "(\\s*\\.\\s*", either, ")*", regex.lookahead(/\s*=\s*[^#\s]/));
    return {
      name: "TOML, also INI",
      aliases: ["toml"],
      case_insensitive: !0,
      illegal: /\S/,
      contains: [
        COMMENT,
        { className: "section", begin: /\[+/, end: /\]+/ },
        { begin: combined, className: "attr", starts: { end: /$/, contains: [COMMENT, i, o, s, r, n] } },
      ],
    };
  }
  Ya.exports = hd;
});

export { Xa };
