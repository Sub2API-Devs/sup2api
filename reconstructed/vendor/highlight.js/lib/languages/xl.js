/**
 * highlight.js/lib/languages/xl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:552193-554094 cjs-fingerprint
var require_xl = __commonJS(function (cjsExports, cjsModule) {
  function xl(hljs) {
    let KWS = [
      "if",
      "then",
      "else",
      "do",
      "while",
      "until",
      "for",
      "loop",
      "import",
      "with",
      "is",
      "as",
      "where",
      "when",
      "by",
      "data",
      "constant",
      "integer",
      "real",
      "text",
      "name",
      "boolean",
      "symbol",
      "infix",
      "prefix",
      "postfix",
      "block",
      "tree",
    ];
    let BUILT_INS = [
      "in",
      "mod",
      "rem",
      "and",
      "or",
      "xor",
      "not",
      "abs",
      "sign",
      "floor",
      "ceil",
      "sqrt",
      "sin",
      "cos",
      "tan",
      "asin",
      "acos",
      "atan",
      "exp",
      "expm1",
      "log",
      "log2",
      "log10",
      "log1p",
      "pi",
      "at",
      "text_length",
      "text_range",
      "text_find",
      "text_replace",
      "contains",
      "page",
      "slide",
      "basic_slide",
      "title_slide",
      "title",
      "subtitle",
      "fade_in",
      "fade_out",
      "fade_at",
      "clear_color",
      "color",
      "line_color",
      "line_width",
      "texture_wrap",
      "texture_transform",
      "texture",
      "scale_?x",
      "scale_?y",
      "scale_?z?",
      "translate_?x",
      "translate_?y",
      "translate_?z?",
      "rotate_?x",
      "rotate_?y",
      "rotate_?z?",
      "rectangle",
      "circle",
      "ellipse",
      "sphere",
      "path",
      "line_to",
      "move_to",
      "quad_to",
      "curve_to",
      "theme",
      "background",
      "contents",
      "locally",
      "time",
      "mouse_?x",
      "mouse_?y",
      "mouse_buttons",
    ];
    let BUILTIN_MODULES = [
      "ObjectLoader",
      "Animate",
      "MovieCredits",
      "Slides",
      "Filters",
      "Shading",
      "Materials",
      "LensFlare",
      "Mapping",
      "VLCAudioVideo",
      "StereoDecoder",
      "PointCloud",
      "NetworkAccess",
      "RemoteControl",
      "RegExp",
      "ChromaKey",
      "Snowfall",
      "NodeJS",
      "Speech",
      "Charts",
    ];
    let KEYWORDS = {
      $pattern: /[a-zA-Z][a-zA-Z0-9_?]*/,
      keyword: KWS,
      literal: ["true", "false", "nil"],
      built_in: BUILT_INS.concat(BUILTIN_MODULES),
    };
    let DOUBLE_QUOTE_TEXT = {
      className: "string",
      begin: '"',
      end: '"',
      illegal: "\\n",
    };
    let SINGLE_QUOTE_TEXT = {
      className: "string",
      begin: "'",
      end: "'",
      illegal: "\\n",
    };
    let LONG_TEXT = {
      className: "string",
      begin: "<<",
      end: ">>",
    };
    let BASED_NUMBER = {
      className: "number",
      begin: "[0-9]+#[0-9A-Z_]+(\\.[0-9-A-Z_]+)?#?([Ee][+-]?[0-9]+)?",
    };
    let IMPORT = {
      beginKeywords: "import",
      end: "$",
      keywords: KEYWORDS,
      contains: [DOUBLE_QUOTE_TEXT],
    };
    let FUNCTION_DEFINITION = {
      className: "function",
      begin: /[a-z][^\n]*->/,
      returnBegin: true,
      end: /->/,
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {
          starts: {
            endsWithParent: true,
            keywords: KEYWORDS,
          },
        }),
      ],
    };
    return {
      name: "XL",
      aliases: ["tao"],
      keywords: KEYWORDS,
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        DOUBLE_QUOTE_TEXT,
        SINGLE_QUOTE_TEXT,
        LONG_TEXT,
        FUNCTION_DEFINITION,
        IMPORT,
        BASED_NUMBER,
        hljs.NUMBER_MODE,
      ],
    };
  }
  cjsModule.exports = xl;
});
export { require_xl };
