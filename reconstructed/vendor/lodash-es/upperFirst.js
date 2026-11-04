/**
 * lodash-es/upperFirst.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-s61vbvea.js (17)
 * attribution: placement 17
 */
import { baseSliceAlias as baseSliceAlias_2 } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { toStringExport } from "./toString.js";

//@ chunk-s61vbvea.js:584196-584276 placement
function baseSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return !start && end >= length ? array : baseSliceAlias_2(array, start, end);
}
//@ chunk-s61vbvea.js:584276-584286 placement
var baseSliceAlias = baseSlice;
//@ chunk-s61vbvea.js:584286-584450 placement
var rsAstralRange = "\\ud800-\\udfff";
var rsComboMarksRange = "\\u0300-\\u036f";
var rsComboSymbolsRange = "\\ufe20-\\ufe2f";
var rsDingbatRange = "\\u20d0-\\u20ff";
var rsComboRange = rsComboMarksRange + rsComboSymbolsRange + rsDingbatRange;
var rsVarRange = "\\ufe0e\\ufe0f";
var rsZWJ = "\\u200d";
var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
//@ chunk-s61vbvea.js:584450-584483 placement
function hasUnicode(string) {
  return reHasUnicode.test(string);
}
//@ chunk-s61vbvea.js:584483-584493 placement
var hasUnicodeAlias = hasUnicode;
//@ chunk-s61vbvea.js:584493-584527 placement
function asciiToArray(string) {
  return string.split("");
}
//@ chunk-s61vbvea.js:584527-584537 placement
var asciiToArrayAlias = asciiToArray;
//@ chunk-s61vbvea.js:584537-585019 placement
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
//@ chunk-s61vbvea.js:585019-585057 placement
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}
//@ chunk-s61vbvea.js:585057-585067 placement
var unicodeToArrayAlias = unicodeToArray;
//@ chunk-s61vbvea.js:585067-585107 placement
function stringToArray(string) {
  return hasUnicodeAlias(string) ? unicodeToArrayAlias(string) : asciiToArrayAlias(string);
}
//@ chunk-s61vbvea.js:585107-585117 placement
var stringToArrayAlias = stringToArray;
//@ chunk-s61vbvea.js:585117-585255 placement
function createCaseFirst(methodName) {
  return function (string) {
    string = toStringExport(string);
    var strSymbols = hasUnicodeAlias(string) ? stringToArrayAlias(string) : undefined;
    var chr = strSymbols ? strSymbols[0] : string.charAt(0);
    var trailing = strSymbols ? baseSliceAlias(strSymbols, 1).join("") : string.slice(1);
    return chr[methodName]() + trailing;
  };
}
//@ chunk-s61vbvea.js:585255-585265 placement
var createCaseFirstAlias = createCaseFirst;
//@ chunk-s61vbvea.js:585265-585297 placement
var upperFirst = createCaseFirstAlias("toUpperCase");
var upperFirstAlias = upperFirst;
//@ chunk-s61vbvea.js:585297-585345 placement
function capitalize(string) {
  return upperFirstAlias(toStringExport(string).toLowerCase());
}
//@ chunk-s61vbvea.js:585345-585356 placement
var capitalizeAlias = capitalize;
export { capitalizeAlias, upperFirstAlias };
