/**
 * highlight.js/lib/languages/rust.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:406633-409669 cjs-fingerprint
var require_rust = __commonJS(function (cjsExports, cjsModule) {
  function rust(hljs) {
    let regex = hljs.regex;
    let RAW_IDENTIFIER = /(r#)?/;
    let UNDERSCORE_IDENT_RE = regex.concat(RAW_IDENTIFIER, hljs.UNDERSCORE_IDENT_RE);
    let IDENT_RE = regex.concat(RAW_IDENTIFIER, hljs.IDENT_RE);
    let FUNCTION_INVOKE = {
      className: "title.function.invoke",
      relevance: 0,
      begin: regex.concat(/\b/, /(?!let|for|while|if|else|match\b)/, IDENT_RE, regex.lookahead(/\s*\(/)),
    };
    let NUMBER_SUFFIX = "([ui](8|16|32|64|128|size)|f(32|64))?";
    let KEYWORDS = [
      "abstract",
      "as",
      "async",
      "await",
      "become",
      "box",
      "break",
      "const",
      "continue",
      "crate",
      "do",
      "dyn",
      "else",
      "enum",
      "extern",
      "false",
      "final",
      "fn",
      "for",
      "if",
      "impl",
      "in",
      "let",
      "loop",
      "macro",
      "match",
      "mod",
      "move",
      "mut",
      "override",
      "priv",
      "pub",
      "ref",
      "return",
      "self",
      "Self",
      "static",
      "struct",
      "super",
      "trait",
      "true",
      "try",
      "type",
      "typeof",
      "union",
      "unsafe",
      "unsized",
      "use",
      "virtual",
      "where",
      "while",
      "yield",
    ];
    let LITERALS = ["true", "false", "Some", "None", "Ok", "Err"];
    let BUILTINS = [
      "drop ",
      "Copy",
      "Send",
      "Sized",
      "Sync",
      "Drop",
      "Fn",
      "FnMut",
      "FnOnce",
      "ToOwned",
      "Clone",
      "Debug",
      "PartialEq",
      "PartialOrd",
      "Eq",
      "Ord",
      "AsRef",
      "AsMut",
      "Into",
      "From",
      "Default",
      "Iterator",
      "Extend",
      "IntoIterator",
      "DoubleEndedIterator",
      "ExactSizeIterator",
      "SliceConcatExt",
      "ToString",
      "assert!",
      "assert_eq!",
      "bitflags!",
      "bytes!",
      "cfg!",
      "col!",
      "concat!",
      "concat_idents!",
      "debug_assert!",
      "debug_assert_eq!",
      "env!",
      "eprintln!",
      "panic!",
      "file!",
      "format!",
      "format_args!",
      "include_bytes!",
      "include_str!",
      "line!",
      "local_data_key!",
      "module_path!",
      "option_env!",
      "print!",
      "println!",
      "select!",
      "stringify!",
      "try!",
      "unimplemented!",
      "unreachable!",
      "vec!",
      "write!",
      "writeln!",
      "macro_rules!",
      "assert_ne!",
      "debug_assert_ne!",
    ];
    let TYPES = [
      "i8",
      "i16",
      "i32",
      "i64",
      "i128",
      "isize",
      "u8",
      "u16",
      "u32",
      "u64",
      "u128",
      "usize",
      "f32",
      "f64",
      "str",
      "char",
      "bool",
      "Box",
      "Option",
      "Result",
      "String",
      "Vec",
    ];
    return {
      name: "Rust",
      aliases: ["rs"],
      keywords: {
        $pattern: hljs.IDENT_RE + "!?",
        type: TYPES,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: BUILTINS,
      },
      illegal: "</",
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.COMMENT("/\\*", "\\*/", {
          contains: ["self"],
        }),
        hljs.inherit(hljs.QUOTE_STRING_MODE, {
          begin: /b?"/,
          illegal: null,
        }),
        {
          className: "symbol",
          begin: /'[a-zA-Z_][a-zA-Z0-9_]*(?!')/,
        },
        {
          scope: "string",
          variants: [
            {
              begin: /b?r(#*)"(.|\n)*?"\1(?!#)/,
            },
            {
              begin: /b?'/,
              end: /'/,
              contains: [
                {
                  scope: "char.escape",
                  match: /\\('|\w|x\w{2}|u\w{4}|U\w{8})/,
                },
              ],
            },
          ],
        },
        {
          className: "number",
          variants: [
            {
              begin: "\\b0b([01_]+)([ui](8|16|32|64|128|size)|f(32|64))?",
            },
            {
              begin: "\\b0o([0-7_]+)([ui](8|16|32|64|128|size)|f(32|64))?",
            },
            {
              begin: "\\b0x([A-Fa-f0-9_]+)([ui](8|16|32|64|128|size)|f(32|64))?",
            },
            {
              begin: "\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)([ui](8|16|32|64|128|size)|f(32|64))?",
            },
          ],
          relevance: 0,
        },
        {
          begin: [/fn/, /\s+/, UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.function",
          },
        },
        {
          className: "meta",
          begin: "#!?\\[",
          end: "\\]",
          contains: [
            {
              className: "string",
              begin: /"/,
              end: /"/,
              contains: [hljs.BACKSLASH_ESCAPE],
            },
          ],
        },
        {
          begin: [/let/, /\s+/, /(?:mut\s+)?/, UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "keyword",
            4: "variable",
          },
        },
        {
          begin: [/for/, /\s+/, UNDERSCORE_IDENT_RE, /\s+/, /in/],
          className: {
            1: "keyword",
            3: "variable",
            5: "keyword",
          },
        },
        {
          begin: [/type/, /\s+/, UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.class",
          },
        },
        {
          begin: [/(?:trait|enum|struct|union|impl|for)/, /\s+/, UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.class",
          },
        },
        {
          begin: hljs.IDENT_RE + "::",
          keywords: {
            keyword: "Self",
            built_in: BUILTINS,
            type: TYPES,
          },
        },
        {
          className: "punctuation",
          begin: "->",
        },
        FUNCTION_INVOKE,
      ],
    };
  }
  cjsModule.exports = rust;
});
export { require_rust };
