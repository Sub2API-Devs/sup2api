/**
 * lodash-es/upperFirst.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-7jxyna5q.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { baseSliceAlias as baseSliceAlias_2 } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { toStringExport } from "./toString.js";

//@ chunk-7jxyna5q.js:501558-501638 placement
function baseSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return !start && end >= length ? array : baseSliceAlias_2(array, start, end);
}
//@ chunk-7jxyna5q.js:501638-501648 placement
var baseSliceAlias = baseSlice;
//@ chunk-7jxyna5q.js:501648-501812 placement
var rsAstralRange = "\\ud800-\\udfff";
var rsComboMarksRange = "\\u0300-\\u036f";
var rsComboSymbolsRange = "\\ufe20-\\ufe2f";
var rsDingbatRange = "\\u20d0-\\u20ff";
var rsComboRange = rsComboMarksRange + rsComboSymbolsRange + rsDingbatRange;
var rsVarRange = "\\ufe0e\\ufe0f";
var rsZWJ = "\\u200d";
var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
//@ chunk-7jxyna5q.js:501812-501845 placement
function hasUnicode(string) {
  return reHasUnicode.test(string);
}
//@ chunk-7jxyna5q.js:501845-501855 placement
var hasUnicodeAlias = hasUnicode;
//@ chunk-7jxyna5q.js:501855-501889 placement
function asciiToArray(string) {
  return string.split("");
}
//@ chunk-7jxyna5q.js:501889-501899 placement
var asciiToArrayAlias = asciiToArray;
//@ chunk-7jxyna5q.js:501899-502381 placement
var rsUnicodeAstralRange = "\\ud800-\\udfff";
var rsUnicodeComboMarksRange = "\\u0300-\\u036f";
var rsUnicodeComboSymbolsRange = "\\ufe20-\\ufe2f";
var rsUnicodeDingbatRange = "\\u20d0-\\u20ff";
var rsUnicodeComboRange = rsUnicodeComboMarksRange + rsUnicodeComboSymbolsRange + rsUnicodeDingbatRange;
var rsUnicodeVarRange = "\\ufe0e\\ufe0f";
var rsAstral = "[" + rsUnicodeAstralRange + "]";
var rsCombo = "[" + rsUnicodeComboRange + "]";
var rsFitz = "\\ud83c[\\udffb-\\udfff]";
var rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")";
var rsNonAstral = "[^" + rsUnicodeAstralRange + "]";
var rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}";
var rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]";
var rsUnicodeZWJ = "\\u200d";
var rsOptMod = rsModifier + "?";
var rsOptVar = "[" + rsUnicodeVarRange + "]?";
var rsOptJoin =
  "(?:" +
  rsUnicodeZWJ +
  "(?:" +
  [rsNonAstral, rsRegional, rsSurrPair].join("|") +
  ")" +
  rsOptVar +
  rsOptMod +
  ")*";
var rsSeq = rsOptVar + rsOptMod + rsOptJoin;
var rsSymbol =
  "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
//@ chunk-7jxyna5q.js:502381-502419 placement
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}
//@ chunk-7jxyna5q.js:502419-502429 placement
var unicodeToArrayAlias = unicodeToArray;
//@ chunk-7jxyna5q.js:502429-502469 placement
function stringToArray(string) {
  return hasUnicodeAlias(string) ? unicodeToArrayAlias(string) : asciiToArrayAlias(string);
}
//@ chunk-7jxyna5q.js:502469-502479 placement
var stringToArrayAlias = stringToArray;
//@ chunk-7jxyna5q.js:502479-502617 placement
function createCaseFirst(methodName) {
  return function (string) {
    string = toStringExport(string);
    var strSymbols = hasUnicodeAlias(string) ? stringToArrayAlias(string) : undefined;
    var chr = strSymbols ? strSymbols[0] : string.charAt(0);
    var trailing = strSymbols ? baseSliceAlias(strSymbols, 1).join("") : string.slice(1);
    return chr[methodName]() + trailing;
  };
}
//@ chunk-7jxyna5q.js:502617-502627 placement
var createCaseFirstAlias = createCaseFirst;
//@ chunk-7jxyna5q.js:502627-502659 placement
var upperFirst = createCaseFirstAlias("toUpperCase");
var upperFirstAlias = upperFirst;
//@ chunk-7jxyna5q.js:502659-502707 placement
function capitalize(string) {
  return upperFirstAlias(toStringExport(string).toLowerCase());
}
//@ chunk-7jxyna5q.js:502707-502718 placement
var capitalizeAlias = capitalize;
export { capitalizeAlias, upperFirstAlias };
