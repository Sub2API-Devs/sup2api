/**
 * highlight.js/lib/languages/qml.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:385534-388349 cjs-fingerprint
var require_qml = __commonJS(function (cjsExports, cjsModule) {
  function qml(hljs) {
    let regex = hljs.regex;
    let KEYWORDS = {
      keyword:
        "in of on if for while finally var new function do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const export super debugger as async await import",
      literal: "true false null undefined NaN Infinity",
      built_in:
        "eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect Behavior bool color coordinate date double enumeration font geocircle georectangle geoshape int list matrix4x4 parent point quaternion real rect size string url variant vector2d vector3d vector4d Promise",
    };
    let QML_IDENT_RE = "[a-zA-Z_][a-zA-Z0-9\\._]*";
    let PROPERTY = {
      className: "keyword",
      begin: "\\bproperty\\b",
      starts: {
        className: "string",
        end: "(:|=|;|,|//|/\\*|$)",
        returnEnd: true,
      },
    };
    let SIGNAL = {
      className: "keyword",
      begin: "\\bsignal\\b",
      starts: {
        className: "string",
        end: "(\\(|:|=|;|,|//|/\\*|$)",
        returnEnd: true,
      },
    };
    let ID_ID = {
      className: "attribute",
      begin: "\\bid\\s*:",
      starts: {
        className: "string",
        end: "[a-zA-Z_][a-zA-Z0-9\\._]*",
        returnEnd: false,
      },
    };
    let QML_ATTRIBUTE = {
      begin: "[a-zA-Z_][a-zA-Z0-9\\._]*\\s*:",
      returnBegin: true,
      contains: [
        {
          className: "attribute",
          begin: "[a-zA-Z_][a-zA-Z0-9\\._]*",
          end: "\\s*:",
          excludeEnd: true,
          relevance: 0,
        },
      ],
      relevance: 0,
    };
    let QML_OBJECT = {
      begin: regex.concat("[a-zA-Z_][a-zA-Z0-9\\._]*", /\s*\{/),
      end: /\{/,
      returnBegin: true,
      relevance: 0,
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {
          begin: "[a-zA-Z_][a-zA-Z0-9\\._]*",
        }),
      ],
    };
    return {
      name: "QML",
      aliases: ["qt"],
      case_insensitive: false,
      keywords: KEYWORDS,
      contains: [
        {
          className: "meta",
          begin: /^\s*['"]use (strict|asm)['"]/,
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          className: "string",
          begin: "`",
          end: "`",
          contains: [
            hljs.BACKSLASH_ESCAPE,
            {
              className: "subst",
              begin: "\\$\\{",
              end: "\\}",
            },
          ],
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "number",
          variants: [
            {
              begin: "\\b(0[bB][01]+)",
            },
            {
              begin: "\\b(0[oO][0-7]+)",
            },
            {
              begin: hljs.C_NUMBER_RE,
            },
          ],
          relevance: 0,
        },
        {
          begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
          keywords: "return throw case",
          contains: [
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            hljs.REGEXP_MODE,
            {
              begin: /</,
              end: />\s*[);\]]/,
              relevance: 0,
              subLanguage: "xml",
            },
          ],
          relevance: 0,
        },
        SIGNAL,
        PROPERTY,
        {
          className: "function",
          beginKeywords: "function",
          end: /\{/,
          excludeEnd: true,
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              begin: /[A-Za-z$_][0-9A-Za-z$_]*/,
            }),
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              excludeBegin: true,
              excludeEnd: true,
              contains: [hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
            },
          ],
          illegal: /\[|%/,
        },
        {
          begin: "\\." + hljs.IDENT_RE,
          relevance: 0,
        },
        ID_ID,
        QML_ATTRIBUTE,
        QML_OBJECT,
      ],
      illegal: /#/,
    };
  }
  cjsModule.exports = qml;
});
export { require_qml };
