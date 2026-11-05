/**
 * highlight.js/lib/languages/swift.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:482907-491187 cjs-fingerprint
var require_swift = __commonJS(function (cjsExports, cjsModule) {
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;
    return re.source;
  }
  function lookahead(re) {
    return concat("(?=", re, ")");
  }
  function concat(...args) {
    return args.map((x) => source(x)).join("");
  }
  function stripOptionsFromArgs(args) {
    let opts = args[args.length - 1];
    if (typeof opts === "object" && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else return {};
  }
  function either(...args) {
    return (
      "(" + (stripOptionsFromArgs(args).capture ? "" : "?:") + args.map((x) => source(x)).join("|") + ")"
    );
  }
  var keywordWrapper = (keyword) => concat(/\b/, keyword, /\w$/.test(keyword) ? /\b/ : /\B/);
  var dotKeywords = ["Protocol", "Type"].map(keywordWrapper);
  var optionalDotKeywords = ["init", "self"].map(keywordWrapper);
  var keywordTypes = ["Any", "Self"];
  var keywords = [
    "actor",
    "any",
    "associatedtype",
    "async",
    "await",
    /as\?/,
    /as!/,
    "as",
    "borrowing",
    "break",
    "case",
    "catch",
    "class",
    "consume",
    "consuming",
    "continue",
    "convenience",
    "copy",
    "default",
    "defer",
    "deinit",
    "didSet",
    "distributed",
    "do",
    "dynamic",
    "each",
    "else",
    "enum",
    "extension",
    "fallthrough",
    /fileprivate\(set\)/,
    "fileprivate",
    "final",
    "for",
    "func",
    "get",
    "guard",
    "if",
    "import",
    "indirect",
    "infix",
    /init\?/,
    /init!/,
    "inout",
    /internal\(set\)/,
    "internal",
    "in",
    "is",
    "isolated",
    "nonisolated",
    "lazy",
    "let",
    "macro",
    "mutating",
    "nonmutating",
    /open\(set\)/,
    "open",
    "operator",
    "optional",
    "override",
    "package",
    "postfix",
    "precedencegroup",
    "prefix",
    /private\(set\)/,
    "private",
    "protocol",
    /public\(set\)/,
    "public",
    "repeat",
    "required",
    "rethrows",
    "return",
    "set",
    "some",
    "static",
    "struct",
    "subscript",
    "super",
    "switch",
    "throws",
    "throw",
    /try\?/,
    /try!/,
    "try",
    "typealias",
    /unowned\(safe\)/,
    /unowned\(unsafe\)/,
    "unowned",
    "var",
    "weak",
    "where",
    "while",
    "willSet",
  ];
  var literals = ["false", "nil", "true"];
  var precedencegroupKeywords = [
    "assignment",
    "associativity",
    "higherThan",
    "left",
    "lowerThan",
    "none",
    "right",
  ];
  var numberSignKeywords = [
    "#colorLiteral",
    "#column",
    "#dsohandle",
    "#else",
    "#elseif",
    "#endif",
    "#error",
    "#file",
    "#fileID",
    "#fileLiteral",
    "#filePath",
    "#function",
    "#if",
    "#imageLiteral",
    "#keyPath",
    "#line",
    "#selector",
    "#sourceLocation",
    "#warning",
  ];
  var builtIns = [
    "abs",
    "all",
    "any",
    "assert",
    "assertionFailure",
    "debugPrint",
    "dump",
    "fatalError",
    "getVaList",
    "isKnownUniquelyReferenced",
    "max",
    "min",
    "numericCast",
    "pointwiseMax",
    "pointwiseMin",
    "precondition",
    "preconditionFailure",
    "print",
    "readLine",
    "repeatElement",
    "sequence",
    "stride",
    "swap",
    "swift_unboxFromSwiftValueWithType",
    "transcode",
    "type",
    "unsafeBitCast",
    "unsafeDowncast",
    "withExtendedLifetime",
    "withUnsafeMutablePointer",
    "withUnsafePointer",
    "withVaList",
    "withoutActuallyEscaping",
    "zip",
  ];
  var operatorHead = either(
    /[/=\-+!*%<>&|^~?]/,
    /[\u00A1-\u00A7]/,
    /[\u00A9\u00AB]/,
    /[\u00AC\u00AE]/,
    /[\u00B0\u00B1]/,
    /[\u00B6\u00BB\u00BF\u00D7\u00F7]/,
    /[\u2016-\u2017]/,
    /[\u2020-\u2027]/,
    /[\u2030-\u203E]/,
    /[\u2041-\u2053]/,
    /[\u2055-\u205E]/,
    /[\u2190-\u23FF]/,
    /[\u2500-\u2775]/,
    /[\u2794-\u2BFF]/,
    /[\u2E00-\u2E7F]/,
    /[\u3001-\u3003]/,
    /[\u3008-\u3020]/,
    /[\u3030]/,
  );
  var operatorCharacter = either(
    operatorHead,
    /[\u0300-\u036F]/,
    /[\u1DC0-\u1DFF]/,
    /[\u20D0-\u20FF]/,
    /[\uFE00-\uFE0F]/,
    /[\uFE20-\uFE2F]/,
  );
  var operator = concat(operatorHead, operatorCharacter, "*");
  var identifierHead = either(
    /[a-zA-Z_]/,
    /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/,
    /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/,
    /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/,
    /[\u1E00-\u1FFF]/,
    /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/,
    /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/,
    /[\u2C00-\u2DFF\u2E80-\u2FFF]/,
    /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/,
    /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/,
    /[\uFE47-\uFEFE\uFF00-\uFFFD]/,
  );
  var identifierCharacter = either(
    identifierHead,
    /\d/,
    /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/,
  );
  var identifier = concat(identifierHead, identifierCharacter, "*");
  var typeIdentifier = concat(/[A-Z]/, identifierCharacter, "*");
  var keywordAttributes = [
    "attached",
    "autoclosure",
    concat(/convention\(/, either("swift", "block", "c"), /\)/),
    "discardableResult",
    "dynamicCallable",
    "dynamicMemberLookup",
    "escaping",
    "freestanding",
    "frozen",
    "GKInspectable",
    "IBAction",
    "IBDesignable",
    "IBInspectable",
    "IBOutlet",
    "IBSegueAction",
    "inlinable",
    "main",
    "nonobjc",
    "NSApplicationMain",
    "NSCopying",
    "NSManaged",
    concat(/objc\(/, identifier, /\)/),
    "objc",
    "objcMembers",
    "propertyWrapper",
    "requires_stored_property_inits",
    "resultBuilder",
    "Sendable",
    "testable",
    "UIApplicationMain",
    "unchecked",
    "unknown",
    "usableFromInline",
    "warn_unqualified_access",
  ];
  var availabilityKeywords = [
    "iOS",
    "iOSApplicationExtension",
    "macOS",
    "macOSApplicationExtension",
    "macCatalyst",
    "macCatalystApplicationExtension",
    "watchOS",
    "watchOSApplicationExtension",
    "tvOS",
    "tvOSApplicationExtension",
    "swift",
  ];
  function swift(hljs) {
    let WHITESPACE = {
      match: /\s+/,
      relevance: 0,
    };
    let BLOCK_COMMENT = hljs.COMMENT("/\\*", "\\*/", {
      contains: ["self"],
    });
    let COMMENTS = [hljs.C_LINE_COMMENT_MODE, BLOCK_COMMENT];
    let DOT_KEYWORD = {
      match: [/\./, either(...dotKeywords, ...optionalDotKeywords)],
      className: {
        2: "keyword",
      },
    };
    let KEYWORD_GUARD = {
      match: concat(/\./, either(...keywords)),
      relevance: 0,
    };
    let PLAIN_KEYWORDS = keywords.filter((kw) => typeof kw === "string").concat(["_|0"]);
    let REGEX_KEYWORDS = keywords
      .filter((kw) => typeof kw !== "string")
      .concat(keywordTypes)
      .map(keywordWrapper);
    let KEYWORD = {
      variants: [
        {
          className: "keyword",
          match: either(...REGEX_KEYWORDS, ...optionalDotKeywords),
        },
      ],
    };
    let KEYWORDS = {
      $pattern: either(/\b\w+/, /#\w+/),
      keyword: PLAIN_KEYWORDS.concat(numberSignKeywords),
      literal: literals,
    };
    let KEYWORD_MODES = [DOT_KEYWORD, KEYWORD_GUARD, KEYWORD];
    let BUILT_IN_GUARD = {
      match: concat(/\./, either(...builtIns)),
      relevance: 0,
    };
    let BUILT_IN = {
      className: "built_in",
      match: concat(/\b/, either(...builtIns), /(?=\()/),
    };
    let BUILT_INS = [BUILT_IN_GUARD, BUILT_IN];
    let OPERATOR_GUARD = {
      match: /->/,
      relevance: 0,
    };
    let OPERATOR = {
      className: "operator",
      relevance: 0,
      variants: [
        {
          match: operator,
        },
        {
          match: `\\.(\\.|${operatorCharacter})+`,
        },
      ],
    };
    let OPERATORS = [OPERATOR_GUARD, OPERATOR];
    let decimalDigits = "([0-9]_*)+";
    let hexDigits = "([0-9a-fA-F]_*)+";
    let NUMBER = {
      className: "number",
      relevance: 0,
      variants: [
        {
          match: "\\b(([0-9]_*)+)(\\.(([0-9]_*)+))?([eE][+-]?(([0-9]_*)+))?\\b",
        },
        {
          match: "\\b0x(([0-9a-fA-F]_*)+)(\\.(([0-9a-fA-F]_*)+))?([pP][+-]?(([0-9]_*)+))?\\b",
        },
        {
          match: /\b0o([0-7]_*)+\b/,
        },
        {
          match: /\b0b([01]_*)+\b/,
        },
      ],
    };
    let ESCAPED_CHARACTER = (rawDelimiter = "") => ({
      className: "subst",
      variants: [
        {
          match: concat(/\\/, rawDelimiter, /[0\\tnr"']/),
        },
        {
          match: concat(/\\/, rawDelimiter, /u\{[0-9a-fA-F]{1,8}\}/),
        },
      ],
    });
    let ESCAPED_NEWLINE = (rawDelimiter = "") => ({
      className: "subst",
      match: concat(/\\/, rawDelimiter, /[\t ]*(?:[\r\n]|\r\n)/),
    });
    let INTERPOLATION = (rawDelimiter = "") => ({
      className: "subst",
      label: "interpol",
      begin: concat(/\\/, rawDelimiter, /\(/),
      end: /\)/,
    });
    let MULTILINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"""/),
      end: concat(/"""/, rawDelimiter),
      contains: [ESCAPED_CHARACTER(rawDelimiter), ESCAPED_NEWLINE(rawDelimiter), INTERPOLATION(rawDelimiter)],
    });
    let SINGLE_LINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"/),
      end: concat(/"/, rawDelimiter),
      contains: [ESCAPED_CHARACTER(rawDelimiter), INTERPOLATION(rawDelimiter)],
    });
    let STRING = {
      className: "string",
      variants: [
        MULTILINE_STRING(),
        MULTILINE_STRING("#"),
        MULTILINE_STRING("##"),
        MULTILINE_STRING("###"),
        SINGLE_LINE_STRING(),
        SINGLE_LINE_STRING("#"),
        SINGLE_LINE_STRING("##"),
        SINGLE_LINE_STRING("###"),
      ],
    };
    let REGEXP_CONTENTS = [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [hljs.BACKSLASH_ESCAPE],
      },
    ];
    let BARE_REGEXP_LITERAL = {
      begin: /\/[^\s](?=[^/\n]*\/)/,
      end: /\//,
      contains: REGEXP_CONTENTS,
    };
    let EXTENDED_REGEXP_LITERAL = (rawDelimiter) => {
      let begin = concat(rawDelimiter, /\//);
      let end = concat(/\//, rawDelimiter);
      return {
        begin,
        end,
        contains: [
          ...REGEXP_CONTENTS,
          {
            scope: "comment",
            begin: `#(?!.*${end})`,
            end: /$/,
          },
        ],
      };
    };
    let REGEXP = {
      scope: "regexp",
      variants: [
        EXTENDED_REGEXP_LITERAL("###"),
        EXTENDED_REGEXP_LITERAL("##"),
        EXTENDED_REGEXP_LITERAL("#"),
        BARE_REGEXP_LITERAL,
      ],
    };
    let QUOTED_IDENTIFIER = {
      match: concat(/`/, identifier, /`/),
    };
    let IMPLICIT_PARAMETER = {
      className: "variable",
      match: /\$\d+/,
    };
    let PROPERTY_WRAPPER_PROJECTION = {
      className: "variable",
      match: `\\$${identifierCharacter}+`,
    };
    let IDENTIFIERS = [QUOTED_IDENTIFIER, IMPLICIT_PARAMETER, PROPERTY_WRAPPER_PROJECTION];
    let AVAILABLE_ATTRIBUTE = {
      match: /(@|#(un)?)available/,
      scope: "keyword",
      starts: {
        contains: [
          {
            begin: /\(/,
            end: /\)/,
            keywords: availabilityKeywords,
            contains: [...OPERATORS, NUMBER, STRING],
          },
        ],
      },
    };
    let KEYWORD_ATTRIBUTE = {
      scope: "keyword",
      match: concat(/@/, either(...keywordAttributes), lookahead(either(/\(/, /\s+/))),
    };
    let USER_DEFINED_ATTRIBUTE = {
      scope: "meta",
      match: concat(/@/, identifier),
    };
    let ATTRIBUTES = [AVAILABLE_ATTRIBUTE, KEYWORD_ATTRIBUTE, USER_DEFINED_ATTRIBUTE];
    let TYPE = {
      match: lookahead(/\b[A-Z]/),
      relevance: 0,
      contains: [
        {
          className: "type",
          match: concat(
            /(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/,
            identifierCharacter,
            "+",
          ),
        },
        {
          className: "type",
          match: typeIdentifier,
          relevance: 0,
        },
        {
          match: /[?!]+/,
          relevance: 0,
        },
        {
          match: /\.\.\./,
          relevance: 0,
        },
        {
          match: concat(/\s+&\s+/, lookahead(typeIdentifier)),
          relevance: 0,
        },
      ],
    };
    let GENERIC_ARGUMENTS = {
      begin: /</,
      end: />/,
      keywords: KEYWORDS,
      contains: [...COMMENTS, ...KEYWORD_MODES, ...ATTRIBUTES, OPERATOR_GUARD, TYPE],
    };
    TYPE.contains.push(GENERIC_ARGUMENTS);
    let TUPLE_ELEMENT_NAME = {
      match: concat(identifier, /\s*:/),
      keywords: "_|0",
      relevance: 0,
    };
    let TUPLE = {
      begin: /\(/,
      end: /\)/,
      relevance: 0,
      keywords: KEYWORDS,
      contains: [
        "self",
        TUPLE_ELEMENT_NAME,
        ...COMMENTS,
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE,
      ],
    };
    let GENERIC_PARAMETERS = {
      begin: /</,
      end: />/,
      keywords: "repeat each",
      contains: [...COMMENTS, TYPE],
    };
    let FUNCTION_PARAMETER_NAME = {
      begin: either(
        lookahead(concat(identifier, /\s*:/)),
        lookahead(concat(identifier, /\s+/, identifier, /\s*:/)),
      ),
      end: /:/,
      relevance: 0,
      contains: [
        {
          className: "keyword",
          match: /\b_\b/,
        },
        {
          className: "params",
          match: identifier,
        },
      ],
    };
    let FUNCTION_PARAMETERS = {
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      contains: [
        FUNCTION_PARAMETER_NAME,
        ...COMMENTS,
        ...KEYWORD_MODES,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...ATTRIBUTES,
        TYPE,
        TUPLE,
      ],
      endsParent: true,
      illegal: /["']/,
    };
    let FUNCTION_OR_MACRO = {
      match: [/(func|macro)/, /\s+/, either(QUOTED_IDENTIFIER.match, identifier, operator)],
      className: {
        1: "keyword",
        3: "title.function",
      },
      contains: [GENERIC_PARAMETERS, FUNCTION_PARAMETERS, WHITESPACE],
      illegal: [/\[/, /%/],
    };
    let INIT_SUBSCRIPT = {
      match: [/\b(?:subscript|init[?!]?)/, /\s*(?=[<(])/],
      className: {
        1: "keyword",
      },
      contains: [GENERIC_PARAMETERS, FUNCTION_PARAMETERS, WHITESPACE],
      illegal: /\[|%/,
    };
    let OPERATOR_DECLARATION = {
      match: [/operator/, /\s+/, operator],
      className: {
        1: "keyword",
        3: "title",
      },
    };
    let PRECEDENCEGROUP = {
      begin: [/precedencegroup/, /\s+/, typeIdentifier],
      className: {
        1: "keyword",
        3: "title",
      },
      contains: [TYPE],
      keywords: [...precedencegroupKeywords, ...literals],
      end: /}/,
    };
    let CLASS_FUNC_DECLARATION = {
      match: [/class\b/, /\s+/, /func\b/, /\s+/, /\b[A-Za-z_][A-Za-z0-9_]*\b/],
      scope: {
        1: "keyword",
        3: "keyword",
        5: "title.function",
      },
    };
    let CLASS_VAR_DECLARATION = {
      match: [/class\b/, /\s+/, /var\b/],
      scope: {
        1: "keyword",
        3: "keyword",
      },
    };
    let TYPE_DECLARATION = {
      begin: [/(struct|protocol|class|extension|enum|actor)/, /\s+/, identifier, /\s*/],
      beginScope: {
        1: "keyword",
        3: "title.class",
      },
      keywords: KEYWORDS,
      contains: [
        GENERIC_PARAMETERS,
        ...KEYWORD_MODES,
        {
          begin: /:/,
          end: /\{/,
          keywords: KEYWORDS,
          contains: [
            {
              scope: "title.class.inherited",
              match: typeIdentifier,
            },
            ...KEYWORD_MODES,
          ],
          relevance: 0,
        },
      ],
    };
    for (let variant of STRING.variants) {
      let interpolation = variant.contains.find((mode) => mode.label === "interpol");
      interpolation.keywords = KEYWORDS;
      let submodes = [...KEYWORD_MODES, ...BUILT_INS, ...OPERATORS, NUMBER, STRING, ...IDENTIFIERS];
      interpolation.contains = [
        ...submodes,
        {
          begin: /\(/,
          end: /\)/,
          contains: ["self", ...submodes],
        },
      ];
    }
    return {
      name: "Swift",
      keywords: KEYWORDS,
      contains: [
        ...COMMENTS,
        FUNCTION_OR_MACRO,
        INIT_SUBSCRIPT,
        CLASS_FUNC_DECLARATION,
        CLASS_VAR_DECLARATION,
        TYPE_DECLARATION,
        OPERATOR_DECLARATION,
        PRECEDENCEGROUP,
        {
          beginKeywords: "import",
          end: /$/,
          contains: [...COMMENTS],
          relevance: 0,
        },
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE,
        TUPLE,
      ],
    };
  }
  cjsModule.exports = swift;
});
export { require_swift };
