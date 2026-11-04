/**
 * @bufbuild/protobuf/dist/cjs/wire/base64-encoding.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:360236-361489 cjs-require-graph
var require_base64_encoding = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.base64Decode = base64Decode;
  cjsExports.base64Encode = base64Encode;
  function base64Decode(base64Str) {
    let table = getDecodeTable();
    let es = (base64Str.length * 3) / 4;
    if (base64Str[base64Str.length - 2] == "=") es -= 2;
    else if (base64Str[base64Str.length - 1] == "=") es -= 1;
    let bytes = new Uint8Array(es);
    let bytePos = 0;
    let groupPos = 0;
    let index;
    let p = 0;
    for (let i = 0; i < base64Str.length; i++) {
      index = table[base64Str.charCodeAt(i)];
      if (index === undefined)
        switch (base64Str[i]) {
          case "=":
            groupPos = 0;
          case `
`:
          case "\r":
          case "\t":
          case " ":
            continue;
          default:
            throw Error("invalid base64 string");
        }
      switch (groupPos) {
        case 0:
          p = index;
          groupPos = 1;
          break;
        case 1:
          bytes[bytePos++] = (p << 2) | ((index & 48) >> 4);
          p = index;
          groupPos = 2;
          break;
        case 2:
          bytes[bytePos++] = ((p & 15) << 4) | ((index & 60) >> 2);
          p = index;
          groupPos = 3;
          break;
        case 3:
          bytes[bytePos++] = ((p & 3) << 6) | index;
          groupPos = 0;
          break;
      }
    }
    if (groupPos == 1) throw Error("invalid base64 string");
    return bytes.subarray(0, bytePos);
  }
  function base64Encode(bytes, encoding = "std") {
    let table = getEncodeTable(encoding);
    let pad = encoding == "std";
    let base64 = "";
    let groupPos = 0;
    let index;
    let p = 0;
    for (let i = 0; i < bytes.length; i++)
      switch (((index = bytes[i]), groupPos)) {
        case 0:
          base64 += table[index >> 2];
          p = (index & 3) << 4;
          groupPos = 1;
          break;
        case 1:
          base64 += table[p | (index >> 4)];
          p = (index & 15) << 2;
          groupPos = 2;
          break;
        case 2:
          base64 += table[p | (index >> 6)];
          base64 += table[index & 63];
          groupPos = 0;
          break;
      }
    if (groupPos) {
      base64 += table[p];
      if (pad) {
        base64 += "=";
        if (groupPos == 1) base64 += "=";
      }
    }
    return base64;
  }
  var encodeTableStd;
  var encodeTableUrl;
  var decodeTable;
  function getEncodeTable(encoding) {
    if (!encodeTableStd) {
      encodeTableStd = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
      encodeTableUrl = encodeTableStd.slice(0, -2).concat("-", "_");
    }
    return encoding == "url" ? encodeTableUrl : encodeTableStd;
  }
  function getDecodeTable() {
    if (!decodeTable) {
      decodeTable = [];
      let encodeTable = getEncodeTable("std");
      for (let i = 0; i < encodeTable.length; i++) decodeTable[encodeTable[i].charCodeAt(0)] = i;
      decodeTable[45] = encodeTable.indexOf("+");
      decodeTable[95] = encodeTable.indexOf("/");
    }
    return decodeTable;
  }
});
export { require_base64_encoding };
