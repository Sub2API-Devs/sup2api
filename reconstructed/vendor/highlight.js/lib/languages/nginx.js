/**
 * highlight.js/lib/languages/nginx.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:309437-310953 cjs-fingerprint
var mi = x(function (cg, pi) {
  function vp(e) {
    let regex = e.regex,
      n = {
        className: "variable",
        variants: [
          { begin: /\$\d+/ },
          { begin: /\$\{\w+\}/ },
          { begin: regex.concat(/[$@]/, e.UNDERSCORE_IDENT_RE) },
        ],
      },
      s = {
        endsWithParent: !0,
        keywords: {
          $pattern: /[a-z_]{2,}|\/dev\/poll/,
          literal: [
            "on",
            "off",
            "yes",
            "no",
            "true",
            "false",
            "none",
            "blocked",
            "debug",
            "info",
            "notice",
            "warn",
            "error",
            "crit",
            "select",
            "break",
            "last",
            "permanent",
            "redirect",
            "kqueue",
            "rtsig",
            "epoll",
            "poll",
            "/dev/poll",
          ],
        },
        relevance: 0,
        illegal: "=>",
        contains: [
          e.HASH_COMMENT_MODE,
          {
            className: "string",
            contains: [e.BACKSLASH_ESCAPE, n],
            variants: [
              { begin: /"/, end: /"/ },
              { begin: /'/, end: /'/ },
            ],
          },
          { begin: "([a-z]+):/", end: "\\s", endsWithParent: !0, excludeEnd: !0, contains: [n] },
          {
            className: "regexp",
            contains: [e.BACKSLASH_ESCAPE, n],
            variants: [
              { begin: "\\s\\^", end: "\\s|\\{|;", returnEnd: !0 },
              { begin: "~\\*?\\s+", end: "\\s|\\{|;", returnEnd: !0 },
              { begin: "\\*(\\.[a-z\\-]+)+" },
              { begin: "([a-z\\-]+\\.)+\\*" },
            ],
          },
          { className: "number", begin: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b" },
          { className: "number", begin: "\\b\\d+[kKmMgGdshdwy]?\\b", relevance: 0 },
          n,
        ],
      };
    return {
      name: "Nginx config",
      aliases: ["nginxconf"],
      contains: [
        e.HASH_COMMENT_MODE,
        {
          beginKeywords: "upstream location",
          end: /;|\{/,
          contains: s.contains,
          keywords: { section: "upstream location" },
        },
        {
          className: "section",
          begin: regex.concat(e.UNDERSCORE_IDENT_RE + regex.lookahead(/\s+\{/)),
          relevance: 0,
        },
        {
          begin: regex.lookahead(e.UNDERSCORE_IDENT_RE + "\\s"),
          end: ";|\\{",
          contains: [{ className: "attribute", begin: e.UNDERSCORE_IDENT_RE, starts: s }],
          relevance: 0,
        },
      ],
      illegal: "[^\\s\\}\\{]",
    };
  }
  pi.exports = vp;
});

export { mi };
