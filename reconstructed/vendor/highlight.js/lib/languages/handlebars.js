/**
 * highlight.js/lib/languages/handlebars.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:183653-185869 cjs-fingerprint
var ka = x(function (RE, xa) {
  function Ad(e) {
    let regex = e.regex,
      n = {
        $pattern: /[\w.\/]+/,
        built_in: [
          "action",
          "bindattr",
          "collection",
          "component",
          "concat",
          "debugger",
          "each",
          "each-in",
          "get",
          "hash",
          "if",
          "in",
          "input",
          "link-to",
          "loc",
          "log",
          "lookup",
          "mut",
          "outlet",
          "partial",
          "query-params",
          "render",
          "template",
          "textarea",
          "unbound",
          "unless",
          "view",
          "with",
          "yield",
        ],
      },
      a = { $pattern: /[\w.\/]+/, literal: ["true", "false", "undefined", "null"] },
      s = /""|"[^"]+"/,
      o = /''|'[^']+'/,
      r = /\[\]|\[[^\]]+\]/,
      i = /[^\s!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]+/,
      c = /(\.|\/)/,
      either = regex.either(s, o, r, i),
      combined = regex.concat(
        regex.optional(/\.|\.\/|\//),
        either,
        regex.anyNumberOfTimes(regex.concat(c, either)),
      ),
      combined_2 = regex.concat("(", r, "|", i, ")(?==)"),
      p = { begin: combined },
      inherit = e.inherit(p, { keywords: a }),
      E = { begin: /\(/, end: /\)/ },
      u = {
        className: "attr",
        begin: combined_2,
        relevance: 0,
        starts: {
          begin: /=/,
          end: /=/,
          starts: { contains: [e.NUMBER_MODE, e.QUOTE_STRING_MODE, e.APOS_STRING_MODE, inherit, E] },
        },
      },
      b = { begin: /as\s+\|/, keywords: { keyword: "as" }, end: /\|/, contains: [{ begin: /\w+/ }] },
      f = {
        contains: [e.NUMBER_MODE, e.QUOTE_STRING_MODE, e.APOS_STRING_MODE, b, u, inherit, E],
        returnEnd: !0,
      },
      inherit_2 = e.inherit(p, { className: "name", keywords: n, starts: e.inherit(f, { end: /\)/ }) });
    E.contains = [inherit_2];
    let inherit_3 = e.inherit(p, { keywords: n, className: "name", starts: e.inherit(f, { end: /\}\}/ }) }),
      inherit_4 = e.inherit(p, { keywords: n, className: "name" }),
      inherit_5 = e.inherit(p, { className: "name", keywords: n, starts: e.inherit(f, { end: /\}\}/ }) });
    return {
      name: "Handlebars",
      aliases: ["hbs", "html.hbs", "html.handlebars", "htmlbars"],
      case_insensitive: !0,
      subLanguage: "xml",
      contains: [
        { begin: /\\\{\{/, skip: !0 },
        { begin: /\\\\(?=\{\{)/, skip: !0 },
        e.COMMENT(/\{\{!--/, /--\}\}/),
        e.COMMENT(/\{\{!/, /\}\}/),
        {
          className: "template-tag",
          begin: /\{\{\{\{(?!\/)/,
          end: /\}\}\}\}/,
          contains: [inherit_3],
          starts: { end: /\{\{\{\{\//, returnEnd: !0, subLanguage: "xml" },
        },
        { className: "template-tag", begin: /\{\{\{\{\//, end: /\}\}\}\}/, contains: [inherit_4] },
        { className: "template-tag", begin: /\{\{#/, end: /\}\}/, contains: [inherit_3] },
        { className: "template-tag", begin: /\{\{(?=else\}\})/, end: /\}\}/, keywords: "else" },
        { className: "template-tag", begin: /\{\{(?=else if)/, end: /\}\}/, keywords: "else if" },
        { className: "template-tag", begin: /\{\{\//, end: /\}\}/, contains: [inherit_4] },
        { className: "template-variable", begin: /\{\{\{/, end: /\}\}\}/, contains: [inherit_5] },
        { className: "template-variable", begin: /\{\{/, end: /\}\}/, contains: [inherit_5] },
      ],
    };
  }
  xa.exports = Ad;
});

export { ka };
