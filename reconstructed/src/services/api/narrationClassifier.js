/**
 * services/api/narrationClassifier.ts
 *
 * 2.1.316 新增：旁白（narration）分类器调用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { claimOnce } from "./verificationRequired.js";
import { logError } from "../../utils/log.js";

//@ chunk-e6aww6q8.js:2538286-2538334 placement
var textDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
});
//@ chunk-e6aww6q8.js:2538334-2538496 placement
function readVarint(bytes, n) {
  let value = 0;
  let s = 1;
  for (let idx = 0; idx < 10; idx++) {
    let y = n + idx;
    if (y >= bytes.length) return;
    let S = bytes[y];
    value += (S & 127) * s;
    if ((S & 128) === 0)
      return {
        value,
        next: y + 1,
      };
    s *= 128;
  }
  return;
}
//@ chunk-e6aww6q8.js:2538496-2538965 placement
/**
 * 极简 protobuf 解析器：逐字段读 tag，varint 与 length-delimited 字段回调 visitor，跳过 64/32 位定长字段；格式错误返回 false。
 */
function walkProtobufFields(bytes, visitor) {
  let r = 0;
  while (r < bytes.length) {
    let varint = readVarint(bytes, r);
    if (varint === undefined) return false;
    let h = varint.value & 7;
    let floored = Math.floor(varint.value / 8);
    switch (((r = varint.next), h)) {
      case 0: {
        let varint = readVarint(bytes, r);
        if (varint === undefined) return false;
        r = varint.next;
        visitor.onVarint?.(floored, varint.value);
        break;
      }
      case 1:
        if (r + 8 > bytes.length) return false;
        r += 8;
        break;
      case 2: {
        let varint = readVarint(bytes, r);
        if (varint === undefined || varint.value > bytes.length - varint.next) return false;
        r = varint.next + varint.value;
        visitor.onBytes?.(floored, bytes.subarray(varint.next, r));
        break;
      }
      case 5:
        if (r + 4 > bytes.length) return false;
        r += 4;
        break;
      default:
        return false;
    }
  }
  return true;
}
//@ chunk-e6aww6q8.js:2538965-2539041 placement
function nestedBytesField(bytes, n) {
  let r;
  return walkProtobufFields(bytes, {
    onBytes(h, y) {
      if (h === n) r = y;
    },
  })
    ? r
    : undefined;
}
//@ chunk-e6aww6q8.js:2539041-2539113 placement
function nestedTextField(e, n) {
  let r = nestedBytesField(e, n);
  return r === undefined ? undefined : textDecoder.decode(r);
}
//@ chunk-e6aww6q8.js:2539113-2539151 placement
/**
 * narration 的 protobuf 字段号：外层 2、内层 1、文本 8，以及 "narration" 标记。
 */
var NARRATION_ENVELOPE_FIELD = 2;
var NARRATION_PAYLOAD_FIELD = 1;
var NARRATION_TEXT_FIELD = 8;
var NARRATION = "narration";
//@ chunk-e6aww6q8.js:2539169-2539391 placement
function decodeSignatureKind(signature) {
  let n;
  try {
    n = atob(signature);
  } catch {
    return;
  }
  let uint8Array = new Uint8Array(n.length);
  for (let idx = 0; idx < n.length; idx++) uint8Array[idx] = n.charCodeAt(idx);
  let s = nestedBytesField(uint8Array, NARRATION_ENVELOPE_FIELD);
  if (s === undefined) return;
  let h = nestedBytesField(s, NARRATION_PAYLOAD_FIELD);
  if (h === undefined) return;
  return nestedTextField(h, NARRATION_TEXT_FIELD);
}
//@ chunk-e6aww6q8.js:2539391-2539411 placement
var weakMap_10 = new WeakMap();
//@ chunk-e6aww6q8.js:2539411-2539630 placement
function isNarrationThinking(block) {
  try {
    if (block.type !== "thinking" || !block.signature) return false;
    let n;
    if (weakMap_10.has(block)) n = weakMap_10.get(block);
    else {
      n = decodeSignatureKind(block.signature);
      weakMap_10.set(block, n);
    }
    return n === NARRATION;
  } catch (error) {
    if (claimOnce().claim("narration_classifier_error")) logError(error);
    return false;
  }
}
export { walkProtobufFields, isNarrationThinking };
