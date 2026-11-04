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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2538286-2538334 placement
var textDecoder; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2538286", () => {
  textDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
  });
});
//@ chunk-e6aww6q8.js:2538334-2538496 placement
function readVarint(bytes, offset) {
  let value = 0;
  let shift = 1;
  for (let idx = 0; idx < 10; idx++) {
    let cursor = offset + idx;
    if (cursor >= bytes.length) return;
    let byte = bytes[cursor];
    value += (byte & 127) * shift;
    if ((byte & 128) === 0)
      return {
        value,
        next: cursor + 1,
      };
    shift *= 128;
  }
  return;
}
//@ chunk-e6aww6q8.js:2538496-2538965 placement
/**
 * 极简 protobuf 解析器：逐字段读 tag，varint 与 length-delimited 字段回调 visitor，跳过 64/32 位定长字段；格式错误返回 false。
 */
function walkProtobufFields(bytes, visitor) {
  let shift = 0;
  while (shift < bytes.length) {
    let varint = readVarint(bytes, shift);
    if (varint === undefined) return false;
    let wireType = varint.value & 7;
    let floored = Math.floor(varint.value / 8);
    switch (((shift = varint.next), wireType)) {
      case 0: {
        let varint = readVarint(bytes, shift);
        if (varint === undefined) return false;
        shift = varint.next;
        visitor.onVarint?.(floored, varint.value);
        break;
      }
      case 1:
        if (shift + 8 > bytes.length) return false;
        shift += 8;
        break;
      case 2: {
        let varint = readVarint(bytes, shift);
        if (varint === undefined || varint.value > bytes.length - varint.next) return false;
        shift = varint.next + varint.value;
        visitor.onBytes?.(floored, bytes.subarray(varint.next, shift));
        break;
      }
      case 5:
        if (shift + 4 > bytes.length) return false;
        shift += 4;
        break;
      default:
        return false;
    }
  }
  return true;
}
//@ chunk-e6aww6q8.js:2538965-2539041 placement
function nestedBytesField(bytes, field) {
  let out;
  return walkProtobufFields(bytes, {
    onBytes(result, bytes) {
      if (result === field) out = bytes;
    },
  })
    ? out
    : undefined;
}
//@ chunk-e6aww6q8.js:2539041-2539113 placement
function nestedTextField(envelope, field) {
  let bytes = nestedBytesField(envelope, field);
  return bytes === undefined ? undefined : textDecoder.decode(bytes);
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
  let text;
  try {
    text = atob(signature);
  } catch {
    return;
  }
  let uint8Array = new Uint8Array(text.length);
  for (let idx = 0; idx < text.length; idx++) uint8Array[idx] = text.charCodeAt(idx);
  let envelope = nestedBytesField(uint8Array, NARRATION_ENVELOPE_FIELD);
  if (envelope === undefined) return;
  let payload = nestedBytesField(envelope, NARRATION_PAYLOAD_FIELD);
  if (payload === undefined) return;
  return nestedTextField(payload, NARRATION_TEXT_FIELD);
}
//@ chunk-e6aww6q8.js:2539391-2539411 placement
var weakMap_10; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2539391", () => {
  weakMap_10 = new WeakMap();
});
//@ chunk-e6aww6q8.js:2539411-2539630 placement
function isNarrationThinking(block) {
  try {
    if (block.type !== "thinking" || !block.signature) return false;
    let value;
    if (weakMap_10.has(block)) value = weakMap_10.get(block);
    else {
      value = decodeSignatureKind(block.signature);
      weakMap_10.set(block, value);
    }
    return value === NARRATION;
  } catch (error) {
    if (claimOnce().claim("narration_classifier_error")) logError(error);
    return false;
  }
}
export { walkProtobufFields, isNarrationThinking };
