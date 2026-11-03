/**
 * highlight.js/lib/languages/parser3.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:330060-330609 cjs-fingerprint
var Mi = x(function (bg, hi) {
  function xp(e) {
    let COMMENT = e.COMMENT(/\{/, /\}/, { contains: ["self"] });
    return {
      name: "Parser3",
      subLanguage: "xml",
      relevance: 0,
      contains: [
        e.COMMENT("^#", "$"),
        e.COMMENT(/\^rem\{/, /\}/, { relevance: 10, contains: [COMMENT] }),
        { className: "meta", begin: "^@(?:BASE|USE|CLASS|OPTIONS)$", relevance: 10 },
        { className: "title", begin: "@[\\w\\-]+\\[[\\w^;\\-]*\\](?:\\[[\\w^;\\-]*\\])?(?:.*)$" },
        { className: "variable", begin: /\$\{?[\w\-.:]+\}?/ },
        { className: "keyword", begin: /\^[\w\-.:]+/ },
        { className: "number", begin: "\\^#[0-9a-fA-F]+" },
        e.C_NUMBER_MODE,
      ],
    };
  }
  hi.exports = xp;
});

export { Mi };
