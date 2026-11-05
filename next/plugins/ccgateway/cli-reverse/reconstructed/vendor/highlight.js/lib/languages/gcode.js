/**
 * highlight.js/lib/languages/gcode.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:166152-167477 cjs-fingerprint
var require_gcode = __commonJS(function (cjsExports, cjsModule) {
  function gcode(hljs) {
    let regex = hljs.regex;
    let GCODE_KEYWORDS = {
      $pattern: /[A-Z]+|%/,
      keyword: [
        "THEN",
        "ELSE",
        "ENDIF",
        "IF",
        "GOTO",
        "DO",
        "WHILE",
        "WH",
        "END",
        "CALL",
        "SUB",
        "ENDSUB",
        "EQ",
        "NE",
        "LT",
        "GT",
        "LE",
        "GE",
        "AND",
        "OR",
        "XOR",
        "%",
      ],
      built_in: [
        "ATAN",
        "ABS",
        "ACOS",
        "ASIN",
        "COS",
        "EXP",
        "FIX",
        "FUP",
        "ROUND",
        "LN",
        "SIN",
        "SQRT",
        "TAN",
        "EXISTS",
      ],
    };
    let LETTER_BOUNDARY_RE = /\b/;
    function LETTER_BOUNDARY_CALLBACK(matchdata, response) {
      if (matchdata.index === 0) return;
      let charBeforeMatch = matchdata.input[matchdata.index - 1];
      if (charBeforeMatch >= "0" && charBeforeMatch <= "9") return;
      if (charBeforeMatch === "_") return;
      response.ignoreMatch();
    }
    let NUMBER_RE = /[+-]?((\.\d+)|(\d+)(\.\d*)?)/;
    let GENERAL_MISC_FUNCTION_RE = /[GM]\s*\d+(\.\d+)?/;
    let TOOLS_RE = /T\s*\d+/;
    let SUBROUTINE_RE = /O\s*\d+/;
    let SUBROUTINE_NAMED_RE = /O<.+>/;
    let AXES_RE = /[ABCUVWXYZ]\s*/;
    let PARAMETERS_RE = /[FHIJKPQRS]\s*/;
    let GCODE_CODE = [
      hljs.COMMENT(/\(/, /\)/),
      hljs.COMMENT(/;/, /$/),
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        scope: "title.function",
        variants: [
          {
            match: regex.concat(LETTER_BOUNDARY_RE, GENERAL_MISC_FUNCTION_RE),
          },
          {
            begin: GENERAL_MISC_FUNCTION_RE,
            "on:begin": LETTER_BOUNDARY_CALLBACK,
          },
          {
            match: regex.concat(LETTER_BOUNDARY_RE, TOOLS_RE),
          },
          {
            begin: TOOLS_RE,
            "on:begin": LETTER_BOUNDARY_CALLBACK,
          },
        ],
      },
      {
        scope: "symbol",
        variants: [
          {
            match: regex.concat(LETTER_BOUNDARY_RE, SUBROUTINE_RE),
          },
          {
            begin: SUBROUTINE_RE,
            "on:begin": LETTER_BOUNDARY_CALLBACK,
          },
          {
            match: regex.concat(LETTER_BOUNDARY_RE, SUBROUTINE_NAMED_RE),
          },
          {
            begin: SUBROUTINE_NAMED_RE,
            "on:begin": LETTER_BOUNDARY_CALLBACK,
          },
          {
            match: /\*\s*\d+\s*$/,
          },
        ],
      },
      {
        scope: "operator",
        match: /^N\s*\d+/,
      },
      {
        scope: "variable",
        match: /-?#\s*\d+/,
      },
      {
        scope: "property",
        variants: [
          {
            match: regex.concat(LETTER_BOUNDARY_RE, AXES_RE, NUMBER_RE),
          },
          {
            begin: regex.concat(AXES_RE, NUMBER_RE),
            "on:begin": LETTER_BOUNDARY_CALLBACK,
          },
        ],
      },
      {
        scope: "params",
        variants: [
          {
            match: regex.concat(LETTER_BOUNDARY_RE, PARAMETERS_RE, NUMBER_RE),
          },
          {
            begin: regex.concat(PARAMETERS_RE, NUMBER_RE),
            "on:begin": LETTER_BOUNDARY_CALLBACK,
          },
        ],
      },
    ];
    return {
      name: "G-code (ISO 6983)",
      aliases: ["nc"],
      case_insensitive: true,
      disableAutodetect: true,
      keywords: GCODE_KEYWORDS,
      contains: GCODE_CODE,
    };
  }
  cjsModule.exports = gcode;
});
export { require_gcode };
