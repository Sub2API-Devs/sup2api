/**
 * highlight.js/lib/languages/scheme.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:416491-419934 cjs-fingerprint
var require_scheme = __commonJS(function (cjsExports, cjsModule) {
  function scheme(hljs) {
    let begin = "(-|\\+)?\\d+([./]\\d+)?[+\\-](-|\\+)?\\d+([./]\\d+)?i";
    let KEYWORDS = {
      $pattern: "[^\\(\\)\\[\\]\\{\\}\",'`;#|\\\\\\s]+",
      built_in:
        "case-lambda call/cc class define-class exit-handler field import inherit init-field interface let*-values let-values let/ec mixin opt-lambda override protect provide public rename require require-for-syntax syntax syntax-case syntax-error unit/sig unless when with-syntax and begin call-with-current-continuation call-with-input-file call-with-output-file case cond define define-syntax delay do dynamic-wind else for-each if lambda let let* let-syntax letrec letrec-syntax map or syntax-rules ' * + , ,@ - ... / ; < <= = => > >= ` abs acos angle append apply asin assoc assq assv atan boolean? caar cadr call-with-input-file call-with-output-file call-with-values car cdddar cddddr cdr ceiling char->integer char-alphabetic? char-ci<=? char-ci<? char-ci=? char-ci>=? char-ci>? char-downcase char-lower-case? char-numeric? char-ready? char-upcase char-upper-case? char-whitespace? char<=? char<? char=? char>=? char>? char? close-input-port close-output-port complex? cons cos current-input-port current-output-port denominator display eof-object? eq? equal? eqv? eval even? exact->inexact exact? exp expt floor force gcd imag-part inexact->exact inexact? input-port? integer->char integer? interaction-environment lcm length list list->string list->vector list-ref list-tail list? load log magnitude make-polar make-rectangular make-string make-vector max member memq memv min modulo negative? newline not null-environment null? number->string number? numerator odd? open-input-file open-output-file output-port? pair? peek-char port? positive? procedure? quasiquote quote quotient rational? rationalize read read-char real-part real? remainder reverse round scheme-report-environment set! set-car! set-cdr! sin sqrt string string->list string->number string->symbol string-append string-ci<=? string-ci<? string-ci=? string-ci>=? string-ci>? string-copy string-fill! string-length string-ref string-set! string<=? string<? string=? string>=? string>? string? substring symbol->string symbol? tan transcript-off transcript-on truncate values vector vector->list vector-fill! vector-length vector-ref vector-set! with-input-from-file with-output-to-file write write-char zero?",
    };
    let LITERAL = {
      className: "literal",
      begin: "(#t|#f|#\\\\[^\\(\\)\\[\\]\\{\\}\",'`;#|\\\\\\s]+|#\\\\.)",
    };
    let NUMBER = {
      className: "number",
      variants: [
        {
          begin: "(-|\\+)?\\d+([./]\\d+)?",
          relevance: 0,
        },
        {
          begin,
          relevance: 0,
        },
        {
          begin: "#b[0-1]+(/[0-1]+)?",
        },
        {
          begin: "#o[0-7]+(/[0-7]+)?",
        },
        {
          begin: "#x[0-9a-f]+(/[0-9a-f]+)?",
        },
      ],
    };
    let STRING = hljs.QUOTE_STRING_MODE;
    let COMMENT_MODES = [
      hljs.COMMENT(";", "$", {
        relevance: 0,
      }),
      hljs.COMMENT("#\\|", "\\|#"),
    ];
    let IDENT = {
      begin: "[^\\(\\)\\[\\]\\{\\}\",'`;#|\\\\\\s]+",
      relevance: 0,
    };
    let QUOTED_IDENT = {
      className: "symbol",
      begin: "'[^\\(\\)\\[\\]\\{\\}\",'`;#|\\\\\\s]+",
    };
    let BODY = {
      endsWithParent: true,
      relevance: 0,
    };
    let QUOTED_LIST = {
      variants: [
        {
          begin: /'/,
        },
        {
          begin: "`",
        },
      ],
      contains: [
        {
          begin: "\\(",
          end: "\\)",
          contains: ["self", LITERAL, STRING, NUMBER, IDENT, QUOTED_IDENT],
        },
      ],
    };
    let NAME = {
      className: "name",
      relevance: 0,
      begin: "[^\\(\\)\\[\\]\\{\\}\",'`;#|\\\\\\s]+",
      keywords: KEYWORDS,
    };
    let LIST = {
      variants: [
        {
          begin: "\\(",
          end: "\\)",
        },
        {
          begin: "\\[",
          end: "\\]",
        },
      ],
      contains: [
        {
          begin: /lambda/,
          endsWithParent: true,
          returnBegin: true,
          contains: [
            NAME,
            {
              endsParent: true,
              variants: [
                {
                  begin: /\(/,
                  end: /\)/,
                },
                {
                  begin: /\[/,
                  end: /\]/,
                },
              ],
              contains: [IDENT],
            },
          ],
        },
        NAME,
        BODY,
      ],
    };
    BODY.contains = [LITERAL, NUMBER, STRING, IDENT, QUOTED_IDENT, QUOTED_LIST, LIST].concat(COMMENT_MODES);
    return {
      name: "Scheme",
      aliases: ["scm"],
      illegal: /\S/,
      contains: [hljs.SHEBANG(), NUMBER, STRING, QUOTED_IDENT, QUOTED_LIST, LIST].concat(COMMENT_MODES),
    };
  }
  cjsModule.exports = scheme;
});
export { require_scheme };
