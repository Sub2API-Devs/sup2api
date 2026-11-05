/**
 * @alcalzone/ansi-tokenize/build/tokenize.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @alcalzone/ansi-tokenize@0.2.2
 * pieces: chunk-ngeq6w7y.js (7)
 * attribution: esm-layout 3, esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFullwidthCodePoint, isWideCodePoint } from "../../../get-east-asian-width/lookup-data.js";
import {
  linkStartCodePrefixCharCodes,
  linkStartCodePrefix,
  ESCAPES,
  OSC,
  getEndCode,
  CSI,
} from "./ansiCodes.js";

//@ chunk-ngeq6w7y.js:6354-6419 esm-layout
function isValidCodePoint(codePoint) {
  if (!Number.isInteger(codePoint)) return false;
  return isFullwidthCodePoint(codePoint) || isWideCodePoint(codePoint);
}
//@ chunk-ngeq6w7y.js:6419-6580 esm-fingerprint
function parseLinkCode(string, index) {
  string = string.slice(index);
  for (let index = 1; index < linkStartCodePrefixCharCodes.length; index++)
    if (string.charCodeAt(index) !== linkStartCodePrefixCharCodes[index]) return;
  let endIndex = string.indexOf("\x07", linkStartCodePrefix.length);
  if (endIndex === -1) return;
  return string.slice(0, endIndex + 1);
}
//@ chunk-ngeq6w7y.js:6580-6605 esm-layout
var CC_0 = 48;
var CC_9 = 57;
var CC_SEMI = 59;
var CC_M = 109;
//@ chunk-ngeq6w7y.js:6605-6743 esm-fingerprint
function findSGRSequenceEndIndex(str) {
  for (let index = 2; index < str.length; index++) {
    let charCode = str.charCodeAt(index);
    if (charCode === CC_M) return index;
    if (charCode === CC_SEMI) continue;
    if (charCode >= CC_0 && charCode <= CC_9) continue;
    break;
  }
  return -1;
}
//@ chunk-ngeq6w7y.js:6743-6822 esm-layout
function parseSGRSequence(string, offset) {
  string = string.slice(offset);
  let endIndex = findSGRSequenceEndIndex(string);
  if (endIndex === -1) return;
  return string.slice(0, endIndex + 1);
}
//@ chunk-ngeq6w7y.js:6822-7168 esm-fingerprint
function splitCompoundSGRSequences(code) {
  if (!code.includes(";")) return [code];
  let codeParts = code.slice(2, -1).split(";");
  let ret = [];
  for (let i = 0; i < codeParts.length; i++) {
    let rawCode = codeParts[i];
    if (rawCode === "38" || rawCode === "48") {
      if (i + 2 < codeParts.length && codeParts[i + 1] === "5") {
        ret.push(codeParts.slice(i, i + 3).join(";"));
        i += 2;
        continue;
      } else if (i + 4 < codeParts.length && codeParts[i + 1] === "2") {
        ret.push(codeParts.slice(i, i + 5).join(";"));
        i += 4;
        continue;
      }
    }
    ret.push(rawCode);
  }
  return ret.map((part) => `\x1B[${part}m`);
}
//@ chunk-ngeq6w7y.js:7168-7632 esm-fingerprint
function tokenize(str, endChar = Number.POSITIVE_INFINITY) {
  let ret = [];
  let index = 0;
  let visible = 0;
  while (index < str.length) {
    let codePoint = str.codePointAt(index);
    if (ESCAPES.has(codePoint)) {
      let code;
      let nextCodePoint = str.codePointAt(index + 1);
      if (nextCodePoint === OSC) {
        code = parseLinkCode(str, index);
        if (code)
          ret.push({
            type: "ansi",
            code,
            endCode: getEndCode(code),
          });
      } else if (nextCodePoint === CSI) {
        code = parseSGRSequence(str, index);
        if (code) {
          let codes = splitCompoundSGRSequences(code);
          for (let individualCode of codes)
            ret.push({
              type: "ansi",
              code: individualCode,
              endCode: getEndCode(individualCode),
            });
        }
      }
      if (code) {
        index += code.length;
        continue;
      }
    }
    let fullWidth = isValidCodePoint(codePoint);
    let character = String.fromCodePoint(codePoint);
    ret.push({
      type: "char",
      value: character,
      fullWidth,
    });
    index += character.length;
    visible += fullWidth ? 2 : character.length;
    if (visible >= endChar) break;
  }
  return ret;
}
export { tokenize };
