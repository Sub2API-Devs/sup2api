/**
 * highlight.js/lib/languages/latex.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:225925-229395 cjs-fingerprint
var require_latex = x(function (cjsExports, cjsModule) {
  function latex(hljs) {
    let begin = hljs.regex.either(
      ...[
        "(?:NeedsTeXFormat|RequirePackage|GetIdInfo)",
        "Provides(?:Expl)?(?:Package|Class|File)",
        "(?:DeclareOption|ProcessOptions)",
        "(?:documentclass|usepackage|input|include)",
        "makeat(?:letter|other)",
        "ExplSyntax(?:On|Off)",
        "(?:new|renew|provide)?command",
        "(?:re)newenvironment",
        "(?:New|Renew|Provide|Declare)(?:Expandable)?DocumentCommand",
        "(?:New|Renew|Provide|Declare)DocumentEnvironment",
        "(?:(?:e|g|x)?def|let)",
        "(?:begin|end)",
        "(?:part|chapter|(?:sub){0,2}section|(?:sub)?paragraph)",
        "caption",
        "(?:label|(?:eq|page|name)?ref|(?:paren|foot|super)?cite)",
        "(?:alpha|beta|[Gg]amma|[Dd]elta|(?:var)?epsilon|zeta|eta|[Tt]heta|vartheta)",
        "(?:iota|(?:var)?kappa|[Ll]ambda|mu|nu|[Xx]i|[Pp]i|varpi|(?:var)rho)",
        "(?:[Ss]igma|varsigma|tau|[Uu]psilon|[Pp]hi|varphi|chi|[Pp]si|[Oo]mega)",
        "(?:frac|sum|prod|lim|infty|times|sqrt|leq|geq|left|right|middle|[bB]igg?)",
        "(?:[lr]angle|q?quad|[lcvdi]?dots|d?dot|hat|tilde|bar)",
      ].map((word) => word + "(?![a-zA-Z@:_])"),
    );
    let L3_REGEX = new RegExp(
      [
        "(?:__)?[a-zA-Z]{2,}_[a-zA-Z](?:_?[a-zA-Z])+:[a-zA-Z]*",
        "[lgc]__?[a-zA-Z](?:_?[a-zA-Z])*_[a-zA-Z]{2,}",
        "[qs]__?[a-zA-Z](?:_?[a-zA-Z])+",
        "use(?:_i)?:[a-zA-Z]*",
        "(?:else|fi|or):",
        "(?:if|cs|exp):w",
        "(?:hbox|vbox):n",
        "::[a-zA-Z]_unbraced",
        "::[a-zA-Z:]",
      ]
        .map((pattern) => pattern + "(?![a-zA-Z:_])")
        .join("|"),
    );
    let L2_VARIANTS = [
      {
        begin: /[a-zA-Z@]+/,
      },
      {
        begin: /[^a-zA-Z@]?/,
      },
    ];
    let DOUBLE_CARET_VARIANTS = [
      {
        begin: /\^{6}[0-9a-f]{6}/,
      },
      {
        begin: /\^{5}[0-9a-f]{5}/,
      },
      {
        begin: /\^{4}[0-9a-f]{4}/,
      },
      {
        begin: /\^{3}[0-9a-f]{3}/,
      },
      {
        begin: /\^{2}[0-9a-f]{2}/,
      },
      {
        begin: /\^{2}[\u0000-\u007f]/,
      },
    ];
    let CONTROL_SEQUENCE = {
      className: "keyword",
      begin: /\\/,
      relevance: 0,
      contains: [
        {
          endsParent: true,
          begin,
        },
        {
          endsParent: true,
          begin: L3_REGEX,
        },
        {
          endsParent: true,
          variants: DOUBLE_CARET_VARIANTS,
        },
        {
          endsParent: true,
          relevance: 0,
          variants: L2_VARIANTS,
        },
      ],
    };
    let MACRO_PARAM = {
      className: "params",
      relevance: 0,
      begin: /#+\d?/,
    };
    let DOUBLE_CARET_CHAR = {
      variants: DOUBLE_CARET_VARIANTS,
    };
    let SPECIAL_CATCODE = {
      className: "built_in",
      relevance: 0,
      begin: /[$&^_]/,
    };
    let MAGIC_COMMENT = {
      className: "meta",
      begin: /% ?!(T[eE]X|tex|BIB|bib)/,
      end: "$",
      relevance: 10,
    };
    let COMMENT = hljs.COMMENT("%", "$", {
      relevance: 0,
    });
    let EVERYTHING_BUT_VERBATIM = [
      CONTROL_SEQUENCE,
      MACRO_PARAM,
      DOUBLE_CARET_CHAR,
      SPECIAL_CATCODE,
      MAGIC_COMMENT,
      COMMENT,
    ];
    let BRACE_GROUP_NO_VERBATIM = {
      begin: /\{/,
      end: /\}/,
      relevance: 0,
      contains: ["self", ...EVERYTHING_BUT_VERBATIM],
    };
    let ARGUMENT_BRACES = hljs.inherit(BRACE_GROUP_NO_VERBATIM, {
      relevance: 0,
      endsParent: true,
      contains: [BRACE_GROUP_NO_VERBATIM, ...EVERYTHING_BUT_VERBATIM],
    });
    let ARGUMENT_BRACKETS = {
      begin: /\[/,
      end: /\]/,
      endsParent: true,
      relevance: 0,
      contains: [BRACE_GROUP_NO_VERBATIM, ...EVERYTHING_BUT_VERBATIM],
    };
    let SPACE_GOBBLER = {
      begin: /\s+/,
      relevance: 0,
    };
    let ARGUMENT_M = [ARGUMENT_BRACES];
    let ARGUMENT_O = [ARGUMENT_BRACKETS];
    let ARGUMENT_AND_THEN = function (arg, starts_mode) {
      return {
        contains: [SPACE_GOBBLER],
        starts: {
          relevance: 0,
          contains: arg,
          starts: starts_mode,
        },
      };
    };
    let CSNAME = function (csname, starts_mode) {
      return {
        begin: "\\\\" + csname + "(?![a-zA-Z@:_])",
        keywords: {
          $pattern: /\\[a-zA-Z]+/,
          keyword: "\\" + csname,
        },
        relevance: 0,
        contains: [SPACE_GOBBLER],
        starts: starts_mode,
      };
    };
    let BEGIN_ENV = function (envname, starts_mode) {
      return hljs.inherit(
        {
          begin: "\\\\begin(?=[ \t]*(\\r?\\n[ \t]*)?\\{" + envname + "\\})",
          keywords: {
            $pattern: /\\[a-zA-Z]+/,
            keyword: "\\begin",
          },
          relevance: 0,
        },
        ARGUMENT_AND_THEN(ARGUMENT_M, starts_mode),
      );
    };
    let VERBATIM_DELIMITED_EQUAL = (innerName = "string") =>
      hljs.END_SAME_AS_BEGIN({
        className: innerName,
        begin: /(.|\r?\n)/,
        end: /(.|\r?\n)/,
        excludeBegin: true,
        excludeEnd: true,
        endsParent: true,
      });
    let VERBATIM_DELIMITED_ENV = function (envname) {
      return {
        className: "string",
        end: "(?=\\\\end\\{" + envname + "\\})",
      };
    };
    let VERBATIM_DELIMITED_BRACES = (innerName = "string") => ({
      relevance: 0,
      begin: /\{/,
      starts: {
        endsParent: true,
        contains: [
          {
            className: innerName,
            end: /(?=\})/,
            endsParent: true,
            contains: [
              {
                begin: /\{/,
                end: /\}/,
                relevance: 0,
                contains: ["self"],
              },
            ],
          },
        ],
      },
    });
    let VERBATIM = [
      ...["verb", "lstinline"].map((csname) =>
        CSNAME(csname, {
          contains: [VERBATIM_DELIMITED_EQUAL()],
        }),
      ),
      CSNAME(
        "mint",
        ARGUMENT_AND_THEN(ARGUMENT_M, {
          contains: [VERBATIM_DELIMITED_EQUAL()],
        }),
      ),
      CSNAME(
        "mintinline",
        ARGUMENT_AND_THEN(ARGUMENT_M, {
          contains: [VERBATIM_DELIMITED_BRACES(), VERBATIM_DELIMITED_EQUAL()],
        }),
      ),
      CSNAME("url", {
        contains: [VERBATIM_DELIMITED_BRACES("link"), VERBATIM_DELIMITED_BRACES("link")],
      }),
      CSNAME("hyperref", {
        contains: [VERBATIM_DELIMITED_BRACES("link")],
      }),
      CSNAME(
        "href",
        ARGUMENT_AND_THEN(ARGUMENT_O, {
          contains: [VERBATIM_DELIMITED_BRACES("link")],
        }),
      ),
      ...[].concat(
        ...["", "\\*"].map((suffix) => [
          BEGIN_ENV("verbatim" + suffix, VERBATIM_DELIMITED_ENV("verbatim" + suffix)),
          BEGIN_ENV(
            "filecontents" + suffix,
            ARGUMENT_AND_THEN(ARGUMENT_M, VERBATIM_DELIMITED_ENV("filecontents" + suffix)),
          ),
          ...["", "B", "L"].map((prefix) =>
            BEGIN_ENV(
              prefix + "Verbatim" + suffix,
              ARGUMENT_AND_THEN(ARGUMENT_O, VERBATIM_DELIMITED_ENV(prefix + "Verbatim" + suffix)),
            ),
          ),
        ]),
      ),
      BEGIN_ENV(
        "minted",
        ARGUMENT_AND_THEN(ARGUMENT_O, ARGUMENT_AND_THEN(ARGUMENT_M, VERBATIM_DELIMITED_ENV("minted"))),
      ),
    ];
    return {
      name: "LaTeX",
      aliases: ["tex"],
      contains: [...VERBATIM, ...EVERYTHING_BUT_VERBATIM],
    };
  }
  cjsModule.exports = latex;
});
export { require_latex };
