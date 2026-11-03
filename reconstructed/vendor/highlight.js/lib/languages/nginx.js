/**
 * highlight.js/lib/languages/nginx.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:309437-310953 cjs-fingerprint
var require_nginx = x(function (cjsExports, cjsModule) {
  function nginx(hljs) {
    let regex = hljs.regex;
    let VAR = {
      className: "variable",
      variants: [
        {
          begin: /\$\d+/,
        },
        {
          begin: /\$\{\w+\}/,
        },
        {
          begin: regex.concat(/[$@]/, hljs.UNDERSCORE_IDENT_RE),
        },
      ],
    };
    let DEFAULT = {
      endsWithParent: true,
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
        hljs.HASH_COMMENT_MODE,
        {
          className: "string",
          contains: [hljs.BACKSLASH_ESCAPE, VAR],
          variants: [
            {
              begin: /"/,
              end: /"/,
            },
            {
              begin: /'/,
              end: /'/,
            },
          ],
        },
        {
          begin: "([a-z]+):/",
          end: "\\s",
          endsWithParent: true,
          excludeEnd: true,
          contains: [VAR],
        },
        {
          className: "regexp",
          contains: [hljs.BACKSLASH_ESCAPE, VAR],
          variants: [
            {
              begin: "\\s\\^",
              end: "\\s|\\{|;",
              returnEnd: true,
            },
            {
              begin: "~\\*?\\s+",
              end: "\\s|\\{|;",
              returnEnd: true,
            },
            {
              begin: "\\*(\\.[a-z\\-]+)+",
            },
            {
              begin: "([a-z\\-]+\\.)+\\*",
            },
          ],
        },
        {
          className: "number",
          begin: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b",
        },
        {
          className: "number",
          begin: "\\b\\d+[kKmMgGdshdwy]?\\b",
          relevance: 0,
        },
        VAR,
      ],
    };
    return {
      name: "Nginx config",
      aliases: ["nginxconf"],
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          beginKeywords: "upstream location",
          end: /;|\{/,
          contains: DEFAULT.contains,
          keywords: {
            section: "upstream location",
          },
        },
        {
          className: "section",
          begin: regex.concat(hljs.UNDERSCORE_IDENT_RE + regex.lookahead(/\s+\{/)),
          relevance: 0,
        },
        {
          begin: regex.lookahead(hljs.UNDERSCORE_IDENT_RE + "\\s"),
          end: ";|\\{",
          contains: [
            {
              className: "attribute",
              begin: hljs.UNDERSCORE_IDENT_RE,
              starts: DEFAULT,
            },
          ],
          relevance: 0,
        },
      ],
      illegal: "[^\\s\\}\\{]",
    };
  }
  cjsModule.exports = nginx;
});
export { require_nginx };
