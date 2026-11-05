/**
 * chart.js/dist/chart.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: chart.js@4.6.1
 * pieces: chunk-z20c443b.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BRAILLE_SPINNER_FRAMES } from "../../../src/constants/figures.js";

//@ chunk-z20c443b.js:197783-197808 esm-layout
function getBrailleSpinnerFrames() {
  return BRAILLE_SPINNER_FRAMES;
}
//@ chunk-z20c443b.js:197808-197987 esm-fingerprint
var ROUNDED_BOX_CORNERS = {
  topLeft: "\u256D",
  topRight: "\u256E",
  bottomLeft: "\u2570",
  bottomRight: "\u256F",
};
var EN_DASH = "\u2013";
var TREE_GLYPHS = {
  branch: "\u251C",
  last: "\u2514",
  pipe: "\u2502",
  teeDown: "\u252C",
  teeUp: "\u2534",
};
export { TREE_GLYPHS, getBrailleSpinnerFrames, EN_DASH, ROUNDED_BOX_CORNERS };
