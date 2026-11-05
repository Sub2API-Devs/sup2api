/**
 * highlight.js/lib/languages/django.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:118155-119920 cjs-fingerprint
var require_django = __commonJS(function (cjsExports, cjsModule) {
  function django(hljs) {
    let FILTER = {
      begin: /\|[A-Za-z]+:?/,
      keywords: {
        name: "truncatewords removetags linebreaksbr yesno get_digit timesince random striptags filesizeformat escape linebreaks length_is ljust rjust cut urlize fix_ampersands title floatformat capfirst pprint divisibleby add make_list unordered_list urlencode timeuntil urlizetrunc wordcount stringformat linenumbers slice date dictsort dictsortreversed default_if_none pluralize lower join center default truncatewords_html upper length phone2numeric wordwrap time addslashes slugify first escapejs force_escape iriencode last safe safeseq truncatechars localize unlocalize localtime utc timezone",
      },
      contains: [hljs.QUOTE_STRING_MODE, hljs.APOS_STRING_MODE],
    };
    return {
      name: "Django",
      aliases: ["jinja"],
      case_insensitive: true,
      subLanguage: "xml",
      contains: [
        hljs.COMMENT(/\{%\s*comment\s*%\}/, /\{%\s*endcomment\s*%\}/),
        hljs.COMMENT(/\{#/, /#\}/),
        {
          className: "template-tag",
          begin: /\{%/,
          end: /%\}/,
          contains: [
            {
              className: "name",
              begin: /\w+/,
              keywords: {
                name: "comment endcomment load templatetag ifchanged endifchanged if endif firstof for endfor ifnotequal endifnotequal widthratio extends include spaceless endspaceless regroup ifequal endifequal ssi now with cycle url filter endfilter debug block endblock else autoescape endautoescape csrf_token empty elif endwith static trans blocktrans endblocktrans get_static_prefix get_media_prefix plural get_current_language language get_available_languages get_current_language_bidi get_language_info get_language_info_list localize endlocalize localtime endlocaltime timezone endtimezone get_current_timezone verbatim",
              },
              starts: {
                endsWithParent: true,
                keywords: "in by as",
                contains: [FILTER],
                relevance: 0,
              },
            },
          ],
        },
        {
          className: "template-variable",
          begin: /\{\{/,
          end: /\}\}/,
          contains: [FILTER],
        },
      ],
    };
  }
  cjsModule.exports = django;
});
export { require_django };
