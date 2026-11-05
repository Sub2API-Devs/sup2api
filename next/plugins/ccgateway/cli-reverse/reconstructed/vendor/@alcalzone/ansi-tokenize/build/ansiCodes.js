/**
 * @alcalzone/ansi-tokenize/build/ansiCodes.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @alcalzone/ansi-tokenize@0.2.2
 * pieces: chunk-ngeq6w7y.js (6)
 * attribution: esm-layout 2, esm-fingerprint 4
 */
import { assembleStyles } from "../../../ansi-styles/index.js";

//@ chunk-ngeq6w7y.js:2807-2821 esm-layout
var assembleStyles_2 = assembleStyles();
var endCodesSource = assembleStyles_2;
//@ chunk-ngeq6w7y.js:2821-2907 esm-layout
var ESCAPES = new Set([27, 155]);
var CSI = "[".codePointAt(0);
var OSC = "]".codePointAt(0);
var endCodesSet = new Set();
var endCodesMap = new Map();
//@ chunk-ngeq6w7y.js:2907-2992 esm-fingerprint
for (let [start, end] of endCodesSource.codes) {
  endCodesSet.add(endCodesSource.color.ansi(end));
  endCodesMap.set(endCodesSource.color.ansi(start), endCodesSource.color.ansi(end));
}
//@ chunk-ngeq6w7y.js:2992-3093 esm-fingerprint
var linkStartCodePrefix = "\x1B]8;;";
var linkStartCodePrefixCharCodes = linkStartCodePrefix.split("").map((char) => char.charCodeAt(0));
var linkCodeSuffix = "\x07";
var linkCodeSuffixCharCode = linkCodeSuffix.charCodeAt(0);
var linkEndCode = `\x1B]8;;${linkCodeSuffix}`;
//@ chunk-ngeq6w7y.js:3093-3377 esm-fingerprint
function getEndCode(code) {
  if (endCodesSet.has(code)) return code;
  if (endCodesMap.has(code)) return endCodesMap.get(code);
  if (code.startsWith(linkStartCodePrefix)) return linkEndCode;
  code = code.slice(2);
  if (code.startsWith("38")) return endCodesSource.color.close;
  else if (code.startsWith("48")) return endCodesSource.bgColor.close;
  let ret = endCodesSource.codes.get(parseInt(code, 10));
  if (ret) return endCodesSource.color.ansi(ret);
  else return endCodesSource.reset.open;
}
//@ chunk-ngeq6w7y.js:3377-3428 esm-fingerprint
function ansiCodesToString(codes) {
  return codes.map((code) => code.code).join("");
}
export {
  ansiCodesToString,
  endCodesSource,
  endCodesSet,
  linkStartCodePrefixCharCodes,
  linkStartCodePrefix,
  ESCAPES,
  OSC,
  getEndCode,
  CSI,
};
