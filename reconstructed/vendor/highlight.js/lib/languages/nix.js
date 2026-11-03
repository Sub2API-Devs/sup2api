/**
 * highlight.js/lib/languages/nix.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:312633-316237 cjs-fingerprint
var require_nix = x(function (cjsExports, cjsModule) {
  function nix(hljs) {
    let regex = hljs.regex;
    let KEYWORDS = {
      keyword: ["assert", "else", "if", "in", "inherit", "let", "or", "rec", "then", "with"],
      literal: ["true", "false", "null"],
      built_in: [
        "abort",
        "baseNameOf",
        "builtins",
        "derivation",
        "derivationStrict",
        "dirOf",
        "fetchGit",
        "fetchMercurial",
        "fetchTarball",
        "fetchTree",
        "fromTOML",
        "import",
        "isNull",
        "map",
        "placeholder",
        "removeAttrs",
        "scopedImport",
        "throw",
        "toString",
      ],
    };
    let BUILTINS = {
      scope: "built_in",
      match: regex.either(
        ...[
          "abort",
          "add",
          "addDrvOutputDependencies",
          "addErrorContext",
          "all",
          "any",
          "appendContext",
          "attrNames",
          "attrValues",
          "baseNameOf",
          "bitAnd",
          "bitOr",
          "bitXor",
          "break",
          "builtins",
          "catAttrs",
          "ceil",
          "compareVersions",
          "concatLists",
          "concatMap",
          "concatStringsSep",
          "convertHash",
          "currentSystem",
          "currentTime",
          "deepSeq",
          "derivation",
          "derivationStrict",
          "dirOf",
          "div",
          "elem",
          "elemAt",
          "false",
          "fetchGit",
          "fetchMercurial",
          "fetchTarball",
          "fetchTree",
          "fetchurl",
          "filter",
          "filterSource",
          "findFile",
          "flakeRefToString",
          "floor",
          "foldl'",
          "fromJSON",
          "fromTOML",
          "functionArgs",
          "genList",
          "genericClosure",
          "getAttr",
          "getContext",
          "getEnv",
          "getFlake",
          "groupBy",
          "hasAttr",
          "hasContext",
          "hashFile",
          "hashString",
          "head",
          "import",
          "intersectAttrs",
          "isAttrs",
          "isBool",
          "isFloat",
          "isFunction",
          "isInt",
          "isList",
          "isNull",
          "isPath",
          "isString",
          "langVersion",
          "length",
          "lessThan",
          "listToAttrs",
          "map",
          "mapAttrs",
          "match",
          "mul",
          "nixPath",
          "nixVersion",
          "null",
          "parseDrvName",
          "parseFlakeRef",
          "partition",
          "path",
          "pathExists",
          "placeholder",
          "readDir",
          "readFile",
          "readFileType",
          "removeAttrs",
          "replaceStrings",
          "scopedImport",
          "seq",
          "sort",
          "split",
          "splitVersion",
          "storeDir",
          "storePath",
          "stringLength",
          "sub",
          "substring",
          "tail",
          "throw",
          "toFile",
          "toJSON",
          "toPath",
          "toString",
          "toXML",
          "trace",
          "traceVerbose",
          "true",
          "tryEval",
          "typeOf",
          "unsafeDiscardOutputDependency",
          "unsafeDiscardStringContext",
          "unsafeGetAttrPos",
          "warn",
          "zipAttrsWith",
        ].map((b) => `builtins\\.${b}`),
      ),
      relevance: 10,
    };
    let IDENTIFIER_REGEX = "[A-Za-z_][A-Za-z0-9_'-]*";
    let LOOKUP_PATH = {
      scope: "symbol",
      match: new RegExp("<[A-Za-z_][A-Za-z0-9_'-]*(/[A-Za-z_][A-Za-z0-9_'-]*)*>"),
    };
    let PATH_PIECE = "[A-Za-z0-9_\\+\\.-]+";
    let PATH = {
      scope: "symbol",
      match: new RegExp("(\\.\\.|\\.|~)?/([A-Za-z0-9_\\+\\.-]+)?(/[A-Za-z0-9_\\+\\.-]+)*(?=[\\s;])"),
    };
    let OPERATOR_WITHOUT_MINUS_REGEX = regex.either(
      ...[
        "==",
        "=",
        "\\+\\+",
        "\\+",
        "<=",
        "<\\|",
        "<",
        ">=",
        ">",
        "->",
        "//",
        "/",
        "!=",
        "!",
        "\\|\\|",
        "\\|>",
        "\\?",
        "\\*",
        "&&",
      ],
    );
    let OPERATOR = {
      scope: "operator",
      match: regex.concat(OPERATOR_WITHOUT_MINUS_REGEX, /(?!-)/),
      relevance: 0,
    };
    let NUMBER = {
      scope: "number",
      match: new RegExp(`${hljs.NUMBER_RE}(?!-)`),
      relevance: 0,
    };
    let MINUS_OPERATOR = {
      variants: [
        {
          scope: "operator",
          beforeMatch: /\s/,
          begin: /-(?!>)/,
        },
        {
          begin: [new RegExp(`${hljs.NUMBER_RE}`), /-/, /(?!>)/],
          beginScope: {
            1: "number",
            2: "operator",
          },
        },
        {
          begin: [OPERATOR_WITHOUT_MINUS_REGEX, /-/, /(?!>)/],
          beginScope: {
            1: "operator",
            2: "operator",
          },
        },
      ],
      relevance: 0,
    };
    let ATTRS = {
      beforeMatch: /(^|\{|;)\s*/,
      begin: new RegExp("[A-Za-z_][A-Za-z0-9_'-]*(\\.[A-Za-z_][A-Za-z0-9_'-]*)*\\s*=(?!=)"),
      returnBegin: true,
      relevance: 0,
      contains: [
        {
          scope: "attr",
          match: new RegExp("[A-Za-z_][A-Za-z0-9_'-]*(\\.[A-Za-z_][A-Za-z0-9_'-]*)*(?=\\s*=)"),
          relevance: 0.2,
        },
      ],
    };
    let NORMAL_ESCAPED_DOLLAR = {
      scope: "char.escape",
      match: /\\\$/,
    };
    let INDENTED_ESCAPED_DOLLAR = {
      scope: "char.escape",
      match: /''\$/,
    };
    let ANTIQUOTE = {
      scope: "subst",
      begin: /\$\{/,
      end: /\}/,
      keywords: KEYWORDS,
    };
    let ESCAPED_DOUBLEQUOTE = {
      scope: "char.escape",
      match: /'''/,
    };
    let ESCAPED_LITERAL = {
      scope: "char.escape",
      match: /\\(?!\$)./,
    };
    let STRING = {
      scope: "string",
      variants: [
        {
          begin: "''",
          end: "''",
          contains: [INDENTED_ESCAPED_DOLLAR, ANTIQUOTE, ESCAPED_DOUBLEQUOTE, ESCAPED_LITERAL],
        },
        {
          begin: '"',
          end: '"',
          contains: [NORMAL_ESCAPED_DOLLAR, ANTIQUOTE, ESCAPED_LITERAL],
        },
      ],
    };
    let FUNCTION_PARAMS = {
      scope: "params",
      match: new RegExp("[A-Za-z_][A-Za-z0-9_'-]*\\s*:(?=\\s)"),
    };
    let EXPRESSIONS = [
      NUMBER,
      hljs.HASH_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.COMMENT(/\/\*\*(?!\/)/, /\*\//, {
        subLanguage: "markdown",
        relevance: 0,
      }),
      BUILTINS,
      STRING,
      LOOKUP_PATH,
      PATH,
      FUNCTION_PARAMS,
      ATTRS,
      MINUS_OPERATOR,
      OPERATOR,
    ];
    ANTIQUOTE.contains = EXPRESSIONS;
    let REPL = [
      {
        scope: "meta.prompt",
        match: /^nix-repl>(?=\s)/,
        relevance: 10,
      },
      {
        scope: "meta",
        beforeMatch: /\s+/,
        begin: /:([a-z]+|\?)/,
      },
    ];
    return {
      name: "Nix",
      aliases: ["nixos"],
      keywords: KEYWORDS,
      contains: EXPRESSIONS.concat(REPL),
    };
  }
  cjsModule.exports = nix;
});
export { require_nix };
