/**
 * lodash-es/_unicodeWords.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-47b8txen.js (7)
 * attribution: esm-layout 5, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasUnicodeWord, asciiWords_default } from "./_hasUnicodeWord.js";
import { toStringExport } from "./toString.js";

//@ chunk-47b8txen.js:3312-3321 esm-layout
var hasUnicode = hasUnicodeWord;
//@ chunk-47b8txen.js:3321-4539 esm-fingerprint
var rsAstralRange = "\\ud800-\\udfff";
var rsComboMarksRange = "\\u0300-\\u036f";
var reComboHalfMarksRange = "\\ufe20-\\ufe2f";
var rsComboSymbolsRange = "\\u20d0-\\u20ff";
var rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
var rsDingbatRange = "\\u2700-\\u27bf";
var rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff";
var rsMathOpRange = "\\xac\\xb1\\xd7\\xf7";
var rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf";
var rsPunctuationRange = "\\u2000-\\u206f";
var rsSpaceRange =
  " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000";
var rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde";
var rsVarRange = "\\ufe0e\\ufe0f";
var rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
var rsApos = "['\u2019]";
var rsBreak = "[" + rsBreakRange + "]";
var rsCombo_2 = "[" + rsComboRange + "]";
var rsDigits = "\\d+";
var rsDingbat = "[" + rsDingbatRange + "]";
var rsLower = "[" + rsLowerRange + "]";
var rsMisc =
  "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]";
var rsFitz = "\\ud83c[\\udffb-\\udfff]";
var rsModifier = "(?:" + rsCombo_2 + "|" + rsFitz + ")";
var rsNonAstral = "[^" + rsAstralRange + "]";
var rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}";
var rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]";
var rsUpper = "[" + rsUpperRange + "]";
var rsZWJ = "\\u200d";
var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")";
var rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")";
var rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?";
var rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?";
var reOptMod = rsModifier + "?";
var rsOptVar = "[" + rsVarRange + "]?";
var rsOptJoin =
  "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*";
var rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])";
var rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])";
var rsSeq = rsOptVar + reOptMod + rsOptJoin;
var rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq;
var unicodeWordsRe = RegExp(
  [
    rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
    rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
    rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
    rsUpper + "+" + rsOptContrUpper,
    rsOrdUpper,
    rsOrdLower,
    rsDigits,
    rsEmoji,
  ].join("|"),
  "g",
);
//@ chunk-47b8txen.js:4539-4577 esm-layout
function unicodeWords(string) {
  return string.match(unicodeWordsRe) || [];
}
//@ chunk-47b8txen.js:4577-4586 esm-layout
var unicodeWords_default = unicodeWords;
//@ chunk-47b8txen.js:4586-4685 esm-layout
function words(string, pattern, guard) {
  string = toStringExport(string);
  pattern = guard ? undefined : pattern;
  if (pattern === undefined)
    return hasUnicode(string) ? unicodeWords_default(string) : asciiWords_default(string);
  return string.match(pattern) || [];
}
//@ chunk-47b8txen.js:4685-4694 esm-layout
var import_words = words;
//@ chunk-47b8txen.js:4694-4731 esm-fingerprint
var reApos = "['\u2019]";
var reAposGlobal = RegExp(reApos, "g");
export { import_words, reAposGlobal };
