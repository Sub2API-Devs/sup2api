/**
 * lodash-es/deburr.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-47b8txen.js (2)
 * attribution: esm-fingerprint 1, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { toStringExport } from "./toString.js";
import { import_deburrLetter } from "./_deburrLetter.js";

//@ chunk-47b8txen.js:2893-3041 esm-fingerprint
var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
var rsComboMarksRange_2 = "\\u0300-\\u036f";
var reComboHalfMarksRange_2 = "\\ufe20-\\ufe2f";
var rsComboSymbolsRange_2 = "\\u20d0-\\u20ff";
var rsComboRange_2 = rsComboMarksRange_2 + reComboHalfMarksRange_2 + rsComboSymbolsRange_2;
var rsCombo = "[" + rsComboRange_2 + "]";
var reComboMark = RegExp(rsCombo, "g");
//@ chunk-47b8txen.js:3041-3103 esm-layout
function deburr(string) {
  string = toStringExport(string);
  return string && string.replace(reLatin, import_deburrLetter).replace(reComboMark, "");
}
export { deburr };
