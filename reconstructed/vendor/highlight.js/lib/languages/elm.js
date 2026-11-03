/**
 * highlight.js/lib/languages/elm.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:128976-130149 cjs-fingerprint
var Yn = x(function (aE, Wn) {
  function ed(e) {
    let t = { variants: [e.COMMENT("--", "$"), e.COMMENT(/\{-/, /-\}/, { contains: ["self"] })] },
      n = { className: "type", begin: "\\b[A-Z][\\w']*", relevance: 0 },
      a = {
        begin: "\\(",
        end: "\\)",
        illegal: '"',
        contains: [{ className: "type", begin: "\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?" }, t],
      },
      s = { begin: /\{/, end: /\}/, contains: a.contains },
      o = { className: "string", begin: "'\\\\?.", end: "'", illegal: "." };
    return {
      name: "Elm",
      keywords: [
        "let",
        "in",
        "if",
        "then",
        "else",
        "case",
        "of",
        "where",
        "module",
        "import",
        "exposing",
        "type",
        "alias",
        "as",
        "infix",
        "infixl",
        "infixr",
        "port",
        "effect",
        "command",
        "subscription",
      ],
      contains: [
        {
          beginKeywords: "port effect module",
          end: "exposing",
          keywords: "port effect module where command subscription exposing",
          contains: [a, t],
          illegal: "\\W\\.|;",
        },
        { begin: "import", end: "$", keywords: "import as exposing", contains: [a, t], illegal: "\\W\\.|;" },
        { begin: "type", end: "$", keywords: "type alias", contains: [n, a, s, t] },
        { beginKeywords: "infix infixl infixr", end: "$", contains: [e.C_NUMBER_MODE, t] },
        { begin: "port", end: "$", keywords: "port", contains: [t] },
        o,
        e.QUOTE_STRING_MODE,
        e.C_NUMBER_MODE,
        n,
        e.inherit(e.TITLE_MODE, { begin: "^[_a-z][\\w']*" }),
        t,
        { begin: "->|<-" },
      ],
      illegal: /;/,
    };
  }
  Wn.exports = ed;
});

export { Yn };
