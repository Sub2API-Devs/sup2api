/**
 * highlight.js/lib/languages/yaml.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:561601-563704 cjs-fingerprint
var _c = x(function (yb, mc) {
  function E_(e) {
    let a = {
        className: "attr",
        variants: [
          { begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/ },
          { begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/ },
          { begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/ },
        ],
      },
      s = {
        className: "template-variable",
        variants: [
          { begin: /\{\{/, end: /\}\}/ },
          { begin: /%\{/, end: /\}/ },
        ],
      },
      o = {
        className: "string",
        relevance: 0,
        begin: /'/,
        end: /'/,
        contains: [{ match: /''/, scope: "char.escape", relevance: 0 }],
      },
      r = {
        className: "string",
        relevance: 0,
        variants: [{ begin: /"/, end: /"/ }, { begin: /\S+/ }],
        contains: [e.BACKSLASH_ESCAPE, s],
      },
      inherit = e.inherit(r, {
        variants: [
          { begin: /'/, end: /'/, contains: [{ begin: /''/, relevance: 0 }] },
          { begin: /"/, end: /"/ },
          { begin: /[^\s,{}[\]]+/ },
        ],
      }),
      c = "[0-9]{4}(-[0-9][0-9]){0,2}",
      l = "([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?",
      d = "(\\.[0-9]*)?",
      m = "([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?",
      p = {
        className: "number",
        begin:
          "\\b[0-9]{4}(-[0-9][0-9]){0,2}([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?(\\.[0-9]*)?([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?\\b",
      },
      _ = { end: ",", endsWithParent: !0, excludeEnd: !0, keywords: "true false yes no null", relevance: 0 },
      E = { begin: /\{/, end: /\}/, contains: [_], illegal: "\\n", relevance: 0 },
      u = { begin: "\\[", end: "\\]", contains: [_], illegal: "\\n", relevance: 0 },
      b = [
        a,
        { className: "meta", begin: "^---\\s*$", relevance: 10 },
        { className: "string", begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*" },
        {
          begin: "<%[%=-]?",
          end: "[%-]?%>",
          subLanguage: "ruby",
          excludeBegin: !0,
          excludeEnd: !0,
          relevance: 0,
        },
        { className: "type", begin: "!\\w+![\\w#;/?:@&=+$,.~*'()[\\]]+" },
        { className: "type", begin: "!<[\\w#;/?:@&=+$,.~*'()[\\]]+>" },
        { className: "type", begin: "![\\w#;/?:@&=+$,.~*'()[\\]]+" },
        { className: "type", begin: "!![\\w#;/?:@&=+$,.~*'()[\\]]+" },
        { className: "meta", begin: "&" + e.UNDERSCORE_IDENT_RE + "$" },
        { className: "meta", begin: "\\*" + e.UNDERSCORE_IDENT_RE + "$" },
        { className: "bullet", begin: "-(?=[ ]|$)", relevance: 0 },
        e.HASH_COMMENT_MODE,
        { beginKeywords: "true false yes no null", keywords: { literal: "true false yes no null" } },
        p,
        { className: "number", begin: e.C_NUMBER_RE + "\\b", relevance: 0 },
        E,
        u,
        o,
        r,
      ],
      f = [...b];
    return (
      f.pop(),
      f.push(inherit),
      (_.contains = f),
      { name: "YAML", case_insensitive: !0, aliases: ["yml"], contains: b }
    );
  }
  mc.exports = E_;
});

export { _c };
